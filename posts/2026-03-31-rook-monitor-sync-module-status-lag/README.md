# How to Monitor Sync Module Status and Lag

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Sync, Monitoring

Description: Learn how to monitor Ceph RGW sync module status and measure replication lag to ensure data is flowing reliably between zones and external systems.

---

## Overview

Monitoring sync module health is critical to ensuring data reaches its destination - whether a secondary Ceph zone, Elasticsearch, or a cloud storage provider. Ceph provides multiple mechanisms to inspect sync state: the `radosgw-admin sync status` command, Prometheus metrics, and the sync error log. This guide covers all three approaches.

## Step 1 - Basic Sync Status Check

```bash
# Get overall sync status
radosgw-admin sync status

# Example output:
# realm: myrealm
# zonegroup: default
# zone: secondary-zone
#           realm id: abc123
#   zonegroup status:
#     bucket sync: ok
#     data sync: source: primary-zone
#                          full sync: 0/128 shards
#                          incremental sync: 128/128 shards
#                          data is caught up with source

# Check sync status for a specific bucket
radosgw-admin bucket sync status \
  --bucket=mybucket \
  --source-zone=primary-zone
```

## Step 2 - Measure Sync Lag Per Shard

```bash
# Check per-shard sync positions (output is human-readable text)
radosgw-admin data sync status --source-zone=primary-zone

# Get detailed shard-level status for the local zone
radosgw-admin datalog status

# Compare positions between source and destination
PRIMARY_POS=$(radosgw-admin datalog list --shard-id=0 \
  --max-entries=1 | jq -r '.[0].id')
SYNC_POS=$(radosgw-admin sync status 2>&1 | grep "shard 0" | awk '{print $NF}')
echo "Primary: ${PRIMARY_POS}, Sync: ${SYNC_POS}"
```

## Step 3 - Monitor via Prometheus Metrics

Enable and scrape RGW Prometheus metrics:

```bash
# Verify the Prometheus endpoint (metrics exposed by the Ceph MGR Prometheus module)
curl -s http://rgw.example.com:9283/metrics | grep -E "ceph_data_sync|ceph_rgw"

# Key sync metrics (where <zone> is the source zone name):
# ceph_data_sync_from_<zone>_fetch_bytes_sum - total bytes fetched from source zone
# ceph_data_sync_from_<zone>_fetch_errors - number of fetch errors during sync
# ceph_data_sync_from_<zone>_poll_latency_sum - sync polling latency

# Create a Prometheus scrape config
```

```yaml
# prometheus-scrape-config.yaml
scrape_configs:
  - job_name: ceph-rgw-sync
    static_configs:
      - targets:
          - rgw-primary.example.com:9283
          - rgw-secondary.example.com:9283
    metric_relabel_configs:
      - source_labels: [__name__]
        regex: "ceph_data_sync.*"
        action: keep
```

## Step 4 - Create Grafana Alerts for Sync Lag

```yaml
# Prometheus alerting rules for sync lag
groups:
  - name: ceph-sync-alerts
    rules:
      - alert: CephRGWSyncFetchErrors
        expr: increase(ceph_data_sync_from_primary_zone_fetch_errors[15m]) > 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Ceph RGW sync fetch errors detected ({{ $value }} new errors)"
          description: "The sync module encountered fetch errors replicating from the source zone."

      - alert: CephRGWSyncHighPollLatency
        expr: rate(ceph_data_sync_from_primary_zone_poll_latency_sum[5m]) / rate(ceph_data_sync_from_primary_zone_poll_latency_count[5m]) > 5
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Ceph RGW sync poll latency is high ({{ $value }}s)"
```

## Step 5 - Monitor Sync Errors

```bash
# List recent sync errors
radosgw-admin sync error list --max-entries=50 \
  | jq '.[] | {timestamp, source_zone, key, error_code, error_message}'

# Count errors by type
radosgw-admin sync error list --max-entries=100 \
  | jq 'group_by(.error_code) | map({error: .[0].error_code, count: length})'

# Trim sync errors older than 7 days
radosgw-admin sync error trim --end-date=$(date -d '7 days ago' +%Y-%m-%d)
```

## Step 6 - Automate Sync Health Checks

```bash
#!/bin/bash
# ceph-sync-healthcheck.sh

ZONE=$1
ALERT_THRESHOLD=5000

# Get number of objects behind
BEHIND=$(radosgw-admin sync status --rgw-zone=${ZONE} 2>&1 \
  | grep "behind" | awk '{sum += $1} END {print sum}')

# Get error count
ERRORS=$(radosgw-admin sync error list --max-entries=1000 2>/dev/null \
  | jq 'length')

echo "Zone: ${ZONE}"
echo "Objects behind: ${BEHIND:-0}"
echo "Sync errors: ${ERRORS:-0}"

if [ "${BEHIND:-0}" -gt "${ALERT_THRESHOLD}" ]; then
  echo "ALERT: Sync lag exceeds threshold (${BEHIND} > ${ALERT_THRESHOLD})"
  curl -X POST "https://hooks.slack.com/services/xxx/yyy/zzz" \
    -d "{\"text\":\"Ceph sync lag alert: ${BEHIND} objects behind in zone ${ZONE}\"}"
fi
```

```bash
# Add to crontab (preserving existing entries)
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/ceph-sync-healthcheck.sh secondary-zone") | crontab -
```

## Summary

Monitoring Ceph RGW sync module status requires combining `radosgw-admin sync status` for real-time visibility, Prometheus metrics for time-series trending, and sync error logs for failure diagnosis. Automating health checks with threshold-based alerting ensures the operations team is notified promptly when sync falls behind or accumulates errors that need manual intervention.
