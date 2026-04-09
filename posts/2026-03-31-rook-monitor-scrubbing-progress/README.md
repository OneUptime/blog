# How to Monitor Scrubbing Progress in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Scrubbing, Monitoring, Prometheus, Kubernetes, Data Integrity

Description: Learn how to monitor Ceph scrubbing progress, track which PGs have been scrubbed, identify overdue scrubs, and set up alerts for scrubbing health issues.

---

## Why Monitor Scrubbing Progress

Ceph scrubbing is a background process that periodically verifies data integrity. Without monitoring, you might not know that:
- Scrubs are not completing due to restricted time windows
- Specific PGs have not been scrubbed in weeks
- Scrub errors are accumulating silently
- Scrubbing is consuming excessive resources

## Checking Overall Scrub Status

Get a quick overview of scrubbing activity:

```bash
# Check current cluster status for scrubbing info
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph status | grep -E "scrub|pg"

# Check for health warnings related to scrubbing
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph health detail | grep -E "scrub|PG_NOT_SCRUBBED|PG_NOT_DEEP_SCRUBBED"
```

## Identifying Overdue PGs

Find PGs that haven't been scrubbed within the expected interval:

```bash
# List PGs with their last scrub timestamps (using JSON for reliable parsing)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump --format json | jq -r '.pg_stats[] | [.pgid, .last_scrub_stamp, .last_deep_scrub_stamp] | @tsv' | head -30

# Find PGs not scrubbed in the last 7 days
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c '
CUTOFF=$(date -d "7 days ago" +"%Y-%m-%dT%H:%M:%S" 2>/dev/null || date -v-7d +"%Y-%m-%dT%H:%M:%S")
ceph pg dump --format json 2>/dev/null | jq -r --arg cutoff "$CUTOFF" \
  ".pg_stats[] | select(.last_scrub_stamp < \$cutoff) | [.pgid, .last_scrub_stamp] | @tsv"
'
```

## Watching Active Scrubs

Monitor which PGs are currently being scrubbed:

```bash
# Watch for active scrubs
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  watch -n 5 "ceph pg dump | grep -E 'scrubbing|deep'"

# Count currently scrubbing PGs
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump | grep -c "scrubbing"
```

## Prometheus Metrics for Scrubbing

Monitor scrubbing via Prometheus when Rook monitoring is enabled:

Key scrub-related Prometheus metrics:

| Metric | Description |
|---|---|
| `ceph_pg_scrubbing` | Number of PGs currently scrubbing (includes deep scrubs) |
| `ceph_pg_deep` | Number of PGs currently deep scrubbing |
| `ceph_pg_inconsistent` | Number of inconsistent PGs |

Sample PromQL queries:

```promql
# All currently scrubbing PGs (includes both shallow and deep scrubs)
ceph_pg_scrubbing

# Only deep scrubbing PGs
ceph_pg_deep

# Inconsistent PGs alert threshold
ceph_pg_inconsistent > 0
```

## Setting Up Scrub Health Alerts

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ceph-scrub-alerts
  namespace: rook-ceph
spec:
  groups:
  - name: ceph-scrub
    rules:
    - alert: CephPGInconsistent
      expr: ceph_pg_inconsistent > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "{{ $value }} Ceph PGs have scrub inconsistencies"
```

## Generating a Scrub Coverage Report

Track what percentage of PGs have been scrubbed recently:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c '
TOTAL=$(ceph pg dump --format json 2>/dev/null | jq ".pg_stats | length")
echo "Total PGs: $TOTAL"
echo "PGs with overdue scrubs:"
ceph health detail | grep "not scrubbed\|not deep-scrubbed" | wc -l
'
```

## Summary

Monitoring Ceph scrubbing progress requires tracking three dimensions: active scrubs in progress, overdue PGs that need scrubbing, and scrub error/inconsistency counts. Use `ceph health detail` for immediate status and Prometheus metrics for long-term trending. Set up alerts for inconsistent PGs (critical) and scrub errors (warning), and periodically audit your PG scrub timestamps to ensure all PGs are being scrubbed within their configured maximum intervals.
