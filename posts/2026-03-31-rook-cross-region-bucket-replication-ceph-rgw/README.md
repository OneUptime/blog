# How to Set Up Cross-Region Bucket Replication in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, RGW, Replication, Multi-Site

Description: Step-by-step guide to configuring cross-region bucket replication between two Ceph RGW zones to achieve geo-redundancy and disaster recovery.

---

## Overview

Ceph RGW multi-site replication lets you replicate bucket data across geographically separate clusters. This is useful for disaster recovery, data locality, and read scaling. The replication is asynchronous and operates at the zone level.

## Architecture

A typical multi-site setup consists of:

- **Realm** - the top-level namespace
- **Zonegroup** - a set of zones in a geographic region
- **Zone** - an individual cluster (e.g., zone-us-east, zone-us-west)

## Step 1: Create the Realm on the Primary Zone

```bash
radosgw-admin realm create --rgw-realm=production --default
radosgw-admin zonegroup create --rgw-zonegroup=us --endpoints=http://primary-rgw.example.com:7480 --rgw-realm=production --master --default
radosgw-admin zone create --rgw-zonegroup=us --rgw-zone=us-east-1 --master --default --endpoints=http://primary-rgw.example.com:7480
radosgw-admin period update --commit
```

## Step 2: Create a Sync User

```bash
radosgw-admin user create \
  --uid=sync-user \
  --display-name="Replication Sync User" \
  --system
```

Note the `access_key` and `secret_key` from the output.

Update the master zone with the system user credentials:

```bash
radosgw-admin zone modify --rgw-zone=us-east-1 \
  --access-key=<access_key> \
  --secret=<secret_key>

radosgw-admin period update --commit
```

## Step 3: Configure the Secondary Zone

On the secondary cluster, pull the realm configuration:

```bash
radosgw-admin realm pull \
  --url=http://primary-rgw.example.com:7480 \
  --access-key=<sync_access_key> \
  --secret=<sync_secret_key>

radosgw-admin realm default --rgw-realm=production

radosgw-admin period pull \
  --url=http://primary-rgw.example.com:7480 \
  --access-key=<sync_access_key> \
  --secret=<sync_secret_key>
```

Create the secondary zone:

```bash
radosgw-admin zone create \
  --rgw-zonegroup=us \
  --rgw-zone=us-west-1 \
  --access-key=<sync_access_key> \
  --secret=<sync_secret_key> \
  --endpoints=http://secondary-rgw.example.com:7480

radosgw-admin period update --commit
```

## Step 4: Verify Sync Status

Check that synchronization is active:

```bash
radosgw-admin sync status
```

Expected output includes lines like:

```text
          realm <id> (production)
      zonegroup <id> (us)
           zone <id> (us-west-1)
  metadata sync syncing
                full sync: 0/64 shards
                incremental sync: 64/64 shards
      data sync source: <id> (us-east-1)
                        syncing
                        full sync: 0/128 shards
                        incremental sync: 128/128 shards
                        data is caught up with source
```

## Step 5: Test Replication

Create a bucket on the primary zone and upload an object:

```bash
aws s3 mb s3://test-replication --endpoint-url http://primary-rgw.example.com:7480
aws s3 cp myfile.txt s3://test-replication/ --endpoint-url http://primary-rgw.example.com:7480
```

Within a few seconds, confirm the object appears on the secondary:

```bash
aws s3 ls s3://test-replication/ --endpoint-url http://secondary-rgw.example.com:7480
```

## Summary

Ceph RGW cross-region replication uses a realm, zonegroup, and zone hierarchy to sync data across clusters asynchronously. Set up a system sync user on the primary, pull the realm config on secondaries, and use `radosgw-admin sync status` to verify replication health. Test by uploading objects to the primary and confirming they appear on the secondary zone.
