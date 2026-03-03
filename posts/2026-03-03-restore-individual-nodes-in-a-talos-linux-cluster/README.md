# How to Restore Individual Nodes in a Talos Linux Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Node Recovery, Kubernetes, Cluster Management, Operations

Description: A complete guide to restoring individual worker and control plane nodes in a Talos Linux cluster after failures, with step-by-step recovery procedures.

---

Node failures are inevitable in any Kubernetes cluster. Hardware breaks, disks fail, and sometimes firmware updates go wrong. With Talos Linux, restoring individual nodes follows a different process than traditional Linux systems because there is no SSH access and no manual intervention at the OS level. Everything goes through the Talos API and machine configuration files.

The good news is that Talos Linux's declarative approach makes node restoration predictable and repeatable. This guide covers restoring both worker nodes and control plane nodes step by step.

## Understanding Node State in Talos Linux

Before diving into restoration, it helps to understand what state a Talos node holds:

- **Machine configuration**: The YAML config that defines everything about the node - network settings, cluster membership, kubelet configuration, and more.
- **etcd data** (control plane only): The distributed key-value store that holds all Kubernetes state.
- **Ephemeral data**: Container images, logs, and temporary files stored on the node's disk.
- **Persistent volume data**: If the node has local persistent volumes, that data lives on the node's disk.

Worker nodes are largely stateless from the cluster's perspective. The important state is in etcd on the control plane. This means worker node restoration is straightforward - just boot a new node with the right configuration.

Control plane restoration is more nuanced because of etcd membership.

## Diagnosing Node Failures

Start by identifying what happened to the node.

```bash
# Check node status in Kubernetes
kubectl get nodes
# Look for nodes in NotReady or Unknown state

# Try to reach the node via Talos API
talosctl -n 10.0.1.10 health
talosctl -n 10.0.1.10 version

# Check system logs if the node is reachable
talosctl -n 10.0.1.10 logs controller-runtime
talosctl -n 10.0.1.10 dmesg
```

If the node is completely unreachable, it could be a hardware failure, network issue, or power problem. Verify at the infrastructure level before proceeding with restoration.

## Restoring a Worker Node

Worker nodes are the simplest to restore because they do not participate in etcd.

### Step 1: Remove the Failed Node from Kubernetes

```bash
# Cordon the node to prevent new pod scheduling
kubectl cordon worker-3

# Drain pods from the node (skip if node is already down)
kubectl drain worker-3 --ignore-daemonsets --delete-emptydir-data --force

# Delete the node object
kubectl delete node worker-3
```

### Step 2: Prepare the Replacement Node

If you are replacing hardware, install Talos Linux on the new machine. For cloud or virtual environments, provision a new VM with the Talos image.

```bash
# For bare metal - boot from Talos ISO or PXE
# For cloud - create a new VM with the Talos image

# If using Talos image factory for custom images
wget https://factory.talos.dev/image/YOUR_SCHEMATIC_ID/v1.9.0/nocloud-amd64.raw.xz
```

### Step 3: Apply the Machine Configuration

Use the same worker machine configuration that the failed node used. If you have been backing up configs (and you should be), pull it from your backup location.

```bash
# Apply the worker configuration to the new node
talosctl apply-config --insecure \
  --nodes 10.0.2.13 \
  --file worker-config.yaml
```

If the new node has a different IP address, update the machine configuration accordingly:

```yaml
# worker-config.yaml - adjust network settings if needed
machine:
  network:
    hostname: worker-3
    interfaces:
      - interface: eth0
        addresses:
          - 10.0.2.13/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.2.1
```

```bash
# Apply the updated configuration
talosctl apply-config --insecure \
  --nodes 10.0.2.13 \
  --file worker-config.yaml
```

### Step 4: Verify the Node Joins the Cluster

```bash
# Watch for the node to appear
kubectl get nodes -w

# Check that the node is Ready
kubectl get node worker-3

# Verify pods are being scheduled
kubectl get pods -o wide --field-selector spec.nodeName=worker-3
```

### Step 5: Restore Node Labels and Taints

If the original node had specific labels or taints, re-apply them.

```bash
# Re-apply labels
kubectl label node worker-3 node-role=compute
kubectl label node worker-3 team=backend

# Re-apply taints if any
kubectl taint node worker-3 dedicated=gpu:NoSchedule
```

## Restoring a Control Plane Node

Control plane restoration requires extra steps because of etcd.

### Step 1: Check etcd Cluster Health

Before doing anything, verify the remaining control plane nodes have a healthy etcd quorum.

```bash
# Check etcd status on a healthy control plane node
talosctl -n 10.0.1.11 etcd status

# List current etcd members
talosctl -n 10.0.1.11 etcd member list

# Verify Kubernetes API is responsive
kubectl get cs
kubectl get nodes
```

