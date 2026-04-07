# How to Configure Lifecycle Processing Settings in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Lifecycle, Object Storage, Configuration

Description: Configure Ceph RGW lifecycle processing parameters to control how S3 lifecycle rules for object expiration and transitions are evaluated and applied.

---

S3 object lifecycle policies allow automatic expiration, transition, and cleanup of objects. Ceph RGW implements lifecycle processing via a background worker that evaluates bucket policies on a schedule.

## Key Lifecycle Parameters

```bash
# Check current lifecycle settings
ceph config get client.rgw rgw_lifecycle_work_time
ceph config get client.rgw rgw_lc_lock_max_time
ceph config get client.rgw rgw_lc_max_objs
```

## Main Lifecycle Configuration Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `rgw_lifecycle_work_time` | `00:00-06:00` | Time window for lifecycle processing |
| `rgw_lc_lock_max_time` | 60 | Seconds to hold lock on lifecycle processing shard |
| `rgw_lc_max_objs` | 32 | Max lifecycle processing shards |
| `rgw_lc_debug_interval` | -1 | Debug interval override (disable with -1) |

## Configuring the Work Time Window

By default, lifecycle processing runs between midnight and 6 AM:

```bash
# Process during business hours too (all day)
ceph config set client.rgw rgw_lifecycle_work_time "00:00-23:59"

# Restrict to off-peak hours
ceph config set client.rgw rgw_lifecycle_work_time "01:00-05:00"
```

## Tuning Processing Shards

More shards allow more parallel processing of buckets:

```bash
# Increase processing shards for large deployments
ceph config set client.rgw rgw_lc_max_objs 64
```

## Creating Lifecycle Policies

Apply a lifecycle policy to a bucket:

```json
{
  "Rules": [
    {
      "ID": "expire-old-logs",
      "Status": "Enabled",
      "Filter": { "Prefix": "logs/" },
      "Expiration": { "Days": 30 }
    },
    {
      "ID": "cleanup-incomplete-uploads",
      "Status": "Enabled",
      "Filter": {},
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
    }
  ]
}
```

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-bucket \
  --lifecycle-configuration file://lifecycle.json \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc
```

## Monitoring Lifecycle Processing

```bash
# List lifecycle processing status
radosgw-admin lc list

# Get detailed lifecycle info for a bucket
radosgw-admin lc get --bucket=my-bucket
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
    rgw_lifecycle_work_time = 00:00-23:59
    rgw_lc_max_objs = 64
    rgw_lc_lock_max_time = 90
```

## Summary

Ceph RGW lifecycle processing runs bucket expiration and cleanup rules on a schedule defined by `rgw_lifecycle_work_time`. Increase `rgw_lc_max_objs` for deployments with many buckets, and set the work window to `00:00-23:59` if you need continuous processing. Monitor progress with `radosgw-admin lc list`.
