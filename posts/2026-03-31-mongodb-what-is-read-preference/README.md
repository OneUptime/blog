# What Is Read Preference in MongoDB and How to Configure It

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Read Preference, Replica Set, Scalability, Secondary

Description: Read preference in MongoDB determines which replica set member handles a read operation, enabling you to distribute load and optimize latency across your cluster.

---

## Overview

In a MongoDB replica set, every write goes to the primary, but reads can be routed to any member. Read preference is the policy that controls which node handles a given read - the primary, a secondary, or the nearest node by network latency. By configuring read preference, you can distribute read workloads, reduce latency for geographically distributed clients, and keep the primary free for writes.

## The Five Read Preference Modes

**`primary` (default)** - All reads go to the primary. Guarantees you always see the most recent data. Use for any read that must be strongly consistent.

**`primaryPreferred`** - Reads go to the primary if available; fall back to a secondary if the primary is unreachable. Good for high-availability scenarios that can tolerate brief replication lag.

**`secondary`** - Reads always go to a secondary. Offloads read traffic from the primary. Accepts eventual consistency - you may read slightly stale data.

**`secondaryPreferred`** - Reads go to secondaries; falls back to the primary if no secondary is available. The most common mode for analytics and reporting queries.

**`nearest`** - Reads go to the member with the lowest network latency, regardless of primary or secondary status. Best for globally distributed deployments where reducing round-trip time matters most.

## Configuring Read Preference in Code

```javascript
// Node.js - set read preference on a query
const { ReadPreference } = require("mongodb");

const docs = await db.collection("products")
  .find({ inStock: true }, { readPreference: ReadPreference.SECONDARY_PREFERRED })
  .toArray();
```

```python
# PyMongo - set read preference on the collection
from pymongo import MongoClient, ReadPreference

client = MongoClient("mongodb://localhost:27017")
db = client["catalog"]
collection = db.get_collection(
    "products",
    read_preference=ReadPreference.SECONDARY_PREFERRED
)
docs = list(collection.find({"inStock": True}))
```

## Tag Sets for Targeted Reads

Tag sets allow you to route reads to specific replica set members based on custom labels. This is useful in multi-data-center deployments where you want reads to stay within a region.

First, add tags to each replica set member:

```javascript
// In the replica set config
cfg = rs.conf();
cfg.members[1].tags = { "region": "us-east", "role": "analytics" };
rs.reconfig(cfg);
```

Then use a tag set in your read preference:

```javascript
const { ReadPreference } = require("mongodb");

const readPref = new ReadPreference("secondary", [{ region: "us-east" }]);
const docs = await db.collection("events")
  .find({}, { readPreference: readPref })
  .toArray();
```

## maxStalenessSeconds

When reading from secondaries, you can limit how stale the data can be:

```javascript
const { ReadPreference } = require("mongodb");

// Reject any secondary lagging more than 90 seconds behind the primary
const readPref = new ReadPreference("secondaryPreferred", [], { maxStalenessSeconds: 90 });
const docs = await db.collection("orders")
  .find({}, { readPreference: readPref })
  .toArray();
```

## Setting Read Preference at the Connection Level

You can also set a default read preference at the connection string level:

```bash
mongodb://host1,host2,host3/?replicaSet=rs0&readPreference=secondaryPreferred
```

## Summary

Read preference gives you fine-grained control over how MongoDB distributes reads across a replica set. Use `primary` for strong consistency, `secondary` or `secondaryPreferred` for analytics and reporting, and `nearest` for latency-sensitive global applications. Combine with tag sets to pin reads to specific data center regions.
