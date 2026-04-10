# How to Configure Multisite Sync Policy in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Multisite, Sync Policy, Object Storage

Description: Learn how to configure fine-grained multisite sync policies in Ceph RGW to control which buckets and objects are synchronized between zones.

---

## Overview

Ceph RGW multisite sync policies let you define granular rules for which buckets, prefixes, or tags are synchronized between zones. This replaces the all-or-nothing zone sync with selective replication, enabling hybrid configurations where some buckets sync globally while others remain local to a zone.

## Sync Policy Hierarchy

Sync policies can be configured at three levels:

1. **Zone group policy** - default policy for all zones
2. **Bucket policy** - overrides zone group policy for a specific bucket
3. **Pipe-level filters** - filters sync based on object tags or prefixes within a pipe

## Understanding Sync Flow

A sync policy consists of:
- **Groups** - named collections of sync rules
- **Flows** - define data movement patterns between zones (symmetrical or directional)
- **Pipes** - specify which buckets participate and their filtering criteria (source/dest zones, tags, prefixes)

```bash
# View current sync policy
radosgw-admin sync policy get

# View bucket-level policy
radosgw-admin sync policy get --bucket=mybucket
```

## Creating a Zone Group Sync Policy

```bash
# Create a sync policy group
radosgw-admin sync group create \
  --group-id=all-sync \
  --status=enabled

# Add a flow between all zones
radosgw-admin sync group flow create \
  --group-id=all-sync \
  --flow-id=all-zones-flow \
  --flow-type=symmetrical \
  --zones=us-east,us-west

# Create a pipe for all buckets
radosgw-admin sync group pipe create \
  --group-id=all-sync \
  --pipe-id=all-buckets \
  --source-zones='*' \
  --dest-zones='*'

# Commit
radosgw-admin period update --commit
```

## Creating a Bucket-Specific Sync Policy

Restrict sync for a sensitive bucket to only the us-east zone:

```bash
# Create a local-only group for the bucket
radosgw-admin sync group create \
  --bucket=confidential-bucket \
  --group-id=local-only \
  --status=enabled

# Create a directional flow - only east to east (no sync out)
radosgw-admin sync group flow create \
  --bucket=confidential-bucket \
  --group-id=local-only \
  --flow-id=no-outbound \
  --flow-type=directional \
  --source-zone=us-east \
  --dest-zone=us-east

radosgw-admin period update --commit
```

## Filtering by Object Tags

Create a sync pipe that only syncs objects with a specific tag:

```bash
# Create a tagged-sync group
radosgw-admin sync group create \
  --group-id=tagged-sync \
  --status=enabled

radosgw-admin sync group pipe create \
  --group-id=tagged-sync \
  --pipe-id=backup-tagged \
  --source-zones=us-east \
  --dest-zones=us-west \
  --tags-add="backup=true"

radosgw-admin period update --commit
```

## Checking Sync Status with Custom Policies

```bash
# Check which objects are syncing under the policy
radosgw-admin bucket sync status --bucket mybucket

# Check overall sync status
radosgw-admin sync status
```

## Summary

Ceph RGW multisite sync policies provide bucket and tag-level control over cross-zone object replication. Policies use groups, flows, and pipes to define sync topology. Bucket-level policies override the zone group default, enabling selective replication for sensitive or localized data. Always run `radosgw-admin period update --commit` after policy changes to propagate them cluster-wide.
