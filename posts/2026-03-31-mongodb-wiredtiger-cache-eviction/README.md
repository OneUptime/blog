# How WiredTiger Cache Eviction Works in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, WiredTiger, Performance, Cache, Storage Engine

Description: Understand how WiredTiger cache eviction works in MongoDB, when it triggers, and how to tune eviction thresholds to prevent write stalls.

---

WiredTiger maintains an in-memory cache of frequently accessed data. When the cache fills up, an eviction process removes pages to make room for new data. Understanding this process helps you avoid unexpected write stalls and performance degradation.

## What Is the WiredTiger Cache?

By default, WiredTiger allocates 50% of (RAM - 1 GB) or 256 MB - whichever is larger - as its internal cache. This is separate from the OS filesystem cache.

```bash
# Check current cache size via mongosh
db.serverStatus().wiredTiger.cache["maximum bytes configured"]
```

## The Eviction Process

WiredTiger uses background eviction threads that continuously scan pages and evict those that are clean (already flushed to disk) or dirty (modified but not yet written). There are four thresholds:

| Threshold               | Default | Behavior                                  |
|-------------------------|---------|-------------------------------------------|
| eviction_target         | 80%     | Background threads start evicting         |
| eviction_trigger        | 95%     | Application threads also evict (stall risk) |
| eviction_dirty_target   | 5%      | Dirty page eviction starts                |
| eviction_dirty_trigger  | 20%     | All threads evict dirty pages (stall risk) |

When the cache hits the `eviction_trigger`, MongoDB application threads stop processing operations and help with eviction. This causes visible latency spikes.

## Checking Current Eviction Activity

```javascript
const stats = db.serverStatus().wiredTiger.cache;
console.log({
  cacheUsedBytes:     stats["bytes currently in the cache"],
  cacheDirtyBytes:    stats["tracked dirty bytes in the cache"],
  cacheMaxBytes:      stats["maximum bytes configured"],
  pagesEvictedApp:    stats["pages evicted by application threads"],
  pagesEvictedBg:     stats["eviction worker thread evicting pages"]
});
```

High `pagesEvictedByApplicationThreads` means your application is stalling to evict - this is a sign the cache is under pressure.

## Tuning Eviction Threads

Increase the number of background eviction threads to handle eviction workload before it spills into application threads:

```javascript
db.adminCommand({
  setParameter: 1,
  wiredTigerEngineRuntimeConfig:
    "eviction=(threads_min=4,threads_max=8)"
});
```

## Adjusting Eviction Thresholds

Lower the eviction target so background eviction starts earlier:

```javascript
db.adminCommand({
  setParameter: 1,
  wiredTigerEngineRuntimeConfig:
    "eviction_target=70,eviction_trigger=90,eviction_dirty_target=3,eviction_dirty_trigger=15"
});
```

## Persistent Configuration

Set these in the MongoDB configuration file for persistence across restarts:

```yaml
storage:
  wiredTiger:
    engineConfig:
      configString: "eviction=(threads_min=4,threads_max=8),eviction_target=70,eviction_trigger=90"
```

## Common Symptoms of Poor Eviction

- Sudden latency spikes during write-heavy workloads
- High `wiredTiger.cache.pages evicted by application threads` in `serverStatus`
- Log messages like `cache eviction blocked`

## Summary

WiredTiger cache eviction is a background process that removes pages from memory to make space for new data. When background eviction cannot keep up, application threads are forced to evict pages, causing write stalls. Tune the eviction thread count, eviction targets, and cache size to keep eviction in the background. Monitor `serverStatus().wiredTiger.cache` for application-thread eviction metrics as an early warning of cache pressure.
