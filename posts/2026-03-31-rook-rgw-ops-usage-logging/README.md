# How to Set Up Operations and Usage Logging in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Logging, Usage, Monitoring

Description: Enable and configure operations logging and usage tracking in Ceph RGW for billing, auditing, and performance analysis of object storage workloads.

---

Ceph RGW supports two types of logging: operations logging (HTTP request logs) and usage logging (per-user bandwidth and request counts). Both are essential for billing, security auditing, and performance analysis.

## Operations Logging

Operations logging writes a record of every S3/Swift API request to RADOS:

```bash
# Enable operations logging
ceph config set client.rgw rgw_enable_ops_log true

# Enable usage logging
ceph config set client.rgw rgw_enable_usage_log true
```

## Usage Log Configuration

```bash
# Flush interval in seconds
ceph config set client.rgw rgw_usage_log_tick_interval 30

# Flush threshold (number of records before forced flush)
ceph config set client.rgw rgw_usage_log_flush_threshold 1024

# Max shards for usage log storage
ceph config set client.rgw rgw_usage_max_shards 32
```

## Viewing Usage Data

```bash
# Show usage for all users
radosgw-admin usage show --start-date=2026-01-01 --end-date=2026-03-31

# Show usage for a specific user
radosgw-admin usage show --uid=testuser --start-date=2026-01-01 --end-date=2026-03-31

# Show per-category breakdown without summary totals
radosgw-admin usage show --uid=testuser --show-log-sum=false
```

Sample usage output:

```json
{
  "summary": [
    {
      "user": "testuser",
      "total": {
        "successful_ops": 150,
        "ops": 155,
        "bytes_sent": 52428800,
        "bytes_received": 10485760
      }
    }
  ]
}
```

## Configuring Operations Log Storage

Operations logs are stored in the `default.rgw.log` pool. Configure the pool before enabling:

```bash
# Check the log pool
ceph osd pool ls | grep log

# Create log pool if it doesn't exist
ceph osd pool create default.rgw.log 32 32
```

## Applying in Rook

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [client.rgw.my-store.a]
    rgw_enable_ops_log = true
    rgw_enable_usage_log = true
    rgw_usage_log_tick_interval = 30
    rgw_usage_log_flush_threshold = 1024
```

## Trimming Log Data

Usage logs must be trimmed periodically to avoid unbounded growth:

```bash
# Trim usage logs older than a date
radosgw-admin usage trim --start-date=2025-01-01 --end-date=2025-12-31

# Trim all usage for a specific user
radosgw-admin usage trim --uid=testuser
```

## Summary

Enable operations logging with `rgw_enable_ops_log` and usage tracking with `rgw_enable_usage_log`. Configure flush intervals and shard counts for performance, and regularly trim old data with `radosgw-admin usage trim`. Usage data enables per-user billing and capacity planning in multi-tenant object storage deployments.
