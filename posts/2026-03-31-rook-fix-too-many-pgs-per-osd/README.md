# How to Fix Too Many PGs Per OSD Warning in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Placement Group, OSD, Performance

Description: Learn how to diagnose and fix the HEALTH_WARN TOO_MANY_PGS warning in Ceph, which indicates excessive Placement Groups per OSD degrading performance.

---

## Understanding the TOO_MANY_PGS Warning

Ceph recommends keeping PGs per OSD between 100 and 200. When the ratio exceeds a configurable threshold (default: 300 PGs per OSD), the cluster emits a `HEALTH_WARN` with `TOO_MANY_PGS`. Each PG consumes memory (typically a few megabytes per PG per OSD, varying with object count) and CPU resources for tracking. Excessive PGs cause:

- Higher memory consumption on all OSDs
- Slower recovery times
- Increased CPU overhead for PG state management

## Diagnosing the Problem

Check the current warning:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph health detail
```

View PGs per OSD (check the `PGS` column in the output):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd df
```

List all pools and their PG counts:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool ls

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool ls detail | grep pg_num
```

## Solution 1 - Enable PG Autoscaling

Let Ceph automatically reduce PG counts:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set replicapool pg_autoscale_mode on
```

The autoscaler will merge PGs when it detects pools are over-provisioned.

## Solution 2 - Manually Reduce pg_num

For a specific over-provisioned pool:

```bash
# First check current count
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool get replicapool pg_num

# Reduce pg_num (Ceph merges PGs automatically)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set replicapool pg_num 64
```

Note: `pg_num` can be decreased since Nautilus (14.2.x). Wait for PG merging to complete before further reduction.

## Solution 3 - Delete Unused Pools

Identify pools with no data that are consuming unnecessary PGs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph df detail | grep -E "POOL|bytes"
```

Delete empty pools to free PG slots:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool delete unused-pool unused-pool --yes-i-really-really-mean-it
```

## Solution 4 - Adjust the Warning Threshold

If your cluster intentionally has more PGs (e.g., a large number of OSDs), raise the threshold:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global mon_max_pg_per_osd 350
```

## Verifying Resolution

After reducing PG counts, confirm the warning clears:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  watch ceph health
```

## Summary

The `TOO_MANY_PGS` warning indicates that pools have more PGs than optimal for the current OSD count. Enable PG autoscaling to let Ceph self-correct, or manually reduce `pg_num` on over-provisioned pools. Delete empty pools that consume PG slots without storing data. Target 100-200 PGs per OSD for optimal performance.
