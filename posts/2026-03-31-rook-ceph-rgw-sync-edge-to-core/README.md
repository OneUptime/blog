# How to Set Up Ceph RGW Sync for Edge-to-Core Data Transfer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Multi-Site, Edge Computing

Description: Learn how to configure Ceph RGW multi-site sync to asynchronously replicate object data from edge locations to the core datacenter.

---

Ceph RGW (RADOS Gateway) multi-site sync enables asynchronous object replication between geographically distributed Ceph clusters. This is ideal for edge-to-core scenarios where local writes at the edge are eventually synchronized to central storage.

## Architecture Overview

```text
Edge Site                          Core Datacenter
+-----------+                      +-----------+
| RGW Zone  |  --async-sync-->     | RGW Zone  |
| (edge-zone)|                     | (core-zone)|
+-----------+                      +-----------+
     |                                   |
   [realm: global]             [zonegroup: main]
```

## Step 1 - Configure the Core Zone

On the core cluster:

```bash
# Create realm
radosgw-admin realm create --rgw-realm=global --default

# Create zonegroup
radosgw-admin zonegroup create --rgw-zonegroup=main \
  --master --default

# Create master zone
radosgw-admin zone create --rgw-zonegroup=main \
  --rgw-zone=core-zone --master --default \
  --endpoints=http://core-rgw.example.com:80

# Create system user
radosgw-admin user create --uid=sync-user \
  --display-name="Sync User" --system

# Add system user keys to the master zone (use keys from user create output)
radosgw-admin zone modify --rgw-zone=core-zone \
  --access-key=<sync-user-access-key> \
  --secret=<sync-user-secret-key>

# Commit
radosgw-admin period update --commit
```

## Step 2 - Configure the Edge Zone

On the edge cluster:

```bash
# Pull realm configuration from core
radosgw-admin realm pull \
  --url=http://core-rgw.example.com:80 \
  --access-key=<core-access-key> \
  --secret=<core-secret-key>

# Create edge zone
radosgw-admin zone create --rgw-zonegroup=main \
  --rgw-zone=edge-zone \
  --endpoints=http://edge-rgw.local:80 \
  --access-key=<sync-access-key> \
  --secret=<sync-secret-key>

# Commit
radosgw-admin period update --commit --rgw-zone=edge-zone
```

## Step 3 - Deploy RGW in Rook

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: edge-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 2
  dataPool:
    replicated:
      size: 2
  gateway:
    port: 80
    instances: 1
  zone:
    name: edge-zone
```

## Verifying Sync Status

On the edge cluster:

```bash
radosgw-admin sync status
```

Expected output:

```text
          realm 1234-abcd (global)
      zonegroup main (main)
           zone edge-zone (edge-zone)
  metadata sync syncing
                full sync: 0/64 shards
                incremental sync: 64/64 shards
      data sync source: core-zone
                syncing
                full sync: 0/128 shards
                incremental sync: 128/128 shards
```

## Monitoring Sync Lag

```bash
radosgw-admin sync status --rgw-zone=edge-zone | grep behind
```

Set up a Prometheus alert for sync lag:

```bash
ceph_rgw_sync_fullsync_index_count
```

## Configuring Selective Bucket Sync

Sync only specific buckets to reduce bandwidth:

```bash
radosgw-admin bucket sync disable --bucket=local-only-bucket
radosgw-admin bucket sync enable --bucket=replicated-bucket
```

## Summary

Ceph RGW multi-site sync provides reliable edge-to-core data replication using an asynchronous pull model. Configuring realms, zonegroups, and zones correctly establishes the sync relationship. Monitoring sync lag and selectively enabling bucket-level sync helps manage bandwidth on constrained edge links.