With a 3-node control plane, losing one node means etcd still has quorum (2 out of 3). You need to act before losing another node.

### Step 2: Remove the Failed etcd Member

```bash
# Find the member ID of the failed node
talosctl -n 10.0.1.11 etcd member list
# Note the member ID for the failed node (e.g., "abc123def456")

# Remove the failed member
talosctl -n 10.0.1.11 etcd remove-member abc123def456

# Verify the member was removed
talosctl -n 10.0.1.11 etcd member list
# Should now show 2 members
```

### Step 3: Remove the Node from Kubernetes

```bash
kubectl delete node cp-3
```

### Step 4: Provision and Configure the Replacement Node

```bash
# Boot the new node with Talos Linux
# Then apply the control plane configuration

talosctl apply-config --insecure \
  --nodes 10.0.1.12 \
  --file controlplane-config.yaml
```

The new control plane node will automatically attempt to join the existing etcd cluster. Watch the logs to confirm.

```bash
# Monitor the new node's etcd join process
talosctl -n 10.0.1.12 logs etcd

# Check etcd member list again
talosctl -n 10.0.1.11 etcd member list
# Should show 3 members again
```

### Step 5: Verify Full Recovery

```bash
# etcd health check
talosctl -n 10.0.1.10 etcd status
talosctl -n 10.0.1.11 etcd status
talosctl -n 10.0.1.12 etcd status

# Kubernetes health check
kubectl get nodes
kubectl get cs

# Run a quick workload test
kubectl run test-pod --image=alpine --restart=Never -- sleep 30
kubectl get pod test-pod
kubectl delete pod test-pod
```

## Handling Persistent Volume Recovery

If the failed node hosted local persistent volumes, restoring the data requires additional steps.

```bash
# Identify PVs that were on the failed node
kubectl get pv -o wide | grep worker-3

# If using local-path-provisioner, the data was on the node's disk
# You will need to restore from backup

# Restore PV data using Velero
velero restore create pv-restore \
  --from-backup latest-backup \
  --include-resources persistentvolumeclaims,persistentvolumes

# Or manually copy data to the new node's storage location
```

## Restoring a Node After a Bad Configuration Update

Sometimes a node fails because of a bad machine config update. Talos provides a way to recover.

```bash
# If the node is still reachable but in a bad state,
# apply a known-good configuration
talosctl -n 10.0.1.10 apply-config --file known-good-config.yaml

# If the node is in maintenance mode, use --insecure
talosctl apply-config --insecure \
  --nodes 10.0.1.10 \
  --file known-good-config.yaml

# If nothing works, reset the node to factory defaults
talosctl -n 10.0.1.10 reset --graceful=false
# Then apply config from scratch
talosctl apply-config --insecure \
  --nodes 10.0.1.10 \
  --file controlplane-config.yaml
```

## Automating Node Restoration

For large clusters, consider automating node restoration with scripts.

```bash
#!/bin/bash
# restore-worker.sh - Automated worker node restoration

NODE_IP=$1
CONFIG_FILE=$2

if [ -z "$NODE_IP" ] || [ -z "$CONFIG_FILE" ]; then
  echo "Usage: restore-worker.sh <node-ip> <config-file>"
  exit 1
fi

echo "Applying configuration to $NODE_IP..."
talosctl apply-config --insecure \
  --nodes "$NODE_IP" \
  --file "$CONFIG_FILE"

echo "Waiting for node to join cluster..."
for i in $(seq 1 60); do
  if kubectl get nodes | grep -q "$NODE_IP"; then
    echo "Node joined the cluster successfully"
    break
  fi
  sleep 10
done

# Verify node is Ready
NODE_STATUS=$(kubectl get nodes | grep "$NODE_IP" | awk '{print $2}')
if [ "$NODE_STATUS" = "Ready" ]; then
  echo "Node restoration complete"
else
  echo "WARNING: Node is $NODE_STATUS, may need more time"
fi
```

## Best Practices for Node Restoration

1. **Keep machine configs versioned**: Store all configs in git so you always have the correct version for each node.
2. **Label your backups**: Include timestamps and node identifiers in backup names.
3. **Test restoration regularly**: Practice node restoration in a staging environment before you need it in production.
4. **Monitor etcd health continuously**: Do not wait for a failure to discover your etcd cluster is already degraded.
5. **Document IP assignments**: Keep a record of which IPs belong to which nodes and their roles.

## Conclusion

Restoring individual nodes in a Talos Linux cluster is straightforward once you understand the process. Worker nodes are simple - just boot and apply the config. Control plane nodes require careful etcd member management. The key to smooth restoration is preparation: keep your machine configurations backed up, maintain etcd snapshots, and practice the recovery process before a real failure forces you to figure it out under pressure.
