# How to Configure Multi-Tenancy for Rook Object Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Multi-Tenancy, Object Storage, RGW, Kubernetes

Description: Configure multi-tenancy in Rook Object Store using RGW tenants to isolate buckets and users between teams or customers sharing the same cluster.

---

## Overview

Ceph RGW supports a multi-tenancy model where users and buckets belong to named tenants. Tenants provide namespace isolation - two tenants can each have a bucket with the same name without conflict. This is useful for service providers or large organizations where multiple teams share the same object storage cluster.

## Understanding RGW Tenancy

In RGW's multi-tenancy model:

- A **tenant** is a namespace that owns users and buckets
- Tenant-scoped users are identified as `tenant$user`
- Buckets created by tenanted users are also tenant-scoped
- Users without a tenant belong to the empty tenant (anonymous tenant)

## Create a Tenanted User

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --tenant=team-alpha \
  --uid=developer1 \
  --display-name="Developer 1 (Team Alpha)" \
  --access-key=ALPHA_ACCESS_KEY_001 \
  --secret-key=alpha_secret_key_001
```

Create another user in a different tenant:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --tenant=team-beta \
  --uid=developer1 \
  --display-name="Developer 1 (Team Beta)" \
  --access-key=BETA_ACCESS_KEY_001 \
  --secret-key=beta_secret_key_001
```

Note: Both tenants can have a `developer1` user - they are fully isolated.

## List Users by Tenant

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user list --tenant=team-alpha
```

## Access Buckets with Tenant Context

When accessing buckets from tenanted users, the bucket name is prefixed with the tenant:

```bash
# Create a bucket as team-alpha
aws s3 mb s3://my-data-bucket \
  --endpoint-url $RGW_ENDPOINT

# The actual bucket name in RGW is scoped as: team-alpha:my-data-bucket
```

To access a tenanted bucket:

```bash
aws s3 ls s3://team-alpha:my-data-bucket \
  --endpoint-url $RGW_ENDPOINT
```

## Set Quotas Per Tenant

Apply storage quotas to a user within a tenant:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin quota set \
  --tenant=team-alpha \
  --uid=developer1 \
  --quota-scope=user \
  --max-size=107374182400 \
  --max-objects=1000000

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin quota enable \
  --tenant=team-alpha \
  --uid=developer1 \
  --quota-scope=user
```

## Create Kubernetes Secrets for Tenanted Access

Store tenant credentials as Kubernetes secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: team-alpha-s3-credentials
  namespace: team-alpha-ns
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: "ALPHA_ACCESS_KEY_001"
  AWS_SECRET_ACCESS_KEY: "alpha_secret_key_001"
  BUCKET_HOST: "rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local"
  BUCKET_PORT: "80"
```

## Admin Capabilities Per Tenant

Grant a tenant admin user additional capabilities:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin caps add \
  --tenant=team-alpha \
  --uid=developer1 \
  --caps="buckets=*;users=*;usage=*"
```

## Use ObjectBucketClaims with Tenanted Storage Classes

Create a StorageClass that provisions buckets for a specific tenant:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-bucket-alpha
provisioner: rook-ceph.ceph.rook.io/bucket
parameters:
  objectStoreName: my-store
  objectStoreNamespace: rook-ceph
  region: us-east-1
reclaimPolicy: Delete
```

## Summary

Multi-tenancy in Rook Object Store uses the RGW tenant model to namespace users and buckets. Each tenant is isolated - same bucket names can exist across tenants without conflict. Create tenanted users with `radosgw-admin user create --tenant=`, apply per-tenant quotas, and distribute credentials as Kubernetes secrets. This provides clean separation for teams or customers sharing the same Rook cluster.
