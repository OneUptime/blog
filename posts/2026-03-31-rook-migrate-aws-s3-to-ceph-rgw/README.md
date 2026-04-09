# How to Migrate from AWS S3 to Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, S3, AWS, Migration, Object Storage

Description: Learn how to migrate data and applications from AWS S3 to Ceph RGW using rclone and S3 sync tools, with strategies for minimizing downtime during cutover.

---

## Overview

Migrating from AWS S3 to Ceph RGW (RADOS Gateway) reduces cloud storage costs and eliminates vendor lock-in for on-premises Kubernetes workloads. Since Ceph RGW is S3-compatible, most applications require only an endpoint URL change after migration. The main challenge is transferring data efficiently while keeping both systems in sync during the cutover window.

## Prerequisites

```bash
# 1. Verify RGW is running
kubectl get pods -n rook-ceph -l app=rook-ceph-rgw

# 2. Get the RGW endpoint
kubectl get svc -n rook-ceph | grep rgw

# 3. Create a Ceph user for migration
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin user create \
    --uid=s3-migrator \
    --display-name="S3 Migration User" \
    --access-key=MIGRATION_KEY \
    --secret-key=MIGRATION_SECRET
```

## Step 1: Install rclone

rclone is the best tool for S3-to-S3 migrations:

```bash
# Install rclone on a migration pod
kubectl run rclone-migrator \
  --image=rclone/rclone:latest \
  --restart=Never \
  --command -- sleep infinity

kubectl exec -it rclone-migrator -- sh
```

## Step 2: Configure rclone

```bash
# Create rclone config inside the pod
mkdir -p /root/.config/rclone
cat << EOF > /root/.config/rclone/rclone.conf
[aws-s3]
type = s3
provider = AWS
access_key_id = YOUR_AWS_ACCESS_KEY
secret_access_key = YOUR_AWS_SECRET_KEY
region = us-east-1

[ceph-rgw]
type = s3
provider = Ceph
access_key_id = MIGRATION_KEY
secret_access_key = MIGRATION_SECRET
endpoint = http://rook-ceph-rgw-my-store.rook-ceph.svc:80
EOF
```

## Step 3: Create Destination Buckets

```bash
# List source buckets
rclone lsd aws-s3:

# Create matching buckets in Ceph RGW
rclone mkdir ceph-rgw:my-app-data
rclone mkdir ceph-rgw:my-backups
rclone mkdir ceph-rgw:my-logs
```

## Step 4: Initial Data Copy

```bash
# Copy a bucket from S3 to Ceph RGW
# Use --transfers to run parallel copies
rclone copy aws-s3:my-app-data ceph-rgw:my-app-data \
  --transfers=32 \
  --checkers=16 \
  --buffer-size=256M \
  --s3-chunk-size=128M \
  --progress

# Check copy progress
rclone check aws-s3:my-app-data ceph-rgw:my-app-data
```

## Step 5: Delta Sync

Run a delta sync to catch objects added after the initial copy:

```bash
# Sync changes (copies new/modified objects and deletes destination objects not in source)
rclone sync aws-s3:my-app-data ceph-rgw:my-app-data \
  --transfers=16 \
  --progress
```

## Step 6: Update Application Configuration

Most S3 clients just need an endpoint change:

```yaml
# Before (AWS S3)
env:
- name: S3_ENDPOINT
  value: "https://s3.amazonaws.com"
- name: S3_BUCKET
  value: "my-app-data"

# After (Ceph RGW)
env:
- name: S3_ENDPOINT
  value: "http://rook-ceph-rgw-my-store.rook-ceph.svc:80"
- name: S3_BUCKET
  value: "my-app-data"
```

## Step 7: Verify Data Integrity

```bash
# Compare object counts
rclone lsf aws-s3:my-app-data | wc -l
rclone lsf ceph-rgw:my-app-data | wc -l

# Check with rclone check (MD5 comparison)
rclone check aws-s3:my-app-data ceph-rgw:my-app-data --one-way
```

## Handling Multipart Uploads

For large objects migrated with multipart, verify integrity:

```bash
# List objects in the bucket to verify migration
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin bucket list --bucket=my-app-data --allow-unordered
```

## Summary

Migrating from AWS S3 to Ceph RGW is straightforward because both use the same S3 API. Using rclone with high parallelism (--transfers=32) accelerates the initial copy, while a final delta sync before cutover minimizes the maintenance window. After cutover, applications only need their S3 endpoint URL updated - all S3 SDK calls, bucket names, and object keys remain unchanged.
