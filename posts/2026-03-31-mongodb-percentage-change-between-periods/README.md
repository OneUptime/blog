# How to Calculate Percentage Change Between Periods in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Analytics, Pipeline, Metric

Description: Use MongoDB aggregation to calculate period-over-period percentage change for metrics like revenue, signups, or events across any time window.

---

## Overview

Period-over-period analysis - comparing this week to last week, or this month to last month - is a common analytics requirement. MongoDB's aggregation pipeline can compute these comparisons directly in the database using stages like `$group` and `$project` along with expressions like `$cond` and `$divide`, avoiding multiple round trips or post-processing in application code.

## Sample Data Structure

Assume an `events` collection where each document records a transaction or activity.

```javascript
const sample = {
  _id: ObjectId(),
  type: "sale",
  amount: 149.99,
  userId: "user_001",
  occurredAt: new Date("2026-03-15T10:23:00Z"),
};
```

## Period-Over-Period with Two Date Ranges

Compare two specific date ranges by tagging each document with a period label inside the pipeline.

```javascript
const now = new Date();
const periodEnd = new Date(now);
const periodStart = new Date(now);
periodStart.setDate(periodStart.getDate() - 7);

const prevEnd = new Date(periodStart);
const prevStart = new Date(prevEnd);
prevStart.setDate(prevStart.getDate() - 7);

const result = await db.collection("events").aggregate([
  {
    $match: {
      type: "sale",
      occurredAt: { $gte: prevStart, $lt: periodEnd },
    },
  },
  {
    $addFields: {
      period: {
        $cond: [
          { $gte: ["$occurredAt", periodStart] },
          "current",
          "previous",
        ],
      },
    },
  },
  {
    $group: {
      _id: "$period",
      totalRevenue: { $sum: "$amount" },
      orderCount: { $sum: 1 },
    },
  },
]).toArray();
```

## Computing the Percentage Change

After grouping, reshape the result and calculate the percentage change.

```javascript
function computeChange(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

const byPeriod = Object.fromEntries(
  result.map((r) => [r._id, r])
);

const revenueChange = computeChange(
  byPeriod.current?.totalRevenue || 0,
  byPeriod.previous?.totalRevenue || 0
);

console.log(`Revenue change: ${revenueChange?.toFixed(2)}%`);
```

## Single-Pipeline Percentage Change

Use `$facet` to compute both periods in one aggregation and derive the change in a follow-up `$project`.

```javascript
const facetResult = await db.collection("events").aggregate([
  { $match: { type: "sale", occurredAt: { $gte: prevStart, $lt: periodEnd } } },
  {
    $facet: {
      current: [
        { $match: { occurredAt: { $gte: periodStart } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ],
      previous: [
        { $match: { occurredAt: { $lt: periodStart } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ],
    },
  },
  {
    $project: {
      currentTotal: { $arrayElemAt: ["$current.total", 0] },
      previousTotal: { $arrayElemAt: ["$previous.total", 0] },
      percentChange: {
        $multiply: [
          {
            $divide: [
              { $subtract: [{ $arrayElemAt: ["$current.total", 0] }, { $arrayElemAt: ["$previous.total", 0] }] },
              { $arrayElemAt: ["$previous.total", 0] },
            ],
          },
          100,
        ],
      },
    },
  },
]).toArray();

console.log(facetResult[0]);
```

## Index for Time-Range Queries

```javascript
await db.collection("events").createIndex({ type: 1, occurredAt: -1 });
```

## Summary

MongoDB aggregation handles period-over-period percentage change calculations directly in the pipeline. Use `$addFields` with `$cond` to tag documents by period, group by the tag, and compute the delta in application code - or use `$facet` to process both periods in a single pipeline pass and project the percentage change in one query.
