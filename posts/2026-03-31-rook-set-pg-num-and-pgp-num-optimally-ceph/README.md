# How to Set pg_num and pgp_num Optimally in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, PG, Performance

Description: Learn how to calculate and set optimal pg_num and pgp_num values for Ceph pools to balance data distribution, memory usage, and recovery performance across your cluster.

---

## Why pg_num and pgp_num Matter

Placement Groups (PGs) are the internal unit Ceph uses to distribute data across OSDs. The right number of PGs directly affects:

- **Data distribution balance**: Too few PGs means uneven distribution; too many wastes resources
- **Recovery speed**: More PGs allow more parallel recovery
- **Memory usage**: Each PG consumes memory on the OSDs that host it

Setting `pg_num` too low means data concentrates on a few OSDs. Setting it too high wastes memory and slows operations.

## The Ceph PG Calculator Formula

The traditional formula for manual calculation:

```text
pg_num = (Target PGs per OSD * OSD count * Data Percentage) / Replication Factor
```

For example, with 9 OSDs, targeting 100 PGs per OSD, one pool taking 100% of data, and 3x replication:

```text
pg_num = (100 * 9 * 1.0) / 3 = 300
```

Round to the nearest power of 2: 256.

The recommended target is 50-100 PGs per OSD across all pools combined.

## Check Current pg_num

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph osd pool ls detail | grep -E 'pool|pg_num'
  ceph osd pool get rbd pg_num
  ceph osd pool get rbd pgp_num
"
```

## Set pg_num via Rook CRD

The preferred way to manage PGs in Rook is through the CephBlockPool spec:

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
  parameters:
    pg_num: "128"
    pgp_num: "128"
```

## Use PG Autoscaler (Recommended)

Ceph 14.2+ includes a PG autoscaler that automatically adjusts pg_num based on pool usage. Enable it in Rook:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  parameters:
    pg_autoscale_mode: "on"
```

Or enable it globally via CLI:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph mgr module enable pg_autoscaler
  ceph config set global osd_pool_default_pg_autoscale_mode on
"
```

## Check Autoscaler Recommendations

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph osd pool autoscale-status
"
```

Output shows the current and recommended pg_num for each pool. If a pool shows `WARN`, the PG count needs adjustment.

## Manually Increase pg_num

For pools where autoscaler is disabled, increase pg_num:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # Increase pg_num (triggers PG splitting, temporary performance impact)
  ceph osd pool set rbd pg_num 256

  # After pg_num settles, update pgp_num to match
  ceph osd pool set rbd pgp_num 256
"
```

Always set `pgp_num` equal to `pg_num` after changes. `pgp_num` controls PG placement and must be updated after `pg_num` changes.

## Monitor PG Splitting

After changing pg_num, monitor cluster health while PGs split:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  watch ceph pg stat
"
```

Wait for all PGs to return to `active+clean` before making further changes.

## Summary

Optimal pg_num settings balance PG count per OSD (targeting 50-100 across all pools), memory usage, and recovery parallelism. The PG autoscaler is the recommended approach for Ceph 14.2+ clusters and handles adjustments automatically as pool usage changes. For manually managed pools, use the formula based on OSD count and target PGs per OSD, always round to a power of 2, and update pgp_num to match pg_num after any changes.
