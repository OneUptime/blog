# How to Configure Scrub Settings for Maximum Data Integrity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Scrubbing, OSD, Data Integrity

Description: Learn how to tune Ceph scrub settings to maximize data integrity while minimizing the performance impact of scrub operations on your production cluster.

---

Ceph's scrubbing system is your primary defense against silent data corruption. Proper configuration ensures scrubs run frequently enough to catch problems early while not overwhelming your cluster with I/O overhead.

## Understanding Scrub Parameters

Ceph provides fine-grained control over when and how scrubs run:

| Parameter | Default | Description |
|-----------|---------|-------------|
| osd_scrub_min_interval | 86400 | Min seconds between scrubs |
| osd_scrub_max_interval | 604800 | Max before forced scrub |
| osd_deep_scrub_interval | 604800 | Interval for deep scrubs |
| osd_scrub_sleep | 0 | Pause between scrub chunks |
| osd_scrub_chunk_max | 25 | Max objects per scrub chunk |
| osd_scrub_load_threshold | 0.5 | Max load before scrub skips |

## Setting Scrub Frequency

For maximum integrity, run deep scrubs more frequently on critical pools:

```bash
# Set globally
ceph config set osd osd_scrub_min_interval 43200
ceph config set osd osd_scrub_max_interval 86400
ceph config set osd osd_deep_scrub_interval 259200
```

For a specific pool:

```bash
ceph osd pool set critical-pool scrub_min_interval 43200
ceph osd pool set critical-pool deep_scrub_interval 259200
```

## Controlling Scrub Timing Windows

Restrict scrubs to off-peak hours to reduce impact:

```bash
ceph config set osd osd_scrub_begin_hour 22
ceph config set osd osd_scrub_end_hour 6
ceph config set osd osd_scrub_begin_week_day 1
ceph config set osd osd_scrub_end_week_day 5
```

This limits scrubs to between 10 PM and 6 AM, weekdays only.

## Reducing Scrub I/O Impact

For busy clusters, throttle scrub aggressiveness:

```bash
# Add sleep between chunks to reduce I/O pressure
ceph config set osd osd_scrub_sleep 0.1

# Reduce chunk size
ceph config set osd osd_scrub_chunk_max 10
ceph config set osd osd_scrub_chunk_min 1

# Lower max scrub priority relative to client I/O
ceph config set osd osd_requested_scrub_priority 5
```

## Prioritizing Scrubs for High-Value Data

Mark pools as high-priority for scrubbing:

```bash
ceph osd pool set database-pool scrub_priority 10
ceph osd pool set archive-pool scrub_priority 1
```

## Checking Scrub Status Across All PGs

```bash
# See last scrub time per PG
ceph pg dump | awk 'NR>1 && /^[0-9]/ {print $1, $18, $19}'

# Count PGs due for deep scrub
ceph pg dump | awk 'NR>1 && /^[0-9]/ {
  if (systime() - $19 > 604800) count++
} END {print count " PGs need deep scrub"}'
```

## Forcing Scrubs When Needed

```bash
# Force scrub on all PGs in a pool
ceph osd pool scrub mypool

# Force deep scrub
ceph osd pool deep-scrub mypool
```

## Alerting on Overdue Scrubs

Configure Prometheus alerts via Rook:

```yaml
groups:
- name: ceph-scrub
  rules:
  - alert: CephPGNotDeepScrubbedRecently
    expr: ceph_pg_last_deep_scrub_stamp < (time() - 7 * 24 * 3600)
    for: 1h
    labels:
      severity: warning
    annotations:
      summary: "Ceph PG not deep-scrubbed in 7 days"
```

## Summary

Configuring scrub settings correctly is key to maximizing data integrity in Ceph. Reducing scrub intervals for critical pools, restricting scrubs to maintenance windows, throttling scrub I/O, and alerting on overdue scrubs creates a balanced approach that protects data without disrupting production workloads.
