# How to Expand Storage Capacity in a Running Rook-Ceph Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Storage, Capacity, Scaling, Kubernetes

Description: Learn how to expand storage capacity in a live Rook-Ceph cluster by adding disks, nodes, or PVC-backed device sets without downtime or data loss.

---

## When to Expand

Use `ceph df` to monitor usage. Plan expansion before hitting the warning threshold:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph df
```

- 70% usage: begin planning expansion
- 85% usage: `HEALTH_WARN` (nearfull) - start expansion immediately
- 95% usage: `HEALTH_ERR` (full) - cluster stops accepting writes

## Method 1: Add Disks to Existing Nodes

If existing nodes have empty disk slots:

```bash
# Confirm new disk is visible and unpartitioned
ssh worker-1 lsblk | grep sdc
```

Update the CephCluster to include the new device:

```yaml
spec:
  storage:
    nodes:
    - name: "worker-1"
      devices:
      - name: "sdb"
      - name: "sdc"   # new disk
```

```bash
kubectl -n rook-ceph apply -f ceph-cluster.yaml
watch "kubectl -n rook-ceph get pods | grep osd"
```

## Method 2: Add New Storage Nodes

Add new Kubernetes nodes with storage, label them, and let Rook discover them:

```bash
kubectl label node new-worker-5 ceph-osd=enabled
```

With `useAllNodes: true` and `useAllDevices: true`, Rook provisions OSDs automatically:

```yaml
spec:
  storage:
    useAllNodes: true
    useAllDevices: true
    deviceFilter: "^sd[b-z]"
```

## Method 3: Increase StorageClassDeviceSet Count

For cloud environments using dynamic provisioning:

```yaml
spec:
  storage:
    storageClassDeviceSets:
    - name: set1
      count: 9   # was 6, adding 3 more
      portable: true
      volumeClaimTemplates:
      - metadata:
          name: data
        spec:
          resources:
            requests:
              storage: 2Ti
          storageClassName: premium-ssd
          volumeMode: Block
          accessModes:
          - ReadWriteOnce
```

```bash
kubectl -n rook-ceph apply -f ceph-cluster.yaml
```

## Monitoring Rebalancing

After adding capacity, Ceph rebalances data automatically:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
# Watch "misplaced" objects count decrease

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd df tree
# Verify even distribution across all OSDs
```

To speed up rebalancing at the cost of I/O impact:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_max_backfills 4
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_recovery_max_active 4
```

## Verify Expansion Success

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph df
# Confirm total capacity and used% have changed
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat
# Confirm OSD count increased
```

## Summary

Expanding Rook-Ceph storage is a non-disruptive operation whether done by adding disks, nodes, or PVC device sets. After expansion, Ceph automatically rebalances data. Monitoring rebalancing progress and tuning backfill settings ensures minimal performance impact during the process.
