# How to Use $round and $trunc for Number Formatting in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Number Formatting, Pipeline, Expression

Description: Learn how to use $round and $trunc in MongoDB aggregation pipelines to control decimal precision and truncate numeric values in query results.

---

## Overview

When working with numeric data in MongoDB aggregation pipelines, you often need to control decimal precision in the output. The `$round` and `$trunc` operators give you precise control over how numbers appear in your results, whether you want to round to a specific decimal place or simply drop the fractional part.

## Using $round

The `$round` operator rounds a number to a specified number of decimal places. If no place is specified, it rounds to the nearest integer.

```javascript
db.orders.aggregate([
  {
    $project: {
      orderId: 1,
      totalAmount: 1,
      roundedAmount: { $round: ["$totalAmount", 2] },
      roundedToWhole: { $round: ["$totalAmount"] }
    }
  }
])
```

This rounds `totalAmount` to two decimal places and also to the nearest whole number.

### Rounding with Negative Places

You can pass a negative number to round to tens, hundreds, etc.:

```javascript
db.sales.aggregate([
  {
    $project: {
      revenue: 1,
      roundedToTens: { $round: ["$revenue", -1] },
      roundedToHundreds: { $round: ["$revenue", -2] }
    }
  }
])
```

A value of `1234.56` would become `1230` (tens) or `1200` (hundreds).

## Using $trunc

The `$trunc` operator truncates a number to a specified decimal place without rounding. It simply drops the digits beyond the specified precision.

```javascript
db.metrics.aggregate([
  {
    $project: {
      rawScore: 1,
      truncatedScore: { $trunc: ["$rawScore", 2] },
      truncatedToInt: { $trunc: ["$rawScore"] }
    }
  }
])
```

For a value of `9.789`, `$trunc` with place `2` returns `9.78`, not `9.79` as `$round` would.

## Practical Example: Financial Reporting

When generating financial summaries, you often need consistent decimal formatting:

```javascript
db.transactions.aggregate([
  {
    $group: {
      _id: "$customerId",
      totalSpent: { $sum: "$amount" },
      avgTransaction: { $avg: "$amount" }
    }
  },
  {
    $project: {
      customerId: "$_id",
      totalSpent: { $round: ["$totalSpent", 2] },
      avgTransaction: { $round: ["$avgTransaction", 2] }
    }
  }
])
```

## Difference Between $round and $trunc

| Operator | Input | Place | Output |
|----------|-------|-------|--------|
| $round   | 4.567 | 2     | 4.57   |
| $trunc   | 4.567 | 2     | 4.56   |
| $round   | 4.5   | 0     | 4      |
| $trunc   | 4.9   | 0     | 4      |

Note that `$round` uses banker's rounding (round half to even), so 4.5 rounds to 4 (nearest even) rather than 5.

Use `$round` when you need mathematically correct rounding and `$trunc` when you need to strip decimal places without any rounding behavior, such as computing floor values or ensuring numbers never exceed a threshold.

## Handling Null and Missing Values

Both operators return `null` when the input expression evaluates to `null` or a missing field:

```javascript
db.products.aggregate([
  {
    $project: {
      name: 1,
      price: { $round: [{ $ifNull: ["$price", 0] }, 2] }
    }
  }
])
```

Using `$ifNull` ensures you get `0.00` instead of `null` in the output.

## Summary

`$round` and `$trunc` are essential aggregation operators for controlling numeric precision in MongoDB query results. `$round` applies banker's rounding (round half to even), while `$trunc` drops digits beyond the specified place without rounding. Both support negative place values to round at the tens or hundreds level, and both return `null` for missing or null input values.
