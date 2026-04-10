# How to Configure Data Sync in Ceph RGW Multisite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Multisite, Data Sync, Replication, Storage, Kubernetes

Description: Learn how to configure object data synchronization between zones in a Ceph RGW multisite setup for active-passive or active-active deployments.

---

## Overview

Data sync in Ceph RGW multisite replicates the actual object data (not just metadata) from source zones to destination zones. While metadata sync handles bucket and user info, data sync is responsible for copying objects written to one zone across to peer zones. This guide explains how to configure, monitor, and tune data sync.

## How Data Sync Differs from Metadata Sync

Metadata sync is one-directional (master to secondaries), but data sync can be bidirectional in active-active setups. Each zone maintains a data log that records new object writes. Secondary zones read this log and replicate objects bucket by bucket.

Data sync pipelines:

- Source zone writes objects to its RADOS pools
- Data log entries are generated per bucket shard
- Secondary zone's sync agent reads and fetches objects

## Verifying Data Sync Status

Check overall sync health:

```bash
radosgw-admin sync status
```

To check per-bucket data sync status:

```bash
radosgw-admin bucket sync status --bucket=my-bucket
```

Example output showing healthy sync:

```bash
data sync: syncing
  source zone: zone1
    full sync: 0/128 shards
    incremental sync: 128/128 shards
    data is caught up with source
```

## Configuring Data Sync on a Secondary Zone

The secondary zone must be configured with its own endpoint and the shared system user credentials:

```bash
radosgw-admin zone modify \
  --rgw-zone=zone2 \
  --endpoints=http://zone2-rgw.example.com \
  --access-key=SYNC_ACCESS_KEY \
  --secret=SYNC_SECRET_KEY

radosgw-admin period update --commit
systemctl restart ceph-radosgw@*
```

## Tuning Data Sync Performance

Increase sync concurrency to speed up replication of large bucket inventories:

```bash
# Set in ceph.conf
[client.rgw.zone2]
rgw_data_sync_spawn_window = 20
rgw_bucket_sync_spawn_window = 25
```

Apply the changes:

```bash
ceph config set client.rgw rgw_data_sync_spawn_window 20
ceph config set client.rgw rgw_bucket_sync_spawn_window 25
```

## Monitoring Data Sync Lag

Measure how much data is queued for sync:

```bash
# Count pending sync entries across all shards
for i in $(seq 0 127); do
  radosgw-admin datalog list --shard-id=$i 2>/dev/null | wc -l
done | awk '{sum+=$1} END {print "Pending sync entries:", sum}'
```

Query metrics via the Ceph MGR Prometheus module (default port 9283):

```bash
curl http://ceph-mgr.example.com:9283/metrics | grep rgw_data_sync
```

## Handling Sync Errors

When objects fail to sync, they appear in the sync error log:

```bash
radosgw-admin sync error list
```

To retry failed syncs:

```bash
radosgw-admin sync error trim --start-date=2026-01-01
radosgw-admin bucket sync run --bucket=my-bucket --source-zone=zone1
```

Force a full resync for a specific bucket by disabling and re-enabling sync:

```bash
radosgw-admin bucket sync disable --bucket=my-bucket
radosgw-admin bucket sync enable --bucket=my-bucket
```

## Summary

Data sync in Ceph RGW multisite copies object data between zones using per-bucket shard log pipelines. Configuring proper endpoint URLs and credentials on secondary zones, tuning concurrency parameters, and monitoring sync lag with `radosgw-admin sync status` ensures timely replication. When errors occur, the sync error log and per-bucket resync tools allow targeted remediation without disrupting healthy replication flows.
