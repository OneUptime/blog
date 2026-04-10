# How to Check OSD Utilization and Variance in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OSD, Utilization, Balancing, Performance

Description: Measure OSD utilization and variance in Ceph to identify imbalanced OSDs, diagnose hotspots, and determine whether rebalancing is needed.

---

## Why Variance Matters

Ceph distributes data using CRUSH, which aims for uniform distribution. However, differences in OSD capacity, CRUSH weight misconfiguration, or insufficient PGs can cause variance - some OSDs become much fuller than others. High-variance clusters waste capacity and create premature nearfull conditions on some OSDs.

## Checking Utilization with `ceph osd df`

```bash
ceph osd df
```

Key columns:

| Column | Description |
|--------|-------------|
| `SIZE` | Raw capacity of the OSD |
| `AVAIL` | Free space |
| `%USE` | Percentage used |
| `VAR` | Variance relative to the cluster average |

The `VAR` column is the most important. A value of `1.0` means the OSD matches the cluster average. Values above `1.2` or below `0.8` indicate significant imbalance.

## Checking Overall Variance

The last line of `ceph osd df` shows the total and average:

```text
TOTAL  100 TiB  73 TiB  27 TiB  27.00  MIN/MAX VAR: 0.78/1.32
```

`MIN/MAX VAR` shows the range. Ideally this should be within 0.9-1.1.

## Sorting by Utilization

Find the most overloaded OSDs:

```bash
ceph osd df | sort -k7 -n -r | head -10
```

## Checking CRUSH Weights

Unequal OSD weights cause unequal distribution. Verify weights match disk sizes:

```bash
ceph osd tree | grep -E "osd\.|host"
```

Set the correct weight for an OSD (weight in TiB):

```bash
ceph osd crush reweight osd.5 3.6
```

## Reweighting Based on Utilization

Ceph provides a utility to automatically adjust weights based on actual usage:

```bash
ceph osd reweight-by-utilization
```

Preview the changes without applying:

```bash
ceph osd test-reweight-by-utilization 120 0.01 5 --no-increasing
```

Arguments:
- `120` - threshold percentage above average to trigger reweight
- `0.01` - maximum reweight step per iteration
- `5` - maximum number of OSDs to reweight

## Enabling the Balancer

For sustained automatic rebalancing:

```bash
ceph balancer on
ceph balancer mode upmap
ceph balancer status
```

## Summary

Check OSD utilization variance with `ceph osd df`, focusing on the `VAR` column and the `MIN/MAX VAR` summary line. Use `ceph osd crush reweight` to correct weight mismatches and `ceph osd reweight-by-utilization` for automatic corrections. Enable the upmap balancer for ongoing distribution optimization.
