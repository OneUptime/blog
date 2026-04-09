# How to Manage Object Gateway from the Ceph Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Dashboard, RGW, Object Storage

Description: Manage Ceph RADOS Gateway (RGW) users, buckets, and S3 keys through the Ceph Dashboard web interface for your Rook-managed object store.

---

## Overview

The Ceph Dashboard Object Gateway section provides a GUI for managing RGW resources - users, S3 credentials, buckets, bucket policies, and multi-site configurations. This section is active when at least one CephObjectStore exists in the cluster.

## Accessing Object Gateway Management

```bash
kubectl -n rook-ceph port-forward svc/rook-ceph-mgr-dashboard 8443:8443
# Navigate to: https://localhost:8443/#/rgw/bucket
```

The Object Gateway sub-sections:
- **Buckets** - list and manage all S3 buckets
- **Users** - create and manage RGW users and S3 keys
- **Multi-site** - zone and zonegroup configuration

## Managing RGW Users

Navigate to Object Gateway > Users and click "Create":

- **User ID**: unique identifier (e.g., `app-team-1`)
- **Display Name**: human-readable name
- **Email**: optional contact email
- **User Quota**: max storage bytes and objects

CLI equivalent:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --uid=app-team-1 \
  --display-name="Application Team 1" \
  --max-buckets=100

kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  radosgw-admin quota set \
  --quota-scope=user \
  --uid=app-team-1 \
  --max-size=1099511627776 \
  --max-objects=10000000

kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  radosgw-admin quota enable \
  --quota-scope=user \
  --uid=app-team-1
```

## Managing S3 Access Keys

In the User detail view, click "Create Key" to generate S3 credentials:

```bash
# CLI equivalent
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  radosgw-admin key create \
  --uid=app-team-1 \
  --key-type=s3

# List keys for user
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  radosgw-admin user info --uid=app-team-1 | python3 -c "
import sys, json
u = json.load(sys.stdin)
for k in u['keys']:
    print('Access:', k['access_key'])
    print('Secret:', k['secret_key'])
"
```

## Managing Buckets

The Buckets view shows:
- Bucket name and owner
- Object count and size
- Creation date
- Versioning status

Create a bucket via the Dashboard or CLI:

```bash
export AWS_ENDPOINT_URL=http://rook-ceph-rgw-my-store.rook-ceph.svc
aws s3 mb s3://my-bucket --endpoint-url $AWS_ENDPOINT_URL
```

Enable bucket versioning from the Dashboard or CLI:

```bash
aws s3api put-bucket-versioning \
  --bucket my-bucket \
  --versioning-configuration Status=Enabled \
  --endpoint-url $AWS_ENDPOINT_URL
```

## Setting Bucket Quotas

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  radosgw-admin quota set \
  --quota-scope=bucket \
  --bucket=my-bucket \
  --max-size=107374182400 \
  --max-objects=1000000

kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  radosgw-admin quota enable \
  --quota-scope=bucket \
  --bucket=my-bucket
```

## Monitoring Object Gateway Usage

The Dashboard Object Gateway section shows:
- Total buckets and objects
- Storage used per user
- Request rate and error rate

CLI equivalents:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  radosgw-admin bucket stats --bucket=my-bucket

kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  radosgw-admin usage show --uid=app-team-1
```

## Summary

The Ceph Dashboard Object Gateway section provides comprehensive RGW management including user creation, S3 key management, bucket monitoring, and quota enforcement. All Dashboard actions have CLI equivalents via `radosgw-admin` for scripting and automation. Enabling user and bucket quotas through the Dashboard prevents individual tenants from consuming unlimited cluster capacity.
