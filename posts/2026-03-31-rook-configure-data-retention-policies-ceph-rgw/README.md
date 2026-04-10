# How to Configure Data Retention Policies in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Data Retention, Lifecycle, S3

Description: Configure S3 lifecycle rules in Ceph RGW to automatically expire, transition, or delete objects based on age, enabling automated data retention policy enforcement.

---

Data retention policies define how long data must be kept and when it can be deleted. In Ceph RGW, lifecycle configuration rules automate these policies by expiring objects, removing old versions, or transitioning data to different storage classes automatically.

## Enable Bucket Lifecycle in RGW

Verify lifecycle processing is enabled:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get client.rgw rgw_lifecycle_work_time

# Enable if needed
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_enable_lc_threads true
```

## Apply a Simple Expiration Policy

Delete all objects older than 90 days:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket logs-bucket \
  --endpoint-url https://rgw.example.com \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "delete-old-logs",
        "Status": "Enabled",
        "Filter": {"Prefix": ""},
        "Expiration": {"Days": 90}
      }
    ]
  }'
```

## Apply Prefix-Based Retention Rules

Different retention periods for different prefixes:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket data-archive \
  --endpoint-url https://rgw.example.com \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "retain-audit-logs-7-years",
        "Status": "Enabled",
        "Filter": {"Prefix": "audit/"},
        "Expiration": {"Days": 2555}
      },
      {
        "ID": "retain-app-logs-30-days",
        "Status": "Enabled",
        "Filter": {"Prefix": "app-logs/"},
        "Expiration": {"Days": 30}
      },
      {
        "ID": "retain-temp-files-7-days",
        "Status": "Enabled",
        "Filter": {"Prefix": "tmp/"},
        "Expiration": {"Days": 7}
      }
    ]
  }'
```

## Clean Up Old Versions

For versioned buckets, expire non-current versions and delete markers:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket versioned-data \
  --endpoint-url https://rgw.example.com \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "cleanup-old-versions",
        "Status": "Enabled",
        "Filter": {"Prefix": ""},
        "NoncurrentVersionExpiration": {"NoncurrentDays": 30},
        "Expiration": {"ExpiredObjectDeleteMarker": true}
      }
    ]
  }'
```

## Abort Incomplete Multipart Uploads

Clean up failed multipart uploads:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket large-uploads \
  --endpoint-url https://rgw.example.com \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "abort-incomplete-multipart",
        "Status": "Enabled",
        "Filter": {"Prefix": ""},
        "AbortIncompleteMultipartUpload": {"DaysAfterInitiation": 7}
      }
    ]
  }'
```

## Monitor Lifecycle Processing

Check the lifecycle worker status:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin lc list

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin lc get --bucket=logs-bucket
```

Force immediate processing for testing:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin lc process
```

## View Lifecycle Configuration

Read the current lifecycle rules for a bucket:

```bash
aws s3api get-bucket-lifecycle-configuration \
  --bucket logs-bucket \
  --endpoint-url https://rgw.example.com
```

## Summary

Ceph RGW lifecycle configuration provides automated data retention policy enforcement through S3-compatible lifecycle rules. Use prefix-based rules to apply different retention periods to different data categories, add `NoncurrentVersionExpiration` for versioned buckets, and always include an `AbortIncompleteMultipartUpload` rule to prevent storage waste from failed uploads. Use `radosgw-admin lc process` to test rules before relying on the scheduled processor.
