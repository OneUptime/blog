# How to Monitor WiredTiger Cache Pressure in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, WiredTiger, Monitoring, Performance, Cache

Description: Learn which MongoDB metrics reveal WiredTiger cache pressure and how to build alerts before cache saturation causes write stalls and latency spikes.

---

WiredTiger cache pressure occurs when the in-memory cache fills up faster than eviction threads can reclaim space. Left undetected, it leads to application threads stalling to evict pages, causing significant write latency. Proactive monitoring is the key to avoiding production incidents.

## Key Metrics to Monitor

All cache metrics are available in `db.serverStatus().wiredTiger.cache`:

```javascript
const cache = db.serverStatus().wiredTiger.cache;

const metrics = {
  maxBytes:           cache["maximum bytes configured"],
  usedBytes:          cache["bytes currently in the cache"],
  dirtyBytes:         cache["tracked dirty bytes in the cache"],
  appEvictions:       cache["pages evicted by application threads"],
  bgEvictions:        cache["eviction worker thread evicting pages"],
  readIntoCache:      cache["pages read into cache"],
  writtenFromCache:   cache["pages written from cache"]
};

metrics.utilization   = metrics.usedBytes / metrics.maxBytes;
metrics.dirtyRatio    = metrics.dirtyBytes / metrics.maxBytes;

console.log(metrics);
```

## Interpreting the Metrics

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| Cache utilization | < 80% | 80-90% | > 90% |
| Dirty ratio | < 5% | 5-15% | > 20% |
| App thread evictions | Near 0 | Occasional | Sustained |

## Application Thread Eviction - The Critical Signal

When `pages evicted by application threads` is consistently non-zero, your application is stalling. This is the most important signal of cache pressure:

```javascript
function checkEvictionPressure() {
  const cache = db.serverStatus().wiredTiger.cache;
  const appEvict = cache["pages evicted by application threads"];
  if (appEvict > 0) {
    print("WARNING: Application threads are evicting pages - cache under pressure");
    print("App thread evictions:", appEvict);
  }
}
```

Note that this counter is cumulative. Track the delta between polling intervals, not the absolute value.

## Scripted Monitoring Loop

```javascript
let previous = db.serverStatus().wiredTiger.cache["pages evicted by application threads"];

setInterval(() => {
  const current = db.serverStatus().wiredTiger.cache["pages evicted by application threads"];
  const delta = current - previous;
  previous = current;
  if (delta > 0) {
    print(`[ALERT] ${delta} app-thread evictions in last interval`);
  }
}, 10000);
```

## Prometheus / Monitoring Integration

If you use MongoDB Exporter (Percona or MongoDB Atlas), these counters are exposed as:

```text
mongodb_wiredtiger_cache_bytes_currently_in_cache
mongodb_wiredtiger_cache_maximum_bytes_configured
mongodb_wiredtiger_cache_tracked_dirty_bytes_in_cache
mongodb_wiredtiger_cache_pages_evicted_by_application_threads_total
```

Recommended Prometheus alert:

```yaml
- alert: MongoDBWiredTigerCachePressure
  expr: |
    (mongodb_wiredtiger_cache_bytes_currently_in_cache /
     mongodb_wiredtiger_cache_maximum_bytes_configured) > 0.90
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "MongoDB WiredTiger cache utilization above 90%"
```

## Immediate Remediation

If you are seeing pressure right now:

```javascript
// Increase cache size at runtime (also update mongod.conf)
db.adminCommand({
  setParameter: 1,
  wiredTigerEngineRuntimeConfig: "cache_size=8G"
});

// Add more eviction threads
db.adminCommand({
  setParameter: 1,
  wiredTigerEngineRuntimeConfig: "eviction=(threads_min=4,threads_max=8)"
});
```

## Summary

Monitor `bytes currently in the cache`, dirty byte ratio, and especially `pages evicted by application threads` to detect WiredTiger cache pressure. Application thread evictions are the clearest signal that the cache cannot keep up. Set Prometheus alerts on cache utilization above 90% and dirty ratio above 15%. If pressure occurs, increase cache size and eviction thread counts, and investigate which collections are consuming the most cache.
