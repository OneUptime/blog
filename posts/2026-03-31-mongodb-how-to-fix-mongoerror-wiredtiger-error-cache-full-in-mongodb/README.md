# How to Fix MongoError: WiredTiger Error - Cache Full in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, WiredTiger, Cache, Troubleshooting, Performance

Description: Diagnose and fix MongoDB WiredTiger cache full errors by identifying the root cause and adjusting cache size, eviction settings, and write throttling.

---

## Understanding the Error

The "WiredTiger cache full" error occurs when WiredTiger's in-memory cache is full and cannot evict dirty pages fast enough to accommodate new writes. This manifests as:

```text
MongoServerError: WiredTiger error: WT_CACHE_FULL: operation would overflow the cache
or
[WiredTiger]WT_VERB_HANDLEOPS Cache capacity: exceeded configured max size
```

## What Causes Cache Full Errors?

```text
1. Cache size too small for the working set
2. Very high write throughput creating too many dirty pages
3. Slow disk I/O preventing timely checkpoint and eviction
4. Memory overcommitment on the host
5. Insufficient WiredTiger eviction threads
6. Large unindexed query causing a full collection scan to be cached
```

## Step 1: Check Current Cache Usage

```javascript
// Check WiredTiger cache statistics
const stats = db.serverStatus().wiredTiger.cache;
const maxBytes = stats["maximum bytes configured"];
const currentBytes = stats["bytes currently in the cache"];
const dirtyBytes = stats["tracked dirty bytes in the cache"];
const evictedPages = stats["pages evicted by application threads"];

print("Cache max:", (maxBytes / 1024 / 1024 / 1024).toFixed(2), "GB");
print("Cache used:", (currentBytes / 1024 / 1024 / 1024).toFixed(2), "GB");
print("Dirty bytes:", (dirtyBytes / 1024 / 1024).toFixed(2), "MB");
print("Utilization:", ((currentBytes / maxBytes) * 100).toFixed(1) + "%");
print("Dirty %:", ((dirtyBytes / maxBytes) * 100).toFixed(1) + "%");
print("App thread evictions:", evictedPages);
```

High utilization (> 80%) and high dirty % indicate cache pressure. "Application thread evictions" above 0 means writes are being throttled.

## Step 2: Increase WiredTiger Cache Size

The default WiredTiger cache is `(RAM - 1GB) / 2`. Increase it for write-heavy workloads.

```yaml
# /etc/mongod.conf
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 8  # Increase as appropriate for your RAM
```

```javascript
// Change at runtime (MongoDB 3.0+)
db.adminCommand({
  setParameter: 1,
  wiredTigerEngineRuntimeConfig: "cache_size=8G"
});
```

Guidelines:
- Leave at least 1-2GB for OS and MongoDB overhead
- Leave memory for connection stacks (~1MB per connection)
- Max safe cache = Total RAM - (connections * 1MB) - 2GB OS reserve

## Step 3: Tune Eviction Settings

WiredTiger evicts pages when cache reaches the eviction trigger threshold.

```javascript
// Set eviction thresholds (values are percentages of cache)
db.adminCommand({
  setParameter: 1,
  wiredTigerEngineRuntimeConfig: "eviction=(threads_min=4,threads_max=8),eviction_target=70,eviction_trigger=80"
});
```

```yaml
# mongod.conf
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 8
      # Additional WiredTiger config
    # eviction settings via extraOptions
```

Key eviction parameters:
```text
eviction_target    - Start evicting when cache hits this % (default: 80%)
eviction_trigger   - Aggressively evict when cache hits this % (default: 95%)
eviction_dirty_target   - Start evicting dirty pages at this % (default: 5%)
eviction_dirty_trigger  - Aggressively evict dirty pages at this % (default: 20%)
eviction threads   - Number of eviction worker threads (default: 4)
```

## Step 4: Monitor Checkpoint Performance

```javascript
// Check checkpoint timing
const checkpointStats = db.serverStatus().wiredTiger.transaction;
print("Checkpoints:", checkpointStats["transaction checkpoints"]);
print("Max checkpoint time:", checkpointStats["transaction checkpoint max time (msecs)"]);
print("Checkpoint total time:", checkpointStats["transaction checkpoint total time (msecs)"]);
```

If checkpoint time is very high, disk I/O is a bottleneck. Solutions:
- Use faster storage (NVMe SSD instead of SATA SSD or spinning disk)
- Reduce write concurrency
- Spread data across multiple volumes

## Step 5: Identify Write Amplifiers

```javascript
// Check for operations generating high dirty pages
db.currentOp({ "active": true }).inprog
  .filter(op => op.numYields > 100 || op.secs_running > 10)
  .map(op => ({
    opId: op.opid,
    op: op.op,
    collection: op.ns,
    secs: op.secs_running,
    numYields: op.numYields
  }));
```

Long-running writes or large bulk operations generate many dirty pages. Consider:
- Using bulk write operations with smaller batches
- Adding rate limiting to import/migration jobs
- Scheduling heavy writes during off-peak hours

## Step 6: Reduce Cache Pressure

```bash
# Check if disk I/O is the bottleneck
iostat -x 1 5

# Check disk latency
iotop -a -o

# If disk is saturated:
# 1. Move MongoDB data to faster disk
# 2. Use RAID 10 for write throughput
# 3. Consider a dedicated journal disk
```

```javascript
// Check journal statistics
db.serverStatus().wiredTiger.log
```

## Step 7: Atlas Configuration

On MongoDB Atlas, you cannot directly set WiredTiger cache size - it's managed by Atlas based on cluster tier. To address cache pressure:

```text
1. Upgrade to a larger cluster tier
2. Enable auto-scaling to scale compute automatically
3. Review slow query logs for index-missing queries driving cache usage
4. Enable Atlas Performance Advisor for index recommendations
```

```bash
# Check Atlas cluster metrics via CLI
atlas metrics processes list --projectId YOUR_PROJECT_ID
```

## Step 8: Reduce Working Set Size

If the working set exceeds the cache, optimize access patterns:

```javascript
// Check which collections/indexes fit in cache
db.stats()
db.collection.stats()

// Ensure frequently accessed documents have proper indexes
db.orders.createIndex({ status: 1, createdAt: -1 });

// Use projection to load only needed fields
db.orders.find({ status: "pending" }, { customerId: 1, total: 1 });

// Automatically expire old data to reduce hot collection size (TTL index deletes docs after 90 days)
db.orders.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 });
```

## Summary

WiredTiger cache full errors indicate the cache cannot evict dirty pages fast enough - often due to undersized cache, high write throughput, or slow disk I/O. Fix it by increasing `cacheSizeGB` in mongod.conf or via `setParameter`, tuning eviction thresholds with more eviction threads, addressing disk I/O bottlenecks, and reducing write amplification through proper indexing and batched writes. Monitor cache utilization with `db.serverStatus().wiredTiger.cache` and alert when dirty byte percentage exceeds 15-20%.
