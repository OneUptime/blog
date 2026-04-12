# How to Perform a Prefix Search in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Query, Regex, Index, Search

Description: Learn how to perform efficient prefix searches in MongoDB using anchored regex patterns and indexes, and when to use Atlas Search for autocomplete.

---

A prefix search returns documents where a string field starts with a specified sequence of characters - the foundation of autocomplete, username lookups, and type-ahead search features. MongoDB supports prefix search via anchored regular expressions, which can leverage standard B-tree indexes for high performance.

## Basic Prefix Search with Regex

Use a regex anchored at the start of the string with `^`:

```javascript
// Find products whose name starts with "Pro"
db.products.find({ name: /^Pro/ })

// Case-insensitive prefix search
db.products.find({ name: /^pro/i })
```

Or equivalently with `$regex`:

```javascript
db.products.find({
  name: { $regex: "^pro", $options: "i" }
})
```

## Index Support for Prefix Queries

Anchored prefix regex (`^pattern`) can use a standard index efficiently:

```javascript
db.products.createIndex({ name: 1 })

// This uses the index
db.products.find({ name: /^Pro/ }).explain("executionStats")
// Look for IXSCAN in winningPlan
```

Important: unanchored patterns like `/pro/` (no `^`) and case-insensitive patterns (`/^pro/i`) do NOT efficiently use standard indexes and result in index scans or collection scans.

## Case-Insensitive Prefix Search with Collation Index

To efficiently run case-insensitive prefix searches, create a collation index. Since `$regex` does not support collation, use a range query instead:

```javascript
db.products.createIndex(
  { name: 1 },
  { collation: { locale: "en", strength: 2 } }
)

// $regex does not support collation, so use a range query with the same collation
db.products.find(
  { name: { $gte: "pro", $lt: "prp" } }
).collation({ locale: "en", strength: 2 })
```

## Autocomplete Pattern

A common autocomplete implementation:

```javascript
async function autocomplete(collection, field, prefix, limit = 10) {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return collection.find(
    { [field]: { $regex: `^${escapedPrefix}`, $options: "i" } },
    { projection: { [field]: 1, _id: 1 } }
  ).limit(limit).toArray();
}

// Usage
const results = await autocomplete(
  db.collection("users"),
  "username",
  "john",
  5
);
```

Note: always escape user input before embedding in a regex pattern to prevent regex injection.

## Compound Index for Filtered Prefix Search

When combining prefix search with other filters:

```javascript
// Find active users whose username starts with "admin"
db.users.find({
  status: "active",
  username: /^admin/
})

// Compound index: equality field first, then prefix field
db.users.createIndex({ status: 1, username: 1 })
```

## Range-Based Prefix Search Alternative

For very high-performance prefix search, you can use a range query instead of regex:

```javascript
function prefixRange(prefix) {
  const start = prefix;
  // Increment the last character to create the exclusive upper bound
  const end = prefix.slice(0, -1) +
    String.fromCharCode(prefix.charCodeAt(prefix.length - 1) + 1);
  return { $gte: start, $lt: end };
}

db.products.find({
  name: prefixRange("Pro")
})
// Equivalent to name >= "Pro" AND name < "Prp"
```

This approach is case-sensitive but maximally index-efficient.

## When to Use Atlas Search Autocomplete

For production autocomplete on MongoDB Atlas, use the dedicated Atlas Search autocomplete operator, which supports prefix, fuzzy matching, and tokenization:

```javascript
db.products.aggregate([
  {
    $search: {
      autocomplete: {
        query: "pro",
        path: "name",
        fuzzy: { maxEdits: 1 }
      }
    }
  },
  { $limit: 10 }
])
```

## Summary

For prefix search in MongoDB, use a `^`-anchored regex pattern. Standard indexes support anchored case-sensitive prefix queries. For case-insensitive prefix search, create a collation index and specify the same collation in the query. Always escape user input when building regex from user-supplied strings. For production autocomplete features on Atlas, prefer the dedicated autocomplete search operator.
