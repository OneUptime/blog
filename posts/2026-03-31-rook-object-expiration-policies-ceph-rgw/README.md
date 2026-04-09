# How to Configure Object Expiration Policies in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, S3, Expiration, Lifecycle, Object Storage, Cleanup

Description: Configure S3 object expiration policies in Ceph RGW to automatically delete temporary files, expired records, and old versions after defined retention periods.

---

## Why Object Expiration Matters

Without expiration policies, buckets grow indefinitely. Expired temporary files, old log uploads, superseded object versions, and incomplete multipart uploads consume storage silently. Ceph RGW's S3-compatible lifecycle expiration automates cleanup without application changes.

## Types of Expiration Rules

1. **Object expiration**: Delete objects after N days
2. **Version expiration**: Delete non-current versions after N days
3. **Delete marker expiration**: Remove expired delete markers
4. **Incomplete multipart cleanup**: Abort uploads not completed within N days

## Basic Object Expiration

Delete all objects under the `temp/` prefix after 7 days:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc \
  --bucket application-uploads \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "expire-temp-files",
        "Status": "Enabled",
        "Filter": {"Prefix": "temp/"},
        "Expiration": {"Days": 7}
      }
    ]
  }'
```

## Multi-Rule Expiration Policy

Apply different expiration periods to different data types:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc \
  --bucket company-data \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "expire-staging-uploads",
        "Status": "Enabled",
        "Filter": {"Prefix": "staging/"},
        "Expiration": {"Days": 3}
      },
      {
        "ID": "expire-processed-jobs",
        "Status": "Enabled",
        "Filter": {"Prefix": "jobs/completed/"},
        "Expiration": {"Days": 30}
      },
      {
        "ID": "expire-access-logs",
        "Status": "Enabled",
        "Filter": {"Prefix": "access-logs/"},
        "Expiration": {"Days": 90}
      },
      {
        "ID": "abort-incomplete-multipart",
        "Status": "Enabled",
        "Filter": {"Prefix": ""},
        "AbortIncompleteMultipartUpload": {"DaysAfterInitiation": 5}
      }
    ]
  }'
```

## Versioned Bucket Expiration

For buckets with versioning enabled, control when old versions are deleted:

```bash
# Enable versioning first
aws s3api put-bucket-versioning \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc \
  --bucket versioned-docs \
  --versioning-configuration Status=Enabled

# Expire non-current versions after 90 days, keep last 5 versions
aws s3api put-bucket-lifecycle-configuration \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc \
  --bucket versioned-docs \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "cleanup-old-versions",
        "Status": "Enabled",
        "Filter": {"Prefix": ""},
        "NoncurrentVersionExpiration": {
          "NoncurrentDays": 90,
          "NewerNoncurrentVersions": 5
        },
        "Expiration": {
          "ExpiredObjectDeleteMarker": true
        }
      }
    ]
  }'
```

## Tag-Based Expiration

Expire objects based on S3 object tags:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc \
  --bucket processed-data \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "expire-tagged-temp",
        "Status": "Enabled",
        "Filter": {
          "Tag": {"Key": "data-type", "Value": "temporary"}
        },
        "Expiration": {"Days": 1}
      }
    ]
  }'
```

## Verifying Expiration is Working

```bash
# Check lifecycle configuration
aws s3api get-bucket-lifecycle-configuration \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc \
  --bucket application-uploads

# Check RGW lifecycle processing status
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin lc list | python3 -m json.tool

# Count objects before and after processing
aws s3 ls --recursive s3://application-uploads/temp/ \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc \
  | wc -l
```

## Summary

Ceph RGW object expiration policies provide automated storage hygiene through S3-compatible lifecycle rules. Rules can target objects by prefix, tags, or versioning status, and can expire objects, non-current versions, delete markers, and incomplete multipart uploads. Combining multiple rules in a single lifecycle configuration handles different data retention requirements within the same bucket, keeping storage consumption bounded without application-side cleanup code.
