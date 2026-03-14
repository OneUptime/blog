# How to Recover a Single Control Plane Node Cluster in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Single Node, Control Plane, Disaster Recovery, Kubernetes, Etcd

Description: Recovery procedures for single control plane node Talos Linux clusters where there is no redundancy to fall back on.

---

Running a single control plane node in Talos Linux means you have no redundancy. If that node goes down, your entire cluster is unavailable. While multi-node control planes are recommended for production, single-node setups are common in development environments, edge deployments, home labs, and small-scale infrastructure. This guide covers how to recover when that single node fails.

## The Risk of Single-Node Control Planes

With a single control plane node, you face these realities:

- No etcd quorum redundancy (one member = quorum of one)
- Any node failure means total cluster outage
- No rolling upgrades - every operation has downtime
- Corruption of etcd data means total loss without a backup

This makes backups absolutely critical. A multi-node cluster can survive individual member failures, but a single-node cluster cannot survive anything.

## Prevention: Backups Are Everything

Before we talk about recovery, let us talk about what makes recovery possible:

```bash
# Take etcd snapshots frequently
# For a single-node cluster, do this at least daily
talosctl etcd snapshot ./etcd-backup-$(date +%Y%m%d-%H%M%S).db \
  --nodes <cp-node-ip>

# Back up the machine configuration
talosctl get machineconfig --nodes <cp-node-ip> -o yaml > machine-config-backup.yaml

# Save the talosconfig
cp ~/.talos/config ./talosconfig-backup
```

Automate these backups. For a single-node cluster, an hourly etcd snapshot is not overkill - it is the minimum.

## Scenario 1: Node Is Down But Data Is Intact

If the node experienced a temporary failure (power outage, kernel panic, hardware glitch) and the disks are intact:

```bash
# Power the node back on (physically or through IPMI/cloud console)

# Wait for it to boot
# Talos will automatically start all services including etcd
until talosctl version --nodes <cp-node-ip> 2>/dev/null; do
    echo "Waiting for node to come online..."
    sleep 10
done

# Check services
talosctl services --nodes <cp-node-ip>

# Verify etcd started successfully
talosctl etcd status --nodes <cp-node-ip>

# Check Kubernetes
kubectl get nodes
kubectl get pods --all-namespaces
```

If etcd starts cleanly, you are back in business. Single-member etcd does not have the quorum issues that multi-member clusters face during recovery.

## Scenario 2: etcd Data Is Corrupted

If the node comes back but etcd cannot start due to data corruption:

```bash
# Check etcd logs for corruption errors
talosctl logs etcd --nodes <cp-node-ip> | grep -i "corrupt\|crc\|mismatch"

# If you see corruption errors, you need to restore from backup
```

### Recovery Steps

```bash
# Step 1: Wipe the EPHEMERAL partition (contains etcd data)
talosctl reset --nodes <cp-node-ip> \
  --system-labels-to-wipe EPHEMERAL \
  --graceful=false

# Step 2: Wait for the node to come back
sleep 30
talosctl services --nodes <cp-node-ip>

# Step 3: Bootstrap from the etcd backup
talosctl bootstrap --nodes <cp-node-ip> \
  --recover-from ./etcd-backup.db

# Step 4: Wait for services to start
talosctl health --nodes <cp-node-ip> --wait-timeout 10m

# Step 5: Verify recovery
talosctl etcd status --nodes <cp-node-ip>
kubectl get nodes
kubectl get pods --all-namespaces
```

## Scenario 3: Complete Node Loss (Hardware Failure)

If the physical or virtual machine is completely gone, you need to provision a new node and restore:

```bash
# Step 1: Provision a new machine
# Boot from Talos installation media (ISO, PXE, or cloud image)

# Step 2: Apply the saved machine configuration
talosctl apply-config --nodes <new-node-ip> \
  --file machine-config-backup.yaml \
  --insecure

# Step 3: Wait for installation to complete
echo "Waiting for Talos to install..."
until talosctl version --nodes <new-node-ip> 2>/dev/null; do
    sleep 10
done

# Step 4: Bootstrap from the etcd backup
talosctl bootstrap --nodes <new-node-ip> \
  --recover-from ./etcd-backup.db

# Step 5: Wait for the cluster to come up
talosctl health --nodes <new-node-ip> --wait-timeout 10m

# Step 6: Update your kubeconfig (the endpoint may have changed)
talosctl kubeconfig --nodes <new-node-ip>
```

### Handling Changed IP Addresses

If the new node has a different IP address than the old one:

