# How to Monitor Multisite Sync Status in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Multisite, Monitoring, Sync

Description: Learn how to monitor Ceph RGW multisite sync status using radosgw-admin commands, Prometheus metrics, and automated lag alerting for production object storage.

---

## Key Sync Status Metrics

For RGW multisite, you need to track:
- **Sync lag**: how far behind the secondary zone is from the primary
- **Error rate**: failed sync operations
- **Throughput**: objects and bytes replicated per second
- **Pending objects**: queue depth for replication

## Step 1: Check Overall Sync Status

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin sync status
```

Sample output to interpret:
```text
realm mycompany (realm-id)
    zonegroup us (zg-id)
        zone us-west (zone-id)
  metadata sync syncing
                full sync: 0/64 shards
                incremental sync: 64/64 shards
                metadata is caught up with master
      data sync source: us-east (zone-id)
                        syncing
                        full sync: 0/128 shards
                        incremental sync: 128/128 shards
                        data is caught up with source
```

`data is caught up with source` means fully synced. If lagging, you will see `data is behind on N shards` followed by the shard IDs.

## Step 2: Check Per-Bucket Sync Status

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin bucket sync status \
  --bucket=my-critical-bucket \
  --source-zone=us-east

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin data sync status \
  --source-zone=us-east
```

## Step 3: Check Sync Error Log

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin sync error list \
  --start-date=2026-03-30 \
  --end-date=2026-03-31 | python3 -m json.tool
```

To clear resolved sync error entries from the log:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin sync error trim \
  --start-date=2026-03-30
```

## Step 4: Prometheus Metrics for RGW Sync

Enable the ceph-mgr Prometheus module:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mgr module enable prometheus
```

Key Prometheus metrics for RGW sync (exposed by ceph-mgr on port 9283):

```text
# Scrape from http://ceph-mgr-service:9283/metrics
ceph_data_sync_from_<zone>_fetch_bytes_sum - bytes fetched from source zone
ceph_data_sync_from_<zone>_fetch_bytes_count - fetch operation count
ceph_data_sync_from_<zone>_poll_latency_sum - sync poll latency
ceph_data_sync_from_<zone>_fetch_errors - sync fetch error count
```

## Step 5: Automated Lag Monitoring Script

```bash
#!/bin/bash
MAX_LAG_SHARDS=10
BEHIND=$(kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  radosgw-admin sync status 2>&1 | \
  grep -oP 'data is behind on \K[0-9]+' | head -1)

# If no "behind" line found, sync is caught up
BEHIND=${BEHIND:-0}

if [ "$BEHIND" -gt "$MAX_LAG_SHARDS" ]; then
  echo "ALERT: RGW sync lag - $BEHIND shards behind"
  # Send to PagerDuty/Slack here
  exit 1
fi
echo "OK: RGW sync lag = $BEHIND shards"
```

## Step 6: Prometheus Alert Rule

```yaml
groups:
- name: rgw-multisite
  rules:
  - alert: RGWSyncFetchErrors
    expr: rate(ceph_data_sync_from_us_east_fetch_errors[5m]) > 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "RGW multisite sync fetch errors detected"
      description: "Sync from source zone is experiencing fetch errors"

  - alert: RGWSyncPollLatencyHigh
    expr: rate(ceph_data_sync_from_us_east_poll_latency_sum[5m]) / rate(ceph_data_sync_from_us_east_poll_latency_count[5m]) > 10
    for: 15m
    labels:
      severity: critical
    annotations:
      summary: "RGW multisite sync poll latency is high"
```

## Summary

Monitoring RGW multisite sync requires checking shard lag via `radosgw-admin sync status`, inspecting per-bucket sync markers, reviewing the error log for failed operations, and alerting on high lag or stopped sync via Prometheus. Regular monitoring ensures replication stays within acceptable recovery point objectives.
