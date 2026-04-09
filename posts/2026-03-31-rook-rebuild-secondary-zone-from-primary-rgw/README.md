# How to Rebuild Secondary Zone from Primary in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Multisite, Zone Rebuild, Disaster Recovery, Sync

Description: Rebuild a corrupted or out-of-sync Ceph RGW secondary zone from the primary by reinitializing sync, performing a full resync, and verifying data consistency.

---

## Overview

Sometimes a secondary zone becomes severely out of sync due to hardware failure, prolonged network partition, or corruption. When incremental sync cannot catch up the secondary zone, a full rebuild from the primary is necessary. This guide covers the process of wiping and resyncing the secondary zone.

## When to Rebuild vs Incremental Resync

Rebuild is appropriate when:
- Incremental sync errors exceed thousands of objects
- The secondary zone's Ceph cluster had hardware failures
- Data corruption is detected on the secondary
- The secondary zone has been offline for a very long time

```bash
# Check if incremental sync is feasible
radosgw-admin data sync status --source-zone=us-east | grep -E "behind|error"

# If behind count is very high or sync is stuck, rebuild is needed
```

## Step 1 - Prepare the Primary Zone

Ensure the primary zone is fully healthy:

```bash
# On primary zone
ceph status
ceph health detail

# Verify RGW is running and accepting operations
radosgw-admin sync status
```

## Step 2 - Pull Period from Primary

On the secondary zone, pull the current realm/period from primary:

```bash
# Pull realm configuration from primary
radosgw-admin realm pull --url=http://us-east-rgw.example.com \
    --access-key=<sync-access-key> --secret=<sync-secret-key>

# Pull current period
radosgw-admin period pull --url=http://us-east-rgw.example.com \
    --access-key=<sync-access-key> --secret=<sync-secret-key>

# Verify the period was pulled correctly
radosgw-admin period get | python3 -m json.tool | grep epoch
```

## Step 3 - Initialize Full Sync

```bash
# Initialize data sync from scratch on the secondary
radosgw-admin data sync init --source-zone=us-east

# Initialize metadata sync from scratch
radosgw-admin metadata sync init --source-zone=us-east

# Restart RGW on secondary to start fresh sync
systemctl restart ceph-radosgw@rgw.us-west
```

## Step 4 - Monitor Full Sync Progress

```bash
# Watch sync progress - full sync can take hours for large datasets
watch -n 60 'radosgw-admin sync status'

# More detailed progress
radosgw-admin data sync status --source-zone=us-east

# Count shards remaining
radosgw-admin data sync status --source-zone=us-east | \
    grep -oP '\d+/\d+ shards' | tail -1
```

## Step 5 - Force Resync Specific Buckets

For critical buckets, force an immediate resync:

```bash
# Force bucket sync from primary
radosgw-admin bucket sync run --bucket=critical-bucket --source-zone=us-east

# Check bucket sync status
radosgw-admin bucket sync status --bucket=critical-bucket --source-zone=us-east
```

## Step 6 - Verify Rebuild Completion

```bash
# Wait for full sync completion (both metadata and data must be caught up)
while true; do
    SYNC_OUTPUT=$(radosgw-admin sync status 2>&1)
    CAUGHT_UP=$(echo "$SYNC_OUTPUT" | grep -c "caught up")
    if [ "$CAUGHT_UP" -ge 2 ]; then
        echo "Secondary zone fully synced!"
        break
    fi
    echo "Still syncing ($CAUGHT_UP/2 caught up)... $(date)"
    sleep 120
done

# Final verification
radosgw-admin sync status
radosgw-admin bucket stats --bucket=critical-bucket

# Compare object count with primary
radosgw-admin bucket stats --bucket=critical-bucket | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print('Objects:', d.get('usage',{}).get('rgw.main',{}).get('num_objects',0))"
```

## Estimating Rebuild Time

```bash
# Estimate based on data volume and network bandwidth
# Get total data size in primary zone
radosgw-admin bucket list | python3 -c "import sys,json; [print(b) for b in json.load(sys.stdin)]" | \
while read b; do
    radosgw-admin bucket stats --bucket="$b" 2>/dev/null | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('usage',{}).get('rgw.main',{}).get('size_actual',0))"
done | awk '{sum+=$1} END {print sum/1024/1024/1024, "GB total"}'
```

## Summary

Rebuilding a Ceph RGW secondary zone from primary requires pulling the current realm/period configuration, reinitializing sync from scratch, and monitoring progress until all data and metadata shards report caught up. The rebuild process can be slow for large datasets - estimate timing based on data volume and available network bandwidth between zones. Verify object counts and bucket integrity after completion before relying on the rebuilt secondary for DR.
