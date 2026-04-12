# How to Use $sum, $avg, $min, $max Accumulators in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, $sum, $avg, $min, $max, Accumulator, $group

Description: Learn how to use $sum, $avg, $min, and $max accumulators in MongoDB aggregation to compute totals, averages, and extreme values per group.

---

## How These Accumulators Work

`$sum`, `$avg`, `$min`, and `$max` are accumulator expressions used primarily in the `$group` stage. They compute a single value per group across all documents in that group. They can also be used in `$project` and `$addFields` to compute values across an array within a single document.

| Accumulator | Behavior |
|---|---|
| `$sum` | Sum of all numeric values; non-numeric values are ignored |
| `$avg` | Arithmetic mean of all numeric values; non-numeric values are ignored |
| `$min` | Minimum value (works on numbers, strings, dates) |
| `$max` | Maximum value (works on numbers, strings, dates) |

## Syntax

### In $group (across documents)

```javascript
{
  $group: {
    _id: "<groupKey>",
    total:   { $sum: "$field" },
    average: { $avg: "$field" },
    minimum: { $min: "$field" },
    maximum: { $max: "$field" }
  }
}
```

### In $project / $addFields (across an array within one document)

```javascript
{
  $project: {
    arraySum: { $sum: "$arrayField" },
    arrayAvg: { $avg: "$arrayField" },
    arrayMin: { $min: "$arrayField" },
    arrayMax: { $max: "$arrayField" }
  }
}
```

## Examples

### Input Documents

```javascript
[
  { _id: 1, product: "Laptop",  category: "Electronics", price: 1200, units: 3 },
  { _id: 2, product: "Phone",   category: "Electronics", price: 800,  units: 5 },
  { _id: 3, product: "Desk",    category: "Furniture",   price: 450,  units: 2 },
  { _id: 4, product: "Chair",   category: "Furniture",   price: 250,  units: 8 },
  { _id: 5, product: "Monitor", category: "Electronics", price: 600,  units: 4 }
]
```

### Example 1 - All Four Accumulators in $group

Compute stats per category:

```javascript
db.products.aggregate([
  {
    $group: {
      _id: "$category",
      totalRevenue: { $sum: { $multiply: ["$price", "$units"] } },
      avgPrice:     { $avg: "$price" },
      minPrice:     { $min: "$price" },
      maxPrice:     { $max: "$price" },
      totalUnits:   { $sum: "$units" }
    }
  }
])
```

Output:

```javascript
[
  {
    _id: "Electronics",
    totalRevenue: 10000,
    avgPrice: 866.67,
    minPrice: 600,
    maxPrice: 1200,
    totalUnits: 12
  },
  {
    _id: "Furniture",
    totalRevenue: 2900,
    avgPrice: 350,
    minPrice: 250,
    maxPrice: 450,
    totalUnits: 10
  }
]
```

### Example 2 - Grand Total with null _id

```javascript
db.products.aggregate([
  {
    $group: {
      _id: null,
      totalRevenue: { $sum: { $multiply: ["$price", "$units"] } },
      avgPrice:     { $avg: "$price" },
      minPrice:     { $min: "$price" },
      maxPrice:     { $max: "$price" }
    }
  },
  { $project: { _id: 0 } }
])
```

Output:

```javascript
[
  { totalRevenue: 12900, avgPrice: 660, minPrice: 250, maxPrice: 1200 }
]
```

### Example 3 - $sum with a Constant (Document Count)

Use `$sum: 1` to count documents per group:

```javascript
db.products.aggregate([
  {
    $group: {
      _id: "$category",
      count: { $sum: 1 }
    }
  }
])
```

Output:

```javascript
[
  { _id: "Electronics", count: 3 },
  { _id: "Furniture",   count: 2 }
]
```

### Example 4 - Accumulators on Array Fields (within $project)

Given a student document with an array of test scores, compute per-document stats:

```javascript
// Input: { _id: 1, name: "Alice", scores: [85, 92, 78, 90] }
db.students.aggregate([
  {
    $project: {
      name: 1,
      totalScore: { $sum: "$scores" },
      avgScore:   { $avg: "$scores" },
      minScore:   { $min: "$scores" },
      maxScore:   { $max: "$scores" }
    }
  }
])
```

Output:

```javascript
[
  { _id: 1, name: "Alice", totalScore: 345, avgScore: 86.25, minScore: 78, maxScore: 92 }
]
```

### Example 5 - $min and $max on Dates

Find the earliest and latest order dates per customer:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: "$customerId",
      firstOrder: { $min: "$orderDate" },
      lastOrder:  { $max: "$orderDate" },
      orderCount: { $sum: 1 }
    }
  }
])
```

### Example 6 - Conditional $sum

Count only units where price is above 500:

```javascript
db.products.aggregate([
  {
    $group: {
      _id: null,
      premiumUnits: {
        $sum: {
          $cond: [{ $gt: ["$price", 500] }, "$units", 0]
        }
      }
    }
  }
])
```

Output:

```javascript
[
  { _id: null, premiumUnits: 12 }  // Laptop(3) + Phone(5) + Monitor(4)
]
```

## Non-Numeric Behavior

- `$sum` returns `0` for missing or non-numeric fields.
- `$avg` ignores missing or non-numeric fields; returns `null` if all values are non-numeric.
- `$min` and `$max` follow BSON comparison order across all types (null < numbers < strings < objects < arrays < dates).

## Use Cases

- Revenue and sales reporting by product, category, or time period
- Computing per-group statistics for dashboards
- Finding earliest/latest events per entity using `$min`/`$max` on dates
- Scoring systems that sum or average per-user values

## Summary

`$sum`, `$avg`, `$min`, and `$max` are the core statistical accumulators in MongoDB aggregation. In `$group`, they operate across documents within each group. In `$project` and `$addFields`, they operate across elements within an array field. Combine these with conditional expressions like `$cond` for selective aggregation.
