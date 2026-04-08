# How to Use Collation with Aggregation Pipelines in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Collation, Aggregation, Pipeline, Sorting

Description: Learn how to apply collation to MongoDB aggregation pipelines for locale-aware sorting, grouping, and filtering across all pipeline stages.

---

## Collation in Aggregation Pipelines

When you run an aggregation pipeline in MongoDB, you can attach a collation document to control how strings are compared throughout the entire pipeline. This affects `$sort`, `$match`, `$group`, and any other stage that compares string values.

The collation is specified as an option to the `aggregate()` method, not inside individual pipeline stages.

## Basic Syntax

```javascript
db.collection.aggregate(
  pipeline,
  { collation: { locale: "...", strength: N } }
)
```

## Locale-Aware Sorting With $sort

Sort a customer list alphabetically using German locale rules:

```javascript
db.customers.aggregate(
  [
    { $sort: { lastName: 1, firstName: 1 } }
  ],
  { collation: { locale: "de", strength: 2 } }
)
```

Without the collation, `"Müller"` would sort based on byte value of `ü`, placing it after all ASCII characters. With German locale collation, it is sorted as if it were `"u"` for base comparison.

## Case-Insensitive $match

Find all users whose name matches "alice" regardless of casing:

```javascript
db.users.aggregate(
  [
    { $match: { name: "alice" } }
  ],
  { collation: { locale: "en", strength: 2 } }
)
```

This is cleaner than using `$toLower` or `$regexMatch` in the pipeline.

## Case-Insensitive Grouping With $group

Group records that differ only in case into the same bucket:

```javascript
db.events.aggregate(
  [
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ],
  { collation: { locale: "en", strength: 2 } }
)
```

With strength 2, `"Sports"`, `"sports"`, and `"SPORTS"` group together. Without collation, they would create three separate groups.

## Combining $match, $sort, and $group

A complete pipeline example - rank products by locale-aware category name:

```javascript
db.products.aggregate(
  [
    { $match: { inStock: true } },
    {
      $group: {
        _id: "$category",
        totalSales: { $sum: "$sales" },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ],
  { collation: { locale: "fr", strength: 2 } }
)
```

## Using Collation Indexes With Aggregation

A pipeline that starts with `$match` on an indexed field will use a collation index if the pipeline collation matches the index collation:

```javascript
// Create a collation index
db.products.createIndex(
  { name: 1 },
  { collation: { locale: "en", strength: 2 } }
)

// This pipeline uses the index - collations match
db.products.aggregate(
  [{ $match: { name: "widget" } }],
  { collation: { locale: "en", strength: 2 } }
)
```

Verify with `explain`:

```javascript
db.products.explain("executionStats").aggregate(
  [{ $match: { name: "widget" } }],
  { collation: { locale: "en", strength: 2 } }
)
```

## Sorting Spanish Names Correctly

Use the Spanish locale to sort names according to Spanish language rules, including correct ordering of accented characters like `ñ`:

```javascript
db.directory.aggregate(
  [{ $sort: { surname: 1 } }],
  { collation: { locale: "es" } }
)
```

With this collation, `ñ` sorts between `n` and `o` as expected in Spanish, rather than being placed after all ASCII characters by byte value.

## $lookup With Collation

When using `$lookup` to join two collections, the collation applies to the join condition as well, enabling case-insensitive joins:

```javascript
db.orders.aggregate(
  [
    {
      $lookup: {
        from: "products",
        localField: "productName",
        foreignField: "name",
        as: "productInfo"
      }
    }
  ],
  { collation: { locale: "en", strength: 2 } }
)
```

This matches `"Widget"` in orders with `"widget"` in products.

## Collation Cannot Be Set Per Stage

A common mistake is trying to set collation inside a stage:

```javascript
// WRONG - collation cannot go inside $sort
{ $sort: { name: 1, collation: { locale: "en" } } }

// CORRECT - collation goes at the aggregate() options level
db.col.aggregate([{ $sort: { name: 1 } }], { collation: { locale: "en" } })
```

## Summary

MongoDB collation applied to an aggregation pipeline controls string comparison for all stages including `$match`, `$sort`, and `$group`. Always pass collation as the second argument to `aggregate()`, not inside pipeline stages. Match the collation to an existing index when possible to avoid in-memory sorts and improve performance.
