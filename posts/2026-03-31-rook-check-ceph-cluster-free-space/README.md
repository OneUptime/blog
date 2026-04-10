# How to Check Ceph Cluster Free Space Quickly

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Capacity, Monitoring, Storage, CLI

Description: Learn the quickest CLI commands to check Ceph cluster free space, raw capacity, and per-pool usage to avoid running out of storage.

---

## Why Monitor Free Space?

Ceph clusters become unstable when they approach capacity. At 85% full (`nearfull` ratio), Ceph warns. At 95% (`full` ratio), writes are blocked. Proactively monitoring free space prevents unplanned outages.

## Quickest Check: `ceph df`

The fastest way to see cluster and pool capacity:

```bash
ceph df
```

Sample output:

```text
--- RAW STORAGE ---
CLASS  SIZE     AVAIL    USED     RAW USED  %RAW USED
hdd    100 TiB  73 TiB   27 TiB  27 TiB    27.00
TOTAL  100 TiB  73 TiB   27 TiB  27 TiB    27.00

--- POOLS ---
POOL              ID  PGS  STORED  OBJECTS  USED    %USED  MAX AVAIL
device_health     1   1    0 B     0        0 B     0      24 TiB
replicapool       2   128  5.8 TiB 1.5M     17 TiB  24.7   24 TiB
```

`MAX AVAIL` per pool accounts for the replication factor. A 3-replica pool on 100 TiB raw gives roughly 33 TiB of usable space.

## Compact One-Line Summary

```bash
ceph status | grep -E "usage|avail"
```

## Raw Capacity Detail

For raw numbers including per-device-class breakdown:

```bash
ceph df detail
```

This includes:

- `DIRTY` - data not yet flushed from cache
- `USED` - actual used bytes including replica overhead

## Checking Individual OSD Free Space

```bash
ceph osd df
```

Output per OSD includes utilization percentage and variance. OSDs over 85% are highlighted.

For a tree view showing utilization by host:

```bash
ceph osd df tree
```

## Threshold Configuration

Check your current nearfull and full ratios:

```bash
ceph osd dump | grep -E "full_ratio|nearfull_ratio|backfillfull_ratio"
```

Adjust if needed (not recommended below defaults):

```bash
ceph osd set-nearfull-ratio 0.80
ceph osd set-full-ratio 0.90
```

## Alerting with Prometheus

If the Prometheus MGR module is enabled, use this query to alert when free space is low:

```promql
(ceph_cluster_total_bytes - ceph_cluster_total_used_bytes) / ceph_cluster_total_bytes < 0.20
```

This fires when less than 20% of raw capacity remains.

## Summary

Use `ceph df` for a fast overview of cluster and pool capacity, `ceph osd df` for per-OSD utilization, and `ceph status` for a compact one-line summary. Monitor the nearfull and full ratio thresholds proactively and set up Prometheus alerts to catch capacity issues before writes are blocked.
