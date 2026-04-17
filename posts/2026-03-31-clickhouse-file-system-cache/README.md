# How to Use File System Cache in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, File System Cache, Performance, Caching, Storage

Description: Learn how to configure and use ClickHouse's file system cache to speed up repeated queries by storing remote data locally on disk.

---

ClickHouse's file system cache lets you store data from remote object stores (like S3 or Azure Blob) on local disk so that repeated reads skip the network round trip. This is especially valuable when your data lives in object storage but you want near-local read latency for hot data.

## How File System Cache Works

When ClickHouse reads a file from a remote disk, it writes a local copy to the cache directory. On subsequent reads of the same file segment, ClickHouse serves the data from disk rather than re-fetching it over the network. The cache is keyed by path and byte range, so partial reads are also cached efficiently.

## Configuring the Cache

Define a cache in your ClickHouse `config.xml` or a drop-in config file:

```xml
<clickhouse>
  <filesystem_caches>
    <s3_local_cache>
      <path>/var/lib/clickhouse/filesystem_cache/s3/</path>
      <max_size>107374182400</max_size> <!-- 100 GB -->
    </s3_local_cache>
  </filesystem_caches>
</clickhouse>
```

Then reference the cache in your storage policy:

```xml
<storage_configuration>
  <disks>
    <s3_disk>
      <type>s3</type>
      <endpoint>https://s3.amazonaws.com/mybucket/data/</endpoint>
      <access_key_id>ACCESS_KEY</access_key_id>
      <secret_access_key>SECRET_KEY</secret_access_key>
      <cache_name>s3_local_cache</cache_name>
      <cache_on_write_operations>1</cache_on_write_operations>
    </s3_disk>
  </disks>
</storage_configuration>
```

The `cache_on_write_operations` flag populates the cache during INSERT as well as SELECT, which helps warm up frequently queried new data.

## Checking Cache Usage

Query system tables to see how the cache is being utilized:

```sql
SELECT
    cache_name,
    formatReadableSize(size) AS used,
    formatReadableSize(max_size) AS capacity,
    round(size / max_size * 100, 2) AS fill_pct
FROM system.filesystem_cache_settings;
```

For per-file cache entries:

```sql
SELECT
    key,
    formatReadableSize(size) AS size,
    cache_hits
FROM system.filesystem_cache
ORDER BY cache_hits DESC
LIMIT 20;
```

## Tuning Cache Behavior

Control cache behavior at the query level using settings:

```sql
-- Force bypassing the cache for a cold benchmarking run
SET read_from_filesystem_cache_if_exists_otherwise_bypass_cache = 1;

-- Skip writing to cache for large one-off scans
SET enable_filesystem_cache_on_write_operations = 0;
```

You can also set a maximum cache size per query to prevent a single large scan from evicting warm data:

```sql
SET filesystem_cache_max_download_size = 10737418240; -- 10 GB
```

## Eviction and Maintenance

The cache uses an LRU-based eviction policy. When the cache directory fills to `max_size`, older entries are removed automatically. You can clear the cache manually if needed:

```sql
SYSTEM DROP FILESYSTEM CACHE;
```

For targeted removal on a specific node, run this on each replica individually or use `ON CLUSTER` for distributed clusters.

## Monitoring Cache Hit Rate

```sql
SELECT
    event,
    value
FROM system.events
WHERE event LIKE '%FilesystemCache%'
ORDER BY event;
```

A high `FilesystemCacheHits` versus `FilesystemCacheMisses` ratio indicates an effective cache configuration. Aim for a hit rate above 80% for stable workloads with repeated query patterns.

## Summary

ClickHouse's file system cache bridges the gap between cheap object storage and fast query performance. By caching remote data locally, you dramatically reduce latency for repeated reads. Configure a `max_size` that fits your hottest dataset, enable cache-on-write for new inserts, and monitor hit rates to ensure the cache remains effective as your data grows.
