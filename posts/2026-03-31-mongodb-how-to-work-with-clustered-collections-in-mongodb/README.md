# How to Work with Clustered Collections in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Clustered Collection, Performance, Index, Storage

Description: Learn how to create and use MongoDB clustered collections to co-locate documents by _id, reducing storage overhead and improving range query performance.

---

## What Are Clustered Collections?

Clustered collections, introduced in MongoDB 5.3, store documents physically ordered by the `_id` field on disk. Unlike regular collections where documents are stored in heap order and the `_id` index is a separate B-tree structure, a clustered collection combines the document storage and `_id` index into a single structure.

Benefits:
- Eliminates the separate `_id` index - saving storage
- Range queries on `_id` require fewer I/O operations
- TTL (time-to-live) expiration on `_id` is more efficient
- Useful when `_id` is a time-ordered value like UUID v7 or ObjectId

## Creating a Clustered Collection

```javascript
db.createCollection("events", {
  clusteredIndex: {
    key: { _id: 1 },
    unique: true,
    name: "events_clustered_index"
  }
})
```

The `clusteredIndex` key must be `{ _id: 1 }` - only the `_id` field can be the cluster key.

## Creating a Clustered Collection with TTL

A common pattern is to use a time-based `_id` with TTL expiry on the clustered index:

```javascript
db.createCollection("sessionEvents", {
  clusteredIndex: {
    key: { _id: 1 },
    unique: true
  },
  expireAfterSeconds: 3600  // expire documents 1 hour after _id value (if _id is a Date)
})
```

For TTL on a clustered collection, the `_id` field must be a BSON Date type.

## Inserting Documents

Inserts work identically to regular collections:

```javascript
// Use Date-based _id for TTL and clustering benefit
db.sessionEvents.insertOne({
  _id: new Date(),  // Date-based _id enables TTL
  userId: "user123",
  action: "login",
  ip: "192.168.1.1"
})

// ObjectId-based _id (already time-ordered) in a non-TTL clustered collection
db.events.insertOne({
  _id: new ObjectId(),
  userId: "user456",
  action: "purchase",
  amount: 49.99
})
```

## Range Queries on _id

The main advantage of clustered collections is efficient range queries on `_id`:

```javascript
// Range query on ObjectId _id (time-ordered)
const startId = ObjectId.createFromTime(Math.floor(new Date("2024-06-01").getTime() / 1000))
const endId = ObjectId.createFromTime(Math.floor(new Date("2024-07-01").getTime() / 1000))

db.events.find({
  _id: { $gte: startId, $lte: endId }
})

// Range query on Date _id
db.sessionEvents.find({
  _id: {
    $gte: new Date("2024-06-01T00:00:00Z"),
    $lt: new Date("2024-06-02T00:00:00Z")
  }
})
```

## Adding Secondary Indexes

Clustered collections support secondary indexes on other fields:

```javascript
// Add secondary indexes for non-_id queries
db.events.createIndex({ userId: 1, _id: 1 })
db.events.createIndex({ action: 1 })
```

## Comparing with Regular Collections

```javascript
// Regular collection: separate _id index + heap storage
db.createCollection("eventsRegular")
// _id index is created automatically, stored separately

// Clustered collection: _id and documents co-located
db.createCollection("eventsClustered", {
  clusteredIndex: { key: { _id: 1 }, unique: true }
})
// No separate _id index structure

// Check collection stats
db.eventsClustered.stats()
// Compare "indexSizes" - clustered collections show no _id index size
```

## Checking Clustered Index Info

```javascript
// Check if a collection uses a clustered index
db.getCollectionInfos({ name: "events" })
// Look for "clusteredIndex" in the options field

// List indexes - clustered index appears differently
db.events.getIndexes()
```

## Limitations

```javascript
// These are not supported on clustered collections:

// 1. Capped collections cannot be clustered
// 2. The cluster key must always be _id
// 3. Clustered collections cannot be converted from regular collections
// 4. TTL only works when _id is a Date type

// Check MongoDB version (requires 5.3+)
db.adminCommand({ buildInfo: 1 }).version
```

## Practical Pattern: Time-Series-Like Events

```javascript
// Use a Date _id for events that expire after 24 hours
db.createCollection("clickEvents", {
  clusteredIndex: { key: { _id: 1 }, unique: true },
  expireAfterSeconds: 86400
})

// Insert click event with Date _id
db.clickEvents.insertOne({
  _id: new Date(),
  userId: "user789",
  pageUrl: "/products/123",
  sessionId: "sess-abc"
})

// Efficiently query clicks in the last hour
db.clickEvents.find({
  _id: { $gte: new Date(Date.now() - 3600000) }
})
```

## Summary

Clustered collections in MongoDB co-locate documents with their `_id` index for more efficient range scans and reduced storage overhead from the separate `_id` index. They are particularly effective when using time-ordered `_id` values like ObjectId or Date, especially in combination with TTL expiration for short-lived event data.
