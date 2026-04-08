# How to Use Change Streams for Real-Time Data Synchronization in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Change Stream, Data Sync, Real-Time, CDC

Description: Build a real-time data synchronization pipeline using MongoDB Change Streams to keep secondary stores like Elasticsearch, Redis, and read replicas in sync.

---

Change Streams are MongoDB's built-in CDC (Change Data Capture) mechanism. They let you react to database writes in real time and propagate changes to secondary stores - Elasticsearch for full-text search, Redis for caching, or a separate MongoDB cluster for cross-region replication.

## Sync Pattern Overview

```text
MongoDB (primary store)
        |
   Change Stream
        |
   Sync Service
   /    |    \
Redis  Elastic  Remote MongoDB
```

## Syncing to Redis (Cache Invalidation)

```javascript
const { MongoClient } = require("mongodb");
const { createClient } = require("redis");

const mongo = new MongoClient(process.env.MONGODB_URI);
const redis = createClient({ url: process.env.REDIS_URL });

await mongo.connect();
await redis.connect();

const stream = mongo.db("catalog").collection("products").watch([], {
  fullDocument: "updateLookup"
});

for await (const event of stream) {
  const id = event.documentKey._id.toString();

  if (event.operationType === "delete") {
    await redis.del(`product:${id}`);
  } else if (["insert", "update", "replace"].includes(event.operationType)) {
    const doc = event.fullDocument;
    await redis.set(`product:${id}`, JSON.stringify(doc), { EX: 3600 });
  }

  await saveResumeToken(event._id);
}
```

## Syncing to Elasticsearch

```python
from pymongo import MongoClient
from elasticsearch import Elasticsearch
import os

mongo = MongoClient(os.environ["MONGODB_URI"])
es = Elasticsearch(os.environ["ES_URL"])

collection = mongo["blog"]["articles"]
resume_token = load_token()

options = {"resume_after": resume_token, "full_document": "updateLookup"} if resume_token else {"full_document": "updateLookup"}

with collection.watch(**options) as stream:
    for event in stream:
        op = event["operationType"]
        doc_id = str(event["documentKey"]["_id"])

        if op == "delete":
            es.options(ignore_status=404).delete(index="articles", id=doc_id)

        elif op in ("insert", "update", "replace"):
            doc = event["fullDocument"]
            doc.pop("_id", None)
            es.index(index="articles", id=doc_id, document=doc)

        save_token(event["_id"])
```

## Cross-Cluster Synchronization (Bidirectional Replication)

For active-active setups, track the origin cluster to avoid sync loops:

```javascript
// Write with a source tag
await collection.insertOne({
  ...document,
  _syncSource: "cluster-east"
});

// In the Change Stream consumer on cluster-west:
for await (const event of stream) {
  if (event.fullDocument?._syncSource === "cluster-west") {
    // Skip events that originated here to break the loop
    continue;
  }

  await replicateToLocalCluster(event);
  await saveToken(event._id);
}
```

## Handling Update Lookup Race Conditions

`fullDocument: "updateLookup"` fetches the document after the update. If multiple updates arrive in rapid succession, the lookup for an earlier event may return the document at a later state. Mitigate by adding an `updatedAt` version field:

```javascript
// Only apply if the incoming version is newer than local state
if (incomingDoc.updatedAt > localDoc.updatedAt) {
  await applyUpdate(incomingDoc);
}
```

## Ensuring Exactly-Once Delivery

Change Streams provide at-least-once delivery. Use idempotent writes on the destination to handle duplicates:

```javascript
// Elasticsearch - use version_type=external for idempotency
await es.index({
  index: "products",
  id: doc._id.toString(),
  version: doc.version,
  version_type: "external",
  document: doc
});
```

## Lag Monitoring

```javascript
changeStream.on("change", (event) => {
  const clusterTimeMs = (event.clusterTime?.t ?? 0) * 1000;
  const lagMs = Date.now() - clusterTimeMs;
  metrics.histogram("sync_lag_ms", lagMs);
});
```

Alert if `sync_lag_ms` exceeds your SLA threshold (e.g., 5 seconds for near-real-time caches).

## Summary

MongoDB Change Streams provide a reliable foundation for real-time synchronization to Redis, Elasticsearch, and remote MongoDB clusters. Persist resume tokens after each successful write to the destination, use `fullDocument: "updateLookup"` to get complete documents on updates, and implement idempotent writes on the destination to handle the at-least-once delivery guarantee.
