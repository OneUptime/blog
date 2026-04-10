# How to Configure Bulk Pool Flag in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Bulk, PG Autoscaler

Description: Learn how the Ceph bulk pool flag affects PG autoscaler behavior and when to enable it for large data pools to improve storage efficiency.

---

The `bulk` flag in Ceph is a relatively recent addition that influences how the PG autoscaler allocates placement groups to a pool. It is particularly important for large data pools that store the majority of cluster data.

## What the Bulk Flag Does

By default, the PG autoscaler assigns PGs proportionally based on each pool's data size relative to the cluster. However, new pools start with few PGs, which can cause a hot-spot on a small number of OSDs until data grows.

The `bulk` flag tells the autoscaler that this pool is expected to consume significant storage, so it should pre-allocate a larger number of PGs from the start rather than scaling up gradually.

Benefits of the `bulk` flag:
- Better data distribution at pool creation time
- Reduced rebalancing overhead as the pool fills up
- Improved performance for large sequential write workloads

## Check Current Bulk Flag Status

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool get replicapool bulk
```

## Enable the Bulk Flag

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool set replicapool bulk true
```

Verify the change:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool get replicapool bulk
```

## Disable the Bulk Flag

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool set replicapool bulk false
```

## Check Autoscaler Impact

After setting the bulk flag, check the autoscaler recommendations:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool autoscale-status
```

Sample output comparing bulk vs non-bulk:

```text
POOL              SIZE  TARGET SIZE  RATE  RAW CAPACITY  RATIO  TARGET RATIO  EFFECTIVE RATIO  BIAS  PG_NUM  NEW PG_NUM  AUTOSCALE  BULK
replicapool       0 B        0 B    3.0    10.0 TiB     0.0000         0.0000             0.0000   1.0     32         128  on         True
metadata-pool     0 B        0 B    3.0    10.0 TiB     0.0000         0.0000             0.0000   1.0     16           8  on         False
```

In this example, the bulk pool is recommended 128 PGs instead of the minimal 32, ensuring better distribution from day one. The actual PG count depends on the number of OSDs, replication factor, and the `mon_target_pg_per_osd` setting.

## Configure Bulk in CephBlockPool

In Rook, set the bulk flag via the `parameters` field:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: data-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
  parameters:
    bulk: "true"
    pg_autoscale_mode: on
```

## When to Use the Bulk Flag

Use the bulk flag for:
- Primary data pools that will hold the majority of cluster data (RBD volumes, CephFS data pools)
- Object store data pools (`.rgw.buckets.data`)
- Pools expected to grow to hundreds of gigabytes or more

Avoid the bulk flag for:
- Small metadata pools (`cephfs.metadata`, `.rgw.root`)
- Temporary or test pools
- Pools with strict PG count requirements (use `nopgchange` instead)

## Summary

The Ceph `bulk` pool flag improves PG autoscaler behavior for large pools by pre-allocating more placement groups at creation time, avoiding early hot-spots and excess rebalancing. Enable it on data-heavy pools using `ceph osd pool set <pool> bulk true` or via the Rook `CephBlockPool` `parameters` field.
