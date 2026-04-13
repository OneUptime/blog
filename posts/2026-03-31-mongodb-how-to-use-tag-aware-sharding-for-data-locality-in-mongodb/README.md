# How to Use Tag-Aware Sharding for Data Locality in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Tag-Aware Sharding, Data Locality, Compliance

Description: Learn how to use MongoDB tag-aware sharding (zones) to pin specific data ranges to specific shards for geographic locality and compliance requirements.

---

## What Is Tag-Aware Sharding

Tag-aware sharding, also called zone sharding, lets you assign shards to named zones and then map shard key ranges to those zones. MongoDB's balancer ensures that chunks falling within a zone's key range reside only on shards assigned to that zone.

Common use cases:
- Store EU user data on EU data center shards (GDPR compliance)
- Keep high-frequency data on NVMe shards and cold data on HDD shards
- Route tenant data for premium customers to dedicated hardware

## Prerequisites

- Sharding must be enabled on the cluster
- A sharded collection with an appropriate shard key
- The shard key must include the field(s) used for zone assignment

## Step 1 - Assign Zones to Shards

Connect to mongos and tag each shard:

```javascript
// Tag EU shards
sh.addShardToZone("shard01", "EU");
sh.addShardToZone("shard02", "EU");

// Tag US shards
sh.addShardToZone("shard03", "US");
sh.addShardToZone("shard04", "US");
```

A shard can belong to multiple zones. Remove a zone assignment:

```javascript
sh.removeShardFromZone("shard01", "EU");
```

## Step 2 - Shard the Collection with a Locality Key

The shard key must include the field that identifies the zone:

```javascript
sh.shardCollection("mydb.users", { region: 1, _id: 1 });
```

## Step 3 - Define Zone Key Ranges

Map shard key ranges to zones. `MinKey` and `MaxKey` cover all values for the second key field:

```javascript
// All EU documents go to EU shards
sh.updateZoneKeyRange(
  "mydb.users",
  { region: "EU", _id: MinKey },
  { region: "EU", _id: MaxKey },
  "EU"
);

// All US documents go to US shards
sh.updateZoneKeyRange(
  "mydb.users",
  { region: "US", _id: MinKey },
  { region: "US", _id: MaxKey },
  "US"
);

// APAC documents
sh.updateZoneKeyRange(
  "mydb.users",
  { region: "APAC", _id: MinKey },
  { region: "APAC", _id: MaxKey },
  "APAC"
);
```

## Step 4 - Verify Zone Configuration

```javascript
sh.status();
```

Look for the `zones` section in the output. You should see your zone-to-shard and zone-to-range mappings.

Check the config database directly:

```javascript
use config;

// View zone assignments on shards
db.shards.find({}, { _id: 1, tags: 1 });

// View zone key ranges
db.tags.find({ ns: "mydb.users" });
```

## Tiered Storage with Zones

Use zones to separate hot and cold data by time:

```javascript
// Shard key: { year: 1, _id: 1 }
sh.addShardToZone("shard-nvme-01", "hot");
sh.addShardToZone("shard-hdd-01",  "cold");

// Current year on fast storage
sh.updateZoneKeyRange("mydb.events",
  { year: 2025, _id: MinKey },
  { year: 2025, _id: MaxKey },
  "hot"
);

// Older data on slower storage
sh.updateZoneKeyRange("mydb.events",
  { year: MinKey, _id: MinKey },
  { year: 2025, _id: MinKey },
  "cold"
);
```

## Removing Zone Ranges

```javascript
sh.removeRangeFromZone(
  "mydb.users",
  { region: "EU", _id: MinKey },
  { region: "EU", _id: MaxKey }
);
```

After removing ranges, the balancer redistributes affected chunks across all shards.

## Balancer Behavior

The balancer respects zone assignments when migrating chunks. If a chunk falls within a zone's key range but lives on a shard outside that zone, the balancer moves it. The balancer runs automatically; you can check its status:

```javascript
sh.isBalancerRunning();
sh.getBalancerState();
```

Force an immediate balancing round:

```javascript
sh.startBalancer();
```

## Summary

Tag-aware sharding gives you precise control over where MongoDB stores data by mapping shard key ranges to named zones and assigning those zones to specific shards. This is essential for GDPR compliance, tiered storage architectures, and multi-tenant isolation. After defining zones and ranges, the MongoDB balancer automatically migrates chunks to enforce the placement rules without application changes.
