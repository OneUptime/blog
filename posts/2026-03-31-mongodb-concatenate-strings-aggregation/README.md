# How to Concatenate Strings in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, String, Pipeline, Projection

Description: Learn how to concatenate strings in MongoDB aggregation using $concat, $concatArrays for joining arrays, and combining literals with field references.

---

String concatenation in MongoDB aggregation is handled by the `$concat` operator. Unlike SQL's `CONCAT()` function, `$concat` works within the aggregation pipeline and can combine field references, string literals, and the results of other string operators.

## Basic $concat Usage

`$concat` takes an array of expressions and joins them into a single string.

```javascript
db.users.aggregate([
  {
    $project: {
      fullName: {
        $concat: ["$firstName", " ", "$lastName"]
      }
    }
  }
]);
```

Elements in the array can be field references (prefixed with `$`) or string literals.

## Concatenating with Dynamic Separators

Build formatted strings by mixing literals and field values.

```javascript
db.products.aggregate([
  {
    $project: {
      sku: {
        $concat: [
          { $toUpper: "$category" },
          "-",
          { $toString: "$productId" },
          "-v",
          { $toString: "$version" }
        ]
      }
    }
  }
]);
```

This produces values like `TOOLS-1042-v3`.

## Handling Null Values

`$concat` returns `null` if any element in the array is `null` or missing. Use `$ifNull` to substitute a default before concatenation.

```javascript
db.users.aggregate([
  {
    $project: {
      displayName: {
        $concat: [
          { $ifNull: ["$firstName", "Unknown"] },
          " ",
          { $ifNull: ["$lastName", ""] }
        ]
      }
    }
  }
]);
```

## Building URL Slugs

Combine `$toLower` and `$replaceAll` before `$concat` to produce URL-safe slugs.

```javascript
db.articles.aggregate([
  {
    $project: {
      slug: {
        $concat: [
          { $toLower: "$category" },
          "/",
          {
            $replaceAll: {
              input: { $toLower: "$title" },
              find: " ",
              replacement: "-"
            }
          }
        ]
      }
    }
  }
]);
```

## Using $concat in $addFields

Add a computed field to documents without removing existing fields.

```javascript
db.orders.aggregate([
  {
    $addFields: {
      label: {
        $concat: ["Order #", { $toString: "$orderId" }, " - ", "$customerName"]
      }
    }
  }
]);
```

## Concatenating in $match with $expr

You cannot use `$concat` directly in a `$match` filter outside of `$expr`. Use `$expr` to apply string expressions in filters.

```javascript
db.users.aggregate([
  {
    $match: {
      $expr: {
        $eq: [
          { $concat: ["$firstName", " ", "$lastName"] },
          "Alice Smith"
        ]
      }
    }
  }
]);
```

This approach is less efficient than direct field matching and will not use indexes effectively, so prefer storing computed values as indexed fields when filtering on them frequently.

## Summary

`$concat` in MongoDB aggregation joins an array of string expressions into a single string. Use `$ifNull` to guard against null fields, combine with `$toLower` and `$replaceAll` to produce formatted slugs, and use `$addFields` to attach computed strings without modifying the rest of the document. Store frequently-filtered computed strings as actual fields to keep queries index-friendly.
