# How to Implement Multi-Region Data Distribution in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replication, Sharding, Distribution

Description: Learn how to distribute MongoDB data across multiple regions using zone sharding, global clusters, and replica set geography for low latency and resilience.

---

## Why Multi-Region Distribution Matters

Distributing data across geographic regions reduces latency for users worldwide and protects against regional outages. MongoDB provides two primary mechanisms for multi-region distribution: replica sets with geographically spread members and zone-based sharding that pins data to specific regions.

## Configuring Replica Sets Across Regions

The simplest form of multi-region distribution involves placing replica set members in different data centers. Use the `priority` and `tags` settings to control which member acts as primary.

```javascript
rs.initiate({
  _id: "globalRS",
  members: [
    { _id: 0, host: "us-east-1.example.com:27017", priority: 2, tags: { region: "us-east" } },
    { _id: 1, host: "eu-west-1.example.com:27017", priority: 1, tags: { region: "eu-west" } },
    { _id: 2, host: "ap-southeast-1.example.com:27017", priority: 1, tags: { region: "ap-south" } }
  ]
});
```

Set read preferences to route reads to the nearest member:

```javascript
db.orders.find({ status: "active" }).readPref("nearest");
```

## Zone Sharding for Data Locality

Zone sharding pins specific data ranges to designated shards in particular regions. This ensures, for example, that European user data stays in EU shards.

```javascript
// Associate shards with zones
sh.addShardToZone("shard-us-east", "US");
sh.addShardToZone("shard-eu-west", "EU");
sh.addShardToZone("shard-ap", "APAC");

// Define zone ranges based on a region field
sh.updateZoneKeyRange(
  "mydb.users",
  { region: "US", _id: MinKey },
  { region: "US", _id: MaxKey },
  "US"
);

sh.updateZoneKeyRange(
  "mydb.users",
  { region: "EU", _id: MinKey },
  { region: "EU", _id: MaxKey },
  "EU"
);
```

## Choosing the Right Shard Key

For zone sharding to work effectively, the shard key must include the region field as a prefix:

```javascript
sh.shardCollection("mydb.users", { region: 1, userId: 1 });
```

This compound key ensures that the balancer routes chunks to the correct zone and that targeted queries avoid scatter-gather operations.

## Write Concern and Read Preference for Multi-Region

When writing across regions, balance durability against latency. For critical writes that must be confirmed in multiple regions:

```javascript
db.orders.insertOne(
  { orderId: "ORD-001", total: 150.00, region: "EU" },
  { writeConcern: { w: "majority", wtimeout: 5000 } }
);
```

For read distribution, tag-based read preferences route to the nearest tagged member:

```javascript
db.users.find({ region: "EU" }).readPref("secondary", [{ region: "eu-west" }]);
```

## Monitoring Chunk Distribution

After enabling zone sharding, verify that chunks land in the correct zones:

```javascript
use config
db.chunks.aggregate([
  { $group: { _id: "$shard", count: { $sum: 1 } } }
]);
```

Run `sh.status()` to see zone assignments and chunk distribution across shards.

## Summary

MongoDB multi-region data distribution combines zone sharding for data locality, geographically spread replica sets for low-latency reads, and tuned write concerns for durability. Design your shard key with the region prefix, assign zones to shards, and use tag-based read preferences to serve users from the nearest data center.
