# How to Configure Cloud Sync Module for RGW to AWS S3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, AWS, Cloud Sync

Description: Learn how to configure the Ceph RGW cloud sync module to replicate objects from a local Ceph cluster to Amazon S3 for cloud backup and hybrid storage.

---

## Overview

The Ceph RGW cloud sync module replicates object data and metadata from a local Ceph RGW zone to a cloud storage provider such as AWS S3. This enables hybrid cloud architectures where active data lives on-premises in Ceph while cold or archived data is tiered to S3. The sync is asynchronous and does not impact write latency on the primary zone.

## Step 1 - Set Up the Multisite Infrastructure

```bash
# Create realm and primary zone if not already done
radosgw-admin realm create --rgw-realm=hybrid-realm --default
radosgw-admin zonegroup create --rgw-zonegroup=default --master --default
radosgw-admin zone create --rgw-zonegroup=default \
  --rgw-zone=on-prem-zone --master --default

# Create sync user for the cloud zone
radosgw-admin user create --uid=cloud-sync \
  --display-name="Cloud Sync User" --system

SYNC_ACCESS=$(radosgw-admin user info --uid=cloud-sync | jq -r '.keys[0].access_key')
SYNC_SECRET=$(radosgw-admin user info --uid=cloud-sync | jq -r '.keys[0].secret_key')
```

## Step 2 - Create the AWS Cloud Sync Zone

```bash
# Create a cloud tier zone pointing to AWS S3
radosgw-admin zone create \
  --rgw-zonegroup=default \
  --rgw-zone=aws-s3-zone \
  --tier-type=cloud \
  --access-key="${SYNC_ACCESS}" \
  --secret="${SYNC_SECRET}"

# Configure AWS S3 as the cloud endpoint
radosgw-admin zone modify \
  --rgw-zone=aws-s3-zone \
  --tier-config=connection.endpoint=https://s3.amazonaws.com,\
connection.access_key=AWS_ACCESS_KEY_ID,\
connection.secret=AWS_SECRET_ACCESS_KEY,\
connection.region=us-east-1,\
connection.host_style=virtual,\
target_path=my-ceph-archive-bucket

# Commit the period
radosgw-admin period update --commit
```

## Step 3 - Configure Sync Bucket Mapping

Control which local buckets sync to which S3 destinations:

```bash
# Configure per-bucket sync mapping
radosgw-admin zone modify \
  --rgw-zone=aws-s3-zone \
  --tier-config=multipart_sync_threshold=33554432,\
multipart_min_part_size=33554432

# Set the S3 storage class for synced objects
radosgw-admin zone modify \
  --rgw-zone=aws-s3-zone \
  --tier-config=connection.storage_class=STANDARD_IA
```

## Step 4 - Set Up the Cloud Sync Zone RGW Instance

```bash
# Start an RGW instance that runs the cloud sync zone
# Add to ceph.conf:
[client.rgw.cloud-sync]
rgw_zone = aws-s3-zone
rgw_zonegroup = default
rgw_realm = hybrid-realm

# Or via Rook, create a dedicated gateway
```

```yaml
# Rook ConfigMap override for cloud sync RGW
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [client.rgw.cloud-sync-store]
    rgw_zone = aws-s3-zone
```

## Step 5 - Monitor Sync Progress

```bash
# Check sync status for the cloud zone
radosgw-admin sync status --rgw-zone=aws-s3-zone

# Verify objects are appearing in AWS S3
aws s3 ls s3://my-ceph-archive-bucket/ --region us-east-1 | tail -10

# Check sync errors
radosgw-admin sync error list --max-entries=20 \
  | jq '.[] | {timestamp, source_zone, key, error_code}'

# View sync datalog
radosgw-admin datalog list --max-entries=10 \
  | jq '.[] | {key, timestamp}'
```

## Step 6 - Configure Storage Class Mapping

```bash
# Set the S3 storage class for synced objects to Glacier
radosgw-admin zone modify \
  --rgw-zone=aws-s3-zone \
  --tier-config=connection.storage_class=GLACIER

# Verify the zone tier config
radosgw-admin zone get --rgw-zone=aws-s3-zone | jq '.tier_config'
```

Test the full end-to-end sync:

```bash
# Upload an object to the primary zone
aws --endpoint-url http://on-prem-rgw:7480 \
  s3 cp /tmp/testfile.txt s3://mybucket/testfile.txt

# Wait for sync
sleep 60

# Verify it appeared in AWS S3
aws s3 ls s3://my-ceph-archive-bucket/mybucket/testfile.txt \
  --region us-east-1
```

## Summary

The Ceph RGW cloud sync module to AWS S3 creates a secondary zone with `tier-type=cloud` and configures AWS credentials as the target endpoint. Objects written to the primary on-premises zone are asynchronously replicated to S3, enabling cost-effective archive storage. Storage class mapping allows cold data to be automatically tiered to S3-IA or Glacier, reducing cloud storage costs.
