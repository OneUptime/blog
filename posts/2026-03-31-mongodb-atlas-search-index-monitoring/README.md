# How to Monitor Atlas Search Index Performance in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Monitoring

Description: Track MongoDB Atlas Search index health, query latency, and replication lag using Atlas metrics, the Search Tester, and programmatic status commands.

---

Atlas Search indexes are maintained by a separate process (mongot) that runs alongside mongod. Monitoring that process and the indexes it manages requires a different approach than watching standard MongoDB metrics.

## Checking Index Status with the Driver

You can inspect the status of Atlas Search indexes programmatically using the `listSearchIndexes` command:

```javascript
const indexes = await db.collection("products").listSearchIndexes().toArray();
indexes.forEach(idx => {
  console.log(idx.name, idx.status, idx.queryable);
});
```

The `status` field cycles through:

```text
BUILDING   - initial index build in progress
READY      - healthy and accepting queries
STALE      - behind on updates but still queryable
FAILED     - build failed, requires intervention
```

## Atlas UI Metrics for Search

In the Atlas UI, navigate to your cluster - then Metrics - then Atlas Search. Key metrics to watch:

- **Opcounters** - number of `$search` operations per second
- **Replication Lag** - how far mongot is behind the oplog
- **Index Size** - disk usage of the search index
- **JVM Heap** - memory used by the Lucene process

A rising replication lag indicates mongot cannot keep up with write throughput. This leads to stale results.

## Using $searchMeta to Check Result Counts

Run a `$searchMeta` aggregation to understand how your results are distributed before adding pagination or boosts:

```javascript
db.products.aggregate([
  {
    $searchMeta: {
      index: "default",
      text: { query: "laptop", path: "title" },
      count: { type: "total" }
    }
  }
])
// Returns: { count: { total: 4821 } }
```

## Profiling Search Queries

Enable the slow query profiler on your cluster and filter for search operations:

```javascript
db.setProfilingLevel(1, { slowms: 100 });

db.system.profile.find({
  "command.pipeline.$search": { $exists: true }
}, {
  "command.pipeline": 1,
  millis: 1,
  ts: 1
}).sort({ millis: -1 }).limit(20)
```

Slow search queries often mean the index is rebuilding, the result set is too large, or a `$lookup` after `$search` is adding latency.

## Monitoring Replication Lag with Atlas Alerts

Create an Atlas alert for high search replication lag:

1. Go to your project - Alerts
2. Select "Add Alert"
3. Choose "Atlas Search Replication Lag" as the condition
4. Set a threshold (for example, 60 seconds)
5. Configure notification channels

When lag exceeds the threshold, your search results may be seconds behind the actual collection state.

## Checking Index Size Impact

Atlas Search indexes consume disk space separately from your MongoDB data. Monitor combined usage:

```javascript
// MongoDB collection stats
db.runCommand({ collStats: "products", scale: 1048576 }) // MB
// storageSize, totalIndexSize reported here

// Atlas Search index size visible in Atlas UI under cluster Storage chart
```

## Force Rebuild When Stale or Failed

If an index enters FAILED state, drop and recreate it:

```javascript
await db.collection("products").dropSearchIndex("default");

await db.collection("products").createSearchIndex({
  name: "default",
  definition: {
    mappings: { dynamic: true }
  }
});
```

Expect the index to be in BUILDING state for several minutes depending on collection size.

## Summary

Monitoring Atlas Search requires tracking mongot-specific metrics in the Atlas UI (replication lag, index status, heap), using `listSearchIndexes` for programmatic health checks, and profiling slow `$search` queries via the MongoDB profiler. Set up alerts for replication lag to catch degraded search freshness before users notice stale results.
