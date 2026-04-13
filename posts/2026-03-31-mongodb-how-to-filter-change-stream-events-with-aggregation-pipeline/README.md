# How to Filter Change Stream Events with Aggregation Pipelines in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Change Stream, Aggregation Pipeline, Filtering, Event

Description: Use aggregation pipeline stages to filter and transform MongoDB change stream events server-side, reducing network traffic and client-side processing.

---

## Why Filter Change Streams?

By default, a change stream emits every change in a collection. For high-write collections, this means your application receives thousands of events per second, most of which may be irrelevant.

Aggregation pipeline filters are evaluated on the server - only matching events are sent over the network. This reduces bandwidth and simplifies client-side logic.

## Pipeline Syntax

Pass an array of aggregation stages as the first argument to `.watch()`:

```javascript
const pipeline = [
  { $match: { /* filter condition */ } },
  { $project: { /* shape the event */ } }
];

const changeStream = collection.watch(pipeline);
```

Supported stages: `$match`, `$project`, `$addFields`, `$replaceRoot`, `$redact`

## Filtering by Operation Type

Only receive insert events:

```javascript
const pipeline = [
  { $match: { operationType: 'insert' } }
];

const changeStream = collection.watch(pipeline);
changeStream.on('change', (change) => {
  console.log('New document inserted:', change.fullDocument);
});
```

Multiple operation types:

```javascript
const pipeline = [
  {
    $match: {
      operationType: { $in: ['insert', 'update'] }
    }
  }
];
```

## Filtering by Document Fields

Filter on specific field values in the inserted/updated document:

```javascript
// Only watch for high-value orders
const pipeline = [
  {
    $match: {
      operationType: 'insert',
      'fullDocument.total': { $gt: 500 },
      'fullDocument.status': 'pending'
    }
  }
];

const changeStream = collection.watch(pipeline, {
  fullDocument: 'updateLookup'
});
```

Note: For update events, `fullDocument` is only available if `fullDocument: 'updateLookup'` is set.

## Filtering on Updated Fields

React only when specific fields change:

```javascript
// Only trigger when 'status' field is updated
const pipeline = [
  {
    $match: {
      operationType: 'update',
      'updateDescription.updatedFields.status': { $exists: true }
    }
  }
];
```

More specifically, react to a specific status transition:

```javascript
const pipeline = [
  {
    $match: {
      operationType: 'update',
      'updateDescription.updatedFields.status': 'SHIPPED'
    }
  }
];
```

## Projecting Only Needed Fields

Reduce event payload size by projecting only the fields you need:

```javascript
const pipeline = [
  {
    $match: { operationType: { $in: ['insert', 'update'] } }
  },
  {
    $project: {
      operationType: 1,
      'documentKey._id': 1,
      'fullDocument.orderId': 1,
      'fullDocument.status': 1,
      'fullDocument.customerId': 1,
      'updateDescription.updatedFields.status': 1
    }
  }
];

const changeStream = collection.watch(pipeline, {
  fullDocument: 'updateLookup'
});
```

## Filtering on Namespace

For database-level or deployment-level streams, filter by collection:

```javascript
const db = client.db('appdb');

const pipeline = [
  {
    $match: {
      $or: [
        { 'ns.coll': 'orders' },
        { 'ns.coll': 'payments' }
      ]
    }
  }
];

const dbStream = db.watch(pipeline);
dbStream.on('change', (change) => {
  console.log(`Change in ${change.ns.coll}:`, change.operationType);
});
```

## Complex Filter: Multiple Conditions

Combine operation type, field existence, and value range:

```javascript
const pipeline = [
  {
    $match: {
      $and: [
        { operationType: { $in: ['insert', 'update', 'replace'] } },
        {
          $or: [
            {
              operationType: 'insert',
              'fullDocument.priority': { $gte: 8 }
            },
            {
              operationType: 'update',
              'updateDescription.updatedFields.priority': { $gte: 8 }
            }
          ]
        }
      ]
    }
  }
];
```

## Using $addFields to Enrich Events

Add computed fields to each event before processing:

```javascript
const pipeline = [
  { $match: { operationType: 'insert' } },
  {
    $addFields: {
      'fullDocument.processedAt': '$$NOW',
      'fullDocument.streamSource': 'orders-watcher'
    }
  }
];
```

## Python Example

```python
from pymongo import MongoClient
import os

client = MongoClient(os.environ["MONGODB_URI"])
collection = client["appdb"]["orders"]

pipeline = [
    {
        "$match": {
            "operationType": "update",
            "updateDescription.updatedFields.status": {"$in": ["SHIPPED", "DELIVERED"]}
        }
    },
    {
        "$project": {
            "operationType": 1,
            "documentKey._id": 1,
            "updateDescription.updatedFields.status": 1
        }
    }
]

with collection.watch(pipeline, full_document="updateLookup") as stream:
    for change in stream:
        order_id = change["documentKey"]["_id"]
        new_status = change["updateDescription"]["updatedFields"]["status"]
        print(f"Order {order_id} is now {new_status}")
        notify_customer(order_id, new_status)
```

## Performance Tips

- Always use `$match` as the first stage to filter as early as possible
- Filter on `operationType` and top-level change event fields first - these are the cheapest comparisons for the server to evaluate
- Keep `$project` narrow to reduce the size of events sent over the network
- Avoid complex `$project` transformations that require evaluating full documents
- For very high-write collections, consider multiple specialized streams rather than one broad stream

## Summary

Aggregation pipeline stages passed to `.watch()` are evaluated server-side before events are sent to the client. Use `$match` to filter by operation type, document field values, or updated field names; use `$project` to reduce event payload size. Filter early and narrow the projection to minimize bandwidth and simplify client processing in high-throughput collections.
