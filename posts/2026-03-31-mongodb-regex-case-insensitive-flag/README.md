# How to Use Regex with Case-Insensitive Flag in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Regex, Collation, Query, String

Description: Learn how to use the case-insensitive regex flag in MongoDB and when to use collation indexes for better performance on case-insensitive queries.

---

## Introduction

Case-insensitive string matching is a common requirement - finding "MongoDB", "mongodb", and "MONGODB" as equivalent. MongoDB supports this via the `i` flag in regex queries, but case-insensitive regex queries cannot use a standard B-tree index. For production-scale case-insensitive queries, collation indexes offer a better alternative.

## Basic Case-Insensitive Regex

Add the `i` flag to make a regex match case-insensitive:

```javascript
db.products.find({ name: /laptop/i })
```

Using `$regex` with `$options`:

```javascript
db.products.find({ name: { $regex: "laptop", $options: "i" } })
```

Both match "Laptop", "LAPTOP", "laptop", and any other casing.

## Why Case-Insensitive Regex Is Slow

The `i` flag prevents MongoDB from using a standard index because index entries are case-sensitive and sorted by byte value. The query planner cannot use an index range scan for a case-insensitive pattern.

```javascript
db.products.find({ name: /laptop/i }).explain("executionStats")
// "stage": "COLLSCAN" - full collection scan
```

For large collections, this results in slow queries.

## Using Collation for Case-Insensitive Index Queries

A collation index stores values in a locale-aware, case-insensitive order. Create one like this:

```javascript
db.products.createIndex(
  { name: 1 },
  { collation: { locale: "en", strength: 2 } }
)
```

`strength: 2` means the collation ignores case (and accent differences at strength 1). Now query with the same collation:

```javascript
db.products.find(
  { name: "laptop" }
).collation({ locale: "en", strength: 2 })
```

This uses an `IXSCAN` instead of a `COLLSCAN`, making it orders of magnitude faster on large collections.

## Case-Insensitive Starts-With with Collation

The `$regex` operator does not support collation and cannot use a collation index. For case-insensitive prefix matching backed by a collation index, use a range query instead of regex:

```javascript
db.products.find(
  { name: { $gte: "lap", $lt: "laq" } }
).collation({ locale: "en", strength: 2 })
```

This range query uses the collation index to perform a case-insensitive prefix scan, matching "Laptop", "LAPTOP", "laptop", and so on.

## Supported $options Flags

MongoDB regex supports several flags via `$options`:

```text
i - case insensitive
m - multiline (^ and $ match line boundaries)
x - extended (ignore whitespace and comments in pattern)
s - dot-all (. matches newline characters)
```

Example using multiline and case-insensitive:

```javascript
db.logs.find({
  message: { $regex: "^error", $options: "im" }
})
```

## Case-Insensitive Regex in Aggregation

Use the `options` parameter in `$regexMatch`:

```javascript
db.products.aggregate([
  {
    $match: {
      $expr: {
        $regexMatch: {
          input: "$name",
          regex: "laptop",
          options: "i"
        }
      }
    }
  }
])
```

## Summary

The `i` flag in MongoDB regex enables case-insensitive matching but always triggers a collection scan. For large collections, use a collation index with `strength: 2` and query using `.collation()` to get index-backed case-insensitive queries. The collation approach supports both equality and prefix (starts-with) patterns using range queries (not regex). Use the `i` flag in regex only for small collections or when filtering a pre-narrowed result set via an indexed pre-filter.
