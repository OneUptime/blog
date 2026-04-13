# How to Use Read Preferences for Load Balancing in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Read Preference, Load Balancing, Replica Set, Secondary Reads

Description: Learn how to configure MongoDB read preferences to distribute read operations across replica set secondaries for improved throughput and geographic load balancing.

---

## Overview

By default, all MongoDB read operations go to the primary node. In a replica set, you can redirect reads to secondary members using read preferences. This distributes read load across the cluster and can reduce latency for geographically distributed deployments.

## Read Preference Modes

| Mode | Description | Best For |
|---|---|---|
| `primary` | All reads go to primary (default) | Reads requiring latest data |
| `primaryPreferred` | Primary when available, otherwise secondary | High availability reads |
| `secondary` | All reads go to secondaries | Analytics, reporting, background jobs |
| `secondaryPreferred` | Secondary when available, otherwise primary | Read-heavy workloads |
| `nearest` | Lowest network latency member | Geographically distributed apps |

## Setting Read Preference at the Connection Level

```javascript
const { MongoClient } = require("mongodb");

// All reads prefer secondaries
const client = new MongoClient("mongodb://host1:27017,host2:27017,host3:27017", {
  replicaSet: "rs0",
  readPreference: "secondaryPreferred"
});
```

## Setting Read Preference per Operation

```javascript
const { ReadPreference } = require("mongodb");

// Read from any secondary for this specific query
const analyticsData = await db.collection("orders")
  .find({ year: 2026 })
  .withReadPreference(ReadPreference.SECONDARY)
  .toArray();

// Read from nearest node (lowest ping) for this query
const userProfile = await db.collection("users")
  .findOne({ _id: userId }, { readPreference: ReadPreference.NEAREST });
```

## Tag Sets for Targeted Reads

Tag sets let you route reads to specific replica set members. This is useful for dedicating some secondaries to analytics workloads.

First, add tags to replica set member configuration:

```javascript
// In the replica set config
rs.reconfig({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017", tags: { region: "us-east", role: "primary" } },
    { _id: 1, host: "mongo2:27017", tags: { region: "us-east", role: "secondary" } },
    { _id: 2, host: "mongo3:27017", tags: { region: "us-west", role: "analytics" } }
  ]
});
```

Then use tag set read preferences:

```javascript
const { ReadPreference } = require("mongodb");

// Route analytics reads to the analytics-tagged secondary
const analyticsPreference = new ReadPreference(
  ReadPreference.SECONDARY,
  [{ role: "analytics" }]
);

const result = await db.collection("events")
  .aggregate([
    { $match: { date: { $gte: startDate } } },
    { $group: { _id: "$eventType", count: { $sum: 1 } } }
  ], { readPreference: analyticsPreference })
  .toArray();

// Route user-facing reads to us-east region
const regionalPreference = new ReadPreference(
  ReadPreference.NEAREST,
  [{ region: "us-east" }]
);
```

## MaxStalenessSeconds

Prevent reading from secondaries that are too far behind the primary:

```javascript
const { ReadPreference } = require("mongodb");

const preference = new ReadPreference(
  ReadPreference.SECONDARY_PREFERRED,
  null,
  { maxStalenessSeconds: 90 }  // don't read from secondaries more than 90s behind
);

const data = await db.collection("products")
  .find({ inStock: true })
  .withReadPreference(preference)
  .toArray();
```

## PyMongo Read Preferences

```python
from pymongo import MongoClient, ReadPreference

client = MongoClient(
    "mongodb://host1:27017,host2:27017,host3:27017",
    replicaSet="rs0",
    read_preference=ReadPreference.SECONDARY_PREFERRED
)

# Per-database preference
analytics_db = client.get_database(
    "analytics",
    read_preference=ReadPreference.SECONDARY
)

# Per-collection preference
events = analytics_db.get_collection(
    "events",
    read_preference=ReadPreference.NEAREST
)
```

## When to Use Secondary Reads

Use secondary reads for:
- Analytics and reporting queries that can tolerate slightly stale data
- Backup-friendly reads without impacting primary performance
- Geographically distributed apps where the nearest node matters
- Background jobs processing historical data

Avoid secondary reads for:
- Reads that must reflect the latest write (use `primary` read preference; for the strongest guarantees, also set read concern to `linearizable`)
- Reads following a critical write in the same session (use sessions to ensure read-your-own-writes)

## Read-Your-Own-Writes with Sessions

When using secondary reads, use a client session to guarantee you read your own writes:

```javascript
const session = client.startSession();

// Write to primary
await db.collection("users").updateOne(
  { _id: userId },
  { $set: { lastLogin: new Date() } },
  { session }
);

// Read from secondary but guaranteed to reflect the write above
const user = await db.collection("users").findOne(
  { _id: userId },
  { session, readPreference: ReadPreference.SECONDARY_PREFERRED }
);

session.endSession();
```

## Summary

MongoDB read preferences let you distribute reads across replica set members to improve throughput and reduce latency. Use `secondaryPreferred` for analytics workloads, `nearest` for geographically distributed users, and tag sets to route specific workload types to dedicated replica members. Always use `maxStalenessSeconds` to avoid reading severely out-of-date data from lagging secondaries.
