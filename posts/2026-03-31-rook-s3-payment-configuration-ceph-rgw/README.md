# How to Configure S3 Payment Configuration in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, S3, RGW, Payment, Requester Pays, Storage

Description: Configure S3 Requester Pays payment settings in Ceph RGW so that requesters rather than bucket owners are charged for data transfer and request costs.

---

## Overview

S3 Requester Pays is a bucket configuration where the requester - rather than the bucket owner - pays for requests and data transfer. Ceph RGW supports the Requester Pays API, which is useful in multi-tenant environments where you want consumers of data to bear the storage access costs.

## What Requester Pays Does

When a bucket is configured as Requester Pays:
- Requesters must include the `x-amz-request-payer: requester` header
- Anonymous access is disabled for that bucket
- Ceph RGW enforces this at the API level but does not have built-in billing; use user quotas separately to track and limit usage

## Enable Requester Pays on a Bucket

```bash
aws s3api put-bucket-request-payment \
  --bucket my-shared-bucket \
  --request-payment-configuration '{"Payer": "Requester"}' \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --profile ceph
```

## Check Current Payment Configuration

```bash
aws s3api get-bucket-request-payment \
  --bucket my-shared-bucket \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --profile ceph
```

Expected output:

```json
{
    "Payer": "Requester"
}
```

## Access a Requester Pays Bucket

Requesters must include the `request-payer` flag in every request:

```bash
aws s3 cp s3://my-shared-bucket/data.csv /tmp/ \
  --request-payer requester \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --profile requester-profile
```

With boto3:

```python
import boto3
from botocore.client import Config

s3 = boto3.client(
    "s3",
    endpoint_url="http://rook-ceph-rgw-my-store.rook-ceph:80",
    aws_access_key_id="requesteraccesskey",
    aws_secret_access_key="requestersecretkey",
    config=Config(s3={"addressing_style": "path"}),
)

response = s3.get_object(
    Bucket="my-shared-bucket",
    Key="data.csv",
    RequestPayer="requester",
)
print(response["Body"].read().decode("utf-8"))
```

## Implement Usage Quotas Per User in Ceph

Use RGW user quotas to track and limit usage:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin quota set \
  --quota-scope=user \
  --uid=requester-user \
  --max-size=10G \
  --max-objects=100000

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin quota enable \
  --quota-scope=user \
  --uid=requester-user
```

Check quota usage:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user stats --uid=requester-user
```

## Revert to Bucket Owner Pays

```bash
aws s3api put-bucket-request-payment \
  --bucket my-shared-bucket \
  --request-payment-configuration '{"Payer": "BucketOwner"}' \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --profile ceph
```

## Summary

Ceph RGW's Requester Pays configuration shifts storage access responsibility to the requester, enforced via per-request headers. Combined with RGW's user quota system, this enables multi-tenant cost accountability for shared datasets without exposing buckets publicly.
