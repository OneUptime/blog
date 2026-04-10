# How to Implement Data Sovereignty with Ceph Multisite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Multisite, Data Sovereignty, Compliance, RGW

Description: Use Ceph multisite replication to enforce data sovereignty by pinning data to specific geographic regions and controlling cross-border data flows.

---

Data sovereignty laws like GDPR, data localization requirements in India, and similar regulations require that certain data remain within specific geographic boundaries. Ceph's multisite architecture lets you enforce these constraints at the storage level.

## Understanding Ceph Multisite Architecture

Ceph multisite consists of realms, zone groups, and zones. Each zone maps to a physical Ceph cluster in a specific location:

```yaml
Realm: global-company
  ZoneGroup: eu-region (eu-west)
    Zone: eu-primary (Frankfurt)
    Zone: eu-secondary (Amsterdam)
  ZoneGroup: us-region (us-east)
    Zone: us-primary (Virginia)
```

## Setting Up the Master Zone for EU Data

On the EU cluster, create the realm and master zone:

```bash
# Create the realm
radosgw-admin realm create --rgw-realm=sovereign-realm --default

# Create the EU zone group
radosgw-admin zonegroup create --rgw-zonegroup=eu-zonegroup \
  --master --default --endpoints=https://rgw-eu.example.com

# Create the EU master zone
radosgw-admin zone create --rgw-zonegroup=eu-zonegroup \
  --rgw-zone=eu-primary --master --default \
  --endpoints=https://rgw-eu.example.com

# Commit the configuration
radosgw-admin period update --commit
```

## Configuring Secondary Zone in the Same Region

```bash
# On the secondary EU cluster
radosgw-admin realm pull --url=https://rgw-eu.example.com \
  --access-key=<sync-access-key> --secret=<sync-secret>

radosgw-admin zone create --rgw-zonegroup=eu-zonegroup \
  --rgw-zone=eu-secondary \
  --endpoints=https://rgw-eu2.example.com \
  --access-key=<sync-access-key> --secret=<sync-secret>

radosgw-admin period update --commit
```

## Enforcing Bucket-Level Data Sovereignty

Use bucket placement to restrict where data is stored:

```bash
# Tag a placement target as EU-only
radosgw-admin zonegroup placement add \
  --rgw-zonegroup=eu-zonegroup \
  --placement-id=eu-only

# Create a bucket with the EU placement tag
aws s3api create-bucket \
  --bucket eu-customer-data \
  --create-bucket-configuration LocationConstraint=eu-zonegroup:eu-only \
  --endpoint-url https://rgw-eu.example.com
```

## Rook Configuration for Multisite

In Rook, configure the multisite topology via CephObjectZone:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectZone
metadata:
  name: eu-primary
  namespace: rook-ceph
spec:
  zoneGroup: eu-zonegroup
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
```

## Verifying Sync and Data Location

```bash
# Check sync status
radosgw-admin sync status

# Verify sync status for the EU bucket
radosgw-admin bucket sync status --bucket=eu-customer-data

# List all objects in the EU bucket
radosgw-admin bucket list --bucket=eu-customer-data
```

## Summary

Ceph multisite provides the building blocks for data sovereignty by organizing clusters into realms, zone groups, and zones that map to physical locations. By using placement targets and careful zone group configuration, you can ensure that regulated data never leaves its required geographic boundary while still maintaining high availability within the allowed region.
