# How to Create a Case-Insensitive Index Using Collation in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Collation, Case-Insensitive, Query Optimization

Description: Learn how to create a case-insensitive index in MongoDB using collation, enabling efficient case-insensitive queries without regex or $toLower workarounds.

---

By default, MongoDB string comparisons are case-sensitive. To run efficient case-insensitive queries without converting data to lowercase, you can create an index with a collation specifying case-insensitive string comparison rules.

## What is Collation?

Collation defines locale-specific rules for string comparison, including case sensitivity, accent handling, and sort ordering. For case-insensitive indexing, the key setting is `strength: 2`, which compares strings ignoring case but respecting accents.

## Creating a Case-Insensitive Index

```javascript
db.users.createIndex(
  { email: 1 },
  {
    collation: {
      locale: "en",
      strength: 2
    },
    name: "idx_email_ci"
  }
)
```

With `strength: 2`:
- `"Alice@Example.com"` = `"alice@example.com"` = `"ALICE@EXAMPLE.COM"`
- `"cafe"` != `"café"` (accents still matter at strength 2)

Use `strength: 1` if you also want accent-insensitive comparison.

## Querying with the Index

The query must specify the same collation for MongoDB to use the collation index:

```javascript
db.users.find(
  { email: "alice@example.com" }
).collation({ locale: "en", strength: 2 })
```

Without the matching collation on the query, MongoDB will NOT use this index and will fall back to a collection scan.

## Verifying Index Usage

```javascript
db.users.find(
  { email: "alice@example.com" }
).collation({ locale: "en", strength: 2 }).explain("executionStats")
```

Check that `winningPlan.inputStage.stage` is `"IXSCAN"` and that `indexName` matches your collation index.

## Setting a Default Collection Collation

To avoid specifying collation on every query, set a default collation at the collection level when creating it:

```javascript
db.createCollection("products", {
  collation: { locale: "en", strength: 2 }
})
```

Now all queries and indexes on this collection use this collation by default, and regular indexes will be case-insensitive automatically:

```javascript
db.products.createIndex({ name: 1 })  // inherits collection collation
db.products.find({ name: "Widget" })  // matches "widget", "WIDGET", etc.
```

## Compound Index with Collation

Collation applies to all string fields in the index:

```javascript
db.articles.createIndex(
  { category: 1, title: 1 },
  { collation: { locale: "en", strength: 2 } }
)

// Query must use the same collation
db.articles.find({
  category: "Technology",
  title: "mongodb basics"
}).collation({ locale: "en", strength: 2 })
```

## Collation Strength Reference

| Strength | Compares | Ignores |
|----------|----------|---------|
| 1 | Base characters only | Case, accents |
| 2 | Base + accents | Case |
| 3 (default) | Base + accents + case | Minor variants only |

Most applications use `strength: 2` for email/username lookups.

## Unique Case-Insensitive Index

Enforce uniqueness case-insensitively:

```javascript
db.users.createIndex(
  { username: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 }
  }
)
```

This prevents both `"Alice"` and `"alice"` from existing as separate usernames.

## Summary

Creating a collation-based index with `strength: 2` is the correct way to support case-insensitive queries in MongoDB without data transformation. Always specify the matching collation in your queries to ensure the index is used. For application-wide case-insensitive behavior, set a default collation on the collection at creation time.
