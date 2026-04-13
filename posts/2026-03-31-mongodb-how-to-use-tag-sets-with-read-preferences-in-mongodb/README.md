# How to Use Tag Sets with Read Preferences in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Read Preference, Tag Set, Replica Set, Routing, Configuration

Description: Learn how to use tag sets with MongoDB read preferences to route reads to specific replica set members based on custom labels like region or purpose.

---

## Introduction

Tag sets allow you to attach custom labels to replica set members and use those labels to control where reads are routed. This is useful for directing analytics workloads to dedicated reporting replicas, routing reads to geographically close members, or separating production traffic from batch jobs.

## Configuring Tags on Replica Set Members

Add tags to replica set members using `rs.reconfig`:

```javascript
const config = rs.conf();

// Tag each member
config.members[0].tags = { region: "us-east", purpose: "primary" };
config.members[1].tags = { region: "us-east", purpose: "reporting" };
config.members[2].tags = { region: "eu-west", purpose: "primary" };

rs.reconfig(config);
```

## Verifying Tags

Check current tags on each member from the replica set configuration:

```javascript
rs.conf().members.forEach(m => {
  print(`${m.host}: ${JSON.stringify(m.tags)}`);
});
```

## Using Tag Sets in mongosh

Target members with specific tags:

```javascript
// Route reads to reporting-tagged members only
db.getMongo().setReadPref("secondary", [{ purpose: "reporting" }]);
db.orders.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
]);
```

## Using Tag Sets in Node.js

```javascript
const { MongoClient, ReadPreference } = require("mongodb");

// Route analytics reads to reporting-tagged members in us-east
const pref = new ReadPreference("secondary", [
  { purpose: "reporting", region: "us-east" },
  { purpose: "reporting" }  // fallback: any reporting member
]);

const client = new MongoClient(uri, { readPreference: pref });
await client.connect();

const results = await client
  .db("analytics")
  .collection("events")
  .find({ date: "2026-03-31" })
  .toArray();
```

## Tag Set Fallback Lists

Pass multiple tag documents as a fallback chain. MongoDB tries each in order:

```javascript
const pref = new ReadPreference("secondary", [
  { region: "us-east", purpose: "reporting" },  // prefer this
  { region: "us-east" },                         // fallback: any us-east secondary
  {}                                             // fallback: any secondary
]);
```

## Common Tag Set Patterns

Isolate analytics traffic to a dedicated replica:

```javascript
// Add analytics tag to a specific member
config.members[2].tags = { role: "analytics" };

// Application-level routing
const analyticsPref = new ReadPreference("secondary", [{ role: "analytics" }]);
```

Route requests to the geographically nearest region:

```javascript
// Set region tags per member, then route by region
const regionalPref = new ReadPreference("nearest", [{ region: "eu-west" }]);
```

## Summary

Tag sets give you fine-grained control over read routing in a MongoDB replica set. By labeling members with custom attributes like region, purpose, or tier, you can direct analytics, reporting, and application reads to appropriate nodes. Using fallback tag lists ensures reads succeed even if preferred members are unavailable.
