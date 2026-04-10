# How to Set Up Automatic PG Rebalancing in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, PG Autoscaler, Rebalancing, Performance

Description: Learn how to enable and configure Ceph's pg_autoscaler module to automatically adjust placement group counts as cluster usage changes.

---

Placement groups (PGs) are the fundamental unit of data distribution in Ceph. Having too few PGs limits parallelism and performance; too many wastes memory. The pg_autoscaler module monitors pool sizes and adjusts PG counts automatically.

## Why PG Count Matters

Each OSD can efficiently handle 100-200 PGs. The recommended PG count for a pool is:

```text
PGs = (OSDs * 100) / Replicas
```

For a cluster with 30 OSDs and 3-way replication: `30 * 100 / 3 = 1000 PGs`

## Enabling the PG Autoscaler

```bash
ceph mgr module enable pg_autoscaler
ceph config set global osd_pool_default_pg_autoscale_mode on
```

Check status:

```bash
ceph osd pool autoscale-status
```

## Autoscaler Modes

| Mode | Behavior |
|------|----------|
| `off` | No autoscaling |
| `warn` | Warns but does not change PGs |
| `on` | Automatically adjusts PG count |

Set per-pool mode:

```bash
ceph osd pool set mypool pg_autoscale_mode on
ceph osd pool set archive-pool pg_autoscale_mode warn
```

## Configuring Autoscaler Target Ratio

Tell the autoscaler how much of the cluster each pool should use:

```bash
# Pool should use 30% of total cluster storage
ceph osd pool set mypool target_size_ratio 0.3

# Or set absolute target size
ceph osd pool set mypool target_size_bytes 1099511627776  # 1 TB
```

## Viewing Autoscaler Recommendations

```bash
ceph osd pool autoscale-status --format json | python3 -m json.tool
```

Example output:

```json
[
  {
    "pool_name": "mypool",
    "pg_autoscale_mode": "on",
    "pg_num_target": 32,
    "pg_num_final": 64,
    "would_adjust": true
  }
]
```

## Setting Global Autoscaler Behavior

```bash
# Target number of PGs per OSD (default 100)
ceph config set global mon_target_pg_per_osd 100

# Bias pools toward more PGs
ceph osd pool set mypool pg_autoscale_bias 1.5
```

## Manual PG Count Adjustment

If you prefer to manage PGs manually:

```bash
ceph osd pool set mypool pg_autoscale_mode off

# Increase PG count
ceph osd pool set mypool pg_num 128
ceph osd pool set mypool pgp_num 128
```

Wait for PG splitting to complete before changing again:

```bash
watch 'ceph -s | grep remapped'
```

## In Rook CephBlockPool

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: mypool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  parameters:
    pg_autoscale_mode: "on"
    target_size_ratio: "0.3"
```

## Summary

The Ceph pg_autoscaler eliminates the need for manual PG count management by continuously monitoring pool sizes and usage ratios. Enabling it globally and setting per-pool target ratios gives the autoscaler enough information to make good decisions. For pools with highly variable growth, combining autoscaling with target_size_ratio ensures PG counts always match actual data distribution needs.
