# How to Tag-Aware Sharding in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Tag, Zone, Data Locality

Description: Learn how to use tag-aware (zone) sharding in MongoDB to pin specific shard key ranges to designated shards for compliance, performance, or multi-tenancy.

---

## Introduction

Tag-aware sharding (called zone sharding in MongoDB 3.4+) lets you assign shard key ranges to specific shards using tags (zones). This is useful for data locality requirements (keeping EU data in EU shards), multi-tenancy isolation (each customer on their own shard), or routing hot data to high-performance hardware and cold data to cheaper storage.

## Architecture: Tags Pinning Data to Shards

```mermaid
graph LR
    subgraph Cluster["MongoDB Sharded Cluster"]
        subgraph Fast["Fast SSDs - tag: hot"]
            S1["Shard 1"]
            S2["Shard 2"]
        end
        subgraph Slow["HDD Storage - tag: cold"]
            S3["Shard 3"]
            S4["Shard 4"]
        end
    end
    RecentData["Recent Data\n(date > 2024)"] -->|Routed by zone| Fast
    OldData["Old Data\n(date < 2023)"] -->|Routed by zone| Slow
```

## Step 1: Add Tags to Shards

Connect to mongos and assign tags to shards:

```javascript
// Tag shards for hot (fast SSD) tier
sh.addShardToZone("rs-shard1", "hot")
sh.addShardToZone("rs-shard2", "hot")

// Tag shards for cold (archival) tier
sh.addShardToZone("rs-shard3", "cold")
sh.addShardToZone("rs-shard4", "cold")
```

Verify tags:

```javascript
use config
db.shards.find({}, { _id: 1, tags: 1 })
```

## Step 2: Enable Sharding with a Compatible Shard Key

The shard key must include the field(s) you want to use for range pinning:

```javascript
// Create the index
use analytics
db.events.createIndex({ tier: 1, eventDate: 1 })

// Shard the collection (this automatically enables sharding on the database in MongoDB 6.0+)
sh.shardCollection("analytics.events", { tier: 1, eventDate: 1 })
```

## Step 3: Add Tag Ranges

Assign shard key ranges to tags. Documents with shard key values in the range go to shards with that tag:

```javascript
// Hot tier: events with tier "hot"
sh.updateZoneKeyRange(
  "analytics.events",
  { tier: "hot", eventDate: MinKey },   // Start of range (inclusive)
  { tier: "hot", eventDate: MaxKey },   // End of range (exclusive)
  "hot"                                  // Zone name
)

// Cold tier: events with tier "cold"
sh.updateZoneKeyRange(
  "analytics.events",
  { tier: "cold", eventDate: MinKey },
  { tier: "cold", eventDate: MaxKey },
  "cold"
)
```

## Step 4: Verify Tag Ranges

```javascript
use config
db.tags.find({ ns: "analytics.events" }).pretty()
```

Expected output:

```javascript
[
  {
    _id: { ns: "analytics.events", min: { tier: "hot", eventDate: MinKey } },
    ns: "analytics.events",
    min: { tier: "hot", eventDate: MinKey },
    max: { tier: "hot", eventDate: MaxKey },
    tag: "hot"
  },
  {
    _id: { ns: "analytics.events", min: { tier: "cold", eventDate: MinKey } },
    ns: "analytics.events",
    min: { tier: "cold", eventDate: MinKey },
    max: { tier: "cold", eventDate: MaxKey },
    tag: "cold"
  }
]
```

## Step 5: Insert Data and Verify Routing

```javascript
use analytics

// Insert a hot event
db.events.insertOne({
  tier: "hot",
  eventDate: new Date(),
  action: "purchase",
  userId: "U-12345"
})

// Insert a cold event
db.events.insertOne({
  tier: "cold",
  eventDate: new Date("2020-01-15"),
  action: "login",
  userId: "U-99999"
})
```

Check where the documents landed:

```javascript
// View chunk distribution across shards
db.getSiblingDB("analytics").events.getShardDistribution()

// Or check zone assignments in sh.status() output
sh.status()
// In the output, verify that analytics.events chunks with tier "hot"
// are on rs-shard1 or rs-shard2
```

## Step 6: Multi-Tenant Sharding Example

For SaaS applications, pin each tenant to a specific shard:

```javascript
// Tag shards per tenant
sh.addShardToZone("rs-shard1", "tenant-A")
sh.addShardToZone("rs-shard2", "tenant-B")
sh.addShardToZone("rs-shard3", "tenant-C")

// Assign ranges (exact match on tenantId)
sh.updateZoneKeyRange(
  "saas.documents",
  { tenantId: "A", _id: MinKey },
  { tenantId: "A", _id: MaxKey },
  "tenant-A"
)

sh.updateZoneKeyRange(
  "saas.documents",
  { tenantId: "B", _id: MinKey },
  { tenantId: "B", _id: MaxKey },
  "tenant-B"
)
```

## Step 7: Removing Tags

```javascript
// Remove a zone range
sh.removeRangeFromZone(
  "analytics.events",
  { tier: "cold", eventDate: MinKey },
  { tier: "cold", eventDate: MaxKey }
)

// Remove a zone from a shard (zones still exist but shard is untagged)
sh.removeShardFromZone("rs-shard3", "cold")
```

## Summary

Tag-aware sharding in MongoDB routes documents to designated shards based on shard key ranges. Assign zones to shards with `sh.addShardToZone()`, then define key ranges for those zones with `sh.updateZoneKeyRange()`. This enables data locality for compliance, hardware tier differentiation (hot/cold), and multi-tenant isolation. The balancer enforces zone assignments by migrating chunks to the correct tagged shard automatically after ranges are configured.
