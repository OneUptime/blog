# How to Monitor Ceph OSDs and Placement Groups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Placement Group, Monitoring

Description: Learn how to monitor OSD health, usage, and placement group states in a Ceph cluster using CLI commands from the Rook toolbox.

---

## Monitoring OSD Health

Start with a high-level OSD overview:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat
```

Example output:

```text
12 osds: 12 up (since 2h), 12 in (since 2d)
```

View the OSD tree to see topology and weights:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
```

This shows which OSDs are on which hosts, their weights, and up/in status.

## OSD Utilization

Check individual OSD utilization and data distribution:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd df
```

The output shows each OSD's used space, available space, utilization percentage, and variance. High variance (above 10-15%) indicates uneven data distribution and may require rebalancing.

Check cluster-wide utilization:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd df tree
```

## OSD Performance Metrics

Latency statistics per OSD:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd perf
```

Output columns:
- `commit_latency_ms` - journal/WAL commit latency
- `apply_latency_ms` - time for data to reach the backing store

High latency (above 50ms consistently) suggests I/O bottlenecks.

## Monitoring Placement Groups

View overall PG status:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg stat
```

List all PGs with their states:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg ls
```

List PGs on a specific OSD:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg ls-by-osd 0
```

## Investigating Stuck PGs

If PGs are stuck in a non-clean state, get details:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg dump stuck
```

Investigate a specific PG:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg 1.2f query
```

The output shows acting OSDs, peering history, and blocking reasons.

## Scrub Monitoring

Check when pools were last scrubbed:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump | grep -E "pgid|last_scrub" | head -20
```

Trigger a manual scrub on a specific PG:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg scrub 1.2f
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg deep-scrub 1.2f
```

## OSD Out Events and CRUSH Rebalancing

Monitor OSD status changes in the cluster log:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph log last 100 | grep "osd"
```

Watch for recovery progress:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph -w | grep -E "recovery|degraded|misplaced"
```

## Summary

Monitoring Ceph OSDs and placement groups requires checking OSD health via `ceph osd stat` and `ceph osd df`, inspecting placement group states with `ceph pg stat` and `ceph pg ls`, and tracking performance latency with `ceph osd perf`. Investigate stuck PGs using `ceph pg dump stuck` and `ceph pg <id> query` for root cause analysis.
