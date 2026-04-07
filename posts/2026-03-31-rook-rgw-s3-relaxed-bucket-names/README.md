# How to Configure S3 Relaxed Bucket Names in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, S3, Bucket, Configuration

Description: Enable rgw_relaxed_s3_bucket_names in Ceph RGW to allow bucket names that do not strictly conform to S3 DNS naming rules.

---

By default, Ceph RGW enforces strict S3 bucket naming rules that require names to be DNS-safe (lowercase, no underscores, 3-63 characters). The `rgw_relaxed_s3_bucket_names` parameter relaxes these restrictions.

## S3 Bucket Naming Rules

Standard S3 rules:
- 3-63 characters
- Lowercase letters, numbers, and hyphens only
- Must start and end with a letter or number
- Cannot look like an IP address

With `rgw_relaxed_s3_bucket_names = true`:
- Underscores are allowed
- Uppercase letters are allowed
- Length limits may be extended

## Checking Current Setting

```bash
ceph config get client.rgw rgw_relaxed_s3_bucket_names
```

## Enabling Relaxed Bucket Names

```bash
# Enable relaxed naming
ceph config set client.rgw rgw_relaxed_s3_bucket_names true
```

## When to Use Relaxed Names

Common scenarios:
- Migrating data from a legacy system where bucket names contain underscores
- Running legacy applications that create buckets with uppercase names
- Internal systems that do not use virtual-hosted-style URLs (no DNS routing required)

**Warning:** Enabling relaxed names can break virtual-hosted-style URL routing if bucket names are not DNS-safe. Use with caution when `rgw_dns_name` is configured.

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
    rgw_relaxed_s3_bucket_names = true
```

Apply and restart:

```bash
kubectl apply -f rook-config-override.yaml
kubectl -n rook-ceph rollout restart deployment rook-ceph-rgw-my-store-a
```

## Testing Bucket Name Creation

After enabling relaxed names:

```bash
# Create a bucket with underscore (fails without relaxed mode)
aws s3api create-bucket \
  --bucket my_legacy_bucket \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc

# Create a bucket with uppercase (fails without relaxed mode)
aws s3api create-bucket \
  --bucket MyAppBucket \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc
```

## Path-Style Access for Non-DNS Names

When using non-DNS-safe bucket names, always use path-style access:

```python
import boto3
from botocore.config import Config

s3 = boto3.client(
    's3',
    endpoint_url='http://rook-ceph-rgw-my-store.rook-ceph.svc',
    config=Config(s3={'addressing_style': 'path'})
)

s3.create_bucket(Bucket='my_legacy_bucket')
```

## Summary

`rgw_relaxed_s3_bucket_names` allows bucket names that violate standard S3 DNS naming conventions. Enable it only when migrating legacy data or running applications with non-standard naming requirements. Always use path-style addressing when bucket names are not DNS-safe, and be aware that virtual-hosted-style URLs will not work for such buckets.
