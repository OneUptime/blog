# How to Route Reads to Specific Replica Set Members in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Read Preference, Replica Set, Tag Set, Routing

Description: Learn how to use tag sets and read preferences to route MongoDB reads to specific replica set members for dedicated reporting, analytics, or geographic routing.

---

## Why Route Reads to Specific Members?

In a replica set, all secondaries replicate the same data. But different secondaries may be configured for different purposes:

- One secondary dedicated to analytics/reporting (larger hardware, separate disk IO)
- One secondary in each geographic region (closer to regional app servers)
- One secondary with a hidden role that never serves reads (backup only)

MongoDB's tag sets let you label replica set members and then target those labels in read preferences, routing specific query types to specific nodes.

## Setting Tags on Replica Set Members

Add tags to members via `rs.reconfig()`:

```javascript
const cfg = rs.conf();

// Tag the reporting secondary
cfg.members[1].tags = { purpose: "reporting", region: "us-east" };

// Tag the operational secondary
cfg.members[2].tags = { purpose: "operational", region: "us-west" };

rs.reconfig(cfg);
```

Verify the tags were applied:

```javascript
rs.conf().members.forEach(m => {
  print(m.host, JSON.stringify(m.tags));
});
```

## Routing Reads Using Tag Sets

Use the tag set in the read preference to target a specific member:

```javascript
// Route to the reporting secondary
db.orders.find({ month: "2026-03" }).readPref("secondary", [
  { purpose: "reporting" }
])
```

```javascript
// Route to us-east region secondary
db.inventory.find({}).readPref("nearest", [
  { region: "us-east" }
])
```

The tag set is an array - MongoDB tries each tag set in order and uses the first one that matches an available member.

## Tag Set Fallback Array

Provide multiple tag set options to create a fallback chain:

```javascript
db.reports.find({}).readPref("secondary", [
  { purpose: "reporting", region: "us-east" },  // Try this first
  { purpose: "reporting" },                      // Fall back to any reporting node
  {}                                             // Fall back to any secondary
])
```

MongoDB tries each tag set in order. If the first matches no available member, it tries the second, and so on.

## Node.js Driver Example

```javascript
const { MongoClient, ReadPreference } = require("mongodb");

// Client for analytics queries - dedicated to reporting secondaries
const analyticsClient = new MongoClient(
  "mongodb://mongo1:27017,mongo2:27017,mongo3:27017/?replicaSet=rs0",
  {
    readPreference: new ReadPreference("secondary", [
      { purpose: "reporting" }
    ])
  }
);

// Client for operational queries - us-east secondary preferred
const opsClient = new MongoClient(
  "mongodb://mongo1:27017,mongo2:27017,mongo3:27017/?replicaSet=rs0",
  {
    readPreference: new ReadPreference("secondaryPreferred", [
      { region: "us-east" }
    ])
  }
);
```

## Dedicated Reporting Secondary Pattern

A common architecture separates reporting load from operational load:

```text
rs0:
  mongo1:27017 PRIMARY   (tags: {})
  mongo2:27017 SECONDARY (tags: { purpose: "operational" })
  mongo3:27017 SECONDARY (tags: { purpose: "reporting", ram: "high" })
```

```javascript
// Operational app reads - go to mongo2
const appClient = new MongoClient(uri, {
  readPreference: new ReadPreference("secondary", [{ purpose: "operational" }])
});

// Nightly report job - goes to mongo3 (high RAM secondary)
const reportClient = new MongoClient(uri, {
  readPreference: new ReadPreference("secondary", [{ purpose: "reporting" }])
});
```

## Geographic Routing

For a global application with regional secondaries:

```javascript
const region = process.env.AWS_REGION || "us-east-1";

const client = new MongoClient(replicaSetUri, {
  readPreference: new ReadPreference("nearest", [
    { region: region },   // Prefer local region
    {}                    // Fallback to any member
  ])
});
```

Each regional deployment reads from its local secondary without cross-region latency, except during regional outages when it falls back to any available member.

## Validating Tag Routing With explain

Confirm which member serves a tagged read:

```javascript
const explainResult = await db.collection("orders")
  .find({ status: "shipped" })
  .withReadPreference(new ReadPreference("secondary", [{ purpose: "reporting" }]))
  .explain();

// Check the serverInfo field to see which node was used
console.log(explainResult.serverInfo.host);
```

## Hidden Members and Tags

Hidden secondary members (those with `hidden: true`) can have tags, but they are excluded from all read preference routing because they do not appear in the client's server topology (they are omitted from `hello`/`isMaster` responses). Reads will never be routed to hidden members regardless of their tags. Tags on hidden members are still useful for custom write concern modes via `settings.getLastErrorModes`. Use hidden members primarily for backup or delayed replication purposes.

## Summary

Tag sets allow precise routing of reads to specific replica set members, enabling dedicated hardware for different query patterns, geographic proximity for low-latency reads, and clean separation of operational and analytics workloads. Define tags in the replica set configuration, reference them in read preference tag set arrays, and use the fallback array to provide resilience when tagged members are unavailable.
