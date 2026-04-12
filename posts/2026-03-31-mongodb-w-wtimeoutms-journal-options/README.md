# How to Use the w, wtimeoutMS, and journal Options in MongoDB Connection Strings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Write Concern, Durability, Connection String, Replication

Description: Learn how to configure w, wtimeoutMS, and journal write concern options in MongoDB connection strings to control durability and acknowledge guarantees.

---

## Write Concern Overview

MongoDB write concern controls how many nodes must acknowledge a write before the driver considers it successful. The three key parameters are:

- `w`: number of nodes (or "majority") that must acknowledge
- `wtimeoutMS`: maximum time to wait for the required acknowledgments
- `journal`: whether the primary must write to the journal before acknowledging

## Connection String Format

```text
mongodb://host:27017/mydb?w=majority&wtimeoutMS=5000&journal=true
```

## w Parameter Values

```text
w=0          - fire and forget, no acknowledgment
w=1          - primary acknowledged (default)
w=2          - primary + one secondary
w=majority   - majority of voting members (recommended for replica sets)
w=<tag>      - custom tag set (e.g., w=datacenterA)
```

## Node.js Driver

```javascript
const { MongoClient } = require('mongodb');

// Set default write concern at the client level
const client = new MongoClient('mongodb://localhost:27017', {
  w: 'majority',
  wtimeoutMS: 5000,
  journal: true,
});

// Or override per-operation
const db = client.db('myapp');
await db.collection('orders').insertOne(
  { orderId: 'ORD-001', status: 'placed' },
  { writeConcern: { w: 'majority', wtimeout: 5000, j: true } }
);
```

## PyMongo

```python
from pymongo import MongoClient, WriteConcern

# Client-level write concern
client = MongoClient(
    "mongodb://localhost:27017",
    w="majority",
    wtimeoutMS=5000,
    j=True,
)

# Or per-collection override
db = client["myapp"]
safe_collection = db.get_collection(
    "orders",
    write_concern=WriteConcern(w="majority", wtimeout=5000, j=True)
)
```

## Java Driver

```java
import com.mongodb.WriteConcern;
import com.mongodb.MongoClientSettings;
import java.util.concurrent.TimeUnit;

MongoClientSettings settings = MongoClientSettings.builder()
    .writeConcern(WriteConcern.MAJORITY
        .withWTimeout(5, TimeUnit.SECONDS)
        .withJournal(true))
    .build();
```

## What journal=true Means

When `journal=true`, the primary must flush the write to its on-disk journal (write-ahead log) before acknowledging. This survives a sudden process crash even if in-memory data is not yet flushed to the main data files. Without `journal=true`, a crash between the acknowledgment and the journal flush could lose the write.

```text
j=false (default): acknowledge after memory write - faster but less durable
j=true:            acknowledge after journal write - slower but crash-safe
```

## Write Concern Trade-offs

```text
Highest durability, lowest throughput:
  w=majority, j=true, wtimeoutMS=10000

Balanced (recommended for most apps):
  w=majority, j=false, wtimeoutMS=5000

Highest throughput, lowest durability:
  w=0 (unacknowledged) - only for bulk inserts where data loss is acceptable
```

## Handling wtimeoutMS Expiration

```javascript
const { MongoServerError } = require('mongodb');

try {
  await collection.insertOne(doc, { writeConcern: { w: 'majority', wtimeout: 1000 } });
} catch (err) {
  if (err instanceof MongoServerError && err.code === 64) {
    // WriteConcernFailed - write happened but acknowledgment timed out
    // The write MAY have succeeded on the majority - check before retrying
    console.error('Write concern timeout - verify write before retrying');
  }
}
```

Note: a `wtimeoutMS` expiration does NOT mean the write failed - it means the required acknowledgment was not received in time. The write may have been applied.

## Summary

Use `w=majority` and a reasonable `wtimeoutMS` (3000-10000ms) for production replica set deployments. Enable `journal=true` for critical data like financial records. Understand that `wtimeoutMS` expiration signals an acknowledgment timeout, not necessarily a write failure - always verify the state of the document before deciding to retry.
