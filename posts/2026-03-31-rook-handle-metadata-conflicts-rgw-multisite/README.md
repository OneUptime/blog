# How to Handle Metadata Conflicts in Ceph RGW Multisite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Multisite, Metadata, Conflict, Consistency

Description: Detect and resolve metadata conflicts in Ceph RGW multisite deployments caused by concurrent writes, split-brain scenarios, and failed sync operations.

---

## Overview

Metadata conflicts in Ceph RGW multisite occur when the same bucket or user metadata is modified in two zones simultaneously. Unlike object data conflicts (which are resolved by version timestamps), metadata conflicts require manual identification and resolution.

## Types of Metadata Conflicts

1. **Bucket metadata conflicts** - bucket configuration modified in both zones
2. **User metadata conflicts** - user account settings diverged between zones
3. **Bucket owner conflicts** - bucket ownership differs between zones
4. **ACL/policy conflicts** - access control diverged between zones

## Detecting Metadata Conflicts

```bash
# Check metadata sync status
radosgw-admin metadata sync status

# List pending metadata sync operations
radosgw-admin metadata sync status | grep -E "behind|conflict|error"

# View metadata log entries for a specific shard
radosgw-admin mdlog list --shard-id=0 | head -20

# Check metadata log status across all shards
radosgw-admin mdlog status
```

## Comparing Metadata Between Zones

```bash
# Compare bucket metadata between zones
# radosgw-admin operates against the local RADOS cluster, so run from each zone's host

# On Zone A host (us-east):
radosgw-admin metadata get bucket:mybucket \
    | python3 -m json.tool > /tmp/bucket-us-east.json

# On Zone B host (us-west):
radosgw-admin metadata get bucket:mybucket \
    | python3 -m json.tool > /tmp/bucket-us-west.json

# Diff the metadata
diff /tmp/bucket-us-east.json /tmp/bucket-us-west.json
```

## Resolving Bucket Metadata Conflicts

```bash
# Re-sync bucket metadata from authoritative zone to secondary
# First, identify which zone has the correct state (run on the authoritative zone's host)
radosgw-admin bucket stats --bucket=mybucket

# Force resync of bucket metadata
radosgw-admin metadata get bucket:mybucket > /tmp/bucket-meta.json
# Edit if needed, then put it back
radosgw-admin metadata put bucket:mybucket < /tmp/bucket-meta.json

# Verify bucket sync status (sync propagates automatically via the RGW daemon)
radosgw-admin bucket sync status --bucket=mybucket
```

## Resolving User Metadata Conflicts

```bash
# Compare user metadata between zones
radosgw-admin user info --uid=myuser > /tmp/user-local.json

# Fetch from another zone via the admin API
curl -s "http://us-east-rgw.example.com/admin/user?uid=myuser" \
    -H "Authorization: AWS <access-key>:<signature>" \
    | python3 -m json.tool > /tmp/user-remote.json

diff /tmp/user-local.json /tmp/user-remote.json
```

## Re-Syncing All Metadata

For widespread conflicts after a long split-brain or major sync failure:

```bash
# Trigger full metadata resync from primary
radosgw-admin metadata sync init --source-zone=us-east

# Run metadata sync
radosgw-admin metadata sync run --source-zone=us-east

# Monitor progress
watch -n 30 'radosgw-admin metadata sync status'
```

## Detecting Orphaned Bucket Entries

```bash
# Check for buckets that exist in metadata but not in data
radosgw-admin bucket list | while read bucket; do
    STATUS=$(radosgw-admin bucket stats --bucket=$bucket 2>&1)
    if echo "$STATUS" | grep -q "does not exist"; then
        echo "Orphaned bucket metadata: $bucket"
    fi
done
```

## Rebuilding Bucket Index After Conflict

```bash
# Rebuild the bucket index from actual object state in OSDs
radosgw-admin bucket check --bucket=mybucket --check-objects --fix

# Verify the bucket index is consistent
radosgw-admin bucket check --bucket=mybucket
```

## Summary

Metadata conflicts in Ceph RGW multisite require careful identification by comparing metadata between zones, then resolving by pushing the authoritative version using `radosgw-admin metadata put` and triggering a resync. For widespread conflicts, a full metadata resync from the authoritative zone is the most reliable recovery path. Always verify sync status returns clean after conflict resolution.
