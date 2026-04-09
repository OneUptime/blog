# How to Query Stuck PGs with ceph pg dump_stuck

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Placement Group, Diagnostic, Troubleshooting

Description: Learn how to use ceph pg dump_stuck to identify Placement Groups that are not making progress in Ceph, enabling targeted troubleshooting in Rook clusters.

---

## What Is ceph pg dump_stuck?

`ceph pg dump_stuck` is a focused diagnostic command that lists only Placement Groups that have been in a problematic state longer than a configurable threshold. Unlike `ceph pg dump` which outputs all PGs, `dump_stuck` filters to only the problematic ones, making troubleshooting much faster in large clusters.

A PG is considered "stuck" when it remains in a non-clean state beyond a configurable time threshold without making progress. The threshold is controlled by the `mon_pg_stuck_threshold` configuration option and defaults to 300 seconds when not overridden on the command line.

## Running dump_stuck

From the Rook toolbox, run without arguments to see stuck unclean PGs (the default type):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump_stuck
```

## Filtering by State

Query stuck PGs in a specific state:

```bash
# Stuck inactive PGs (not serving I/O at all)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump_stuck inactive

# Stuck unclean PGs (recovery not completing)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump_stuck unclean

# Stuck stale PGs (primary OSD not reporting)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump_stuck stale

# Stuck undersized PGs (fewer replicas than size setting)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump_stuck undersized

# Stuck degraded PGs (fewer copies than pool size)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump_stuck degraded
```

## Adjusting the Stuck Threshold

By default, PGs must be stuck for 300 seconds to appear in `dump_stuck`. Lower the threshold to find recently stuck PGs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump_stuck -t 60
```

This shows PGs stuck for more than 60 seconds.

## Understanding the Output

A typical `dump_stuck` output row:

```text
13.2a     active+undersized+degraded  [3,7,1]    3   [3,7]   3
```

Columns:
- `13.2a` - PG ID (pool 13, PG number 0x2a)
- `active+undersized+degraded` - current state
- `[3,7,1]` - up set (desired OSD IDs)
- `3` - up primary OSD ID
- `[3,7]` - acting set (current OSD IDs serving I/O)
- `3` - acting primary OSD ID

## Investigating a Specific Stuck PG

Get detailed diagnostics for a stuck PG:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg 13.2a query
```

The output shows the full PG state history including when it entered the current state and what blocking conditions exist.

## Automating Stuck PG Monitoring

Create a simple monitoring script:

```bash
#!/bin/bash
STUCK=$(kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump_stuck 2>/dev/null | grep -v "ok" | wc -l)
echo "Stuck PGs: $STUCK"
if [ "$STUCK" -gt 0 ]; then
  echo "WARNING: $STUCK PGs are stuck"
  kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
    ceph pg dump_stuck 2>/dev/null
fi
```

## Resolving Common Stuck States

For stuck stale PGs, restart the associated OSD:

```bash
# Find the OSD responsible for the stuck PG
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg 13.2a query | grep primary

# Restart the OSD pod
kubectl -n rook-ceph delete pod rook-ceph-osd-<id>-<suffix>
```

## Summary

`ceph pg dump_stuck` is the go-to command for identifying Placement Groups that are not making progress. Filter by state (inactive, unclean, stale, undersized, degraded) to focus troubleshooting. Use the `-t` flag to adjust the stuck threshold. Follow up with `ceph pg <pgid> query` on individual PGs to get root cause details before taking remediation action.
