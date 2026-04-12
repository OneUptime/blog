# How to Configure Write Concern for Replica Sets in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Write Concern, Durability, Database

Description: Learn how to configure write concern for MongoDB replica sets to balance durability and performance, including w:majority, custom levels, and timeout settings.

---

Write concern controls how many replica set members must acknowledge a write before MongoDB considers it successful. Choosing the right write concern is one of the most important durability decisions in a MongoDB deployment.

## Write Concern Components

- `w` - number of members (or `majority`) that must acknowledge the write
- `j` - whether the acknowledging members must write to the on-disk journal before acknowledging
- `wtimeout` - milliseconds to wait before returning an error if acknowledgment is not received

## Write Concern Levels

```javascript
// Unacknowledged - fire and forget
{ w: 0 }

// Acknowledged by primary only (default before MongoDB 5.0)
{ w: 1 }

// Acknowledged by a majority of voting members (default for replica sets since MongoDB 5.0)
{ w: "majority" }

// Acknowledged by exactly N members
{ w: 3 }

// With journaling on the primary
{ w: 1, j: true }

// Most durable - majority with journaling
{ w: "majority", j: true }
```

## Setting Write Concern Per Operation

```javascript
// Insert with majority write concern
await db.collection('orders').insertOne(
  { userId: "u1", total: 99.99 },
  { writeConcern: { w: "majority", j: true, wtimeout: 5000 } }
);

// Update with specific member count
await db.collection('inventory').updateOne(
  { productId: "p1" },
  { $inc: { qty: -1 } },
  { writeConcern: { w: 2 } }
);
```

## Setting Default Write Concern on a Collection

```javascript
const orders = db.collection('orders', { writeConcern: { w: "majority" } });
await orders.insertOne({ ... });
```

## Setting Cluster-Wide Default Write Concern

```javascript
db.adminCommand({
  setDefaultRWConcern: 1,
  defaultWriteConcern: { w: "majority", j: true }
});
```

## Setting Write Concern in Replica Set Config

You can configure the default write concern at the replica set level:

```javascript
var cfg = rs.conf();
cfg.settings.getLastErrorDefaults = {
  w: "majority",
  wtimeout: 5000
};
rs.reconfig(cfg);
```

Note: As of MongoDB 5.0, this field is deprecated in favor of `setDefaultRWConcern`.

## Custom Write Concern Modes with Tags

Tag members and create custom write concern modes:

```javascript
// Tag members by datacenter
var cfg = rs.conf();
cfg.members[0].tags = { dc: "east" };
cfg.members[1].tags = { dc: "east" };
cfg.members[2].tags = { dc: "west" };

// Define a mode requiring at least one ack from each DC
cfg.settings.getLastErrorModes = {
  multiDC: { dc: 2 }  // at least 2 distinct dc values must ack
};
rs.reconfig(cfg);
```

Use the custom mode:

```javascript
await col.insertOne(doc, { writeConcern: { w: "multiDC" } });
```

## Performance vs Durability Trade-offs

| Write Concern | Latency | Durability |
|---|---|---|
| `w:0` | Lowest | None - no ack |
| `w:1` | Low | Primary only |
| `w:majority` | Medium | Survives primary failure |
| `w:majority, j:true` | Higher | Survives primary failure + crash |

## Handling Write Concern Errors

```javascript
try {
  await col.insertOne(doc, { writeConcern: { w: "majority", wtimeout: 3000 } });
} catch (err) {
  if (err.result?.writeConcernError) {
    console.error("Write concern timeout:", err.result.writeConcernError.errmsg);
    // Data may still be written to the primary - handle accordingly
  }
}
```

A `wtimeout` error does NOT mean the write failed - it means acknowledgment was not received in time. The write may still propagate.

## Summary

Use `w: "majority"` for production workloads to ensure writes survive a primary failure. Add `j: true` for the strongest durability guarantee. Set `wtimeout` to avoid indefinite blocking when members are slow. For multi-datacenter deployments, tag-based custom write concerns let you require acknowledgment from specific infrastructure zones before confirming a write.

