# How to Configure size and min_size for Pool Replicas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Replication, Availability

Description: Learn how to configure Ceph pool size and min_size parameters to control replication factor and minimum replica requirements for balancing availability and performance.

---

## Understanding size and min_size

Two parameters control replication in Ceph pools:

- **size**: The total number of replicas to maintain (default: 3). Ceph writes to all `size` replicas before acknowledging a write.
- **min_size**: The minimum number of replicas that must acknowledge a write for it to succeed (default: 2). If available replicas drop below min_size, the pool blocks all I/O.

Together they determine fault tolerance and write availability.

## How size and min_size Interact

With `size=3, min_size=2`:
- Normal operation: all 3 replicas are written
- 1 OSD down: still writes to 2 replicas, cluster stays writable
- 2 OSDs down: only 1 replica available, pool blocks all I/O (1 < min_size)

With `size=3, min_size=1` (less safe):
- 2 OSDs down: still writable with 1 replica
- Risk: data loss if that single OSD fails

## Configure via Rook CRD

Set `size` and `min_size` in the CephBlockPool spec:

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
    requireSafeReplicaSize: true  # Enforces min_size >= ceil(size/2)
```

The `requireSafeReplicaSize: true` option prevents creating pools with unsafe min_size values.

## Set min_size via CLI

For existing pools:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # View current settings
  ceph osd pool get rbd size
  ceph osd pool get rbd min_size

  # Change min_size for an existing pool
  ceph osd pool set rbd min_size 2

  # Change size (triggers replication changes)
  ceph osd pool set rbd size 3
"
```

## Common Configurations

### High Availability (3 nodes, standard)

```yaml
replicated:
  size: 3
  # min_size defaults to 2 - safe
```

### Two-Node Cluster (development only)

```yaml
replicated:
  size: 2
  requireSafeReplicaSize: false  # Allows min_size=1
```

Note: Two-node clusters have no fault tolerance for OSD failures.

### Four Replicas (highest availability)

```yaml
replicated:
  size: 4
  # min_size defaults to 2
```

## Verify Settings

After applying changes, verify they are in effect:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph osd pool ls detail | grep -E 'pool|size|min_size'
  ceph osd pool get rbd all
"
```

## Monitor Degraded Replicas

When replica count drops below `size` but above `min_size`, Ceph marks PGs as `active+degraded`. Monitor this in Prometheus:

```bash
# Alert when PGs are degraded for an extended period
ceph_pg_degraded > 0
```

The cluster remains fully writable in this state, but recovery should complete before another OSD fails.

## Impact on Read Performance

With `size=3`, Ceph reads from the primary OSD only by default. For distributing reads across replicas, enable the read balancer in the mgr balancer module (available in Ceph Reef+):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph balancer on
  ceph balancer mode upmap-read
"
```

## Summary

Configuring `size` and `min_size` for Ceph pool replicas controls fault tolerance and write availability. Setting `size=3, min_size=2` is the standard safe configuration for production clusters, allowing one OSD failure while maintaining write availability. The `requireSafeReplicaSize` option in Rook prevents misconfiguration, and monitoring degraded PG counts in Prometheus provides early warning before replica counts fall to unsafe levels.
