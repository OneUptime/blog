# How to Implement the Approximation Pattern in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Data Modeling, Approximation Pattern, Performance, Write Optimization

Description: Learn how to implement the approximation pattern in MongoDB to reduce write frequency for counters and metrics where exact precision is not required.

---

## What Is the Approximation Pattern?

The approximation pattern reduces write frequency for high-volume counters by updating the stored value only periodically or probabilistically rather than on every event. When exact counts are not required (e.g., page views, social likes), approximate values computed with far fewer writes are acceptable.

## The Problem: Write-Heavy Exact Counters

A popular page with 1,000 views per second generates 1,000 write operations per second just to increment a counter:

```javascript
// Called 1000 times per second
db.articles.updateOne(
  { _id: ObjectId("6650a1b2c3d4e5f678901234") },
  { $inc: { viewCount: 1 } }
)
```

This creates write contention, increases latency, and consumes database resources unnecessarily when a near-exact count is sufficient.

## Approach 1: Threshold-Based Updates

Only write to MongoDB every N events. Buffer the count in memory and flush when a threshold is reached:

```javascript
class PageViewCounter {
  constructor(threshold = 100) {
    this.threshold = threshold;
    this.buffer = new Map(); // articleId -> pending count
  }

  async recordView(articleId) {
    const current = (this.buffer.get(articleId) || 0) + 1;
    this.buffer.set(articleId, current);

    if (current >= this.threshold) {
      // Flush: update database with accumulated count
      await db.articles.updateOne(
        { _id: articleId },
        { $inc: { viewCount: this.threshold } }
      );
      this.buffer.set(articleId, 0);
    }
  }
}

const counter = new PageViewCounter(100);
// Now 1000 views/sec = only 10 writes/sec
```

## Approach 2: Probabilistic Updates

Write to the database with probability 1/N. Each write increments by N:

```javascript
function recordViewProbabilistic(articleId, probability = 0.01) {
  if (Math.random() < probability) {
    // Write happens ~1% of the time, but increments by 1/probability
    db.articles.updateOne(
      { _id: articleId },
      { $inc: { viewCount: Math.round(1 / probability) } }
    );
  }
}

// 1000 views/sec -> ~10 writes/sec, each increments by 100
// Expected value of counter is accurate over time
```

## Approach 3: Time-Window Batching

Accumulate counts in a fast store (Redis, in-memory) and flush periodically:

```javascript
// In-memory accumulator
const viewAccumulator = {};

// Called on every page view (very fast, no DB write)
function recordView(articleId) {
  viewAccumulator[articleId] = (viewAccumulator[articleId] || 0) + 1;
}

// Flush every 60 seconds
setInterval(async () => {
  const snapshot = { ...viewAccumulator };
  for (const [articleId, count] of Object.entries(snapshot)) {
    if (count > 0) {
      await db.articles.updateOne(
        { _id: articleId },
        { $inc: { viewCount: count } }
      );
      viewAccumulator[articleId] = 0;
    }
  }
}, 60000);
```

## Storing Last-Written Timestamp

Track when the counter was last approximated for staleness detection:

```javascript
db.articles.updateOne(
  { _id: articleId },
  {
    $inc: { viewCount: batchCount },
    $set: { viewCountUpdatedAt: new Date() }
  }
)
```

## Use Cases for Approximation

```text
Metric                  | Exact required? | Approximation OK?
------------------------|-----------------|-------------------
Financial transaction   | Yes             | No
Page view count         | No              | Yes
Social media likes      | No              | Yes
Search result count     | No              | Yes
Inventory quantity      | Yes             | No
Video play count        | No              | Yes
API request rate        | No              | Yes
```

## Combining with the Computed Pattern

Store an approximate count in the main document and recompute exactly during off-peak hours:

```javascript
// Fast approximation during the day
db.articles.updateOne({ _id: id }, { $inc: { approxViews: 100 } });

// Exact recomputation at midnight using actual event log
const exactCount = db.pageViewEvents.countDocuments({ articleId: id });
db.articles.updateOne({ _id: id }, { $set: { exactViews: exactCount } });
```

## Summary

The approximation pattern reduces write frequency for high-volume counters by updating stored values only when a threshold is reached, probabilistically, or on a time interval. This is ideal for page views, like counts, play counts, and any metric where near-exact values are acceptable. The pattern dramatically reduces write contention and database load - reducing 1,000 writes per second to 10-100 writes per second - with minimal impact on the accuracy that users actually need.
