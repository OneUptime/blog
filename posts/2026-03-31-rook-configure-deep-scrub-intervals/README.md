# How to Configure Deep Scrubbing Intervals in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Deep Scrub, Data Integrity, Kubernetes, OSD

Description: Learn how to configure Ceph deep scrubbing intervals to verify full data block integrity while managing the significant I/O impact of reading all object data from disk.

---

## What is Deep Scrubbing?

Deep scrubbing goes beyond shallow scrubbing by reading the actual data of every object from disk and recomputing checksums to verify bit-level data integrity. This detects silent data corruption that wouldn't be caught by metadata-only shallow scrubs.

Deep scrubbing is significantly more I/O intensive than shallow scrubbing because it reads every byte of stored data from disk. By default, Ceph performs a deep scrub on each PG approximately once per week.

## Default Deep Scrub Configuration

| Parameter | Default | Description |
|---|---|---|
| `osd_deep_scrub_interval` | 604800 (7 days) | Target interval between deep scrubs |
| `osd_scrub_min_interval` | 86400 (1 day) | Minimum wait before any scrub |
| `osd_deep_scrub_randomize_ratio` | 0.15 | Ratio of shallow scrubs randomly promoted to deep scrubs |

## Checking Deep Scrub Status

```bash
# Check when PGs were last deep scrubbed
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump | awk '{print $1, $15}' | sort -k2 | head -20

# Health check for overdue deep scrubs
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph health detail | grep "deep"
```

## Configuring Deep Scrub Intervals

Adjust the deep scrub interval:

```bash
# Set deep scrub interval to 14 days (for lower-priority clusters)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_deep_scrub_interval 1209600

# Verify the setting
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get osd osd_deep_scrub_interval
```

For higher-compliance environments, increase the frequency:

```bash
# Deep scrub every 3 days
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_deep_scrub_interval 259200
```

## Limiting Deep Scrub I/O Impact

Deep scrubs can significantly impact cluster performance. Throttle them:

```bash
# Add sleep between scrub chunk operations (applies to both shallow and deep scrubs)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_scrub_sleep 0.5

# Set a maximum I/O rate for scrubbing
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_scrub_chunk_max 25

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_scrub_chunk_min 5
```

## Restricting Deep Scrubs to Off-Peak Hours

```bash
# Only allow deep scrubs from 11 PM to 5 AM
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_scrub_begin_hour 23

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_scrub_end_hour 5

# The same begin/end hours apply to both shallow and deep scrubs
```

## Triggering an Immediate Deep Scrub

Force a deep scrub on a specific pool:

```bash
# Deep scrub a specific pool immediately
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool deep-scrub my-pool

# Or scrub a specific PG
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg deep-scrub 1.0
```

## Monitoring Deep Scrub Progress

```bash
# Check progress in ceph status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph status | grep "scrub"

# View detailed scrub queue
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump | grep "scrubbing"
```

## Summary

Deep scrubbing is essential for catching silent data corruption in Ceph clusters, but its full-data-read approach creates significant I/O pressure. Configure intervals based on your compliance requirements and hardware capabilities - typically weekly for production clusters. Use `osd_scrub_sleep` to throttle impact, restrict scrubbing to off-peak hours, and monitor that PGs complete deep scrubs within the configured maximum interval to avoid health warnings.
