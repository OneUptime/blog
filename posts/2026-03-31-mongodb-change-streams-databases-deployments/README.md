# How to Open Change Streams on Databases and Deployments in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Change Stream, Database, Replication, Real-Time

Description: Open MongoDB Change Streams at the database or deployment level to capture insert, update, and delete events across multiple collections simultaneously.

---

MongoDB Change Streams can be opened at three levels: collection, database, and deployment (entire MongoDB instance). Opening a stream at a broader scope lets you monitor all collections within that scope with a single cursor.

## Collection-Level vs Database-Level vs Deployment-Level

| Scope | Watches | Use Case |
|-------|---------|----------|
| Collection | One collection | Targeted CDC for a single entity |
| Database | All collections in a database | Multi-collection audit logs |
| Deployment | All databases and collections | Cross-database event bus |

## Opening a Database-Level Change Stream (Node.js)

```javascript
const { MongoClient } = require("mongodb");

async function watchDatabase() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const db = client.db("ecommerce");

  const pipeline = [
    {
      $match: {
        // Only capture write operations on specific collections
        "ns.coll": { $in: ["orders", "inventory", "payments"] }
      }
    }
  ];

  const changeStream = db.watch(pipeline, { fullDocument: "updateLookup" });

  changeStream.on("change", (event) => {
    console.log(
      `[${event.ns.coll}] op=${event.operationType} id=${event.documentKey._id}`
    );
  });

  changeStream.on("error", (err) => {
    console.error("Change stream error:", err);
    changeStream.close();
  });
}

watchDatabase();
```

## Opening a Deployment-Level Change Stream (Python)

```python
from pymongo import MongoClient
import os

client = MongoClient(os.environ["MONGODB_URI"])

pipeline = [
    {
        "$match": {
            "operationType": {"$in": ["insert", "update", "delete"]},
            # Exclude system collections
            "ns.coll": {"$not": {"$regex": "^system\\."}},
        }
    }
]

with client.watch(pipeline=pipeline, full_document="updateLookup") as stream:
    for event in stream:
        db_name = event["ns"]["db"]
        coll_name = event["ns"]["coll"]
        op = event["operationType"]
        print(f"{db_name}.{coll_name}: {op}")
```

## Event Shape at Database and Deployment Levels

The event document has the same structure as collection-level change events, including the `ns` field with both `db` and `coll`:

```json
{
  "_id": { "_data": "..." },
  "operationType": "insert",
  "ns": {
    "db": "ecommerce",
    "coll": "orders"
  },
  "documentKey": { "_id": { "$oid": "..." } },
  "fullDocument": { ... }
}
```

## Filtering by Database at Deployment Level

```javascript
// Watch all collections in "ecommerce" and "analytics" databases
const pipeline = [
  {
    $match: {
      "ns.db": { $in: ["ecommerce", "analytics"] }
    }
  }
];

const deploymentStream = client.watch(pipeline);
```

## Important Constraints

- Change Streams require a replica set or sharded cluster. They do not work on standalone instances.
- `fullDocument: "updateLookup"` performs a lookup after an update, which may return a newer document than the one that triggered the event if updates happen rapidly.
- Database and deployment-level streams produce a higher volume of events for the consumer. Apply `$match` stages early in the pipeline to filter out unwanted events.

## Persisting Resume Tokens

Always save the `_id` field (resume token) from each event to a durable store so you can resume after a restart:

```javascript
changeStream.on("change", async (event) => {
  await processEvent(event);
  // Save resume token after successful processing
  await resumeTokenStore.save(event._id);
});
```

## Summary

Database-level and deployment-level Change Streams provide a single cursor for capturing events across multiple collections, making them well-suited for cross-collection audit trails, event buses, and CDC pipelines. Add `$match` filters to the pipeline to reduce noise and always persist resume tokens to ensure at-least-once delivery.
