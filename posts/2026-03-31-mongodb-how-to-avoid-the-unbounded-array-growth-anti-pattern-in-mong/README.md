# How to Avoid the Unbounded Array Growth Anti-Pattern in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Anti-Pattern, Schema Design, Performance, Best Practice

Description: Learn how to identify and fix the unbounded array growth anti-pattern in MongoDB that causes document bloat, slow queries, and write amplification.

---

## What Is the Unbounded Array Anti-Pattern

The unbounded array anti-pattern occurs when you embed an array in a document that can grow without limit over time. MongoDB documents have a 16MB size limit, and large arrays cause:
- Document size limit violations
- Slow read performance (loading large arrays into memory)
- High write amplification (updating embedded arrays triggers full document rewrites)
- Index inefficiency (multikey indexes on large arrays are expensive)

## Common Examples of the Anti-Pattern

### Example 1 - Storing All Comments in a Post Document

```javascript
// ANTI-PATTERN: unbounded comments array
{
  _id: "post-123",
  title: "My Blog Post",
  comments: [
    { user: "alice", text: "Great post!", date: ISODate("2026-01-01") },
    { user: "bob",   text: "Thanks!",     date: ISODate("2026-01-02") },
    // ... potentially thousands of comments
  ]
}
```

### Example 2 - Logging Events in a User Document

```javascript
// ANTI-PATTERN: unbounded activity log
{
  _id: "user-456",
  name: "Alice",
  activityLog: [
    { action: "login",    at: ISODate("2026-01-01T08:00:00Z") },
    { action: "purchase", at: ISODate("2026-01-01T09:30:00Z") },
    // ... grows indefinitely
  ]
}
```

### Example 3 - Tracking All Orders on a Customer

```javascript
// ANTI-PATTERN: orders embedded in customer
{
  _id: "customer-789",
  name: "Bob",
  orders: [
    { orderId: "ORD-001", total: 99.99 },
    { orderId: "ORD-002", total: 149.99 },
    // years of orders = document explosion
  ]
}
```

## Fix 1 - Use a Separate Collection with References

The most common fix is to extract the growing array items into their own collection:

```javascript
// GOOD: separate comments collection
// posts collection
{ _id: "post-123", title: "My Blog Post", commentCount: 42 }

// comments collection
{ _id: ObjectId(), postId: "post-123", user: "alice", text: "Great post!", date: ISODate("2026-01-01") }
{ _id: ObjectId(), postId: "post-123", user: "bob",   text: "Thanks!",     date: ISODate("2026-01-02") }

// Index for efficient lookup
db.comments.createIndex({ postId: 1, date: -1 });

// Query comments for a post with pagination
db.comments.find({ postId: "post-123" })
  .sort({ date: -1 })
  .skip(0)
  .limit(20);
```

## Fix 2 - The Subset Pattern (Bounded Embedding)

When you genuinely need to embed related data, only embed a bounded subset - such as the most recent N items:

```javascript
// GOOD: embed only the 5 most recent comments
{
  _id: "post-123",
  title: "My Blog Post",
  commentCount: 350,
  recentComments: [
    { user: "carol", text: "Still relevant!", date: ISODate("2026-03-30") },
    { user: "dave",  text: "Agreed.",          date: ISODate("2026-03-29") }
    // max 5 items
  ]
}

// When adding a new comment
async function addComment(db, postId, comment) {
  const commentsCol = db.collection('comments');
  const postsCol = db.collection('posts');

  // Insert into comments collection
  await commentsCol.insertOne({ postId, ...comment, date: new Date() });

  // Update post: increment count, push to recent, trim to 5
  await postsCol.updateOne(
    { _id: postId },
    {
      $inc: { commentCount: 1 },
      $push: {
        recentComments: {
          $each: [comment],
          $sort: { date: -1 },
          $slice: 5
        }
      }
    }
  );
}
```

## Fix 3 - Bucketing Pattern for Time-Series Data

For activity logs and time-series data, group events into time-bounded buckets:

```javascript
// GOOD: bucket pattern - one document per user per hour
{
  _id: ObjectId(),
  userId: "user-456",
  bucketStart: ISODate("2026-03-31T08:00:00Z"),
  bucketEnd:   ISODate("2026-03-31T09:00:00Z"),
  eventCount: 23,
  events: [
    { action: "login",    at: ISODate("2026-03-31T08:02:14Z") },
    { action: "search",   at: ISODate("2026-03-31T08:05:32Z") },
    // bounded by 1 hour of events
  ]
}

// Append to current bucket
async function logEvent(db, userId, action) {
  const now = new Date();
  const bucketStart = new Date(now);
  bucketStart.setMinutes(0, 0, 0);

  await db.collection('activity_logs').updateOne(
    { userId, bucketStart },
    {
      $push: { events: { action, at: now } },
      $inc: { eventCount: 1 },
      $setOnInsert: { bucketEnd: new Date(bucketStart.getTime() + 3600000) }
    },
    { upsert: true }
  );
}

// Query events for a time range
async function getEvents(db, userId, start, end) {
  return db.collection('activity_logs').aggregate([
    { $match: { userId, bucketStart: { $gte: start }, bucketEnd: { $lte: end } } },
    { $unwind: '$events' },
    { $match: { 'events.at': { $gte: start, $lte: end } } },
    { $replaceRoot: { newRoot: '$events' } },
    { $sort: { at: 1 } }
  ]).toArray();
}
```

## Fix 4 - Using $slice to Prevent Growth

When you want to keep only the last N items in an array and prune older ones:

```javascript
// Keep only the last 100 log entries per document
await db.collection('users').updateOne(
  { _id: userId },
  {
    $push: {
      recentPurchases: {
        $each: [newPurchase],
        $sort: { purchasedAt: -1 },
        $slice: 100  // keep first 100 after sort (i.e. the 100 most recent)
      }
    }
  }
);
```

## Detecting the Anti-Pattern

```javascript
// Find documents with large arrays
db.posts.aggregate([
  { $project: { title: 1, commentArraySize: { $size: '$comments' } } },
  { $match: { commentArraySize: { $gt: 100 } } },
  { $sort: { commentArraySize: -1 } },
  { $limit: 10 }
]);

// Check document sizes
db.posts.aggregate([
  { $project: { title: 1, docSize: { $bsonSize: '$$ROOT' } } },
  { $sort: { docSize: -1 } },
  { $limit: 10 }
]);
```

## Choosing the Right Fix

```text
Array size < 100 items, rarely grows    -> Embedding is fine
Array grows a lot, needs full history   -> Separate collection with reference
Need recent N items quickly             -> Subset pattern (bounded embed)
Time-series or event data               -> Bucketing pattern
Need to cap and rotate                  -> $slice with $push
```

## Summary

The unbounded array growth anti-pattern is one of the most common MongoDB schema mistakes, leading to document size violations, poor write performance, and slow queries. Fix it by extracting arrays into separate collections, using the subset pattern to embed only a bounded recent set, or applying the bucketing pattern for time-series data. Always monitor document sizes with `$bsonSize` to catch the pattern early before it causes production issues.
