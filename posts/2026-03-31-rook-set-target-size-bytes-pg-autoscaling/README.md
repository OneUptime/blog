# How to Set target_size_bytes for PG Autoscaling in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Placement Group, Autoscaling, Pool

Description: Learn how to set target_size_bytes on Ceph pools to give the PG autoscaler accurate capacity hints for optimal Placement Group allocation.

---

## Why target_size_bytes Matters

The Ceph PG autoscaler estimates appropriate PG counts based on current data sizes. For new or empty pools, there is no data to measure, so the autoscaler defaults to a small PG count. When the pool eventually fills up, PG count needs to increase, causing PG splits that temporarily stress the cluster.

Setting `target_size_bytes` tells the autoscaler the expected maximum size of the pool, allowing it to pre-provision the right number of PGs before data arrives. This prevents disruptive PG splits as the pool grows.

## Setting target_size_bytes on a Pool

From the Rook toolbox, set the target size in bytes:

```bash
# 1 TiB = 1099511627776 bytes
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set mypool target_size_bytes 1099511627776

# 500 GiB pool
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set mypool target_size_bytes 536870912000
```

## Configuring in Rook CephBlockPool

Set `target_size_bytes` declaratively in the pool spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: database-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  parameters:
    pg_autoscale_mode: "on"
    target_size_bytes: "1099511627776"
```

## Verifying the Configuration

Check the autoscaler's view of the pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool autoscale-status
```

The `TARGET SIZE` column should show the configured target, and `NEW PG_NUM` reflects the recommendation based on that target.

## Choosing target_size_bytes Values

Guidelines for setting the target:

```text
Small pool (< 100 GB)   : set target to 200 GB
Medium pool (100 GB - 1 TB): set target to 2x expected maximum
Large pool (> 1 TB)     : set target to 1.5x current capacity
```

Overestimating is safe - extra PGs consume memory but don't cause data issues. Underestimating causes PG splits when the pool outgrows the target.

## Using Human-Readable Units via CLI

The Ceph CLI also accepts human-readable sizes with `target_size_ratio` (fraction of cluster), but for absolute sizing, use bytes directly:

```bash
# Calculate bytes for common sizes
python3 -c "print(int(2 * 1024**4))"  # 2 TiB in bytes
# Output: 2199023255552
```

## Clearing the Target

Remove the target size hint to return to autoscaler default behavior:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set mypool target_size_bytes 0
```

## Combining with target_size_ratio

If you prefer relative sizing, use `target_size_ratio` instead:

```bash
# Allocate PGs as if this pool will use 20% of cluster capacity
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set mypool target_size_ratio 0.2
```

Do not set both `target_size_bytes` and `target_size_ratio` on the same pool. Ceph will generate a `POOL_HAS_TARGET_SIZE_BYTES_AND_RATIO` health warning if both are configured. Use one or the other.

## Summary

`target_size_bytes` provides the PG autoscaler with expected pool capacity, enabling it to pre-provision optimal PG counts before data arrives. Set it during pool creation for pools with known capacity requirements. Configure it in the Rook `CephBlockPool` spec for declarative management. Use `ceph osd pool autoscale-status` to verify the autoscaler is using your target correctly.