```bash
# Update the machine configuration with the new IP
# before applying it

# Edit the machine config to update:
# - machine.network.interfaces (node IP)
# - cluster.controlPlane.endpoint (if it referenced the node IP)

# Also update your talosconfig with the new endpoint
talosctl config endpoint <new-node-ip>
talosctl config node <new-node-ip>
```

## Scenario 4: Recovering Without an etcd Backup

If you lost the node and do not have an etcd backup, the cluster state is gone. You need to rebuild from scratch:

```bash
# Step 1: Generate new cluster configuration
talosctl gen config my-cluster https://<new-node-ip>:6443 \
  --output-dir ./new-configs

# Step 2: Apply the configuration
talosctl apply-config --nodes <new-node-ip> \
  --file ./new-configs/controlplane.yaml \
  --insecure

# Step 3: Bootstrap a fresh cluster
talosctl bootstrap --nodes <new-node-ip>

# Step 4: Wait for the cluster
talosctl health --nodes <new-node-ip> --wait-timeout 10m

# Step 5: Redeploy all your applications
# Since there is no etcd backup, you need to recreate everything
kubectl apply -f ./my-app-manifests/
```

This is why backups are so important for single-node clusters.

## Dealing with Worker Nodes After Recovery

If your single control plane node also serves as a worker (common in small setups), all workloads restart automatically after recovery.

If you have separate worker nodes, they need to reconnect to the restored control plane:

```bash
# Check if workers are reconnecting
kubectl get nodes --watch

# Workers might show as NotReady initially
# Give them a few minutes to reconnect

# If workers do not reconnect, check their kubelet logs
talosctl logs kubelet --nodes <worker-ip>

# Workers may need their configs re-applied if the
# cluster certificates changed
talosctl apply-config --nodes <worker-ip> \
  --file worker-config.yaml
```

## Persistent Volume Recovery

The etcd backup restores Kubernetes state (PV definitions, PVC bindings), but not the actual data on persistent volumes:

```bash
# After cluster recovery, check PV status
kubectl get pv
kubectl get pvc --all-namespaces

# If PVs used local storage on the old node and
# the disk is accessible on the new node, the data
# should be available automatically

# If the disks changed, you need to restore PV data
# from separate backups
```

## Upgrading to Multi-Node After Recovery

After recovering a single-node cluster, consider adding more control plane nodes to prevent future single points of failure:

```bash
# Generate configs for additional control plane nodes
# using the existing cluster secrets

# Apply configs to new control plane nodes
talosctl apply-config --nodes <new-cp-2-ip> \
  --file additional-cp-config.yaml --insecure

talosctl apply-config --nodes <new-cp-3-ip> \
  --file additional-cp-config.yaml --insecure

# The new nodes will join the existing etcd cluster
talosctl etcd members --nodes <cp-node-ip>
# Should now show 3 members
```

## Automating Single-Node Recovery

Given the higher risk of single-node setups, automate as much of the recovery as possible:

```bash
#!/bin/bash
# single-node-recovery.sh

set -e

CONFIG_FILE="${1:?Usage: $0 <config-file> <etcd-backup>}"
ETCD_BACKUP="${2:?Usage: $0 <config-file> <etcd-backup>}"
NODE_IP="${3:?Usage: $0 <config-file> <etcd-backup> <node-ip>}"

echo "Recovering single-node cluster..."
echo "Config: ${CONFIG_FILE}"
echo "etcd backup: ${ETCD_BACKUP}"
echo "Node IP: ${NODE_IP}"

# Apply config
talosctl apply-config --nodes ${NODE_IP} \
  --file ${CONFIG_FILE} --insecure

# Wait for installation
echo "Waiting for node to be ready..."
until talosctl version --nodes ${NODE_IP} 2>/dev/null; do
    sleep 10
done

# Bootstrap from backup
echo "Bootstrapping from etcd backup..."
talosctl bootstrap --nodes ${NODE_IP} \
  --recover-from ${ETCD_BACKUP}

# Wait for health
echo "Waiting for cluster to be healthy..."
talosctl health --nodes ${NODE_IP} --wait-timeout 15m

# Update kubeconfig
talosctl kubeconfig --nodes ${NODE_IP}

# Verify
echo "Cluster state:"
kubectl get nodes
kubectl get pods --all-namespaces | head -20

echo "Recovery complete!"
```

## Summary

Recovering a single control plane node Talos Linux cluster depends entirely on your backups. With an etcd snapshot and saved machine configuration, you can restore the cluster on the same or new hardware. Without backups, you must start from scratch and redeploy everything. The lack of redundancy in single-node setups makes automated, frequent backups a necessity rather than a nice-to-have. Consider upgrading to a multi-node control plane after recovery to avoid the same risk in the future.
