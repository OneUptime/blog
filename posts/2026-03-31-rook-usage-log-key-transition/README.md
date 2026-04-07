# How to Configure Usage Log Key Transition in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Object Storage, Configuration, Logging

Description: Learn how to configure usage log key transition in Ceph RGW to manage billing and accounting data stored in RADOS objects efficiently.

---

Ceph RGW stores usage accounting data in RADOS objects using a specific key format. Over time, the key format may change between releases, and understanding how to manage this transition ensures continuity of billing data.

## Understanding Usage Log Keys

Usage logs track per-user bandwidth and request counts. They are stored in the `default.rgw.usage` pool (or the zone-specific usage pool) under keys based on user and time period. When upgrading Ceph or changing configuration, the key format can shift and old records may not merge correctly with new ones.

Check current usage log configuration:

```bash
ceph config get client.rgw rgw_usage_log_tick_interval
ceph config get client.rgw rgw_usage_log_flush_threshold
ceph config get client.rgw rgw_usage_max_shards
ceph config get client.rgw rgw_usage_max_user_shards
```

## Configuring Key Transition Parameters

Set the usage log shard count and flush thresholds via the Ceph config database:

```bash
# Set number of shards for usage log storage
ceph config set client.rgw rgw_usage_max_shards 32

# Set per-user shard count
ceph config set client.rgw rgw_usage_max_user_shards 1

# Flush interval in seconds
ceph config set client.rgw rgw_usage_log_tick_interval 30

# Flush when this many records accumulate
ceph config set client.rgw rgw_usage_log_flush_threshold 1024
```

## Verifying the Configuration

After applying, restart RGW pods in a Rook-managed cluster:

```bash
kubectl -n rook-ceph rollout restart deployment rook-ceph-rgw-my-store-a
```

Then verify usage logs are being written:

```bash
radosgw-admin usage show --uid=testuser --start-date=2026-01-01 --end-date=2026-03-31
```

Sample output:

```json
{
    "entries": [...],
    "summary": [
        {
            "user": "testuser",
            "categories": [
                { "category": "get_obj", "bytes_sent": 1048576, "ops": 100 }
            ]
        }
    ]
}
```

## Trimming Old Usage Logs

After a key transition, trim stale usage log data to reclaim space:

```bash
# Trim all usage logs older than a date
radosgw-admin usage trim --start-date=2025-01-01 --end-date=2025-12-31

# Trim for a specific user
radosgw-admin usage trim --uid=olduser
```

## Rook CephObjectStore Context

In a Rook-managed cluster, apply configuration changes via the Ceph config override:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  gateway:
    instances: 2
    port: 80
```

Use `CephConfig` or config override maps to tune `rgw_usage_max_shards` without editing the CR directly.

## Summary

Ceph RGW usage log key transition involves setting shard counts, flush intervals, and trimming old records after upgrades. Properly configuring `rgw_usage_max_shards` and `rgw_usage_log_flush_threshold` ensures accurate billing data collection. Always restart RGW instances after changing these parameters.
