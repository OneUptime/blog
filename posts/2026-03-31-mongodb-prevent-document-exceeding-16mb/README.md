# How to Prevent Document Size from Exceeding 16MB in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema, Performance, Storage

Description: Learn how to stay within MongoDB's 16MB document size limit using schema patterns like Bucket, Outlier, and GridFS for binary data.

---

## Understanding the 16 MB Limit

Every BSON document in MongoDB must be 16 MB or smaller. This applies to the document as stored on disk, including all embedded sub-documents, arrays, and binary data. Exceeding this limit causes a `BSONObjectTooLarge` error at write time.

```text
BSONObj size: 17549583 (0x10BC90F) is invalid. Size must be between 0 and 16793600(16MB)
```

The limit exists to encourage good schema design - a document that large is almost always a sign that data should be modelled differently.

## Detecting Documents Approaching the Limit

Use `$bsonSize` to periodically scan for oversized documents:

```javascript
db.posts.aggregate([
  {
    $project: {
      title: 1,
      sizeBytes: { $bsonSize: "$$ROOT" }
    }
  },
  {
    $match: { sizeBytes: { $gt: 10 * 1024 * 1024 } }  // > 10 MB
  },
  { $sort: { sizeBytes: -1 } }
])
```

Set up a cron job or scheduled task that alerts you when documents exceed a threshold (e.g., 10 MB).

## Pattern 1: Separate Large Arrays into a Child Collection

The most common cause of document bloat is unbounded arrays. Extract array elements to a separate collection:

```javascript
// Before - dangerous
{ _id: "post-001", comments: [ /* thousands of objects */ ] }

// After - safe
// posts: { _id: "post-001", commentCount: 5000 }
// comments: { _id: ..., postId: "post-001", text: "..." }
```

## Pattern 2: The Bucket Pattern for Time-Series

Group time-series readings into fixed-size buckets instead of one document per entity:

```javascript
{
  _id: ObjectId(),
  deviceId: "sensor-42",
  hour: ISODate("2026-01-15T10:00:00Z"),
  count: 60,
  readings: [ /* max 60 items */ ]
}
```

When a bucket reaches its limit, close it and start a new one with `upsert`:

```javascript
db.buckets.updateOne(
  { deviceId: "sensor-42", count: { $lt: 60 } },
  { $push: { readings: newReading }, $inc: { count: 1 }, $setOnInsert: { hour: new Date() } },
  { upsert: true }
)
```

## Pattern 3: The Outlier Pattern

Most documents are small but occasional "viral" ones grow large. Store a flag and a reference to overflow data:

```javascript
// Normal post
{ _id: "post-001", commentCount: 50, comments: [ /* 50 items */ ] }

// Outlier post
{ _id: "post-002", commentCount: 15000, hasOverflow: true, comments: [ /* first 1000 */ ] }
// Overflow stored in overflow_comments collection with postId reference
```

Application logic checks `hasOverflow` and loads additional pages from the overflow collection.

## Pattern 4: Use GridFS for Binary Data

Never embed large binary files (images, PDFs, videos) directly in documents. Use GridFS, which automatically chunks files into 255 KB pieces:

```javascript
const bucket = new GridFSBucket(db);

// Store a file
const uploadStream = bucket.openUploadStream("photo.jpg");
fs.createReadStream("photo.jpg").pipe(uploadStream);

// Reference from a document
{
  _id: "product-001",
  name: "Widget",
  photoFileId: ObjectId("64abc...")  // GridFS file ID
}
```

## Schema Validation to Enforce Array Limits

Use JSON Schema validation to reject inserts that would cause array growth beyond a safe size:

```javascript
db.createCollection("posts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        comments: {
          bsonType: "array",
          maxItems: 500
        }
      }
    }
  }
})
```

## Summary

Stay within 16 MB by moving unbounded arrays to child collections, grouping time-series data with the Bucket Pattern, handling rare "outlier" documents separately, and storing binary files via GridFS. Use `$bsonSize` in scheduled queries to monitor document sizes proactively, and enforce array size limits via JSON Schema validation to catch problems before they reach the document size ceiling.
