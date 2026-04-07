# How to Reshard Large Buckets in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, RGW, Resharding, Performance, Object Storage

Description: Learn how to reshard large Ceph RGW buckets to distribute the index across more shards and eliminate listing and write performance bottlenecks.

---

## Why Resharding Is Necessary

Ceph RGW stores a bucket index in RADOS objects. By default, a new bucket has a single index shard. As the object count grows into the millions, a single shard becomes a bottleneck, causing slow listings, high latency on writes, and potential OSD overload on the hosting OSD.

Resharding distributes the index across multiple shards to alleviate this.

## Checking Current Shard Count

```bash
radosgw-admin bucket stats --bucket my-large-bucket | grep -E "num_shards|num_objects"
```

As a rule of thumb, aim for no more than 100,000-150,000 objects per shard.

## Manual Resharding

Trigger an immediate reshard to a specific shard count:

```bash
radosgw-admin bucket reshard \
  --bucket my-large-bucket \
  --num-shards 64
```

This command runs the reshard synchronously in the foreground. For very large buckets, this can take a long time.

Monitor progress:

```bash
radosgw-admin reshard status --bucket my-large-bucket
```

## Dynamic Resharding (Automatic)

Ceph has supported automatic dynamic resharding since Luminous (12.2.x), with significant reliability improvements in Nautilus and later releases. When enabled, RGW monitors bucket object counts and reshards automatically when thresholds are exceeded.

Enable it globally:

```bash
ceph config set client.rgw rgw_dynamic_resharding true
ceph config set client.rgw rgw_max_objs_per_shard 100000
```

Check the reshard queue:

```bash
radosgw-admin reshard list
```

Execute pending reshards from the queue:

```bash
radosgw-admin reshard process
```

## Canceling a Reshard

If a reshard is in progress and you need to cancel:

```bash
radosgw-admin reshard cancel --bucket my-large-bucket
```

## Verifying After Reshard

Confirm the new shard count:

```bash
radosgw-admin bucket stats --bucket my-large-bucket | grep num_shards
```

List the RADOS index objects directly:

```bash
rados ls -p default.rgw.buckets.index | grep "$(radosgw-admin bucket stats --bucket my-large-bucket | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["id"])')"
```

## Summary

RGW bucket resharding distributes the bucket index across multiple RADOS shards to prevent performance bottlenecks as object counts grow. Use `radosgw-admin bucket reshard` for immediate manual resharding, or enable `rgw_dynamic_resharding` for automatic management. Monitor the reshard queue with `reshard list` and check completion with `reshard status`.
