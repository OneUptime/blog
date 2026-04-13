# How to Handle Documents Approaching the 16MB Limit in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Document Size, 16MB Limit, Schema Design, Performance

Description: Learn strategies for handling MongoDB documents approaching the 16MB BSON limit, including schema redesign, bucketing, and offloading large data.

---

## The 16MB BSON Document Limit

MongoDB enforces a 16MB limit on individual BSON documents. Documents approaching this limit often indicate schema design issues. Understanding your options prevents hitting this wall in production.

## Detecting Documents Near the Limit

```javascript
// Find documents larger than 1MB
db.myCollection.find().forEach(function(doc) {
  const size = bsonsize(doc);
  if (size > 1024 * 1024) {
    print(`_id: ${doc._id}, size: ${(size / 1024 / 1024).toFixed(2)} MB`);
  }
});

// More efficient with aggregation
db.myCollection.aggregate([
  {
    $project: {
      docSize: { $bsonSize: "$$ROOT" }
    }
  },
  {
    $match: { docSize: { $gt: 1048576 } }
  },
  { $sort: { docSize: -1 } },
  { $limit: 10 }
])
```

## Strategy 1: Bucket Pattern

If the document grows because you append to an array (e.g., sensor readings), use the bucket pattern to cap each document:

```javascript
// Instead of one document per device with unlimited readings array:
// { deviceId: "s1", readings: [{t: ..., v: ...}, ...thousands...] }

// Use bucketed documents (one per hour, for example):
{
  deviceId: "sensor-001",
  bucketStart: ISODate("2026-03-31T10:00:00Z"),
  bucketEnd: ISODate("2026-03-31T11:00:00Z"),
  count: 360,
  readings: [
    { t: ISODate("2026-03-31T10:00:00Z"), v: 23.4 },
    { t: ISODate("2026-03-31T10:00:10Z"), v: 23.5 }
    // ... up to ~360 entries
  ]
}
```

## Strategy 2: Referencing Instead of Embedding

Extract frequently-growing sub-documents into their own collections:

```javascript
// Instead of embedding all comments in a post:
db.posts.findOne({ _id: postId })
// { title: "...", comments: [...thousands of comments...] }

// Reference comments from a separate collection:
db.comments.find({ postId: postId })
// Each comment is its own document
```

## Strategy 3: Extended Reference Pattern

Keep only the most recent or most important data embedded, archive the rest:

```javascript
// Embed only the last 10 events; archive older ones
db.orders.updateOne(
  { _id: orderId },
  {
    $push: {
      recentEvents: {
        $each: [newEvent],
        $sort: { timestamp: -1 },
        $slice: 10  // keep only last 10
      }
    }
  }
)
```

## Strategy 4: Use GridFS for Binary Data

If the document is large because of embedded binary data (images, files), use GridFS:

```javascript
const { GridFSBucket } = require("mongodb");
const bucket = new GridFSBucket(db, { bucketName: "attachments" });

// Upload file
const uploadStream = bucket.openUploadStream("report.pdf");
fs.createReadStream("/path/to/report.pdf").pipe(uploadStream);

// Store only the file ID in the document
db.reports.updateOne(
  { _id: reportId },
  { $set: { attachmentId: uploadStream.id } }
)
```

## Monitoring Growth Over Time

```javascript
db.myCollection.aggregate([
  {
    $group: {
      _id: null,
      avgSize: { $avg: { $bsonSize: "$$ROOT" } },
      maxSize: { $max: { $bsonSize: "$$ROOT" } },
      totalDocs: { $sum: 1 }
    }
  }
])
```

## Summary

Documents approaching MongoDB's 16MB limit usually signal a schema design problem. The bucket pattern caps unbounded arrays, referencing replaces embedded arrays with separate collections, and GridFS handles binary data outside documents. Monitor document sizes proactively using `$bsonSize` in aggregation to catch growth trends before they cause production errors.
