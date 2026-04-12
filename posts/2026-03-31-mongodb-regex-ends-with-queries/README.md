# How to Use Regex for Ends-With Queries in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Regex, Query, String, Pattern

Description: Learn how to use regex for ends-with queries in MongoDB using the $ anchor, and understand why these queries always require a collection scan.

---

## Introduction

An ends-with query finds documents where a string field terminates with a specific suffix. In MongoDB, this is achieved using a regex with the `$` anchor at the end of the pattern. Unlike starts-with queries, ends-with patterns cannot use a standard B-tree index and always scan the collection.

## Basic Ends-With Query

Use the `$` anchor to match strings ending with a given suffix:

```javascript
db.files.find({ filename: /\.pdf$/ })
```

This finds all documents where `filename` ends with ".pdf". The backslash escapes the `.` so it matches a literal period.

Using the `$regex` operator:

```javascript
db.files.find({ filename: { $regex: "\\.pdf$" } })
```

Note that inside a string, the backslash must itself be escaped, resulting in `\\.`.

## Common Ends-With Use Cases

Finding files by extension:

```javascript
db.files.find({ filename: /\.(jpg|jpeg|png|gif)$/i })
```

Matching email domains:

```javascript
db.users.find({ email: /@gmail\.com$/ })
```

Finding URLs ending with specific paths:

```javascript
db.requests.find({ url: /\/api\/health$/ })
```

## Performance Characteristics

Ends-with regex does not use a B-tree index because indexes store values in sorted order (left-to-right), but suffix matching requires scanning from the right end of each value.

```javascript
db.files.find({ filename: /\.pdf$/ }).explain("executionStats")
// stage: "COLLSCAN" - always a full collection scan
```

For large collections, this is expensive. Options to improve suffix query performance:

1. **Store the reversed string** - add a field with the string reversed and use a starts-with query on it:

```javascript
db.files.insertOne({
  filename: "report.pdf",
  filenameReversed: "fdp.troper"
})
db.files.createIndex({ filenameReversed: 1 })

// Ends-with ".pdf" becomes starts-with "fdp." on the reversed field
db.files.find({ filenameReversed: /^fdp\./ })
```

2. **Store the extension separately** - extract file extension into its own indexed field during insert.

## Ends-With in Aggregation

Use `$regexMatch` inside an aggregation pipeline:

```javascript
db.files.aggregate([
  {
    $match: {
      $expr: {
        $regexMatch: {
          input: "$filename",
          regex: "\\.pdf$",
          options: "i"
        }
      }
    }
  }
])
```

Or use `$substrCP` and `$strLenCP` to check the suffix without regex:

```javascript
db.files.aggregate([
  {
    $match: {
      $expr: {
        $eq: [
          {
            $toLower: {
              $substrCP: [
                "$filename",
                { $subtract: [{ $strLenCP: "$filename" }, 4] },
                4
              ]
            }
          },
          ".pdf"
        ]
      }
    }
  }
])
```

This non-regex approach is equivalent but also requires a full scan.

## Limiting Scan with Pre-Filtering

Reduce scan size by adding an indexed pre-filter before the suffix regex:

```javascript
db.files.find({
  uploadedBy: "user_42",
  filename: /\.pdf$/
})
```

With an index on `uploadedBy`, MongoDB filters by user first, then applies the regex to a smaller document set.

## Summary

Ends-with queries in MongoDB use the `$` regex anchor but cannot use B-tree indexes, always resulting in a collection scan. For performance-sensitive suffix matching on large collections, consider storing a reversed field and using a starts-with query, or extracting the suffix into a separate indexed field. Always pre-filter with an indexed condition before applying the ends-with pattern to minimize scan costs.
