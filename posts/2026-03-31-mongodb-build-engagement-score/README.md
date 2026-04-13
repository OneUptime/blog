# How to Build an Engagement Score in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Analytics, Engagement, Score

Description: Learn how to build a user engagement score in MongoDB by weighting different user actions and aggregating them into a composite score per user.

---

## Introduction

An engagement score is a composite metric that quantifies how actively a user interacts with your product. By assigning weights to different event types (e.g., a comment is worth more than a page view), you can rank users by overall engagement and power features like churn prediction or loyalty programs.

## Sample Data

Assume an `events` collection:

```javascript
{
  "_id": ObjectId("..."),
  "userId": "user_800",
  "event": "comment",
  "timestamp": ISODate("2025-10-15T13:00:00Z")
}
```

Possible event types and weights: `page_view` = 1, `search` = 2, `add_to_cart` = 5, `purchase` = 20, `comment` = 10, `share` = 8.

## Computing Weighted Engagement Score

Use `$cond` or `$switch` to assign weights per event type, then sum them per user:

```javascript
db.events.aggregate([
  {
    $match: {
      timestamp: {
        $gte: ISODate("2025-10-01T00:00:00Z"),
        $lt: ISODate("2025-11-01T00:00:00Z")
      }
    }
  },
  {
    $project: {
      userId: 1,
      timestamp: 1,
      eventWeight: {
        $switch: {
          branches: [
            { case: { $eq: ["$event", "purchase"] }, then: 20 },
            { case: { $eq: ["$event", "comment"] }, then: 10 },
            { case: { $eq: ["$event", "share"] }, then: 8 },
            { case: { $eq: ["$event", "add_to_cart"] }, then: 5 },
            { case: { $eq: ["$event", "search"] }, then: 2 },
            { case: { $eq: ["$event", "page_view"] }, then: 1 }
          ],
          default: 0
        }
      }
    }
  },
  {
    $group: {
      _id: "$userId",
      engagementScore: { $sum: "$eventWeight" },
      totalEvents: { $sum: 1 },
      lastActive: { $max: "$timestamp" }
    }
  },
  { $sort: { engagementScore: -1 } }
])
```

## Adding Recency Decay

Recent activity should count more than old activity. Apply a recency multiplier using a time decay factor:

```javascript
db.events.aggregate([
  {
    $match: {
      timestamp: { $gte: ISODate("2025-09-01T00:00:00Z") }
    }
  },
  {
    $project: {
      userId: 1,
      event: 1,
      daysSinceEvent: {
        $divide: [
          { $subtract: [new Date("2025-11-01T00:00:00Z"), "$timestamp"] },
          1000 * 60 * 60 * 24
        ]
      }
    }
  },
  {
    $project: {
      userId: 1,
      weightedScore: {
        $multiply: [
          {
            $switch: {
              branches: [
                { case: { $eq: ["$event", "purchase"] }, then: 20 },
                { case: { $eq: ["$event", "comment"] }, then: 10 },
                { case: { $eq: ["$event", "page_view"] }, then: 1 }
              ],
              default: 1
            }
          },
          { $exp: { $multiply: [-0.01, "$daysSinceEvent"] } }
        ]
      }
    }
  },
  {
    $group: {
      _id: "$userId",
      engagementScore: { $sum: "$weightedScore" }
    }
  },
  { $sort: { engagementScore: -1 } }
])
```

`$exp` computes the natural exponential, enabling exponential decay based on days since the event.

## Persisting Scores for Real-Time Lookup

Write scores to a `user_engagement` collection for fast per-user lookups:

```javascript
db.events.aggregate([
  // ... pipeline from above
  { $merge: { into: "user_engagement", on: "_id", whenMatched: "replace" } }
])
```

Schedule this aggregation to run nightly or hourly depending on freshness requirements.

## Index Recommendation

```javascript
db.events.createIndex({ userId: 1, timestamp: -1 })
db.events.createIndex({ event: 1, timestamp: 1 })
```

## Summary

Building an engagement score in MongoDB uses `$switch` to assign weights to event types, `$group` to sum weighted scores per user, and optionally `$exp` for recency decay. Persisting scores to a dedicated collection with `$merge` enables fast lookups without re-running the full aggregation on every request. Index on `userId` and `timestamp` to keep the aggregation pipeline efficient.
