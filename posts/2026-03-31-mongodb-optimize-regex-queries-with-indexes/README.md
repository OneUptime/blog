# How to Optimize Regex Queries with Indexes in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Regex, Index, Performance, Query

Description: Learn which regex patterns can use MongoDB indexes, how to structure queries for maximum index utilization, and alternatives for non-indexable patterns.

---

## Introduction

Not all regex queries in MongoDB can use indexes. Understanding which patterns qualify for index-assisted scans versus full collection scans is essential for query performance tuning. This guide covers the rules, how to verify index usage, and workarounds for non-indexable patterns.

## Which Regex Patterns Use Indexes

MongoDB can use a B-tree index for regex queries only when the pattern is a left-anchored prefix (starts with `^`) without special characters in the prefix:

```javascript
// Uses index - left-anchored prefix
db.users.find({ username: /^john/ })

// Does NOT use index - no anchor
db.users.find({ username: /john/ })

// Does NOT use index - ends-with anchor only
db.users.find({ username: /doe$/ })

// Does NOT use index - case-insensitive flag
db.users.find({ username: /^john/i })
```

## Verifying Index Usage with explain()

Always verify with `explain("executionStats")`:

```javascript
db.users.find({ username: /^john/ }).explain("executionStats")
```

A good result shows:
```text
"stage": "IXSCAN",
"indexName": "username_1",
"indexBounds": { "username": ["[\"john\", \"joho\")", ...] }
```

A bad result shows:
```text
"stage": "COLLSCAN",
"docsExamined": 5000000
```

## Creating the Right Index

For prefix regex queries, a simple ascending index works:

```javascript
db.users.createIndex({ username: 1 })
```

For case-insensitive prefix queries, store a lowercased copy of the field and query against it:

```javascript
// Store a lowercased copy on insert/update
db.users.insertOne({
  username: "JohnDoe",
  usernameLower: "johndoe"
})

db.users.createIndex({ usernameLower: 1 })

// Case-insensitive prefix search uses the index efficiently
db.users.find({ usernameLower: /^john/ })
```

Note: `$regex` is not collation-aware, so collation indexes cannot be used for case-insensitive regex matching. For case-insensitive exact matches without regex, use a collation index with string comparison operators instead:

```javascript
db.users.createIndex(
  { username: 1 },
  { collation: { locale: "en", strength: 2 } }
)

db.users.find({ username: "john" })
  .collation({ locale: "en", strength: 2 })
```

## Workarounds for Non-Indexable Patterns

### Suffix Search - Store Reversed Values

For ends-with queries, store the reversed string and query with a starts-with pattern:

```javascript
db.emails.createIndex({ domainReversed: 1 })

// Find all @gmail.com addresses
db.emails.find({ domainReversed: /^moc\.liamg@/ })
```

### Contains Search - Use Text Indexes

For word-level substring matching, text indexes are more efficient than regex:

```javascript
db.articles.createIndex({ content: "text" })
db.articles.find({ $text: { $search: "mongodb" } })
```

### Pre-filter with Indexed Field

When a collection scan is unavoidable, reduce its scope with an indexed pre-filter:

```javascript
// category is indexed, reducing the regex scan from 1M to 10K documents
db.products.find({
  category: "Electronics",
  description: /wireless/
})
```

## Monitoring Regex Query Performance

Use the profiler to identify slow regex queries:

```javascript
db.setProfilingLevel(1, { slowms: 100 })

db.system.profile.find({ ns: /^mydb/, millis: { $gt: 100 } })
  .sort({ ts: -1 })
  .limit(10)
```

The `command.filter` field shows the regex pattern. Look for `COLLSCAN` in the profiler output.

## Compound Index with Regex

For queries combining an indexed equality filter with a prefix regex, a compound index can help:

```javascript
db.products.createIndex({ status: 1, sku: 1 })

// Compound index is used for both status equality and sku prefix
db.products.find({ status: "active", sku: /^ELEC-/ })
```

The compound index scan for `status = "active"` reduces the document set before the regex is applied.

## Summary

Only left-anchored prefix regex patterns without special characters can use a MongoDB B-tree index. Verify index usage with `explain("executionStats")` and look for `IXSCAN`. For case-insensitive regex queries, store a lowercased copy of the field since `$regex` is not collation-aware. For ends-with patterns, store reversed values. For contains matching, use text indexes. Always add an indexed equality pre-filter before any regex that cannot use an index to limit the scan scope.
