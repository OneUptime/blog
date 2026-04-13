# How to Use $bucketAuto for Automatic Data Distribution in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, $bucketAuto, Data Distribution, Pipeline Stage, NoSQL

Description: Learn how to use MongoDB's $bucketAuto stage to automatically distribute documents into evenly sized buckets without manually specifying boundary values.

---

## What Is the $bucketAuto Stage?

The `$bucketAuto` stage automatically determines bucket boundaries to distribute documents as evenly as possible across a specified number of buckets. Unlike `$bucket`, you don't need to know the data distribution in advance.

```javascript
{
  $bucketAuto: {
    groupBy: expression,
    buckets: numberOfBuckets,
    output: {                // optional
      field: { accumulator: expression }
    },
    granularity: "R5"        // optional: preferred number series
  }
}
```

## Basic Example

Distribute products into 5 equal price buckets:

```javascript
db.products.aggregate([
  {
    $bucketAuto: {
      groupBy: "$price",
      buckets: 5
    }
  }
])
```

Output:

```javascript
[
  { _id: { min: 5, max: 25 }, count: 42 },
  { _id: { min: 25, max: 75 }, count: 41 },
  { _id: { min: 75, max: 150 }, count: 43 },
  { _id: { min: 150, max: 400 }, count: 42 },
  { _id: { min: 400, max: 2000 }, count: 41 }
]
```

Each bucket has `_id.min` and `_id.max` values. The boundaries are automatically computed.

## Adding Custom Output Fields

```javascript
db.products.aggregate([
  {
    $bucketAuto: {
      groupBy: "$price",
      buckets: 4,
      output: {
        count: { $sum: 1 },
        avgPrice: { $avg: "$price" },
        totalRevenue: { $sum: { $multiply: ["$price", "$unitsSold"] } }
      }
    }
  }
])
```

## Using Granularity

The `granularity` option snaps bucket boundaries to standard preferred number series, making the ranges more "human-readable":

```javascript
db.sensors.aggregate([
  {
    $bucketAuto: {
      groupBy: "$reading",
      buckets: 6,
      granularity: "R10"  // Renard R10 series: 1, 1.25, 1.6, 2, 2.5, 3.15, 4, 5, 6.3, 8, 10...
    }
  }
])
```

Available granularity options include: `R5`, `R10`, `R20`, `R40`, `R80`, `1-2-5`, `E6`, `E12`, `E24`, `E48`, `E96`, `E192`, `POWERSOF2`.

## Practical Use Case - Income Distribution Analysis

```javascript
db.employees.aggregate([
  {
    $bucketAuto: {
      groupBy: "$annualSalary",
      buckets: 10,
      output: {
        count: { $sum: 1 },
        avgSalary: { $avg: "$annualSalary" },
        minSalary: { $min: "$annualSalary" },
        maxSalary: { $max: "$annualSalary" }
      }
    }
  }
])
```

## Response Time Percentile Analysis

```javascript
db.apiLogs.aggregate([
  { $match: { date: { $gte: new Date("2024-01-01") } } },
  {
    $bucketAuto: {
      groupBy: "$responseTimeMs",
      buckets: 4,
      granularity: "POWERSOF2"
    }
  }
])
```

## Uneven Distribution Warning

`$bucketAuto` tries to distribute documents evenly, but if many documents share the same value (low cardinality), some buckets may have more documents than others:

```javascript
// If 1000 documents have price = 10 and you ask for 5 buckets,
// most of those will end up in one bucket
```

## Comparing $bucket and $bucketAuto

```text
Feature         | $bucket              | $bucketAuto
----------------|----------------------|------------------
Boundaries      | Manual               | Automatic
Distribution    | Not guaranteed       | Approximately equal
Use case        | Known domain ranges  | Exploratory analysis
Output _id      | Lower boundary       | { min, max } object
Granularity     | N/A                  | Optional series
```

## Reshaping $bucketAuto Output

The `_id` in `$bucketAuto` results is an object - reshape it with `$project` for cleaner output:

```javascript
db.products.aggregate([
  {
    $bucketAuto: {
      groupBy: "$price",
      buckets: 5,
      output: { count: { $sum: 1 }, avgPrice: { $avg: "$price" } }
    }
  },
  {
    $project: {
      _id: 0,
      range: { $concat: [
        { $toString: "$_id.min" }, " - ", { $toString: "$_id.max" }
      ]},
      count: 1,
      avgPrice: { $round: ["$avgPrice", 2] }
    }
  }
])
```

## Summary

`$bucketAuto` is perfect for exploratory data analysis when you don't know your data's distribution in advance. It automatically computes bucket boundaries to achieve near-equal document distribution, and supports optional granularity settings for human-friendly boundary values. Use it for quick histogram generation, exploratory analysis, and any scenario where automatic binning is preferable to manual range definition.
