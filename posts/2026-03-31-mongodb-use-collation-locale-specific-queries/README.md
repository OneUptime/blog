# How to Use Collation for Locale-Specific Queries in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Collation, Query, Index, Locale

Description: Learn how to use MongoDB collation to perform locale-aware string comparisons, case-insensitive queries, and accent-insensitive searches.

---

By default, MongoDB performs string comparisons using binary order, which does not account for language-specific rules like accented characters, case folding, or locale-specific sort order. Collation lets you specify how string comparisons should behave for a specific language or culture.

## What Is Collation?

A collation document specifies locale and comparison strength:

```json
{
  "locale": "en",
  "strength": 2,
  "caseLevel": false,
  "caseFirst": "off",
  "numericOrdering": false,
  "alternate": "non-ignorable",
  "backwards": false
}
```

The `strength` setting is most commonly adjusted:
- `1` - base characters only (accent and case insensitive)
- `2` - base + accent (case insensitive, accent sensitive)
- `3` - base + accent + case (default behavior, fully case sensitive)

## Case-Insensitive Queries with Collation

```javascript
// Find users regardless of case: "Alice", "alice", "ALICE" all match
db.users.find(
  { name: "alice" }
).collation({ locale: "en", strength: 2 })
```

Without a collation index, this works but requires a collection scan. With one:

```javascript
db.users.createIndex(
  { name: 1 },
  { collation: { locale: "en", strength: 2 } }
)

// Now this query uses the index efficiently
db.users.find(
  { name: "alice" }
).collation({ locale: "en", strength: 2 })
```

Important: the query must specify the same collation as the index for the index to be used.

## Accent-Insensitive Search (Strength 1)

```javascript
// Find "résumé", "resume", "Resume" - ignoring both case and accents
db.documents.find(
  { title: "resume" }
).collation({ locale: "fr", strength: 1 })
```

## Locale-Specific Sort Order

Different languages sort characters differently. Collation ensures correct ordering:

```javascript
// German-aware sort (treats u-umlaut correctly)
db.words.find().sort({ word: 1 }).collation({ locale: "de" })

// Swedish sort (a with ring sorts after z)
db.words.find().sort({ word: 1 }).collation({ locale: "sv" })
```

## Numeric String Ordering

With `numericOrdering: true`, strings containing numbers sort numerically:

```javascript
// Without numericOrdering: "10" < "2" (lexicographic)
// With numericOrdering: "2" < "10" (numeric)
db.versions.find().sort({ version: 1 }).collation({
  locale: "en",
  numericOrdering: true
})
```

## Setting Collection-Level Collation

You can set a default collation when creating a collection. All queries on the collection use it unless overridden:

```javascript
db.createCollection("users", {
  collation: { locale: "en", strength: 2 }
})

// Queries automatically use the collection collation
db.users.find({ name: "alice" })
// Performs case-insensitive match using the collection's collation
```

## Collation in Aggregation Pipelines

Specify collation at the aggregation level:

```javascript
db.products.aggregate(
  [
    { $match: { category: "Electronics" } },
    { $sort: { name: 1 } }
  ],
  { collation: { locale: "en", strength: 2 } }
)
```

## Unique Index with Collation

Create a case-insensitive unique constraint:

```javascript
db.users.createIndex(
  { email: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 }
  }
)
// Rejects both "user@example.com" and "User@Example.com" if one exists
```

## Summary

Use collation to implement locale-aware string comparisons in MongoDB. Set `strength: 2` for case-insensitive matching, `strength: 1` for accent and case insensitive, and `numericOrdering: true` for version-style string sorting. Create collation indexes to make these queries efficient. Always specify the same collation in both the index definition and the query for index usage.
