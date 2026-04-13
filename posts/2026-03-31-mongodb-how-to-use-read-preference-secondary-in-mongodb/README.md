# How to Use Read Preference 'secondary' in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Read Preference, Secondary, Replication, Scalability, Analytics

Description: Learn how to use read preference secondary in MongoDB to offload read traffic to secondary replica set members and scale read throughput.

---

## Introduction

Read preference `secondary` routes all read operations to secondary replica set members, completely offloading read traffic from the primary. This is useful for analytics queries, reporting workloads, and bulk reads that can tolerate replication lag. It frees the primary to handle writes and latency-sensitive operations.

## How "secondary" Works

- All reads go to a randomly selected secondary
- If no secondaries are available, reads fail (unlike `secondaryPreferred`)
- Secondary data may lag behind the primary by milliseconds to seconds
- Distributes read load across all secondary members

## Setting Read Preference in mongosh

```javascript
db.getMongo().setReadPref("secondary");
db.events.find({ type: "pageview" }).readPref("secondary");
```

## Setting in Node.js

```javascript
const { MongoClient, ReadPreference } = require("mongodb");

const client = new MongoClient(
  "mongodb://host1:27017,host2:27017,host3:27017/?replicaSet=rs0",
  { readPreference: ReadPreference.SECONDARY }
);

await client.connect();
const events = client.db("analytics").collection("events");
const pageviews = await events.find({ type: "pageview" }).toArray();
```

## Controlling Staleness with maxStalenessSeconds

Limit how stale a secondary can be before it is considered unacceptable:

```javascript
const { ReadPreference } = require("mongodb");
const pref = new ReadPreference("secondary", [], { maxStalenessSeconds: 90 });

const result = await collection.find({}).withReadPreference(pref).toArray();
```

The minimum value for `maxStalenessSeconds` is 90 seconds (MongoDB 3.4+).

## Directing Analytics Queries to Secondaries

A common pattern is to create a separate client configured for secondary reads for analytics workloads:

```javascript
const analyticsClient = new MongoClient(uri, {
  readPreference: "secondary"
});

const reportingClient = new MongoClient(uri, {
  readPreference: "primary"
});

// Heavy aggregation on secondary
const report = await analyticsClient
  .db("mydb")
  .collection("orders")
  .aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ])
  .toArray();
```

## What to Avoid with "secondary"

Do not use `secondary` for:
- Read-your-write patterns - the secondary may not have your write yet
- Inventory checks before purchase
- Any operation requiring the most current data

## Summary

Read preference `secondary` routes reads to secondary replica set members, offloading the primary and enabling horizontal read scaling. It is ideal for analytics, reporting, and batch reads where replication lag is acceptable. Always set `maxStalenessSeconds` to bound the staleness risk, and never use `secondary` for operations requiring up-to-date data.
