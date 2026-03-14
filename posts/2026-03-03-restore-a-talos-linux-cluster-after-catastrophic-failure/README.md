# How to Restore a Talos Linux Cluster After Catastrophic Failure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Disaster Recovery, Kubernetes, Cluster Restore, etcd, Infrastructure

Description: A complete walkthrough for restoring a Talos Linux Kubernetes cluster after a catastrophic failure that has taken down all nodes.

---

Catastrophic failure means everything is gone. All control plane nodes are down, etcd is unreachable, and your Kubernetes cluster is not responding. Maybe it was a data center outage, a misconfigured update that wiped all nodes, or a storage failure that destroyed the OS partitions. Whatever the cause, you need to bring the cluster back from your backups. This guide covers the full restoration process.

## Assessing the Damage

Before jumping into recovery, understand what you are dealing with:

```bash
# Try to reach any node
talosctl version --nodes <cp-node-1> 2>&1
talosctl version --nodes <cp-node-2> 2>&1
talosctl version --nodes <cp-node-3> 2>&1

# Try to reach the Kubernetes API
kubectl cluster-info 2>&1

# Check if any worker nodes are reachable
talosctl version --nodes <worker-node-1> 2>&1
```

Based on what is still accessible, your recovery path will differ:

- **All nodes gone**: Full rebuild from backups
- **Control plane gone, workers alive**: Rebuild control plane, reconnect workers
- **Partial failure**: Targeted recovery of failed nodes

This guide focuses on the worst case - everything needs to be rebuilt.

## What You Need for Recovery

Gather these items before starting:

1. **etcd snapshot** - The most recent backup of the etcd database
2. **Machine configurations** - Saved configs for all node types
3. **Secrets bundle** - The original `secrets.yaml` or equivalent
4. **talosconfig** - Your admin credentials for the cluster
5. **Infrastructure access** - Ability to provision or access the physical/virtual machines

```bash
# Verify your etcd backup exists
ls -la ./backups/etcd-snapshot.db

# Verify you have machine configs
ls -la ./backups/configs/

# Verify the secrets bundle
ls -la ./backups/secrets.yaml
```

If you are missing the etcd snapshot, you cannot restore the cluster state. You will need to start fresh. If you are missing machine configs but have the secrets bundle, you can regenerate configs.

## Step 1: Prepare the Infrastructure

Make sure your nodes are accessible and ready for Talos installation. This depends on your platform.

### Bare Metal

```bash
# Boot nodes from Talos installation media
# (ISO, PXE, or USB)
# Nodes will enter maintenance mode waiting for configuration
```

### Virtual Machines

```bash
# Recreate VMs with the same specifications
# Boot from Talos ISO or use the Talos image for your hypervisor
```

### Cloud

```bash
# Provision new instances using Talos machine images
# Match the instance types and network configuration
# of the original cluster
```

## Step 2: Apply Machine Configurations

Apply the saved machine configurations to each node. Start with the control plane nodes.

```bash
# Apply config to the first control plane node
talosctl apply-config --nodes <cp-node-1-ip> \
  --file ./backups/configs/cp-node-1.yaml \
  --insecure

# Apply to the remaining control plane nodes
talosctl apply-config --nodes <cp-node-2-ip> \
  --file ./backups/configs/cp-node-2.yaml \
  --insecure

talosctl apply-config --nodes <cp-node-3-ip> \
  --file ./backups/configs/cp-node-3.yaml \
  --insecure
```

The `--insecure` flag is required because the nodes do not yet have TLS trust established.

Wait for the nodes to install and reboot:

```bash
# Monitor installation progress
talosctl dmesg --nodes <cp-node-1-ip> --follow --insecure
```

## Step 3: Bootstrap from etcd Backup

Once the first control plane node is installed and running (but not yet bootstrapped), restore from the etcd snapshot:

```bash
# Bootstrap the first control plane node with the etcd backup
talosctl bootstrap --nodes <cp-node-1-ip> \
  --recover-from ./backups/etcd-snapshot.db

# Monitor the bootstrap process
talosctl services --nodes <cp-node-1-ip>

# Wait for etcd to start
talosctl etcd status --nodes <cp-node-1-ip>
```

This step initializes etcd with the data from your snapshot instead of starting with an empty database.

## Step 4: Wait for the Control Plane

After the bootstrap, the Kubernetes control plane components should start:

