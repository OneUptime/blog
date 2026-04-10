# How to Configure pg_num_min and pg_num_max Bounds in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Placement Group, Autoscaling, Pool

Description: Learn how to set pg_num_min and pg_num_max bounds on Ceph pools to constrain PG autoscaling within acceptable limits for your workloads.

---

## Why Bound PG Autoscaling?

The Ceph PG autoscaler is powerful, but unrestricted autoscaling can cause problems:

- **Too few PGs**: A pool that starts empty might get 1 PG, causing all data to land on a single OSD when first written
- **Too many PGs**: A suddenly large pool might get thousands of PGs, overwhelming OSD memory
- **Disruptive splits**: Frequent PG splits during rapid growth can cause temporary performance degradation

`pg_num_min` and `pg_num_max` set floor and ceiling values that the autoscaler respects, giving you control over the autoscaling range.

## Setting pg_num_min

Set a minimum PG count to ensure adequate distribution even for empty pools:

```bash
# Minimum 32 PGs even when pool is empty
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set mypool pg_num_min 32
```

This is especially important for pools that receive large write bursts at startup.

## Setting pg_num_max

Set a maximum PG count to prevent excessive memory consumption:

```bash
# Maximum 512 PGs regardless of data volume
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set mypool pg_num_max 512
```

## Configuring Bounds in Rook CephBlockPool

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: bounded-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  parameters:
    pg_autoscale_mode: "on"
    pg_num_min: "32"
    pg_num_max: "256"
    target_size_ratio: "0.3"
```

## Recommended Bounds by Use Case

For a production RBD pool on a 12-OSD cluster:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set rbd pg_num_min 64

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set rbd pg_num_max 512
```

For a small metadata pool (CephFS .meta):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set cephfs_metadata pg_num_min 16

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set cephfs_metadata pg_num_max 64
```

## Verifying Bounds

Check configured bounds:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool get mypool pg_num_min

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool get mypool pg_num_max
```

View autoscaler status to confirm bounds are being respected:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool autoscale-status
```

The `NEW PG_NUM` value should always be within your configured bounds.

## Clearing Bounds

Remove bounds to allow unrestricted autoscaling:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set mypool pg_num_min 0

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set mypool pg_num_max 0
```

Setting `pg_num_min` to 0 removes the lower bound, and setting `pg_num_max` to 0 removes the upper bound.

## Summary

`pg_num_min` and `pg_num_max` provide guardrails for the PG autoscaler. Set `pg_num_min` to ensure new pools start with adequate distribution, and `pg_num_max` to prevent memory exhaustion from excessive PGs. Configure these bounds in the Rook `CephBlockPool` CRD alongside `pg_autoscale_mode` for complete autoscaling control.
