# How to Set Up a Geographically Distributed Replica Set in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Disaster Recovery, Multi-Region, Configuration

Description: Configure a geographically distributed MongoDB replica set across multiple data centers or cloud regions for disaster recovery and low-latency reads.

---

## Why Distribute a Replica Set Geographically

A geographically distributed replica set protects against regional outages and enables low-latency reads for globally distributed users. The tradeoff is that replication across regions adds latency to write operations when using `w: majority` with cross-region acknowledgment.

## Recommended Topologies

**3-2 topology** (most common): Place 3 nodes in the primary region and 2 in a secondary region. The primary region maintains the majority vote, ensuring writes can be acknowledged without cross-region round trips.

**2-2-1 topology**: 2 nodes in region A, 2 in region B, 1 arbiter in a third region. Elections require cross-region votes, introducing write latency during failovers.

## Configure Replica Set Members with Tags

Tags allow applications to target specific regions for reads:

```javascript
rs.initiate({
  _id: "rs0",
  members: [
    {
      _id: 0,
      host: "us-east-1a.example.com:27017",
      priority: 3,
      tags: { region: "us-east", dc: "us-east-1a" }
    },
    {
      _id: 1,
      host: "us-east-1b.example.com:27017",
      priority: 2,
      tags: { region: "us-east", dc: "us-east-1b" }
    },
    {
      _id: 2,
      host: "us-east-1c.example.com:27017",
      priority: 1,
      tags: { region: "us-east", dc: "us-east-1c" }
    },
    {
      _id: 3,
      host: "eu-west-1a.example.com:27017",
      priority: 0,
      tags: { region: "eu-west", dc: "eu-west-1a" }
    },
    {
      _id: 4,
      host: "eu-west-1b.example.com:27017",
      priority: 0,
      tags: { region: "eu-west", dc: "eu-west-1b" }
    }
  ]
})
```

EU nodes have `priority: 0` to prevent them from becoming primary in the US-primary topology.

## Define Custom Write Concerns with Tags

Create a write concern that requires acknowledgment from both regions:

```javascript
var cfg = rs.conf()
cfg.settings.getLastErrorModes = {
  multiRegion: { "region": 2 }
}
rs.reconfig(cfg)
```

Use it for critical writes:

```javascript
db.orders.insertOne(
  { orderId: "ORD-001", amount: 150.00 },
  { writeConcern: { w: "multiRegion", wtimeout: 10000 } }
)
```

## Route Reads to the Nearest Region

```javascript
const { MongoClient, ReadPreference } = require("mongodb");

const client = new MongoClient(uri, {
  readPreference: ReadPreference.NEAREST,
  readPreferenceTags: [{ region: "eu-west" }, {}]
});
```

The empty tag set `{}` acts as a fallback if no EU node is available.

## Monitor Replication Lag Between Regions

```javascript
rs.printSecondaryReplicationInfo()
```

Or check per-member lag:

```javascript
rs.status().members
  .filter(m => m.stateStr === "SECONDARY")
  .map(m => ({
    name: m.name,
    lagSeconds: (new Date() - m.optimeDate) / 1000
  }))
```

## Summary

A geographically distributed MongoDB replica set uses member tags to define regions and priority settings to control election outcomes. Place the majority of voting members in the primary region to avoid cross-region write latency during normal operations. Use tag-based read preferences to route reads to the nearest region, and define custom write concern modes requiring multi-region acknowledgment for critical data durability.
