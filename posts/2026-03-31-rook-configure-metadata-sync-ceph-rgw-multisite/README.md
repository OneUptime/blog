# How to Configure Metadata Sync in Ceph RGW Multisite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Multisite, Metadata, Sync, Storage, Kubernetes

Description: Learn how to configure and troubleshoot metadata synchronization between zones in a Ceph RGW multisite deployment.

---

## Overview

In a Ceph RGW multisite deployment, metadata sync propagates user accounts, bucket names, and ACLs from the master zone to secondary zones. Without proper metadata sync, buckets created on the master zone will not appear on secondary zones. This guide explains how metadata sync works and how to configure it correctly.

## How Metadata Sync Works

Metadata sync is a one-directional process from the master zone to all other zones. The metadata pool on secondary zones receives user info, bucket info, and bucket instance metadata. The `radosgw` process running on secondary zones pulls this metadata automatically.

Key metadata types that are synced:

- `user` - User accounts and credentials
- `bucket` - Bucket ownership information
- `bucket.instance` - Bucket configuration and shard layout

## Checking Metadata Sync Status

To verify that metadata sync is active and healthy:

```bash
radosgw-admin sync status
```

Look for output similar to:

```text
metadata sync: syncing
        full sync: 0/64 shards
        incremental sync: 64/64 shards
        metadata is caught up with master
```

For detailed shard-level metadata log inspection:

```bash
radosgw-admin mdlog list --shard-id=0
```

## Forcing Metadata Sync

If metadata sync is stalled or lagging, you can reset and restart it:

```bash
# Reset metadata sync on secondary zone
radosgw-admin metadata sync init
radosgw-admin metadata sync run
```

To trigger a full metadata re-sync for a specific type:

```bash
radosgw-admin metadata list bucket
radosgw-admin metadata sync run
```

## Configuring Sync Credentials

The secondary zone needs proper credentials to pull metadata from the master. Configure the zone with a system user:

```bash
# On the master zone, create a system user
radosgw-admin user create \
  --uid=zone.user \
  --display-name="Zone Sync User" \
  --access-key=AKIAIOSFODNN7EXAMPLE \
  --secret=wJalrXUtnFEMI \
  --system

# On the secondary zone, update zone credentials
radosgw-admin zone modify \
  --rgw-zone=zone2 \
  --access-key=AKIAIOSFODNN7EXAMPLE \
  --secret=wJalrXUtnFEMI

radosgw-admin period update --commit
```

## Monitoring Metadata Sync Lag

Track how far behind metadata sync is using the debug log or by comparing log markers:

```bash
# Check current metadata log marker on master
radosgw-admin mdlog list --shard-id=0 | tail -5

# Check secondary zone's current sync position
radosgw-admin sync status | grep "metadata"
```

Set up a simple monitoring script:

```bash
#!/bin/bash
STATUS=$(radosgw-admin sync status 2>&1 | grep "metadata is")
if echo "$STATUS" | grep -q "caught up"; then
  echo "OK: Metadata sync is current"
else
  echo "WARN: Metadata sync may be lagging: $STATUS"
fi
```

## Troubleshooting Common Issues

If metadata sync reports errors, check the RGW logs:

```bash
journalctl -u ceph-radosgw@* | grep -i "metadata sync" | tail -20
```

Common issues include clock skew between zones and network connectivity failures. Ensure NTP is synchronized:

```bash
chronyc tracking
timedatectl status
```

## Summary

Metadata sync in Ceph RGW multisite propagates user and bucket information from the master zone to secondaries. Configuring proper system user credentials, monitoring sync lag with `radosgw-admin sync status`, and periodically resetting stalled shards keeps metadata consistent across all zones. Stable network connectivity and synchronized clocks are critical prerequisites for reliable metadata sync.
