# How to Configure Selective Sync with Sync Policy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Sync, Policy

Description: Learn how to use Ceph RGW sync policy to selectively replicate specific buckets and prefixes between zones, reducing bandwidth and storage costs.

---

## Overview

Ceph RGW sync policy, introduced in Octopus (15.2), replaces the older per-zone bucket sync configuration with a more flexible, hierarchical policy system. Sync policies can be applied at the zonegroup, bucket, or even per-prefix level, enabling precise control over what data replicates between zones.

## Step 1 - Understanding Sync Policy Groups

A sync policy consists of groups with flow and pipe definitions:

```bash
# View existing sync policy
radosgw-admin sync policy get

# Sync policy structure:
# groups:
#   - id: group-name
#     status: enabled | allowed | forbidden
#     data_flow:
#       symmetrical: [zone pairs]
#       directional: [source -> dest]
#     pipes:
#       - id: pipe-name
#         source: {zones, bucket}
#         dest: {zones, bucket}
#         params: {prefix, tag_set, storage_class}
```

## Step 2 - Create a Selective Sync Policy

```bash
# Create a sync group that only syncs specific buckets
radosgw-admin sync group create \
  --group-id=selective-sync \
  --status=allowed

# Add a directional flow from primary to secondary
radosgw-admin sync group flow create \
  --group-id=selective-sync \
  --flow-id=primary-to-dr \
  --flow-type=directional \
  --source-zone=primary-zone \
  --dest-zone=dr-zone

# Create a pipe that syncs only the "production" bucket
radosgw-admin sync group pipe create \
  --group-id=selective-sync \
  --pipe-id=production-bucket-sync \
  --source-zones=primary-zone \
  --source-bucket=production \
  --dest-zones=dr-zone \
  --dest-bucket=production

# Commit the policy
radosgw-admin period update --commit
```

## Step 3 - Apply Prefix-Level Sync Filtering

```bash
# Sync only objects with a specific prefix
radosgw-admin sync group pipe modify \
  --group-id=selective-sync \
  --pipe-id=production-bucket-sync \
  --prefix="critical/" \
  --prefix-rm

# Verify the pipe configuration
radosgw-admin sync policy get | jq '.groups[] | select(.id == "selective-sync")'
```

## Step 4 - Configure Per-Bucket Sync Policy

```bash
# Apply a sync policy override at the bucket level
# This takes priority over the zonegroup-level policy

# Enable sync for a specific bucket
radosgw-admin sync group create \
  --bucket=important-bucket \
  --group-id=bucket-sync \
  --status=enabled

# Create a pipe for the bucket
radosgw-admin sync group pipe create \
  --bucket=important-bucket \
  --group-id=bucket-sync \
  --pipe-id=full-sync \
  --source-zones='*' \
  --dest-zones='*'

# Disable sync for a bucket that should not replicate
radosgw-admin sync group create \
  --bucket=local-only-bucket \
  --group-id=no-sync \
  --status=forbidden
```

## Step 5 - Sync with Tag Filters

```bash
# Sync only objects with a specific tag
radosgw-admin sync group pipe modify \
  --group-id=selective-sync \
  --pipe-id=tagged-sync \
  --tags-add=sync-required=true

# Objects must have this tag to be synced:
aws --endpoint-url http://rgw.example.com:7480 \
  s3api put-object \
  --bucket production \
  --key important-file.txt \
  --body /tmp/important-file.txt \
  --tagging "sync-required=true"
```

## Step 6 - Verify Selective Sync Behavior

```bash
# Check which buckets are being synced
radosgw-admin sync policy get --bucket=production

# Check the sync status for a specific bucket
radosgw-admin bucket sync status \
  --bucket=production \
  --source-zone=primary-zone

# Confirm a local-only bucket is excluded
radosgw-admin bucket sync status \
  --bucket=local-only-bucket \
  --source-zone=primary-zone 2>&1 | grep -i "forbidden\|disabled"

# List all sync errors to verify no unexpected failures
radosgw-admin sync error list --max-entries=20
```

## Summary

Ceph RGW sync policy provides hierarchical, granular control over data replication between zones. Using groups, flows, and pipes, you can restrict sync to specific buckets, object prefixes, or tagged objects. Per-bucket policy overrides allow individual buckets to opt in or opt out of zonegroup-wide sync, enabling compliance with data residency requirements and cost optimization through selective replication.
