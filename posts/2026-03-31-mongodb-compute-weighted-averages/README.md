# How to Compute Weighted Averages in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Average, Weighted, Analytics

Description: Calculate weighted averages in MongoDB using $group with $sum and $divide to weight values by quantity, rating count, or any numeric factor.

---

## Overview

A weighted average assigns different importance to different values based on a weight factor - for example, averaging product ratings weighted by review count, or computing weighted GPA using credit hours. MongoDB aggregation computes weighted averages using `$sum` of `value * weight` divided by `$sum` of weights, all within a single `$group` stage.

## Basic Weighted Average Formula

The formula is: `weightedAvg = sum(value * weight) / sum(weight)`.

```javascript
// reviews collection: { productId, rating (1-5), helpfulVotes (weight) }
const weightedRatings = await db.collection("reviews").aggregate([
  {
    $group: {
      _id: "$productId",
      sumWeightedRating: {
        $sum: { $multiply: ["$rating", "$helpfulVotes"] },
      },
      sumWeights: { $sum: "$helpfulVotes" },
      reviewCount: { $sum: 1 },
    },
  },
  {
    $project: {
      productId: "$_id",
      reviewCount: 1,
      weightedAvgRating: {
        $cond: [
          { $eq: ["$sumWeights", 0] },
          null,
          { $divide: ["$sumWeightedRating", "$sumWeights"] },
        ],
      },
    },
  },
  { $sort: { weightedAvgRating: -1 } },
]).toArray();
```

## Weighted GPA Calculation

Compute a weighted GPA where credit hours are the weights.

```javascript
// grades collection: { studentId, courseId, gradePoints, creditHours }
const gpaByStudent = await db.collection("grades").aggregate([
  {
    $group: {
      _id: "$studentId",
      totalQualityPoints: {
        $sum: { $multiply: ["$gradePoints", "$creditHours"] },
      },
      totalCredits: { $sum: "$creditHours" },
    },
  },
  {
    $project: {
      studentId: "$_id",
      totalCredits: 1,
      gpa: {
        $round: [{ $divide: ["$totalQualityPoints", "$totalCredits"] }, 2],
      },
    },
  },
  { $sort: { gpa: -1 } },
]).toArray();
```

## Weighted Average with Conditional Weights

Apply different weights based on field values using `$cond`.

```javascript
// sales collection: { region, amount, channel (web/mobile/store) }
const weightedSales = await db.collection("sales").aggregate([
  {
    $addFields: {
      channelWeight: {
        $switch: {
          branches: [
            { case: { $eq: ["$channel", "web"] }, then: 1.5 },
            { case: { $eq: ["$channel", "mobile"] }, then: 1.2 },
          ],
          default: 1.0,
        },
      },
    },
  },
  {
    $group: {
      _id: "$region",
      weightedTotal: { $sum: { $multiply: ["$amount", "$channelWeight"] } },
      totalWeight: { $sum: "$channelWeight" },
    },
  },
  {
    $project: {
      region: "$_id",
      weightedAvgSale: { $divide: ["$weightedTotal", "$totalWeight"] },
    },
  },
]).toArray();
```

## Weighted Average Over Time Windows

Compute a time-weighted average where more recent values receive higher weight.

```javascript
const timeWeighted = await db.collection("prices").aggregate([
  { $match: { symbol: "AAPL", recordedAt: { $gte: new Date("2026-01-01") } } },
  {
    $addFields: {
      ageMs: { $subtract: [new Date(), "$recordedAt"] },
      ageWeight: {
        $divide: [1, { $add: [1, { $divide: [{ $subtract: [new Date(), "$recordedAt"] }, 86400000] }] }],
      },
    },
  },
  {
    $group: {
      _id: "$symbol",
      weightedSum: { $sum: { $multiply: ["$price", "$ageWeight"] } },
      weightSum: { $sum: "$ageWeight" },
    },
  },
  {
    $project: {
      symbol: "$_id",
      timeWeightedPrice: { $divide: ["$weightedSum", "$weightSum"] },
    },
  },
]).toArray();
```

## Summary

MongoDB computes weighted averages in a `$group` stage by accumulating `sum(value * weight)` and `sum(weight)`, then dividing in a `$project` stage. Handle zero-weight edge cases with `$cond`, and use `$switch` to assign conditional weights based on document fields. This approach scales to millions of documents without requiring any post-processing outside the database.
