# How to Fix TOO_FEW_OSDS Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OSD, Health Check, Cluster

Description: Learn how to resolve TOO_FEW_OSDS in Ceph, a warning that the cluster has fewer OSDs than the minimum required for reliable distributed storage.

---

## What Is TOO_FEW_OSDS?

`TOO_FEW_OSDS` is a Ceph health warning that fires when the cluster has fewer OSDs than recommended for the configured replication factor and failure domain settings. For example, if you have a pool with `size=3` and a `host` failure domain but only 2 nodes with OSDs, Ceph will warn that there are too few OSDs to reliably store data with the requested redundancy.

This warning can also appear when OSDs are down or out, reducing the effective OSD count below the minimum threshold.

## Checking the Warning

```bash
ceph health detail
```

Example output:

```text
[WRN] TOO_FEW_OSDS: Only 2 OSDs in cluster (minimum 3 required for configured pools)
```

Check current OSD status:

```bash
ceph osd stat
ceph osd tree
```

## Common Scenarios

### Scenario 1 - New Cluster with Not Enough Nodes

A new Rook deployment with only 1 or 2 nodes but pools configured with `size=3`:

```bash
ceph osd pool get rbd size
# shows: size: 3
ceph osd stat
# shows: 2 OSDs
```

### Scenario 2 - OSDs are Down

Multiple OSDs are down, reducing the active count:

```bash
ceph osd tree | grep down
```

### Scenario 3 - OSDs Marked Out

OSDs were manually marked out:

```bash
ceph osd dump | grep "osd\." | grep "out"
```

## Fix Steps

### Fix 1 - Add More OSD Nodes

The proper fix is to add more Kubernetes nodes with available disks. In Rook:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
spec:
  storage:
    useAllNodes: true
    useAllDevices: true
```

After adding nodes:

```bash
kubectl -n rook-ceph rollout restart deploy/rook-ceph-operator
```

Monitor new OSD provisioning:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-osd
```

### Fix 2 - Reduce Pool Size to Match Available OSDs

If you cannot add more nodes, reduce the pool replication factor:

```bash
ceph osd pool set rbd size 2
ceph osd pool set rbd min_size 1
```

### Fix 3 - Bring Back Down OSDs

If OSDs are down due to a temporary issue:

```bash
ceph osd in osd.1
kubectl -n rook-ceph rollout restart deploy/rook-ceph-osd-1
```

### Fix 4 - Adjust the Warning Threshold

Temporarily suppress the warning (not recommended long-term):

```bash
ceph health mute TOO_FEW_OSDS
```

## Minimum OSD Recommendations

| Pool Size | Minimum OSDs | Recommended OSDs |
|---|---|---|
| 1 | 1 | 1 |
| 2 | 2 | 4 |
| 3 | 3 | 6 |
| EC 2+1 | 3 | 5 |

## Summary

`TOO_FEW_OSDS` warns that your cluster lacks sufficient OSDs for the configured replication or erasure coding settings. The correct fix is adding more nodes with disks to the cluster. As a workaround, you can reduce pool replication factor to match available OSDs, but this reduces data durability. Always ensure OSD count exceeds the pool `size` value across distinct failure domains.
