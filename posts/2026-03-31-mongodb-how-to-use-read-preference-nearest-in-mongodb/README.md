# How to Use Read Preference 'nearest' in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Read Preference, Latency, Replication, Multi-Region, Driver

Description: Learn how to use read preference nearest in MongoDB to route reads to the replica set member with the lowest network latency for optimal response time.

---

## Introduction

Read preference `nearest` routes reads to the replica set member with the lowest measured round-trip time, regardless of whether it is the primary or a secondary. It is the best choice for applications deployed across multiple data centers or regions where minimizing latency is the top priority.

## How "nearest" Works

The MongoDB driver measures round-trip latency to each replica set member and selects members within a configurable latency window (default 15ms). Among those, it picks randomly to distribute load. The primary is considered alongside secondaries - the selection is purely latency-based.

## Setting Read Preference in mongosh

```javascript
db.getMongo().setReadPref("nearest");
db.sessions.find({ token: "abc123" }).readPref("nearest");
```

## Setting in Node.js

```javascript
const { MongoClient, ReadPreference } = require("mongodb");

const client = new MongoClient(
  "mongodb://us-east:27017,eu-west:27017,ap-south:27017/?replicaSet=rs0",
  { readPreference: ReadPreference.NEAREST }
);

await client.connect();
```

## Configuring the Latency Window

Adjust the acceptable latency window (in milliseconds) at the client level:

```javascript
const { MongoClient } = require("mongodb");

// Accept members within 25ms of the fastest member
const client = new MongoClient(
  "mongodb://us-east:27017,eu-west:27017,ap-south:27017/?replicaSet=rs0",
  { readPreference: "nearest", localThresholdMS: 25 }
);

await client.connect();
const doc = await client.db("mydb").collection("mycol").findOne({});
```

## Multi-Region Deployment Pattern

In a geographically distributed deployment, `nearest` automatically routes each application instance to its closest data center:

```text
App (US East) --> reads from US East replica
App (EU West) --> reads from EU West replica
App (AP South) --> reads from AP South replica
```

All write operations still go to the primary regardless of location.

```javascript
// App in EU West automatically reads from EU West replica
const client = new MongoClient(
  "mongodb://us-east:27017,eu-west:27017,ap-south:27017/?replicaSet=rs0",
  { readPreference: "nearest" }
);
```

## When to Use "nearest"

Use `nearest` when:
- Your application is geographically distributed
- Read latency is a higher priority than data freshness
- You are reading data that is relatively static (product catalogs, configuration)
- You have replicas in multiple regions and want automatic locality

## Summary

Read preference `nearest` delivers the lowest possible read latency by routing each request to the closest replica set member. It is the ideal preference for geographically distributed deployments where users and application servers span multiple regions. The `localThresholdMS` setting lets you tune the trade-off between latency and load distribution.
