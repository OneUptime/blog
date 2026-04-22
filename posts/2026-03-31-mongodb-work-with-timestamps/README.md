# How to Work with Timestamps in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Timestamp, BSON, Replication

Description: Understand MongoDB's internal BSON Timestamp type, how it differs from Date, when to use each, and how to work with timestamps in documents and replication.

---

## BSON Timestamp vs Date

MongoDB has two time-related BSON types that serve different purposes:

- **Date** (BSON type 9) - a 64-bit millisecond UTC value for storing application timestamps
- **Timestamp** (BSON type 17) - a special 64-bit type for internal MongoDB use (replication oplog)

The BSON `Timestamp` encodes an ordinal (incrementing integer) in the lower 32 bits and seconds since epoch in the upper 32 bits. It is primarily used internally by MongoDB for the oplog and change streams. For application dates, always use `Date`.

## Internal Timestamp in the Oplog

The oplog uses the `Timestamp` type in its `ts` field:

```javascript
use local
db.oplog.rs.find().sort({ $natural: -1 }).limit(1);
// Output includes: ts: Timestamp({ t: 1718444400, i: 1 })
```

The `t` component is seconds since epoch, and `i` is the ordinal within that second.

## Creating Timestamps in mongosh

```javascript
// Zero timestamp - when inserted as a top-level field, the server
// replaces it with the current timestamp automatically
const ts = new Timestamp();
print(ts); // Timestamp({ t: 0, i: 0 })

// Specific timestamp with time and ordinal
const ts2 = new Timestamp({ t: 1718444400, i: 5 });
```

## When You Might Store a Timestamp Field

Occasionally applications store a BSON `Timestamp` to track replication position or to implement custom CDC (Change Data Capture):

```javascript
db.checkpoints.insertOne({
  service: "order-processor",
  lastProcessed: new Timestamp({ t: Math.floor(Date.now() / 1000), i: 1 })
});
```

Query checkpoints after a known timestamp:

```javascript
const checkpoint = db.checkpoints.findOne({ service: "order-processor" });
db.oplog.rs.find({ ts: { $gt: checkpoint.lastProcessed } });
```

## Comparing Timestamps

```javascript
const ts1 = new Timestamp({ t: 1718444000, i: 1 });
const ts2 = new Timestamp({ t: 1718444400, i: 1 });

// $gt, $lt comparisons work on Timestamp fields
db.checkpoints.find({ lastProcessed: { $gt: ts1 } });
```

## Timestamp Type Checking

```javascript
// Find documents where a field is a BSON Timestamp (type 17)
db.checkpoints.find({ lastProcessed: { $type: "timestamp" } });

// Differentiate from Date type
db.events.find({ createdAt: { $type: "date" } });
```

## Practical Pattern - Auto-Updating Timestamps with $currentDate

The `$currentDate` operator can set a field to the current date as either a `Date` or `Timestamp`:

```javascript
// Set as Date (recommended for application timestamps)
db.sessions.updateOne(
  { sessionId: "sess-001" },
  { $currentDate: { updatedAt: true } }
);

// Set as Timestamp
db.sessions.updateOne(
  { sessionId: "sess-001" },
  { $currentDate: { updatedAt: { $type: "timestamp" } } }
);
```

## Summary

MongoDB's BSON `Timestamp` type is designed for internal replication and oplog purposes, encoding seconds and an ordinal counter. For application-level time tracking, use `Date` objects instead. Store `Timestamp` fields only when you need to track replication position, implement custom CDC, or interface directly with the oplog. Use `$currentDate` to set either type automatically on update.
