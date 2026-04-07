# How to Configure Multipart Upload Settings in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Multipart, Object Storage, S3

Description: Configure Ceph RGW multipart upload parameters to handle large S3 object uploads efficiently and clean up incomplete uploads automatically.

---

S3 multipart upload allows clients to split large objects into smaller parts and upload them independently. Ceph RGW supports this natively, and several parameters control its behavior.

## Key Multipart Parameters

```bash
# Check current settings
ceph config get client.rgw rgw_multipart_min_part_size
ceph config get client.rgw rgw_multipart_part_upload_limit
ceph config get client.rgw rgw_abort_incomplete_multipart_upload_expiration
```

## Setting Minimum Part Size

The S3 spec requires parts to be at least 5 MB except the last part. RGW enforces a minimum:

```bash
# Default minimum part size (5 MB)
ceph config set client.rgw rgw_multipart_min_part_size 5242880

# Relax minimum for testing (not recommended in production)
ceph config set client.rgw rgw_multipart_min_part_size 1048576
```

## Setting Maximum Number of Parts

```bash
# Maximum parts per multipart upload (S3 spec max is 10000)
ceph config set client.rgw rgw_multipart_part_upload_limit 10000
```

## Configuring Incomplete Upload Cleanup

Incomplete multipart uploads consume storage and should be cleaned up:

```bash
# Enable automatic cleanup of incomplete uploads (seconds)
# 86400 = 24 hours
ceph config set client.rgw rgw_abort_incomplete_multipart_upload_expiration 86400
```

Or use a bucket lifecycle policy for finer control:

```json
{
  "Rules": [
    {
      "ID": "cleanup-incomplete-uploads",
      "Status": "Enabled",
      "Filter": {},
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    }
  ]
}
```

Apply the policy:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-bucket \
  --lifecycle-configuration file://lifecycle.json \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc
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
    rgw_multipart_min_part_size = 5242880
    rgw_multipart_part_upload_limit = 10000
```

## Testing Multipart Upload

```bash
# Create a 1 GB test file
dd if=/dev/urandom of=/tmp/bigfile bs=1M count=1024

# Upload using multipart
aws s3 cp /tmp/bigfile s3://test-bucket/bigfile \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc

# List in-progress multipart uploads
aws s3api list-multipart-uploads \
  --bucket test-bucket \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc
```

## Summary

Ceph RGW multipart upload is configured via `rgw_multipart_min_part_size` and `rgw_multipart_part_upload_limit`. Always configure automatic cleanup of incomplete uploads using either the RGW expiration parameter or bucket lifecycle policies to prevent storage waste. Restart RGW pods after changing configuration.
