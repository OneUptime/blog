# What Is a Zone in MongoDB Sharding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Zone, Sharding, Data Locality, Sharded Cluster

Description: A zone in MongoDB sharding is a named grouping of shards that pins specific ranges of shard key values to designated shards for data locality control.

---

## Overview

MongoDB zones (formerly called tags) allow you to control where data lives in a sharded cluster. By assigning shards to named zones and mapping shard key ranges to those zones, you can ensure that specific documents always reside on specific shards. This is essential for multi-tenant architectures, regulatory compliance, and geographic data locality.

## Common Use Cases

- **Multi-region deployments** - Route European user data to EU shards and US user data to US shards
- **Tiered storage** - Pin hot data to fast NVMe shards and cold data to spinning-disk shards
- **Tenant isolation** - Dedicate shards to specific customers in a multi-tenant system
- **Compliance** - Keep data within a jurisdiction for GDPR or data residency requirements

## How Zones Work

A zone is a named label. You assign one or more shards to a zone, then define shard key ranges that map to that zone. MongoDB's balancer ensures that chunks in those key ranges only live on shards within the matching zone.

## Setting Up Zones

Step 1: Add shards to zones.

```javascript
// Assign shards to geographic zones
sh.addShardToZone("shard01", "EU")
sh.addShardToZone("shard02", "EU")
sh.addShardToZone("shard03", "US")
sh.addShardToZone("shard04", "US")
```

Step 2: Define key ranges for each zone.

```javascript
// Route EU users (region: "eu") to EU shards
sh.updateZoneKeyRange(
  "mydb.users",
  { region: "eu", _id: MinKey },
  { region: "eu", _id: MaxKey },
  "EU"
)

// Route US users to US shards
sh.updateZoneKeyRange(
  "mydb.users",
  { region: "us", _id: MinKey },
  { region: "us", _id: MaxKey },
  "US"
)
```

Step 3: Verify.

```javascript
sh.status()
```

The balancer will migrate chunks to comply with the zone definitions. This may take time depending on data volume.

## Listing and Removing Zone Ranges

```javascript
// View all zone ranges for a namespace
use config
db.tags.find({ ns: "mydb.users" })

// Remove a zone range
sh.removeRangeFromZone(
  "mydb.users",
  { region: "eu", _id: MinKey },
  { region: "eu", _id: MaxKey }
)

// Remove a shard from a zone
sh.removeShardFromZone("shard01", "EU")
```

## Zone Sharding and Shard Key Design

Your shard key must include the field you want to use for zone routing (e.g., `region`). A compound shard key like `{ region: 1, _id: 1 }` enables range-based zone routing while maintaining good distribution within each region.

If you use a hashed shard key, you lose the ability to define contiguous ranges per zone. Stick with ranged shard keys when zone sharding is a requirement.

## Balancer Behavior with Zones

The balancer respects zone constraints first, then distributes chunks evenly within each zone. If no shards are assigned to a zone but data falls into its range, the balancer cannot migrate those chunks to satisfy the zone constraint and the chunks remain on their current shard. Always ensure every zone-mapped range has at least one shard assigned.

## Summary

Zones in MongoDB sharding let you pin shard key ranges to specific shards for data locality, compliance, and tiered storage. Assign shards to named zones, define key ranges per zone, and the balancer handles the rest. Proper shard key design that includes the routing field is essential for effective zone sharding.
