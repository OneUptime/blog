# How to Handle Bucket Resharding in Multisite Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Multisite, Resharding, Bucket, Storage, Kubernetes

Description: Learn how bucket resharding works in Ceph RGW multisite and how to safely perform and monitor resharding without disrupting data sync.

---

## Overview

Bucket resharding in Ceph RGW increases the number of index shards for a bucket to improve performance at high object counts. In a multisite deployment, resharding is more complex because shard changes must propagate to all zones and the sync process must adapt to the new shard layout. This guide explains the process and pitfalls.

## Why Resharding Matters in Multisite

Each bucket has an index shard count. When a bucket grows beyond millions of objects, performance degrades. Resharding increases the shard count. In multisite, resharding must happen on all zones consistently - if zones disagree on shard counts, data sync can fail.

## Checking Bucket Shard Count

Before resharding, check the current shard configuration:

```bash
radosgw-admin bucket stats --bucket=my-large-bucket | python3 -c "
import sys, json
stats = json.load(sys.stdin)
print('Num shards:', stats['num_shards'])
print('Object count:', stats['usage']['rgw.main']['num_objects'])
"
```

## Performing Manual Resharding

To reshard a bucket manually:

```bash
# Perform immediate inline resharding (blocks bucket I/O)
radosgw-admin bucket reshard \
  --bucket=my-large-bucket \
  --num-shards=128 \
  --yes-i-really-mean-it
```

For online resharding without downtime:

```bash
# Ceph Pacific+ supports online resharding
radosgw-admin reshard add --bucket=my-large-bucket --num-shards=128
radosgw-admin reshard process
```

## Monitoring Reshard Progress

Check the reshard queue:

```bash
radosgw-admin reshard list
```

Monitor active reshard operations:

```bash
radosgw-admin reshard status --bucket=my-large-bucket
```

Watch for completion:

```bash
watch -n 5 "radosgw-admin reshard status --bucket=my-large-bucket | grep -E 'status|resharding_status'"
```

## Multisite Sync After Resharding

After resharding, the bucket instance metadata changes. Secondary zones need to pick up the new shard layout. Verify sync status:

```bash
radosgw-admin bucket sync status --bucket=my-large-bucket
```

If sync is stuck after resharding, reinitialize the bucket sync by disabling and re-enabling it:

```bash
radosgw-admin bucket sync disable --bucket=my-large-bucket
radosgw-admin bucket sync enable --bucket=my-large-bucket
```

## Enabling Automatic Resharding

Ceph can automatically reshard buckets based on object count thresholds:

```bash
ceph config set global rgw_dynamic_resharding true
ceph config set global rgw_max_objs_per_shard 100000
ceph config set global rgw_reshard_thread_interval 600
```

These settings trigger resharding when any shard exceeds 100,000 objects, checking every 10 minutes.

## Avoiding Sync Conflicts

To prevent sync issues during resharding in multisite:

```bash
# Disable bucket sync before resharding
radosgw-admin bucket sync disable --bucket=my-large-bucket

# Perform resharding on master zone
radosgw-admin bucket reshard --bucket=my-large-bucket --num-shards=128

# Re-enable bucket sync after resharding is complete
radosgw-admin bucket sync enable --bucket=my-large-bucket
```

## Summary

Bucket resharding in multisite Ceph RGW requires careful coordination to avoid breaking data sync. Monitoring the reshard queue, verifying bucket sync status after resharding, and optionally pausing sync during the reshard window prevents inconsistencies. Enabling automatic resharding with appropriate thresholds reduces manual intervention for growing buckets in production multisite environments.
