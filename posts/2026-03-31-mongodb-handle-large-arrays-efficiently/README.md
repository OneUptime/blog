# How to Handle Large Arrays Efficiently in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Array, Performance, Schema

Description: Learn strategies for handling large arrays in MongoDB, including the Bucket Pattern, pagination with $slice, and when to use separate collections.

---

## The Problem with Unbounded Arrays

MongoDB's 16 MB document size limit becomes a concern when arrays grow without bound. A blog post that embeds all comments, or an IoT device document that embeds all sensor readings, will eventually hit this limit or suffer serious write amplification - every push to the array rewrites the entire document.

## Anti-Pattern: The Unbounded Array

```json
{
  "_id": "post-001",
  "title": "My Blog Post",
  "comments": [
    { "author": "Alice", "text": "Great post!" },
    { "author": "Bob",   "text": "Thanks!" }
    // ... potentially thousands more
  ]
}
```

Avoid this pattern for arrays that can grow to more than a few hundred elements.

## Strategy 1: Move Large Arrays to a Separate Collection

The simplest fix is to extract array elements into their own collection and use a reference:

```javascript
// posts collection
{ _id: "post-001", title: "My Blog Post", commentCount: 42 }

// comments collection
{ _id: ObjectId(), postId: "post-001", author: "Alice", text: "Great post!", createdAt: ISODate() }
{ _id: ObjectId(), postId: "post-001", author: "Bob",   text: "Thanks!",     createdAt: ISODate() }
```

Index `postId` to keep per-post comment queries fast:

```javascript
db.comments.createIndex({ postId: 1, createdAt: -1 })
```

## Strategy 2: The Bucket Pattern

Group a fixed number of related items per document. This is ideal for time-series and IoT data:

```javascript
// One bucket = one hour of readings for one device
{
  _id: ObjectId(),
  deviceId: "sensor-001",
  bucketStart: ISODate("2026-01-15T10:00:00Z"),
  count: 60,
  readings: [
    { ts: ISODate("2026-01-15T10:00:00Z"), temp: 22.1 },
    { ts: ISODate("2026-01-15T10:01:00Z"), temp: 22.3 }
    // ... up to 60 entries
  ]
}
```

Use `$push` with an upsert, and create a new bucket when the count reaches the limit:

```javascript
db.sensorBuckets.updateOne(
  {
    deviceId: "sensor-001",
    count: { $lt: 60 }
  },
  {
    $push: { readings: { ts: new Date(), temp: 22.5 } },
    $inc: { count: 1 },
    $setOnInsert: { bucketStart: new Date() }
  },
  { upsert: true }
)
```

## Strategy 3: Paginating Large Arrays with $slice

When you must keep an array embedded, use `$slice` in a projection to read only a window of elements:

```javascript
// Get the first 10 comments
db.posts.findOne(
  { _id: "post-001" },
  { comments: { $slice: 10 } }
)

// Skip 20, take the next 10 (offset pagination)
db.posts.findOne(
  { _id: "post-001" },
  { comments: { $slice: [20, 10] } }
)
```

## Strategy 4: Capping Array Size with $push and $slice Together

Keep a "latest N" sliding window using an update:

```javascript
// Keep only the 100 most recent events
db.devices.updateOne(
  { _id: "device-001" },
  {
    $push: {
      recentEvents: {
        $each: [{ ts: new Date(), value: 42 }],
        $slice: -100   // keep the last 100 elements
      }
    }
  }
)
```

## Indexing Array Fields

MongoDB creates a multikey index that indexes each element individually. This is efficient for membership queries but watch out for index bloat on high-cardinality arrays:

```javascript
db.products.createIndex({ tags: 1 })

// Now this query is index-backed
db.products.find({ tags: "electronics" })
```

## Summary

For arrays that grow without bound, prefer a separate collection with a foreign key reference. Use the Bucket Pattern to group a fixed number of items per document - ideal for time-series data. Use `$slice` in projections to page through embedded arrays without reading the whole document. Use `$push` with `$slice: -N` to maintain a sliding window of the most recent N elements.
