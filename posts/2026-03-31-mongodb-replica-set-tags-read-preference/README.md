# How to Use Replica Set Tags for Read Preference Routing in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Read Preference, Tag, Performance

Description: Learn how to use MongoDB replica set tags to route read operations to specific members based on custom attributes like region, purpose, or hardware tier.

---

MongoDB replica set tags let you label individual members with custom key-value pairs and then route read operations to members matching those labels. This is useful for directing analytics traffic to dedicated secondaries, routing reads to the nearest datacenter, or separating workloads by hardware tier.

## Setting Tags on Replica Set Members

Tags are set via `rs.reconfig()` on the primary:

```javascript
var cfg = rs.conf();

// Tag by datacenter and purpose
cfg.members[0].tags = { dc: "us-east", purpose: "app" };
cfg.members[1].tags = { dc: "us-east", purpose: "reporting" };
cfg.members[2].tags = { dc: "us-west", purpose: "app" };

rs.reconfig(cfg);
```

## Verify Tags

```javascript
rs.conf().members.map(m => ({ host: m.host, tags: m.tags }))
```

## Reading with Tag Sets

A **tag set** is a document specifying required tag values. A member matches if it has ALL the key-value pairs in the tag set.

### Node.js (Mongoose / MongoDB Driver)

```javascript
const { MongoClient, ReadPreference } = require('mongodb');

const client = new MongoClient("mongodb://mongo1,mongo2,mongo3/?replicaSet=rs0");
const db = client.db("app");

// Route reads to reporting secondary
const readPref = new ReadPreference('secondary', [{ purpose: "reporting" }]);

const data = await db.collection('reports').find(
  { year: 2025 },
  { readPreference: readPref }
).toArray();
```

### Python (PyMongo)

```python
from pymongo import MongoClient
from pymongo.read_preferences import Secondary

client = MongoClient("mongodb://mongo1,mongo2,mongo3/?replicaSet=rs0")

reporting = client.db.get_collection(
    'reports',
    read_preference=Secondary([{"purpose": "reporting"}])
)

results = list(reporting.find({"year": 2025}))
```

### Connection String Tag Sets

```text
mongodb://mongo1,mongo2,mongo3/?replicaSet=rs0&readPreference=secondary&readPreferenceTags=purpose:reporting
```

## Fallback Tag Sets

You can specify multiple tag sets as fallbacks - MongoDB tries each in order:

```javascript
// Try reporting secondary first, then any secondary, then primary
new ReadPreference('secondaryPreferred', [
  { purpose: "reporting" },
  {},              // empty tag set matches any member
])
```

In the connection string:

```text
readPreferenceTags=purpose:reporting&readPreferenceTags=
```

## Custom Write Concern Modes with Tags

Tags also power custom write concern modes. Require acknowledgment from at least one member in each datacenter:

```javascript
var cfg = rs.conf();
cfg.settings.getLastErrorModes = {
  crossDC: { dc: 2 }  // requires 2 distinct "dc" values to ack
};
rs.reconfig(cfg);
```

Use it:

```javascript
await col.insertOne(doc, { writeConcern: { w: "crossDC" } });
```

## Nearest Tag-Based Routing

For latency-sensitive applications, combine `nearest` with tags:

```javascript
new ReadPreference('nearest', [{ dc: "us-west" }])
```

This picks the lowest-latency member that has `dc: "us-west"`.

## Common Mistakes

- Tags are case-sensitive: `{ DC: "east" }` and `{ dc: "east" }` are different
- A member with no tags does not match any non-empty tag set
- To remove a tag, omit it from the tags document entirely

```javascript
// Remove the "purpose" tag by omitting it
cfg.members[0].tags = { dc: "us-east" };
rs.reconfig(cfg);
```

## Summary

Replica set tags are a powerful mechanism for routing reads to specific members based on attributes like datacenter, purpose, or hardware. Configure tags via `rs.reconfig()`, then use tag sets in your read preference to match the right members. Use fallback tag sets to ensure availability when preferred members are unreachable, and leverage tags in custom write concern modes for multi-datacenter durability.

