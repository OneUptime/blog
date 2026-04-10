# How to Handle Bucket Index Inconsistencies in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, RGW, Troubleshooting, Bucket Index, Object Storage

Description: Diagnose and repair Ceph RGW bucket index inconsistencies that cause incorrect object listings, wrong usage stats, or missing objects.

---

## What Causes Bucket Index Inconsistencies?

Bucket index inconsistencies occur when the RADOS bucket index diverges from the actual object data. Common causes include:

- OSD crashes during write operations
- Power failures mid-transaction
- Network partitions during multi-site sync
- Bug-induced partial writes in older Ceph versions

Symptoms include: `radosgw-admin bucket stats` showing incorrect object counts, objects that exist on disk but don't appear in listings, or 404 errors on objects you know are stored.

## Step 1: Run a Bucket Check

The first step is running the built-in consistency checker:

```bash
radosgw-admin bucket check --bucket my-bucket
```

This checks the index against actual RADOS objects and reports discrepancies. Add `--fix` to automatically repair what it finds:

```bash
radosgw-admin bucket check --bucket my-bucket --fix
```

## Step 2: Check All Buckets for a User

To audit all buckets owned by a specific user:

```bash
radosgw-admin bucket check --uid=alice --fix
```

## Step 3: Rebuild the Bucket Index

If the basic check does not resolve the issue, run a deeper check that compares the index against actual RADOS objects:

```bash
radosgw-admin bucket check --check-objects --fix --bucket my-bucket
```

If the index is severely corrupted, purge it entirely and rebuild from scratch:

```bash
radosgw-admin bi purge --bucket my-bucket
radosgw-admin bucket check --check-objects --fix --bucket my-bucket
```

## Step 4: Sync Stats After Fix

After repairs, verify the bucket stats are correct:

```bash
radosgw-admin bucket stats --bucket my-bucket
```

Then sync the user-level usage stats to reflect the repaired bucket:

```bash
radosgw-admin user stats --uid=<user> --sync-stats
```

## Step 5: Check the RADOS Objects Directly

Inspect the raw bucket index entries stored in RADOS:

```bash
# List index entries for the bucket
rados ls -p default.rgw.buckets.index | grep <bucket-id>

# Inspect a specific index object
rados listomapkeys -p default.rgw.buckets.index .dir.<bucket-id>.0
```

## Preventing Future Inconsistencies

- Ensure adequate journal/WAL configuration on OSDs
- Keep Ceph upgraded to avoid known index bugs
- Monitor `ceph health detail` for slow requests that may indicate OSD issues

```bash
ceph health detail | grep -i "slow requests"
```

## Summary

Ceph RGW bucket index inconsistencies are repaired with `radosgw-admin bucket check --fix` for minor issues and `bi purge` followed by `bucket check --check-objects --fix` for severe corruption. Always sync user stats after repair and inspect raw RADOS index objects when automated tools do not resolve the problem. Regular cluster health monitoring reduces the chance of inconsistencies occurring.
