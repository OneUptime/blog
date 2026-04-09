# How to Get PG Information with ceph pg dump

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Placement Group, Diagnostic, Administration

Description: Learn how to use ceph pg dump to retrieve detailed Placement Group information for diagnostics and capacity planning in Rook clusters.

---

## What Is ceph pg dump?

`ceph pg dump` is a comprehensive command that outputs the full state of all Placement Groups in the cluster. The output includes PG state, OSD mapping, object counts, data sizes, scrub timestamps, and statistical information. It is the primary tool for deep PG-level diagnostics in Ceph.

## Basic pg dump Usage

From the Rook toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump
```

The output is large for clusters with many PGs. Filter with standard Unix tools:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump 2>/dev/null | grep "active+clean" | wc -l
```

## Dumping in JSON Format

For programmatic processing:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump --format json 2>/dev/null | python3 -m json.tool | head -100
```

## Dumping Summary Statistics

Get just the summary without per-PG detail:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump pgs_brief
```

Or the summary section only:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump summary
```

## Finding PGs in Specific States

Filter for PGs in non-clean states:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump 2>/dev/null | grep -v "active+clean" | grep -v "^$" | grep -v "^version" | head -30
```

## Extracting Pool-Level Statistics from pg dump

Get per-pool PG statistics:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump pools 2>/dev/null
```

This shows aggregate statistics per pool including object counts, bytes used, and read/write operations.

## Checking Object Count and Size per PG

Extract object count and size for each PG:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump 2>/dev/null | \
  awk 'NF>10 {print $1, "objects:", $10, "bytes:", $11}' | \
  sort -k4 -rn | head -20
```

## Checking Last Scrub Times

Find PGs that have not been scrubbed recently:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump 2>/dev/null | \
  awk '{print $1, $18}' | sort -k2 | head -20
```

## Using pg dump for Capacity Planning

Calculate total logical data per pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump pools --format json 2>/dev/null | \
  python3 -c "import sys,json; \
  [print(p['poolname'], round(p['stat_sum']['num_bytes']/1073741824, 2), 'GB') \
  for p in json.load(sys.stdin)['pool_stats']]"
```

## Summary

`ceph pg dump` provides comprehensive Placement Group state data for diagnostics and capacity planning. Use `pgs_brief` for quick state overviews, `pools` for pool-level aggregates, and `--format json` for programmatic processing. Filter the output with `grep` and `awk` to find PGs in specific states, identify unscrubbed PGs, or analyze data distribution across the cluster.
