# How to Recover a Talos Linux Cluster from etcd Backup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, etcd, Disaster Recovery, Kubernetes, Cluster Recovery, Backups

Description: Step-by-step instructions for recovering a Talos Linux Kubernetes cluster from an etcd snapshot backup after a failure.

---

When your Talos Linux cluster suffers a catastrophic failure and etcd is lost, recovering from an etcd backup is your path back to a working cluster. This process restores all Kubernetes state - deployments, services, secrets, and configurations - from a previously taken etcd snapshot. It is one of the most critical disaster recovery procedures for any Kubernetes operator.

## When You Need etcd Recovery

You need to recover from an etcd backup when:

- All control plane nodes have failed simultaneously
- The etcd data directory is corrupted on all members
- You have lost quorum and cannot recover individual members
- A configuration mistake has destroyed the etcd cluster
- You are rebuilding the cluster after hardware failure

If only one or two members of a three-member etcd cluster are down, you can usually recover without restoring from backup. The full backup restore is the nuclear option.

## Prerequisites

Before starting the recovery process, make sure you have:

1. A valid etcd snapshot file
2. The machine configurations for your control plane nodes
3. Access to the Talos API on at least one control plane node (or the ability to provision new nodes)
4. The cluster's secrets bundle (or the ability to regenerate configs)

```bash
# Verify your snapshot file exists and is not empty
ls -la ./etcd-backup.db

# If you have etcdctl, verify the snapshot
etcdctl snapshot status ./etcd-backup.db --write-out=table
```

## Understanding the Recovery Process

The recovery works by bootstrapping a fresh etcd cluster from the snapshot data. Instead of the normal bootstrap that starts with an empty database, Talos initializes etcd with the data from your snapshot. Here is the high-level flow:

1. Reset the etcd data on control plane nodes
2. Bootstrap the first control plane node from the snapshot
3. Additional control plane nodes join the restored cluster
4. Kubernetes components reconnect to the restored etcd

## Step 1: Prepare the Control Plane Nodes

If your control plane nodes are still running but etcd is corrupted, you need to wipe the etcd data. If you are starting with fresh nodes, skip to Step 2.

```bash
# Reset etcd on each control plane node
# This wipes the EPHEMERAL partition which contains etcd data
talosctl reset --nodes <cp-node-1> \
  --system-labels-to-wipe EPHEMERAL \
  --graceful=false

talosctl reset --nodes <cp-node-2> \
  --system-labels-to-wipe EPHEMERAL \
  --graceful=false

talosctl reset --nodes <cp-node-3> \
  --system-labels-to-wipe EPHEMERAL \
  --graceful=false
```

Wait for all nodes to complete the reset:

```bash
# Verify nodes are in maintenance mode or ready for bootstrap
talosctl get machinestatus --nodes <cp-node-1>
```

## Step 2: Bootstrap from the Snapshot

Choose one control plane node to be the initial bootstrap node. This node will start the new etcd cluster with the snapshot data.

```bash
# Bootstrap the first control plane node from the etcd snapshot
talosctl bootstrap --nodes <cp-node-1> \
  --recover-from ./etcd-backup.db
```

This command uploads the snapshot to the node and starts etcd with the snapshot data as the initial state. The process takes a few minutes depending on the snapshot size.

```bash
# Monitor the bootstrap progress
talosctl dmesg --nodes <cp-node-1> --follow

# Watch etcd come up
talosctl services --nodes <cp-node-1>
```

Wait for etcd to be fully running on the first node:

```bash
# Check etcd status - should show one member
talosctl etcd status --nodes <cp-node-1>
talosctl etcd members --nodes <cp-node-1>
```

## Step 3: Join Additional Control Plane Nodes

Once the first node is running with the restored data, the other control plane nodes can join:

```bash
# The remaining control plane nodes should automatically
# attempt to join the etcd cluster if they are configured
# correctly and can reach the first node

# Monitor the second node joining
talosctl services --nodes <cp-node-2>
talosctl etcd members --nodes <cp-node-1>

# Wait for all three members to appear
# This may take a few minutes
```

If the additional nodes do not join automatically, you may need to apply their machine configurations:

