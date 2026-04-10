# How to Configure Cloud Sync Module for RGW to GCS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, GCS, Cloud Sync

Description: Learn how to configure the Ceph RGW cloud sync module to replicate objects from a local Ceph cluster to Google Cloud Storage for hybrid cloud backup.

---

## Overview

The Ceph RGW cloud sync module supports Google Cloud Storage (GCS) as a sync target through GCS's S3-compatible API. Objects written to the primary Ceph RGW zone are asynchronously replicated to a GCS bucket, enabling hybrid cloud storage and disaster recovery scenarios.

## Step 1 - Set Up GCS Interoperability Credentials

GCS requires HMAC keys for S3-compatible access:

```bash
# In Google Cloud Console or via gcloud:
gcloud config set project my-project

# Create an HMAC key for a service account
gcloud storage hmac create sa@my-project.iam.gserviceaccount.com

# Or via the Cloud Console:
# Storage > Settings > Interoperability > Create a key for a service account

# Note the Access ID and Secret
GCS_ACCESS_ID="GOOGXXXXXXXXXXXXXXXXXXXXXXXXXX"
GCS_SECRET="base64-encoded-secret"
```

## Step 2 - Create the GCS Target Bucket

```bash
# Create the destination bucket in GCS
gcloud storage buckets create gs://ceph-sync-backup \
  --location=us-central1 \
  --default-storage-class=STANDARD \
  --project=my-project

# Grant the service account access to the bucket
gcloud storage buckets add-iam-policy-binding gs://ceph-sync-backup \
  --member="serviceAccount:sa@my-project.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

## Step 3 - Create the GCS Cloud Sync Zone

```bash
# Create the cloud tier zone
radosgw-admin zone create \
  --rgw-zonegroup=default \
  --rgw-zone=gcs-zone \
  --tier-type=cloud \
  --access-key="${SYNC_ACCESS}" \
  --secret="${SYNC_SECRET}"

# Configure GCS endpoint
# GCS S3-compatible endpoint: storage.googleapis.com
radosgw-admin zone modify \
  --rgw-zone=gcs-zone \
  --tier-config=connection.endpoint=https://storage.googleapis.com,\
connection.access_key=${GCS_ACCESS_ID},\
connection.secret=${GCS_SECRET},\
connection.host_style=virtual,\
target_path=ceph-sync-backup

# Commit the configuration
radosgw-admin period update --commit
```

## Step 4 - Configure Multipart Upload Thresholds

```bash
# GCS has specific limits for multipart uploads
# Set thresholds appropriate for GCS
radosgw-admin zone modify \
  --rgw-zone=gcs-zone \
  --tier-config=multipart_sync_threshold=104857600,\
multipart_min_part_size=5242880

# Commit the updated thresholds
radosgw-admin period update --commit
```

## Step 5 - Start the Sync Zone RGW Instance

```bash
# Add RGW instance configuration for GCS sync zone
# In ceph.conf:
cat >> /etc/ceph/ceph.conf << 'EOF'
[client.rgw.gcs-sync]
rgw_frontends = beast port=7482
rgw_zone = gcs-zone
rgw_zonegroup = default
rgw_realm = hybrid-realm
EOF

# Start the RGW instance
radosgw -n client.rgw.gcs-sync -d --no-mon-config
```

## Step 6 - Verify Sync to GCS

```bash
# Check sync status
radosgw-admin sync status --rgw-zone=gcs-zone

# Upload a test object
aws --endpoint-url http://primary-rgw:7480 \
  s3 cp /etc/hostname s3://test-bucket/hostname.txt

# Wait for sync
sleep 60

# Verify in GCS using gcloud
gcloud storage ls gs://ceph-sync-backup/test-bucket/

# Or using GCS S3 API
aws --endpoint-url https://storage.googleapis.com \
  --profile gcs \
  s3 ls s3://ceph-sync-backup/test-bucket/

# Check for errors
radosgw-admin sync error list --max-entries=20 | \
  jq '.[] | select(.rgw_zone == "gcs-zone")'
```

Monitor ongoing sync health:

```bash
# Check sync lag per shard
radosgw-admin sync status --rgw-zone=gcs-zone 2>&1 | \
  grep -E "behind|shard|error"

# Prometheus metrics for sync lag
curl -s http://rgw.example.com:9283/metrics | \
  grep ceph_data_sync_from
```

## Summary

Configuring Ceph RGW to sync to Google Cloud Storage requires HMAC interoperability credentials from GCS, a `cloud` tier zone pointed at `storage.googleapis.com`, and a running RGW instance for that zone. The S3-compatible GCS endpoint makes the configuration nearly identical to AWS S3 cloud sync, with the main difference being the GCS-specific HMAC key format and virtual-hosted bucket path structure.
