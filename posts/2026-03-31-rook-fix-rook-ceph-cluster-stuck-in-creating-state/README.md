# How to Fix Rook-Ceph Cluster Stuck in Creating State

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Troubleshooting, Kubernetes, Cluster

Description: Learn how to fix a Rook-Ceph cluster stuck in the Creating state by checking operator logs, monitor pod issues, device availability, and network connectivity between pods.

---

## Identifying the Issue

When a CephCluster resource remains in `Creating` phase indefinitely, it means the Rook operator cannot complete the cluster bootstrap. Check the current status:

```bash
# Check CephCluster phase
kubectl -n rook-ceph get cephcluster rook-ceph

# Expected output when stuck:
# NAME        DATADIRHOSTPATH   MONCOUNT   AGE   PHASE      MESSAGE
# rook-ceph   /var/lib/rook     3          10m   Creating   ...

# Get detailed conditions
kubectl -n rook-ceph describe cephcluster rook-ceph
```

## Step 1: Check Operator Logs

The operator log is the primary source of truth for why the cluster is stuck:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-operator --tail=100 | grep -E "ERROR|WARN|level=error"
```

Common log messages and their meanings:

- `"waiting for quorum"` - monitors are not forming quorum
- `"failed to configure monitor"` - mon pod networking issue
- `"no valid devices found"` - OSD device discovery failed
- `"exceeded max retries"` - transient error, check underlying pods

## Step 2: Check Monitor Pod Status

Monitor formation is required before cluster creation can proceed:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-mon

# Check individual mon pod
kubectl -n rook-ceph describe pod rook-ceph-mon-a-<id>
kubectl -n rook-ceph logs rook-ceph-mon-a-<id>
```

If mons are Pending, check node resources and tolerations:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-mon -o wide
kubectl describe node <target-node> | grep -E "Taints|Conditions"
```

## Step 3: Check Network Connectivity

Monitors need to communicate on port 6789/3300. Verify:

```bash
# Get mon pod IPs
kubectl -n rook-ceph get pods -l app=rook-ceph-mon -o wide

# Test connectivity from another pod
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  nc -zv <mon-pod-ip> 3300
```

If network policies are blocking mon-to-mon communication, add appropriate rules:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ceph-mons
  namespace: rook-ceph
spec:
  podSelector:
    matchLabels:
      app: rook-ceph-mon
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: rook-ceph
      ports:
        - port: 3300
        - port: 6789
```

## Step 4: Check HostPath Permissions

Rook stores monitor data at `dataDirHostPath` (default: `/var/lib/rook`). Verify this directory is writable:

```bash
# On each node that should host a monitor
ls -la /var/lib/rook
# Should exist and be owned by root or accessible to Ceph UID

# Create it if missing
mkdir -p /var/lib/rook
chmod 755 /var/lib/rook
```

## Step 5: Force Cluster Reconciliation

If the cluster appears stuck due to a transient error, trigger a reconciliation:

```bash
# Restart the operator to trigger reconciliation
kubectl -n rook-ceph rollout restart deploy/rook-ceph-operator
```

## Step 6: Clean Up and Retry

If the cluster has never fully initialized and you need to start fresh:

```bash
# Delete the CephCluster
kubectl -n rook-ceph delete cephcluster rook-ceph

# Clean up host paths on all nodes
# On each node:
rm -rf /var/lib/rook

# Wipe OSD devices (on each node)
DISK="/dev/sdb"
sgdisk --zap-all $DISK
dd if=/dev/zero of=$DISK bs=1M count=100 oflag=direct,dsync

# Reapply the CephCluster manifest
kubectl apply -f cluster.yaml
```

## Summary

A Rook-Ceph cluster stuck in Creating is usually caused by monitor pods failing to form quorum due to networking issues, missing host path directories, node resource constraints, or unavailable OSD devices. Checking operator logs, monitor pod status, and network connectivity between pods identifies the root cause. After fixing the underlying issue, restarting the operator or triggering a reconciliation resumes cluster creation.
