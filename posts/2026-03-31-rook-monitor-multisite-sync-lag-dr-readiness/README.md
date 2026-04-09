# How to Monitor Multisite Sync Lag for DR Readiness

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Multisite, Sync Lag, DR, Monitoring

Description: Monitor Ceph RGW multisite sync lag using radosgw-admin, Prometheus metrics, and alerting to ensure your secondary zone meets Recovery Point Objective (RPO) targets.

---

## Overview

Sync lag is the most important metric for DR readiness in a Ceph RGW multisite deployment. It represents the maximum data loss you would incur if the primary zone failed right now. Continuously monitoring sync lag ensures your deployment meets its RPO targets.

## Checking Sync Lag with radosgw-admin

```bash
# View overall sync status
radosgw-admin sync status

# The output shows data and metadata sync state including:
# - Current sync epoch
# - Number of shards behind
# - Estimated lag in seconds or object counts
```

Example output:

```text
realm 12345 (production)
    zonegroup 67890 (us)
        period 98765
            zone us-west (secondary)
                data sync source: us-east (primary)
                          full sync: 0/128 shards
                    incremental sync: 128/128 shards
                    data is caught up with source
```

## Measuring Lag in Seconds

```bash
# Write a timestamped probe object on primary
PROBE_TIME=$(date +%s)
echo "$PROBE_TIME" | aws s3 cp - s3://sync-test/probe.txt \
    --endpoint-url http://us-east-rgw.example.com

# Poll secondary until object appears, measure elapsed time
START=$PROBE_TIME
while true; do
    if aws s3 ls s3://sync-test/probe.txt \
        --endpoint-url http://us-west-rgw.example.com > /dev/null 2>&1; then
        LAG=$(($(date +%s) - START))
        echo "Sync lag: ${LAG} seconds"
        break
    fi
    sleep 5
done
```

## Prometheus Metrics for Sync Lag

Enable the Ceph MGR Prometheus module and scrape sync metrics:

```bash
# Enable Prometheus module
ceph mgr module enable prometheus

# Query available RGW sync metrics
curl -s http://$(ceph mgr dump | python3 -c \
    "import sys,json; print(json.load(sys.stdin)['active_addr'].split(':')[0])"):9283/metrics \
    | grep -i "sync\|rgw"
```

PromQL queries for Grafana:

```promql
# Data sync shards behind count
ceph_rgw_data_sync_num_shards_behind

# Metadata sync shards behind
ceph_rgw_metadata_sync_num_shards_behind
```

## Setting Up Alerts

```yaml
# prometheus-ceph-dr-alerts.yml
groups:
  - name: ceph_rgw_dr
    rules:
      - alert: RGWSyncLagCritical
        expr: ceph_rgw_data_sync_num_shards_behind > 50
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "RGW sync lag critical - DR readiness at risk"
          description: "{{ $value }} data sync shards behind. RPO may be exceeded."

      - alert: RGWSyncLagWarning
        expr: ceph_rgw_data_sync_num_shards_behind > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "RGW sync lag elevated"
```

## Automated Lag Monitoring Script

```bash
#!/bin/bash
# monitor-sync-lag.sh - run via cron every 5 minutes

RPO_THRESHOLD_SECONDS=300  # 5 minute RPO target
PROBE_BUCKET="sync-monitor"
PRIMARY="http://us-east-rgw.example.com"
SECONDARY="http://us-west-rgw.example.com"

# Write probe
PROBE_ID=$(date +%s)
echo "$PROBE_ID" | aws s3 cp - s3://$PROBE_BUCKET/probe-$PROBE_ID.txt \
    --endpoint-url $PRIMARY --quiet

# Check for newest probe on secondary (most recently synced)
NEWEST_PROBE=$(aws s3 ls s3://$PROBE_BUCKET/ --endpoint-url $SECONDARY \
    2>/dev/null | sort | tail -1 | awk '{print $4}')

if [ -n "$NEWEST_PROBE" ]; then
    PROBE_TIMESTAMP=$(echo $NEWEST_PROBE | grep -oP '\d+')
    LAG=$((PROBE_ID - PROBE_TIMESTAMP))
    echo "Sync lag: ${LAG}s (RPO target: ${RPO_THRESHOLD_SECONDS}s)"
    if [ $LAG -gt $RPO_THRESHOLD_SECONDS ]; then
        echo "WARNING: Sync lag exceeds RPO target!"
    fi
fi
```

## Summary

Monitoring Ceph RGW multisite sync lag is essential for DR readiness. Use `radosgw-admin sync status` for spot checks, probe-based lag measurement for precise latency, Prometheus metrics for trending, and alerting rules to notify when lag approaches or exceeds your RPO target. A well-monitored sync pipeline gives confidence that your secondary zone can take over within the committed data loss window.
