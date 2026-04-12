# How to Create Zones for Targeted Data Distribution in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Zone, Data Locality, Database

Description: Learn how to create MongoDB zone sharding to pin specific shard key ranges to designated shards, enabling data locality, compliance, and tiered storage.

---

Zone sharding (formerly tag-aware sharding) lets you assign shard key ranges to specific shards. This enables data locality (keep EU data in EU shards), tiered storage (hot data on NVMe, cold on HDD), and regulatory compliance (data residency requirements).

## How Zones Work

1. Assign zone names to shards
2. Define shard key ranges that belong to each zone
3. The balancer migrates chunks to the shards whose zones match the range

## Step 1 - Add Zones to Shards

Connect to `mongos`:

```javascript
// Assign shards to geographic zones
sh.addShardToZone("shard1", "US")
sh.addShardToZone("shard2", "US")
sh.addShardToZone("shard3", "EU")
sh.addShardToZone("shard4", "EU")
```

A shard can belong to multiple zones.

## Step 2 - Define Zone Key Ranges

Specify which shard key ranges map to which zones:

```javascript
sh.updateZoneKeyRange(
  "myapp.users",
  { region: "US", _id: MinKey() },
  { region: "US", _id: MaxKey() },
  "US"
)

sh.updateZoneKeyRange(
  "myapp.users",
  { region: "EU", _id: MinKey() },
  { region: "EU", _id: MaxKey() },
  "EU"
)
```

The shard key must include `region` as a prefix for zone routing to work.

## Step 3 - Shard the Collection with a Zone-Aligned Key

```javascript
db.users.createIndex({ region: 1, _id: 1 })
sh.shardCollection("myapp.users", { region: 1, _id: 1 })
```

After sharding and once the balancer runs, all users with `region: "EU"` will reside on EU shards.

## Verify Zone Assignments

```javascript
// View shard zones
use config
db.shards.find({}, { _id: 1, tags: 1 })

// View zone key ranges
db.tags.find({ ns: "myapp.users" })
```

## Tiered Storage Example

Separate hot and cold data by using a date-based shard key with zones:

```javascript
// Hot shards (NVMe)
sh.addShardToZone("shard-hot1", "hot")
sh.addShardToZone("shard-hot2", "hot")

// Cold shards (spinning disk)
sh.addShardToZone("shard-cold1", "cold")

// Hot zone: last 90 days
sh.updateZoneKeyRange(
  "myapp.events",
  { createdAt: ISODate("2026-01-01") },
  { createdAt: MaxKey() },
  "hot"
)

// Cold zone: everything before 2026
sh.updateZoneKeyRange(
  "myapp.events",
  { createdAt: MinKey() },
  { createdAt: ISODate("2026-01-01") },
  "cold"
)
```

## Removing Zone Ranges

```javascript
sh.removeRangeFromZone(
  "myapp.users",
  { region: "EU", _id: MinKey() },
  { region: "EU", _id: MaxKey() }
)
```

## Removing a Shard from a Zone

```javascript
sh.removeShardFromZone("shard3", "EU")
```

After removing a shard from a zone, the balancer will distribute that shard's chunks to other shards in the zone.

## Limitations

- The shard key must include the zone tag field as a prefix
- Data outside defined zone ranges can land on any shard - ensure you define ranges covering `MinKey` to `MaxKey` to constrain all data
- Zone changes take effect only when the balancer runs and migrates chunks - not instantaneous

## Summary

Zone sharding pins shard key ranges to specific shards, enabling data locality for compliance and performance. Define zones by adding shards to zone labels, then configure key ranges for each zone. Use compound shard keys with the zone discriminator as a prefix. The balancer enforces zone placement automatically, but changes take time to propagate as chunks are migrated.

