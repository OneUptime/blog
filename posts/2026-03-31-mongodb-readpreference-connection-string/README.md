# How to Use the readPreference Options in MongoDB Connection Strings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Read Preference, Connection String, Replica Set, Scalability

Description: Learn how to configure readPreference in MongoDB connection strings to route reads to primary, secondary, or nearest nodes for performance and availability.

---

## What Is readPreference?

`readPreference` controls which replica set member the MongoDB driver sends read operations to. By default, all reads go to the primary. Changing read preference allows you to distribute read load across secondaries or route queries to the geographically nearest node.

## Read Preference Modes

```text
primary            - always read from primary (default)
primaryPreferred   - prefer primary, fall back to secondary if unavailable
secondary          - always read from a secondary
secondaryPreferred - prefer secondary, fall back to primary if no secondary available
nearest            - read from the member with the lowest network latency
```

## Connection String Format

```text
mongodb://host1:27017,host2:27017,host3:27017/mydb?replicaSet=rs0&readPreference=secondaryPreferred
```

## Node.js Driver

```javascript
const { MongoClient } = require('mongodb');

// Client-level read preference
const client = new MongoClient('mongodb://localhost:27017', {
  replicaSet: 'rs0',
  readPreference: 'secondaryPreferred',
});

// Per-collection override
const db = client.db('analytics');
const results = await db
  .collection('events', { readPreference: 'secondary' })
  .find({ type: 'pageview' })
  .toArray();
```

## PyMongo

```python
from pymongo import MongoClient, ReadPreference

# Client-level
client = MongoClient(
    "mongodb://host1:27017,host2:27017",
    replicaSet="rs0",
    readPreference="secondaryPreferred",
)

# Per-collection override
db = client["analytics"]
collection = db.get_collection(
    "events",
    read_preference=ReadPreference.SECONDARY
)
docs = list(collection.find({"type": "pageview"}))
```

## Java Driver

```java
import com.mongodb.ReadPreference;
import com.mongodb.MongoClientSettings;

MongoClientSettings settings = MongoClientSettings.builder()
    .readPreference(ReadPreference.secondaryPreferred())
    .build();
```

## Read Preference Tags

For fine-grained routing (e.g., to a specific data center), use tag sets:

```text
mongodb://host:27017/mydb?replicaSet=rs0&readPreference=secondary&readPreferenceTags=dc:east
```

```javascript
const { MongoClient, ReadPreference } = require('mongodb');

const client = new MongoClient(uri, {
  readPreference: new ReadPreference('secondary', [{ dc: 'east' }]),
});
```

## When to Use Each Mode

```text
primary:            - financial writes, sessions requiring read-your-writes consistency
secondary:          - analytics, reporting, batch jobs
secondaryPreferred: - most read-heavy workloads, acceptable slight staleness
nearest:            - global applications routing to the closest node
```

## Stale Data Warning

Secondaries replicate asynchronously. Data read from a secondary may lag behind the primary by milliseconds to seconds. For use cases requiring up-to-date data (e.g., showing a user their just-submitted order), always read from the primary or use `readConcern: "majority"` with causal consistency.

```javascript
// Ensure read-your-writes with a session
const session = client.startSession({ causalConsistency: true });
await collection.insertOne(order, { session });
const result = await collection.findOne({ _id: order._id }, { session });
await session.endSession();
```

## Summary

Use `readPreference=secondaryPreferred` for analytics and reporting workloads to offload reads from the primary. Use `primary` for any operation that requires the latest data. Tag sets allow precise control over which data center or hardware tier receives reads, enabling geographic read locality.
