# How to Set Multisite Sync Settings in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, RGW, Multisite, Object Storage

Description: Configure Ceph RGW multisite sync settings including rgw_zone, rgw_zonegroup, and rgw_realm to enable active-active or active-passive object storage replication.

---

## RGW Multisite Concepts

Ceph RGW multisite creates a hierarchy for managing object data replication:

```text
Realm
  |
  +-- Zonegroup (maps to a geographic region)
  |     |
  |     +-- Zone (maps to a single Ceph cluster)
  |           |
  |           +-- RGW instances
```

- **Realm**: Top-level container, globally unique name
- **Zonegroup**: Groups zones in the same region, shares S3/Swift API endpoints
- **Zone**: Represents a single Ceph cluster's RGW storage

## Multisite Sync Settings

The core configuration settings are:

```text
rgw_realm        - Which realm this RGW belongs to
rgw_zonegroup    - Which zonegroup within the realm
rgw_zone         - Which zone within the zonegroup
```

## Step 1 - Set Up the Primary Zone (Master)

On the primary cluster, create the realm, zonegroup, and zone:

```bash
# Create the realm
radosgw-admin realm create --rgw-realm=global --default

# Create the master zonegroup
radosgw-admin zonegroup create \
  --rgw-zonegroup=us-east \
  --master \
  --default \
  --endpoints=http://rgw-primary.example.com:80

# Create the master zone
radosgw-admin zone create \
  --rgw-zonegroup=us-east \
  --rgw-zone=us-east-1 \
  --master \
  --default \
  --endpoints=http://rgw-primary.example.com:80

# Commit the period
radosgw-admin period update --commit
```

## Step 2 - Configure RGW to Use the Zone

Set the zone settings in the Ceph configuration:

```bash
# Set zone settings in ceph.conf or via ceph config
ceph config set client.rgw.primary rgw_realm global
ceph config set client.rgw.primary rgw_zonegroup us-east
ceph config set client.rgw.primary rgw_zone us-east-1
```

Or in `ceph.conf`:

```text
[client.rgw.primary]
rgw_realm = global
rgw_zonegroup = us-east
rgw_zone = us-east-1
```

Restart RGW after configuration changes:

```bash
systemctl restart ceph-radosgw@rgw.primary
# Or via cephadm:
ceph orch restart rgw.primary
```

## Step 3 - Create a System User for Sync

```bash
# Create a system user for zone sync (used for authentication between zones)
radosgw-admin user create \
  --uid=zone-sync-user \
  --display-name="Zone Sync User" \
  --system

# Note the access_key and secret_key from the output

# Update the master zone with the system user's credentials
radosgw-admin zone modify \
  --rgw-zone=us-east-1 \
  --access-key=<sync-user-access-key> \
  --secret=<sync-user-secret>

# Commit the updated period
radosgw-admin period update --commit
```

## Step 4 - Set Up the Secondary Zone

On the secondary cluster, pull the realm and period from the primary:

```bash
# Pull the realm configuration from the primary
radosgw-admin realm pull \
  --url=http://rgw-primary.example.com:80 \
  --access-key=<sync-user-access-key> \
  --secret=<sync-user-secret>

# Set the pulled realm as default
radosgw-admin realm default --rgw-realm=global

# Pull the current period
radosgw-admin period pull \
  --url=http://rgw-primary.example.com:80 \
  --access-key=<sync-user-access-key> \
  --secret=<sync-user-secret>
```

## Step 5 - Create the Secondary Zone

```bash
# Create the secondary zone
radosgw-admin zone create \
  --rgw-zonegroup=us-east \
  --rgw-zone=us-east-2 \
  --endpoints=http://rgw-secondary.example.com:80 \
  --access-key=<sync-user-access-key> \
  --secret=<sync-user-secret>

# Commit the period through the master zone
radosgw-admin period update --commit \
  --url=http://rgw-primary.example.com:80 \
  --access-key=<sync-user-access-key> \
  --secret=<sync-user-secret>
```

## Step 6 - Configure Secondary RGW

```bash
ceph config set client.rgw.secondary rgw_realm global
ceph config set client.rgw.secondary rgw_zonegroup us-east
ceph config set client.rgw.secondary rgw_zone us-east-2
```

## Verifying Sync Status

```bash
# Check sync status from secondary
radosgw-admin sync status

# Expected output when healthy:
# realm: global
# zonegroup: us-east
# data sync source: us-east-1 (primary)
#   status: running
#   full sync: 0/128 shards
#   incremental sync: 128/128 shards
#   bucket shards behind: 0
```

## Monitoring Sync Lag

```bash
# Check data sync lag
radosgw-admin sync status | grep -i "behind\|lag\|error"

# Detailed per-shard sync status
radosgw-admin data sync status --source-zone=us-east-1
radosgw-admin metadata sync status
```

## Rook Multisite Configuration

In Rook, configure zones using CephObjectZone, CephObjectZoneGroup, and CephObjectRealm resources:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectRealm
metadata:
  name: global
  namespace: rook-ceph

---
apiVersion: ceph.rook.io/v1
kind: CephObjectZoneGroup
metadata:
  name: us-east
  namespace: rook-ceph
spec:
  realm: global

---
apiVersion: ceph.rook.io/v1
kind: CephObjectZone
metadata:
  name: us-east-1
  namespace: rook-ceph
spec:
  zoneGroup: us-east
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
```

## Summary

Ceph RGW multisite sync is configured through a three-level hierarchy: realm, zonegroup, and zone. The primary zone is the master that holds the authoritative period configuration. Secondary zones pull the realm and period configuration from the primary, then create their own zone entry and commit through the master. The `rgw_realm`, `rgw_zonegroup`, and `rgw_zone` settings in the Ceph configuration map each RGW instance to its place in the hierarchy. Monitor sync health with `radosgw-admin sync status` and track lag with `radosgw-admin data sync status`.
