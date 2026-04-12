# How to Scale Change Stream Consumers Across Multiple Processes in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Change Stream, Scalability, Concurrency, Architecture

Description: Scale MongoDB Change Stream processing horizontally across multiple consumer processes using partition strategies, leader election, and work queues.

---

A single Change Stream cursor is sequential - MongoDB sends events one at a time to the cursor. When a single process cannot keep up with the write rate, you need a strategy to parallelize processing across multiple processes or threads without duplicating or skipping events.

## The Core Challenge

A Change Stream cursor cannot be shared across processes - each cursor belongs to one connection. The parallelism must be introduced at the application level, after events are received by one or more cursors.

## Strategy 1: Fan-Out via a Work Queue

A single "ingestion" process reads the Change Stream and publishes each event to a queue (Redis, RabbitMQ, Kafka). Multiple worker processes consume from the queue in parallel.

```javascript
// ingestion-process.js
const { MongoClient } = require("mongodb");
const { createClient } = require("redis");

const mongo = new MongoClient(process.env.MONGODB_URI);
const redis = createClient({ url: process.env.REDIS_URL });

await mongo.connect();
await redis.connect();

const stream = mongo.db("shop").collection("orders").watch();

for await (const event of stream) {
  // Publish to a list keyed by the shard key for ordering guarantees
  const queueKey = `orders:queue:${event.documentKey._id.toString().slice(-1)}`;
  await redis.rPush(queueKey, JSON.stringify(event));
  await saveToken(event._id);
}
```

```javascript
// worker-process.js (run N instances)
const redis = createClient({ url: process.env.REDIS_URL });
const QUEUE_SHARD = process.env.QUEUE_SHARD; // e.g., "0", "1", ..., "f"

await redis.connect();

while (true) {
  const item = await redis.blPop(`orders:queue:${QUEUE_SHARD}`, 5);
  if (item) {
    const event = JSON.parse(item.element);
    await processEvent(event);
  }
}
```

## Strategy 2: Multiple Cursors on a Sharded Cluster

On a sharded cluster, each shard has its own oplog. You can open one Change Stream per shard primary to parallelize at the database level:

```javascript
const { MongoClient } = require("mongodb");

async function watchShard(shardUri, shardName) {
  const client = new MongoClient(shardUri);
  await client.connect();

  const stream = client.db("shop").collection("orders").watch();
  console.log(`Watching shard: ${shardName}`);

  for await (const event of stream) {
    await processEvent(shardName, event);
    await saveToken(shardName, event._id);
  }
}

// Start one watcher per shard
watchShard(process.env.SHARD1_URI, "shard1");
watchShard(process.env.SHARD2_URI, "shard2");
```

**Note:** Each shard watcher emits events independently. Events from different shards for the same aggregate may arrive out of order. MongoDB recommends opening Change Streams through `mongos` rather than connecting directly to shard primaries. Direct shard connections may miss events during chunk migrations between shards.

## Strategy 3: Parallel Processing with Worker Threads

For CPU-bound processing, use Node.js worker threads (or Python multiprocessing) to parallelize event handling without a separate queue:

```javascript
const { Worker, isMainThread, parentPort } = require("worker_threads");

if (isMainThread) {
  const workers = Array.from({ length: 4 }, (_, i) =>
    new Worker(__filename, { workerData: { workerId: i } })
  );

  const stream = getChangeStream();
  let idx = 0;

  for await (const event of stream) {
    // Serialize to avoid BSON types being corrupted by the structured clone algorithm
    workers[idx % workers.length].postMessage(JSON.stringify(event));
    idx++;
    await saveToken(event._id);
  }
} else {
  parentPort.on("message", async (serialized) => {
    const event = JSON.parse(serialized);
    await processEvent(event);
  });
}
```

## Leader Election for High Availability

When running multiple ingestion processes for HA, only one should hold the active Change Stream cursor at a time. Use a distributed lock:

```javascript
const lock = await redlock.acquire(["change-stream-leader"], 10000);

try {
  const stream = collection.watch([], { resumeAfter: await loadToken() });
  for await (const event of stream) {
    await processAndPublish(event);
    await lock.extend(10000); // Renew lock
  }
} catch (err) {
  await lock.release();
  // Another instance will take over
}
```

## Metrics to Track

```text
- change_stream_events_received_total
- change_stream_events_processed_total
- change_stream_lag_seconds
- queue_depth (work queue backlog)
- worker_processing_duration_seconds
```

Alert when queue depth or lag trends upward - this indicates workers are too slow and you need to scale out.

## Summary

Scale MongoDB Change Stream processing by introducing a fan-out queue between the ingestion cursor and worker processes, opening per-shard cursors on sharded clusters, or using worker threads for CPU-bound work. Combine with leader election for high-availability ingestion and track lag and queue depth metrics to know when to add more workers.