```bash
# Watch services come up
talosctl services --nodes <cp-node-1-ip>

# Expected services in running state:
# etcd, kubelet, kube-apiserver, kube-controller-manager, kube-scheduler

# Check etcd members
talosctl etcd members --nodes <cp-node-1-ip>
```

The remaining control plane nodes should join automatically:

```bash
# Monitor the second and third control plane nodes
talosctl services --nodes <cp-node-2-ip>
talosctl services --nodes <cp-node-3-ip>

# Verify all three etcd members are present
talosctl etcd members --nodes <cp-node-1-ip>
```

## Step 5: Verify Kubernetes State

Once the control plane is running, verify that the restored state is intact:

```bash
# Configure kubectl to use the restored cluster
# (your kubeconfig may need updating if endpoints changed)
talosctl kubeconfig --nodes <cp-node-1-ip>

# Check cluster status
kubectl cluster-info
kubectl get nodes

# Verify restored resources
kubectl get namespaces
kubectl get deployments --all-namespaces
kubectl get services --all-namespaces
kubectl get secrets --all-namespaces | wc -l
```

## Step 6: Restore Worker Nodes

Apply configurations to worker nodes:

```bash
# Apply worker configurations
for worker_ip in 10.0.0.10 10.0.0.11 10.0.0.12; do
    talosctl apply-config --nodes ${worker_ip} \
      --file ./backups/configs/worker-${worker_ip}.yaml \
      --insecure
done

# Wait for workers to install, reboot, and join
kubectl get nodes --watch
```

Workers should automatically register with the cluster and become Ready.

## Step 7: Clean Up Stale State

The restored etcd database may reference nodes and resources that no longer exist or have different IPs:

```bash
# Remove stale node entries
kubectl get nodes
# Delete any nodes that are not part of the new cluster
kubectl delete node <old-node-name>

# Check for pods stuck in Terminating state
kubectl get pods --all-namespaces | grep Terminating

# Force delete stuck pods
kubectl delete pod <pod-name> -n <namespace> --force --grace-period=0

# Check for orphaned persistent volume claims
kubectl get pvc --all-namespaces
kubectl get pv
```

## Step 8: Restore Application Workloads

Depending on your backup strategy, application data may need separate restoration:

```bash
# Kubernetes resource definitions are restored from etcd
# But persistent volume data is NOT in etcd

# Restore persistent volume data from your storage backup solution
# This is platform-specific:
# - Cloud: Restore from volume snapshots
# - Local storage: Restore from filesystem backups
# - Network storage: Reconnect to the existing storage backend
```

If your persistent volumes were on local storage that was destroyed, you need to restore the data from wherever you backed it up.

## Step 9: Validate Everything

Run a comprehensive validation:

```bash
# Control plane health
talosctl health --nodes <cp-node-1-ip> --wait-timeout 5m

# etcd health
talosctl etcd status --nodes <cp-node-1-ip>

# All nodes Ready
kubectl get nodes

# All system pods running
kubectl get pods -n kube-system

# All application pods running
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# Network connectivity
kubectl run test-pod --image=busybox --restart=Never \
  -- wget -qO- kubernetes.default.svc.cluster.local
kubectl delete pod test-pod

# DNS resolution
kubectl run dns-test --image=busybox --restart=Never \
  -- nslookup kubernetes.default.svc.cluster.local
kubectl delete pod dns-test
```

## Step 10: Take a Fresh Backup

After confirming everything is working, take new backups:

```bash
# New etcd snapshot
talosctl etcd snapshot ./etcd-post-recovery.db --nodes <cp-node-1-ip>

# Updated machine configs (IPs or other details may have changed)
for node in cp-1 cp-2 cp-3 worker-1 worker-2 worker-3; do
    talosctl get machineconfig --nodes ${node} -o yaml > new-${node}-config.yaml
done
```

## Lessons for Next Time

After every catastrophic recovery, do a retrospective:

- Why did the failure happen?
- Could the recovery have been faster?
- Were the backups recent enough?
- Was the recovery procedure documented clearly?
- What additional backups or monitoring would have helped?

Update your disaster recovery plan based on what you learned.

## Summary

Restoring a Talos Linux cluster after catastrophic failure requires etcd snapshots, machine configurations, and the secrets bundle. The process involves preparing infrastructure, applying saved configurations, bootstrapping from the etcd backup, joining additional nodes, and cleaning up stale state. The quality of your recovery depends entirely on the quality of your backups. Take regular etcd snapshots, save machine configs, and practice the recovery procedure so you are ready when disaster strikes.
