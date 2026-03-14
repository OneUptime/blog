# How to Upgrade Talos Linux Control Plane Nodes Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Control Plane, Upgrade, Etcd, High Availability

Description: A detailed guide to safely upgrading Talos Linux control plane nodes while maintaining cluster availability and etcd quorum.

---

Control plane nodes are the heart of your Kubernetes cluster. They run the API server, scheduler, controller manager, and etcd. An upgrade gone wrong on a control plane node can take down the entire cluster. This guide walks through the safest approach to upgrading Talos Linux control plane nodes without losing availability.

## Understanding the Risks

When you upgrade a control plane node, you are temporarily removing it from the cluster. During the reboot, the node's etcd member goes offline, the local API server becomes unavailable, and any leader elections for Kubernetes controllers may trigger. With a three-node control plane, losing one node means you are down to two - still enough for quorum, but with zero margin for error.

If you have a single control plane node, the cluster will be completely unavailable during the upgrade. For production environments, always use three or more control plane nodes.

## Pre-Upgrade Preparation

### Verify etcd Health

This is the most critical pre-check. Never start a control plane upgrade with an unhealthy etcd cluster.

```bash
# Check etcd status
talosctl etcd status --nodes <cp-node-1>

# Verify all members are present and healthy
talosctl etcd members --nodes <cp-node-1>

# Expected: 3 members, all with a valid endpoint
# If any member is missing or unhealthy, fix that first
```

### Confirm Cluster Health

```bash
# All control plane nodes should be Ready
kubectl get nodes -l node-role.kubernetes.io/control-plane

# API server should respond quickly
kubectl cluster-info

# No pending or failing system pods
kubectl get pods -n kube-system
```

### Take an etcd Backup

```bash
# Snapshot etcd before starting
talosctl etcd snapshot ./etcd-pre-upgrade-backup.snapshot \
  --nodes <cp-node-1>

# Verify the backup file is not empty
ls -la ./etcd-pre-upgrade-backup.snapshot
```

This backup is your safety net. If something goes catastrophically wrong during the upgrade, you can restore from this snapshot.

### Save Machine Configurations

```bash
# Back up each control plane node's config
for node in cp-node-1 cp-node-2 cp-node-3; do
    talosctl get machineconfig --nodes ${node} -o yaml > ${node}-config-backup.yaml
done
```

## The Upgrade Procedure

### Step 1: Upgrade the First Control Plane Node

Pick the node that is NOT the current etcd leader if possible. This reduces the chance of unnecessary leader elections.

```bash
# Check who the etcd leader is
talosctl etcd status --nodes <cp-node-1>
# The output shows which member is the leader

# Upgrade a non-leader node first
talosctl upgrade --nodes <cp-node-2> \
  --image ghcr.io/siderolabs/installer:v1.7.0
```

### Step 2: Wait and Verify

Do not rush to the next node. Wait for the upgraded node to fully rejoin the cluster.

```bash
# Wait for the node to come back
talosctl health --nodes <cp-node-2> --wait-timeout 10m

# Verify etcd has all three members again
talosctl etcd members --nodes <cp-node-1>

# Check that the upgraded node is Ready in Kubernetes
kubectl get nodes -l node-role.kubernetes.io/control-plane

# Verify the version changed
talosctl version --nodes <cp-node-2>
```

Make sure all three etcd members are healthy before proceeding. This is not optional.

```bash
# Double-check etcd health
talosctl etcd status --nodes <cp-node-1>

# All members should show a valid status
# The cluster ID should be consistent
```

### Step 3: Upgrade the Second Control Plane Node

```bash
# Upgrade the next non-leader node (or the old leader)
talosctl upgrade --nodes <cp-node-3> \
  --image ghcr.io/siderolabs/installer:v1.7.0

# Wait for it to rejoin
talosctl health --nodes <cp-node-3> --wait-timeout 10m

# Verify etcd members
talosctl etcd members --nodes <cp-node-2>

# Check Kubernetes node status
kubectl get nodes -l node-role.kubernetes.io/control-plane
```

### Step 4: Upgrade the Final Control Plane Node

The last node is often the current etcd leader (since the other two rebooted and likely triggered leader elections).

```bash
# Upgrade the last control plane node
talosctl upgrade --nodes <cp-node-1> \
  --image ghcr.io/siderolabs/installer:v1.7.0

# Wait for it to come back
talosctl health --nodes <cp-node-1> --wait-timeout 10m

# Final verification of etcd
talosctl etcd status --nodes <cp-node-2>
talosctl etcd members --nodes <cp-node-2>
```

## Post-Upgrade Verification

After all control plane nodes are upgraded, run a thorough check:

```bash
# All control plane nodes on the new version
talosctl version --nodes <cp-node-1>,<cp-node-2>,<cp-node-3>

# etcd cluster is healthy
talosctl etcd status --nodes <cp-node-1>

# All system services running
talosctl services --nodes <cp-node-1>
talosctl services --nodes <cp-node-2>
talosctl services --nodes <cp-node-3>

# Kubernetes API is responsive
kubectl get nodes
kubectl get pods -n kube-system

# API server components are on the expected version
kubectl get pods -n kube-system -l component=kube-apiserver -o yaml | \
  grep "image:"
```

## Handling Common Issues

### etcd Member Fails to Rejoin

If a node comes back but its etcd member does not rejoin the cluster:

```bash
# Check etcd logs
talosctl logs etcd --nodes <problem-node>

# Look for messages about member ID mismatch,
# data directory corruption, or TLS errors

# If etcd data is corrupted, you may need to remove
# and re-add the member
talosctl etcd remove-member --nodes <healthy-node> <member-id>
talosctl etcd join --nodes <problem-node>
```

### Node Stuck in NotReady

If a control plane node comes back from reboot but stays NotReady in Kubernetes:

```bash
# Check kubelet status
talosctl services --nodes <problem-node>

# Check kubelet logs
talosctl logs kubelet --nodes <problem-node>

# Common causes:
# - CNI not ready
# - Certificate issues
# - API server not reachable from the node
```

### Upgrade Timeout

If the upgrade command itself times out:

```bash
# Check if the image is being pulled
talosctl dmesg --nodes <node-ip> | grep -i pull

# The image might be large or the registry might be slow
# You can increase the timeout or pre-pull the image
talosctl upgrade --nodes <node-ip> \
  --image ghcr.io/siderolabs/installer:v1.7.0 \
  --timeout 15m
```

## Rolling Back a Control Plane Upgrade

If things go badly wrong, Talos keeps the previous OS partition:

```bash
# Rollback to the previous version
talosctl rollback --nodes <problem-node>

# The node will reboot into the previous OS partition
# with the previous Talos version
```

If you need to restore the entire cluster from the etcd backup, that is a more involved process covered in disaster recovery documentation.

## Five-Node Control Plane Considerations

With five control plane nodes, you have more room for error since quorum requires only three nodes. However, the same principles apply:

- Upgrade one node at a time
- Verify etcd health between each upgrade
- Never have more than one node upgrading simultaneously

The extra redundancy means a single failed upgrade is less likely to cause an outage, but it is still best to be methodical.

## Summary

Safely upgrading Talos Linux control plane nodes comes down to patience and verification. Back up etcd before starting, upgrade one node at a time, verify etcd health between each upgrade, and do not skip the post-upgrade checks. The sequential approach takes longer than upgrading all nodes at once, but it ensures your cluster stays available throughout the process.
