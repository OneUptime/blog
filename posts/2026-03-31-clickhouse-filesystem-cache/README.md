# How to Use Filesystem Cache in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Filesystem Cache, Remote Storage, S3, Performance

Description: Learn how to configure ClickHouse filesystem cache for remote storage backends, reducing S3/GCS read latency by caching data on local SSD.

---

ClickHouse filesystem cache stores recently read data from remote storage (S3, GCS, Azure Blob) on local disk, reducing latency for repeated reads of the same data. This is essential when using tiered storage or ClickHouse Cloud, where data lives in object storage.

## Why Filesystem Cache Matters

When ClickHouse reads from S3, each read request has 10-100ms of network latency. Without cache, a query scanning 100GB of data from S3 involves thousands of remote reads. With filesystem cache on a local NVMe SSD, repeated access to the same data blocks is served at local I/O speeds (microseconds vs milliseconds).

## Configuring Filesystem Cache

Add a cache configuration to `/etc/clickhouse-server/config.d/filesystem_cache.xml`:

```xml
<clickhouse>
  <filesystem_caches>
    <s3_cache>
      <path>/var/lib/clickhouse/filesystem_cache/s3/</path>
      <max_size>107374182400</max_size>  <!-- 100 GB -->
      <max_elements>10000000</max_elements>
      <cache_hits_threshold>0</cache_hits_threshold>
    </s3_cache>
  </filesystem_caches>
</clickhouse>
```

## Associating Cache with a Storage Policy

Reference the cache in your storage configuration:

```xml
<storage_configuration>
  <disks>
    <s3_disk>
      <type>s3</type>
      <endpoint>https://s3.amazonaws.com/mybucket/data/</endpoint>
      <access_key_id>ACCESS_KEY</access_key_id>
      <secret_access_key>SECRET_KEY</secret_access_key>
      <cache_name>s3_cache</cache_name>
    </s3_disk>
  </disks>
  <policies>
    <s3_policy>
      <volumes>
        <main>
          <disk>s3_disk</disk>
        </main>
      </volumes>
    </s3_policy>
  </policies>
</storage_configuration>
```

## Monitoring Cache Performance

```sql
-- Check cache size and configuration
SELECT
    cache_name,
    path,
    max_size,
    current_size,
    max_elements,
    current_elements_num
FROM system.filesystem_cache_settings;
```

```sql
-- Detailed cache stats per query
SELECT
    query_id,
    ProfileEvents['CachedReadBufferReadFromCacheHits'] AS cache_hits,
    ProfileEvents['CachedReadBufferReadFromCacheMisses'] AS cache_misses,
    ProfileEvents['CachedReadBufferReadFromSourceBytes'] AS s3_bytes
FROM system.query_log
WHERE type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 10;
```

## Cache Eviction Policy

ClickHouse uses a combination of LRU (Least Recently Used) and size-based eviction. When the cache reaches `max_size`, it evicts the least recently used segments to make room for new data.

## Warming the Cache

For predictable workloads, you can warm the cache by running representative queries after a restart:

```bash
# Run warm-up queries
clickhouse-client --query "SELECT count() FROM events WHERE event_time >= today() - 7"
clickhouse-client --query "SELECT uniq(user_id) FROM events WHERE event_time >= today()"
```

## Bypassing Cache for a Query

```sql
-- Skip cache for this query (forces fresh S3 read)
SELECT count() FROM events
SETTINGS enable_filesystem_cache = 0;
```

## Summary

ClickHouse filesystem cache bridges the performance gap between remote object storage and local NVMe SSDs by caching recently read data blocks locally. Properly sized and configured, it can achieve 90%+ hit rates for typical analytical workloads, delivering near-local-disk performance for data stored in S3 or GCS.
