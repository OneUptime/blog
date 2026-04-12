# How to Monitor MongoDB Page Faults

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Monitoring, Page Fault, WiredTiger, Performance

Description: Learn how to monitor MongoDB page faults using serverStatus extra_info metrics to detect when working set exceeds RAM and WiredTiger cache, causing disk I/O.

---

Page faults in MongoDB occur when the data being accessed is not in RAM or the WiredTiger cache and must be loaded from disk. A high page fault rate is a reliable indicator that the working set exceeds available memory, causing latency spikes as MongoDB waits for disk reads.

## Reading Page Fault Metrics

```javascript
db.adminCommand({ serverStatus: 1 }).extra_info
```

Output:

```json
{
  "note": "fields vary by platform",
  "page_faults": 12345
}
```

On Windows, this includes page file metrics:

```javascript
db.adminCommand({ serverStatus: 1 }).extra_info
// {
//   "page_faults": 12345,
//   "usagePageFileMB": 2048,
//   "totalPageFileMB": 8192
// }
```

## Monitoring Page Faults Over Time

```python
import pymongo
import time

client = pymongo.MongoClient("mongodb://localhost:27017")

def get_page_faults():
    status = client.admin.command("serverStatus")
    return status.get("extra_info", {}).get("page_faults", 0)

def monitor_page_faults(interval=10):
    prev = get_page_faults()
    while True:
        time.sleep(interval)
        current = get_page_faults()
        rate = (current - prev) / interval
        print(f"Page faults: {rate:.2f}/sec (total: {current})")
        if rate > 100:
            print("  WARNING: High page fault rate - check WiredTiger cache size")
        prev = current

monitor_page_faults()
```

## WiredTiger Cache Metrics

Page faults often correlate with WiredTiger cache eviction. Check cache pressure:

```javascript
const wt = db.adminCommand({ serverStatus: 1 }).wiredTiger.cache

printjson({
  maxBytes: wt["maximum bytes configured"],
  currentBytes: wt["bytes currently in the cache"],
  dirtyBytes: wt["tracked dirty bytes in the cache"],
  pagesReadIntoCache: wt["pages read into cache"],
  pagesEvicted: wt["pages evicted by application threads"],
  percentFull: (wt["bytes currently in the cache"] / wt["maximum bytes configured"] * 100).toFixed(2) + "%"
})
```

## Correlating Page Faults with Slow Queries

When page faults spike, look for slow queries in the profiler:

```javascript
db.setProfilingLevel(1, { slowms: 100 })

// Find slow queries during the fault period
db.system.profile.find(
  { millis: { $gt: 500 } }
).sort({ ts: -1 }).limit(10)
```

## Key Indicators of Memory Pressure

```text
High page_faults/sec + High wiredTiger.cache eviction  ->  Working set > WiredTiger cache
High page_faults/sec + Low wiredTiger.cache eviction   ->  Working set > OS file cache
Spikes in page_faults during specific hours            ->  Time-based access pattern (reporting jobs, etc.)
```

## Checking Current WiredTiger Cache Size

```javascript
db.adminCommand({ serverStatus: 1 }).wiredTiger.cache["maximum bytes configured"]
// Returns bytes, divide by 1024^3 for GB
```

The default cache size is `(RAM - 1GB) / 2`. For a 16GB server, default cache = 7.5GB.

## Adjusting WiredTiger Cache Size

In `mongod.conf`:

```yaml
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 8
```

Or at runtime:

```javascript
db.adminCommand({ setParameter: 1, wiredTigerEngineRuntimeConfig: "cache_size=8G" })
```

## Reducing Page Faults

1. **Add indexes** - indexed reads are smaller and more cache-friendly than full document reads
2. **Add RAM** - increase physical memory to grow OS page cache
3. **Increase WiredTiger cache** - if underallocated relative to available RAM
4. **Use projections** - fetch only needed fields, reducing document size in cache
5. **Archive old data** - reduce working set size by moving cold data to Atlas Online Archive

## Summary

MongoDB page faults are a memory pressure signal - they increase when data access patterns exceed the available WiredTiger cache and OS page cache. Monitor `extra_info.page_faults` from `serverStatus` and correlate spikes with WiredTiger cache eviction rates and slow query patterns. Resolution involves increasing cache size, adding indexes, using projections to reduce document footprint, or archiving cold data to shrink the working set.
