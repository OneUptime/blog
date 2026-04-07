# How to Understand PG Splitting in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Placement Group, Architecture, Performance

Description: Understand how PG splitting works in Ceph when pg_num increases, including the impact on performance and how to manage splits in Rook clusters.

---

## What Is PG Splitting?

When a Ceph pool's `pg_num` increases (either manually or via autoscaling), existing PGs are split into smaller PGs through a process called PG splitting. Each existing PG is divided into two child PGs, and the objects it contained are redistributed between them. PG splitting allows Ceph to use more OSDs for data distribution and improves parallel I/O performance for growing pools.

PG splitting is the opposite of PG merging, which occurs when `pg_num` decreases.

## How Splitting Works Internally

When `pg_num` is doubled (e.g., from 64 to 128):

1. New PG IDs are allocated (1.0 splits into 1.0 and 1.40, since PG ID 64 = 0x40 in hex)
2. Each existing primary OSD splits its PG into two
3. Objects are redistributed based on the new CRUSH mapping
4. Replicas are synchronized to secondary OSDs
5. The split is acknowledged to monitors when complete

## Triggering a PG Split

Manually increase `pg_num` to trigger splits:

```bash
# Check current pg_num
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool get mypool pg_num

# Double the PG count
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set mypool pg_num 128

# pgp_num controls actual placement - increase after pg_num
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set mypool pgp_num 128
```

**Important**: Always increase `pg_num` before `pgp_num`. Setting `pgp_num` equal to `pg_num` triggers data movement. Keeping `pgp_num` at the old value temporarily pauses movement while `pg_num` increases.

## Monitoring Split Progress

Watch the split progress:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  watch -n 5 "ceph pg stat"

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph status | grep -E "splitting|peering|active"
```

PGs temporarily enter `splitting` or `peering` states during the process.

## Performance Impact During Splits

PG splitting causes temporary I/O overhead as OSDs:
- Rebuild PG data structures
- Verify object placement
- Synchronize with replicas

To minimize client impact, split during low-traffic periods and throttle recovery:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_max_backfills 1
```

## Incremental Splitting

Split incrementally rather than jumping to the final `pg_num` all at once. Each doubling should complete before the next:

```bash
# Stage 1: 64 to 128
ceph osd pool set mypool pg_num 128
# Wait for completion...
ceph osd pool set mypool pgp_num 128

# Stage 2: 128 to 256 (if needed)
ceph osd pool set mypool pg_num 256
# Wait...
ceph osd pool set mypool pgp_num 256
```

## Autoscaler-Triggered Splits

When `pg_autoscale_mode=on`, Ceph triggers splits automatically. View pending splits:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool autoscale-status | grep -v "^$"
```

## Summary

PG splitting redistributes objects across more PGs as a pool grows, improving data distribution and parallel I/O. Always increase `pg_num` before `pgp_num` to control when data movement occurs. Split incrementally in powers of two and monitor completion between stages. PG autoscaling handles splitting automatically when enabled, making manual management unnecessary for most production pools.
