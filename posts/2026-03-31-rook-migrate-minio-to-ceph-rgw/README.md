# How to Migrate from MinIO to Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, MinIO, Migration, Object Storage, S3

Description: Learn how to migrate object storage data from MinIO to Ceph RGW using rclone and mc, covering bucket migration, credential management, and application cutover.

---

## Overview

MinIO is a popular single-node or distributed S3-compatible object store often used in Kubernetes environments. As data grows and multi-tenancy requirements emerge, organizations migrate to Ceph RGW for its native multi-tenancy, quota support, and integration with Rook. Both systems are S3-compatible, making data migration straightforward with tools like rclone and the MinIO client (`mc`).

## Pre-Migration Inventory

```bash
# List all MinIO buckets using mc
mc alias set myminio http://minio.minio.svc:9000 MINIO_ACCESS MINIO_SECRET
mc ls myminio

# Check bucket sizes
mc du myminio/my-bucket
```

## Step 1: Set Up Ceph RGW Target

```bash
# Create a migration user in Ceph RGW
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin user create \
    --uid=minio-migrator \
    --display-name="MinIO Migration" \
    --access-key=CEPH_MIGRATE_KEY \
    --secret-key=CEPH_MIGRATE_SECRET

# Create a matching bucket via S3 API
aws s3 mb s3://my-bucket \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

## Step 2: Configure mc for Both Endpoints

```bash
# Add MinIO source alias
mc alias set minio-src \
  http://minio.minio.svc:9000 \
  MINIO_ACCESS MINIO_SECRET

# Add Ceph RGW destination alias
mc alias set ceph-dst \
  http://rook-ceph-rgw-my-store.rook-ceph.svc:80 \
  CEPH_MIGRATE_KEY CEPH_MIGRATE_SECRET
```

## Step 3: Mirror All Buckets

```bash
# Mirror a single bucket
mc mirror --preserve minio-src/my-bucket ceph-dst/my-bucket

# Mirror all buckets in parallel
for bucket in $(mc ls minio-src | awk '{print $NF}' | tr -d '/'); do
  echo "Migrating: $bucket"
  mc mb --ignore-existing ceph-dst/$bucket
  mc mirror --preserve minio-src/$bucket ceph-dst/$bucket &
done
wait
echo "All buckets migrated"
```

## Step 4: Migrate Bucket Policies

MinIO bucket policies are S3-compatible JSON:

```bash
# Export MinIO bucket policy
mc anonymous get-json minio-src/my-bucket > /tmp/bucket-policy.json

# Apply to Ceph RGW
mc anonymous set-json /tmp/bucket-policy.json ceph-dst/my-bucket
```

## Step 5: Verify Migration with rclone

For a checksum-verified migration, use rclone:

```bash
rclone check \
  ":s3,access_key_id=MINIO_ACCESS,secret_access_key=MINIO_SECRET,endpoint='http://minio.minio.svc:9000':my-bucket" \
  ":s3,access_key_id=CEPH_MIGRATE_KEY,secret_access_key=CEPH_MIGRATE_SECRET,endpoint='http://rook-ceph-rgw-my-store.rook-ceph.svc:80':my-bucket"
```

## Step 6: Migrate MinIO Users to Ceph RGW

```bash
# List MinIO users
mc admin user list minio-src

# Create equivalent Ceph RGW users
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin user create \
    --uid=app-user-1 \
    --display-name="App User 1" \
    --access-key=APP1_KEY \
    --secret-key=APP1_SECRET
```

## Step 7: Application Cutover

Update application environment variables:

```bash
# Change S3 endpoint in application ConfigMap
kubectl patch configmap s3-config -n my-app --type merge \
  -p '{"data":{"S3_ENDPOINT":"http://rook-ceph-rgw-my-store.rook-ceph.svc:80"}}'

# Restart application pods to pick up new config
kubectl rollout restart deployment/my-app -n my-app
```

## Validating Access After Cutover

```bash
# Quick validation
mc ls ceph-dst/my-bucket | head -20
mc stat ceph-dst/my-bucket/critical-file.dat

# Compare object counts
MINIO_COUNT=$(mc ls --recursive minio-src/my-bucket | wc -l)
CEPH_COUNT=$(mc ls --recursive ceph-dst/my-bucket | wc -l)
echo "MinIO: $MINIO_COUNT objects, Ceph: $CEPH_COUNT objects"
```

## Summary

Migrating from MinIO to Ceph RGW leverages the shared S3 API, making `mc mirror` the fastest path for data transfer. The main operational steps are creating matching users and buckets in Ceph, mirroring data with `mc mirror --preserve`, transferring bucket policies, and updating application S3 endpoint URLs. After cutover, verify object counts and run a rclone checksum comparison to confirm data integrity before decommissioning MinIO.
