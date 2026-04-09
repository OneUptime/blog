# How to Configure RADOS Object Replica Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RADOS, Replication, Pool

Description: Configure RADOS object replica counts, minimum replica requirements, and safe replica size enforcement in Rook-Ceph storage pools.

---

RADOS (Reliable Autonomic Distributed Object Store) is the foundation of all Ceph storage. Every piece of data written to Ceph - whether through RBD, CephFS, or RGW - is broken into RADOS objects and replicated across OSDs. Understanding and configuring replica management is critical for data durability.

## Replica Configuration Parameters

Three key parameters govern replication behavior:

| Parameter | Description | Default |
|---|---|---|
| `size` | Number of replicas per object | 3 |
| `min_size` | Minimum replicas needed to accept I/O | 2 |
| `requireSafeReplicaSize` | Prevent creating pools with `size: 1` (single replica, guaranteed data loss) | true |

## Configure Replicas in CephBlockPool CRD

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
    requireSafeReplicaSize: true
  parameters:
    min_size: "2"
```

The `requireSafeReplicaSize: true` flag prevents you from accidentally setting `size` to 1, which would cause data loss on any OSD failure.

## Configure Replicas via CLI

```bash
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- bash

# Set replica count
ceph osd pool set replicapool size 3

# Set minimum replicas for active I/O
ceph osd pool set replicapool min_size 2

# Verify
ceph osd pool get replicapool size
ceph osd pool get replicapool min_size
```

## Understand the size vs min_size Relationship

- `size` defines durability: how many copies exist when everything is healthy
- `min_size` defines availability: how many copies must exist to allow writes
- If active replicas drop below `min_size`, the pool blocks writes to prevent split-brain data loss

A common production setup is `size=3, min_size=2` - you can lose one OSD and still write data, but losing two will halt writes.

## Single-Copy Configuration (Dev/Test Only)

For non-production environments where storage is constrained:

```yaml
spec:
  replicated:
    size: 1
    requireSafeReplicaSize: false
  parameters:
    min_size: "1"
```

Never use `size=1` in production - any disk failure causes permanent data loss.

## Check Current Replica State Across All Pools

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd dump | grep "^pool" | awk '{print $3, "size:", $6}'
```

Or more detailed:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool ls detail --format json-pretty | \
  python3 -c "
import json, sys
pools = json.load(sys.stdin)
for p in pools:
    print(f\"{p['pool_name']}: size={p['size']}, min_size={p['min_size']}\")
"
```

## Monitor Under-Replicated Objects

```bash
# Count degraded objects
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health detail | grep -i degraded

# Watch recovery
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph -w | grep -E "(degraded|recovery)"
```

## Summary

RADOS replica management in Rook-Ceph centers on `size` (total copies) and `min_size` (minimum for I/O). Configure these through the `CephBlockPool` CRD `replicated` spec or via `ceph osd pool set`. Always use `requireSafeReplicaSize: true` in production to prevent accidental single-replica configurations that would expose data to loss.
