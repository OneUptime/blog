# How to Set Up Ceph RGW Multisite Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Multisite, S3, Object Storage

Description: Learn how to configure Ceph RGW multisite replication to synchronize S3 object data across multiple geographic zones for high availability and DR.

---

## Overview

Ceph RGW multisite allows you to replicate object storage data across multiple Ceph clusters in different physical locations. The multisite topology consists of realms, zone groups, and zones. Each zone runs its own RGW instances, and data is automatically synchronized between zones within a zone group.

## Multisite Topology Concepts

- **Realm** - top-level container, defines the global namespace
- **Zone Group** - collection of zones that synchronize with each other
- **Zone** - a Ceph cluster instance with its own RGW and storage pools
- **Master zone** - the authoritative zone for metadata operations

## Step 1: Create a Realm on the Master Zone

```bash
# Create the realm
radosgw-admin realm create --rgw-realm=production --default

# Create the master zone group
radosgw-admin zonegroup create \
  --rgw-zonegroup=us \
  --endpoints=http://master-rgw-host:80 \
  --master \
  --default

# Create the master zone
radosgw-admin zone create \
  --rgw-zonegroup=us \
  --rgw-zone=us-east \
  --endpoints=http://master-rgw-host:80 \
  --master \
  --default

# Commit the changes
radosgw-admin period update --rgw-realm=production --commit
```

## Step 2: Create Sync User

```bash
# Create a sync user for inter-zone authentication
radosgw-admin user create \
  --uid=zone-sync-user \
  --display-name="Zone Sync User" \
  --access-key=zone-sync-key \
  --secret=zone-sync-secret \
  --system

# Update the master zone with the sync user credentials
radosgw-admin zone modify \
  --rgw-zone=us-east \
  --access-key=zone-sync-key \
  --secret=zone-sync-secret

# Commit the updated configuration
radosgw-admin period update --commit
```

## Step 3: Configure the Secondary Zone

On the secondary cluster:

```bash
# Pull the realm configuration from the master
radosgw-admin realm pull \
  --url=http://master-rgw-host:80 \
  --access-key=zone-sync-key \
  --secret=zone-sync-secret

# Create the secondary zone
radosgw-admin zone create \
  --rgw-zonegroup=us \
  --rgw-zone=us-west \
  --access-key=zone-sync-key \
  --secret=zone-sync-secret \
  --endpoints=http://secondary-rgw-host:80

# Update and commit
radosgw-admin period update --commit
```

## Rook: Multisite via CephObjectStore

In Rook, multisite is configured using `CephObjectRealm`, `CephObjectZoneGroup`, and `CephObjectZone`:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectRealm
metadata:
  name: production
  namespace: rook-ceph
---
apiVersion: ceph.rook.io/v1
kind: CephObjectZoneGroup
metadata:
  name: us
  namespace: rook-ceph
spec:
  realm: production
---
apiVersion: ceph.rook.io/v1
kind: CephObjectZone
metadata:
  name: us-east
  namespace: rook-ceph
spec:
  zoneGroup: us
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
```

## Verifying Synchronization

```bash
# Check sync status
radosgw-admin sync status

# Test by uploading an object on the primary
aws s3 cp testfile.txt s3://mybucket/ --endpoint-url http://master-rgw:80

# Verify it appears on the secondary
aws s3 ls s3://mybucket/ --endpoint-url http://secondary-rgw:80
```

## Summary

Ceph RGW multisite replication uses a realm-zone group-zone hierarchy to synchronize objects across clusters. The master zone handles metadata operations while all zones participate in data replication. In Rook, multisite is configured through dedicated CRDs. Always verify sync status after setup and test cross-zone object visibility to confirm proper operation.
