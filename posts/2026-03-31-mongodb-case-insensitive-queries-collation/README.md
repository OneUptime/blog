# How to Perform Case-Insensitive Queries Using Collation in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Collation, Query, Case-Insensitive, Index

Description: Learn how to run case-insensitive MongoDB queries using collation strength 2, avoiding slow regex workarounds while supporting index usage.

---

## The Problem With Case-Insensitive Queries

A common requirement is to match documents regardless of letter case. For example, searching for `"alice"` should also find `"Alice"` and `"ALICE"`. The naive approach uses a regex:

```javascript
db.users.find({ username: /^alice$/i })
```

This works, but it cannot use a standard index efficiently - MongoDB must perform a collection scan or index scan without prefix optimization. As the collection grows, this approach becomes slow.

## The Collation Approach

MongoDB collation lets you specify a `strength` level that controls how characters are compared. Strength 2 ignores case (secondary differences). Use the `.collation()` method on the cursor:

```javascript
db.users.find({ username: "alice" }).collation({ locale: "en", strength: 2 })
```

This query matches `"alice"`, `"Alice"`, `"ALICE"`, and any other casing.

## Collation Strength Reference

```text
Strength  What is compared
1         Base characters only (ignores case AND accents)
2         Base + accents (ignores case)
3         Base + accents + case (full, default)
4         Base + accents + case + punctuation
5         Unicode code point (identical match)
```

For case-insensitive but accent-sensitive matching, use strength 2. For case-insensitive AND accent-insensitive matching, use strength 1.

## Creating a Case-Insensitive Index

A query-level collation does not use a standard index. To enable index-backed case-insensitive queries, create an index with the same collation:

```javascript
db.users.createIndex(
  { username: 1 },
  { collation: { locale: "en", strength: 2 } }
)
```

Now the same query will use the index:

```javascript
db.users.find({ username: "alice" }).collation({ locale: "en", strength: 2 })
```

Use `explain()` to confirm index use:

```javascript
db.users.find({ username: "alice" })
  .collation({ locale: "en", strength: 2 })
  .explain("executionStats")
```

Look for `IXSCAN` in the winning plan.

## Important: Collation Must Match

A query using collation will only use a collation index if the collation documents match exactly. A query with no collation will use a standard index, not the collation index:

```javascript
// Uses collation index - collations match
db.users.find({ username: "alice" }).collation({ locale: "en", strength: 2 })

// Does NOT use collation index - no collation specified
db.users.find({ username: "alice" })
```

## Case-Insensitive Uniqueness

To enforce case-insensitive uniqueness (e.g., `"Alice"` and `"alice"` cannot both exist), combine `unique: true` with the collation:

```javascript
db.users.createIndex(
  { username: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 }
  }
)
```

Attempting to insert `"alice"` when `"Alice"` exists will throw a duplicate key error.

## Using Collation in Aggregation

Apply case-insensitive matching in an aggregation pipeline:

```javascript
db.users.aggregate(
  [
    { $match: { username: "alice" } }
  ],
  { collation: { locale: "en", strength: 2 } }
)
```

The collation is passed as an option to `aggregate()`, not inside the `$match` stage.

## Comparison With Regex

```text
Approach              Index Use        Notes
-----------           ----------       -----
/pattern/i regex      Partial only     Cannot use index for prefix queries
$toLower comparison   None             Requires computed field or transform
Collation strength 2  Full IXSCAN      Requires matching collation on index
```

Collation is the recommended approach for production case-insensitive queries.

## Summary

Case-insensitive queries in MongoDB are best implemented using collation with `strength: 2`. Create an index with the same collation to allow efficient IXSCAN plans. Combine with `unique: true` to enforce case-insensitive uniqueness constraints. Always match the collation document exactly between the query and the index to ensure the index is used.