```bash
# Re-apply machine config to trigger etcd join
talosctl apply-config --nodes <cp-node-2> \
  --file cp-node-2-config.yaml

talosctl apply-config --nodes <cp-node-3> \
  --file cp-node-3-config.yaml
```

## Step 4: Verify etcd Health

Once all control plane nodes have joined, verify the etcd cluster is healthy:

```bash
# Check etcd status - all three members should be present
talosctl etcd status --nodes <cp-node-1>

# Verify member list
talosctl etcd members --nodes <cp-node-1>

# Expected: 3 members, all with valid endpoints
# The leader should be elected and stable
```

## Step 5: Verify Kubernetes State

The restored etcd contains your Kubernetes state. Check that it is intact:

```bash
# Wait for the API server to come up
kubectl cluster-info

# Check that nodes are recognized
kubectl get nodes

# Verify workloads are present
kubectl get deployments --all-namespaces
kubectl get services --all-namespaces
kubectl get configmaps --all-namespaces

# Check secrets are intact
kubectl get secrets --all-namespaces
```

Note that the cluster state is restored to the point when the snapshot was taken. Any changes made between the snapshot and the failure are lost.

## Step 6: Recover Worker Nodes

Worker nodes should reconnect to the control plane automatically once etcd and the API server are healthy. If workers do not reconnect:

```bash
# Check worker node status
talosctl services --nodes <worker-ip>

# The kubelet should be trying to connect to the API server
talosctl logs kubelet --nodes <worker-ip>

# If workers need to be re-joined, apply their configs
talosctl apply-config --nodes <worker-ip> \
  --file worker-config.yaml
```

## Step 7: Verify Workloads

After the cluster is fully recovered, check that application workloads are running:

```bash
# Check all pods
kubectl get pods --all-namespaces

# Some pods may be in Pending state if their nodes
# have not rejoined yet - this is expected

# Check for any pods stuck in Terminating state
# These may need to be force-deleted
kubectl get pods --all-namespaces --field-selector status.phase=Terminating

# Force delete stuck pods if necessary
kubectl delete pod <pod-name> -n <namespace> --force --grace-period=0
```

## Handling Stale Resources

The restored state may include references to nodes or resources that no longer exist:

```bash
# Remove stale node entries
kubectl get nodes
kubectl delete node <stale-node-name>

# Check for orphaned pods
kubectl get pods --all-namespaces -o wide | grep Unknown

# Clean up any resources pointing to old infrastructure
kubectl get endpoints --all-namespaces
```

## Troubleshooting Common Recovery Issues

### Bootstrap Fails to Start

```bash
# Check for errors in the bootstrap process
talosctl logs machined --nodes <cp-node-1> | grep -i error
talosctl logs etcd --nodes <cp-node-1> | grep -i error

# Common causes:
# - Corrupted snapshot file
# - Insufficient disk space
# - Configuration mismatch
```

### etcd Members Cannot Join

```bash
# Check network connectivity between control plane nodes
talosctl logs etcd --nodes <cp-node-2> | grep -i "peer"

# Verify the machine config has correct cluster endpoints
talosctl get machineconfig --nodes <cp-node-2> -o yaml | grep -A5 "cluster:"
```

### Kubernetes API Does Not Start

```bash
# Check API server logs
talosctl logs kube-apiserver --nodes <cp-node-1>

# The API server needs etcd to be healthy
# Verify etcd is fully operational first
talosctl etcd status --nodes <cp-node-1>
```

## Testing Your Recovery Procedure

Do not wait for a real disaster to test this. Set up a test cluster and practice the recovery procedure periodically:

```bash
# 1. Create a test cluster
# 2. Deploy some workloads
# 3. Take an etcd snapshot
# 4. Destroy the cluster (or wipe etcd)
# 5. Recover from the snapshot
# 6. Verify everything is restored
```

Running this drill quarterly gives you confidence that your backups work and your team knows the procedure.

## Summary

Recovering a Talos Linux cluster from an etcd backup involves resetting the control plane nodes, bootstrapping the first node from the snapshot, letting the remaining nodes join, and then verifying that all Kubernetes state has been restored. The process is well-defined but requires preparation - you need valid backups, saved machine configurations, and familiarity with the procedure. Practice this in a non-production environment so you are ready when a real disaster strikes.
