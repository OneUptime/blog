# How to Fix LARGE_OMAP_OBJECTS Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OMAP, Health Check, Performance

Description: Learn how to resolve LARGE_OMAP_OBJECTS in Ceph, a warning about objects with excessive key-value metadata that degrades OSD and MDS performance.

---

## What Is LARGE_OMAP_OBJECTS?

`LARGE_OMAP_OBJECTS` is a Ceph health warning triggered when one or more RADOS objects have an unusually large number of OMAP (object map) key-value entries. OMAP is the per-object key-value store used by CephFS (for directory entries), RGW (for bucket indexes), and other Ceph services.

When an OMAP object grows too large, BlueStore performance degrades significantly because OMAP data is stored in RocksDB inside BlueStore, and large OMAP entries create RocksDB compaction pressure. This can cause slow OSD operations and increased latency.

## Identifying Large OMAP Objects

Check health detail:

```bash
ceph health detail
```

Example output:

```text
[WRN] LARGE_OMAP_OBJECTS: 2 large omap objects
    2 large omap objects found in pool 'default.rgw.buckets.index'
```

List large OMAP objects in a pool:

```bash
rados -p <pool-name> ls
rados -p default.rgw.buckets.index listomapkeys <object-name> | wc -l
```

For deep inspection during scrub:

```bash
ceph osd pool deep-scrub <pool-name>
ceph log last 20 | grep "omap"
```

## Common Sources of Large OMAP

### RGW Bucket Index Sharding

The most common cause: an S3/RGW bucket has too many objects without index sharding enabled.

Check bucket object count:

```bash
radosgw-admin bucket stats --bucket=<bucket-name>
```

If the object count is in the millions with only 1 shard, the bucket index is a single massive OMAP object.

Fix by resharding the bucket:

```bash
radosgw-admin bucket reshard --bucket=<bucket-name> --num-shards=64
```

### CephFS Directory with Many Entries

A CephFS directory with millions of files becomes a large OMAP object.

List directory fragments to identify large directories:

```bash
ceph tell mds.0 dirfrag ls /path/to/large/directory
```

Enable CephFS dirfrag splitting to automatically distribute large directories:

```bash
ceph config set mds mds_bal_split_size 10000
ceph config set mds mds_bal_merge_size 5000
```

### BlueStore RocksDB Compaction

Large OMAP objects cause RocksDB compaction pressure. Trigger manual compaction:

```bash
ceph tell osd.* compact
```

## Preventing Future LARGE_OMAP Issues

For RGW, configure automatic bucket sharding at cluster level:

```bash
ceph config set client.rgw rgw_override_bucket_index_max_shards 64
```

For new RGW instances, set default sharding:

```ini
[client.rgw]
rgw_bucket_index_max_shards = 64
```

Increase the OMAP warning threshold if the default (200000) is too sensitive:

```bash
ceph config set osd osd_deep_scrub_large_omap_object_key_threshold 500000
```

## Summary

`LARGE_OMAP_OBJECTS` indicates RADOS objects with excessive OMAP key-value entries, most commonly caused by unsharded RGW bucket indexes or large CephFS directories. Fix RGW buckets with `radosgw-admin bucket reshard`, configure automatic bucket index sharding, and enable CephFS dirfrag splitting. Addressing large OMAP objects restores BlueStore/RocksDB performance.
