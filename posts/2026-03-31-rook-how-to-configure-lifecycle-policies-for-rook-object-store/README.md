# How to Configure Lifecycle Policies for Rook Object Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Lifecycle, Object Storage, S3, Kubernetes

Description: Configure S3-compatible lifecycle policies on Rook Object Store buckets to automatically expire, transition, or delete objects based on age or rules.

---

## Overview

Ceph RGW supports S3 lifecycle policies that automate object management. You can configure rules to expire objects after a set number of days, delete expired object markers, or abort incomplete multipart uploads. Lifecycle policies help control storage costs and enforce data retention requirements.

## Prerequisites

- A running Rook CephObjectStore
- S3 client (AWS CLI) configured to point to your RGW endpoint
- An existing bucket

## Configure AWS CLI for Rook Object Store

```bash
aws configure set aws_access_key_id <your-access-key>
aws configure set aws_secret_access_key <your-secret-key>
aws configure set default.region us-east-1
```

Use the `--endpoint-url` flag with every command:

```bash
export RGW_ENDPOINT=http://rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local:80
```

## Create a Lifecycle Policy

Write the policy to a JSON file:

```json
{
  "Rules": [
    {
      "ID": "expire-old-logs",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "logs/"
      },
      "Expiration": {
        "Days": 30
      }
    },
    {
      "ID": "cleanup-multipart",
      "Status": "Enabled",
      "Filter": {
        "Prefix": ""
      },
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    }
  ]
}
```

Apply the policy to a bucket:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --endpoint-url $RGW_ENDPOINT \
  --bucket my-bucket \
  --lifecycle-configuration file://lifecycle.json
```

## Common Lifecycle Rules

### Expire All Objects After N Days

```json
{
  "Rules": [
    {
      "ID": "expire-all",
      "Status": "Enabled",
      "Filter": {},
      "Expiration": {
        "Days": 90
      }
    }
  ]
}
```

### Expire Noncurrent Versions

For versioned buckets, delete old noncurrent versions:

```json
{
  "Rules": [
    {
      "ID": "remove-noncurrent",
      "Status": "Enabled",
      "Filter": {},
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 60,
        "NewerNoncurrentVersions": 3
      }
    }
  ]
}
```

### Prefix-Based Expiration

Apply different rules to different prefixes:

```json
{
  "Rules": [
    {
      "ID": "expire-tmp",
      "Status": "Enabled",
      "Filter": {"Prefix": "tmp/"},
      "Expiration": {"Days": 1}
    },
    {
      "ID": "expire-archive",
      "Status": "Enabled",
      "Filter": {"Prefix": "archive/"},
      "Expiration": {"Days": 365}
    }
  ]
}
```

## Verify the Policy

Retrieve and inspect the applied policy:

```bash
aws s3api get-bucket-lifecycle-configuration \
  --endpoint-url $RGW_ENDPOINT \
  --bucket my-bucket
```

## Check Lifecycle Processing in RGW

Lifecycle processing runs on a schedule. Check the RGW logs for lifecycle activity:

```bash
kubectl -n rook-ceph logs deploy/rook-ceph-rgw-my-store-a \
  | grep -i lifecycle
```

Force a lifecycle check (for testing):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin lc process --bucket=my-bucket
```

## Remove a Lifecycle Policy

```bash
aws s3api delete-bucket-lifecycle \
  --endpoint-url $RGW_ENDPOINT \
  --bucket my-bucket
```

## Summary

Lifecycle policies in Rook Object Store use the standard S3 API for configuration via AWS CLI or any S3-compatible SDK. Key rule types include expiration (delete after N days), noncurrent version expiration for versioned buckets, and abort incomplete multipart uploads. Policies are evaluated on a schedule by the RGW daemon, and you can trigger immediate processing with `radosgw-admin lc process` for testing.
