# How to Perform a Case-Insensitive Query in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Case-Insensitive, Collation, Regex, Query

Description: Learn how to perform case-insensitive string queries in MongoDB using regex with $options i, collation, or case-insensitive text indexes.

---

## Overview

MongoDB string comparisons are case-sensitive by default. This guide shows three ways to perform case-insensitive queries: regex with the `i` flag, collation, and text indexes.

## Method 1 - Regex with $options: "i"

The simplest approach for occasional case-insensitive queries:

```javascript
// Case-insensitive exact match using regex
db.users.find({ name: { $regex: /^alice$/i } });

// Using $regex operator
db.users.find({ email: { $regex: "example\\.com$", $options: "i" } });

// Partial match
db.products.find({ name: { $regex: "widget", $options: "i" } });
```

Limitation: regex queries cannot use standard indexes efficiently unless anchored at the start.

## Method 2 - Collation for Index-Backed Case-Insensitive Queries

Collation provides proper linguistic rules for case-insensitive comparisons AND can use indexes:

```javascript
// Create a case-insensitive index using collation
db.users.createIndex(
  { name: 1 },
  { collation: { locale: "en", strength: 2 } }
);

// Query must specify the same collation to use the index
db.users.find({ name: "alice" })
  .collation({ locale: "en", strength: 2 });
```

Collation strength levels:
- `1` - base character differences only (a == A == à)
- `2` - base + accents (a == A, but a != à)
- `3` - base + accents + case (default, case-sensitive)

## Method 3 - Collection-Level Default Collation

Set a default collation when creating the collection so all queries are case-insensitive by default:

```javascript
db.createCollection("users", {
  collation: { locale: "en", strength: 2 }
});

// Now this query is case-insensitive without specifying collation
db.users.find({ name: "Alice" });
// Matches "alice", "ALICE", "aLiCe"
```

## Method 4 - Text Index for Full-Text Case-Insensitive Search

Text indexes are case-insensitive by default:

```javascript
db.articles.createIndex({ title: "text", content: "text" });

// Case-insensitive full-text search
db.articles.find({ $text: { $search: "MongoDB" } });
// Also matches "mongodb", "MONGODB"
```

## Practical Comparison

```javascript
// Scenario: find users by username, case-insensitive

// Option A: regex (no index benefit for non-anchored patterns)
db.users.find({ username: { $regex: "^johndoe$", $options: "i" } });

// Option B: collation (uses index, best performance)
db.users.createIndex({ username: 1 }, { collation: { locale: "en", strength: 2 } });
db.users.find({ username: "JohnDoe" }).collation({ locale: "en", strength: 2 }).limit(1);

// Option C: store lowercase in a separate field
db.users.find({ usernameLower: "johndoe" });
// Requires storing usernameLower: username.toLowerCase() on insert/update
```

## Storing Normalized Lowercase (Fastest Approach)

For maximum query performance, store a normalized lowercase version alongside the original:

```javascript
// Insert with lowercase copy
await db.collection("users").insertOne({
  username: "JohnDoe",
  usernameLower: "johndoe",   // always lowercase
  email: "john@example.com"
});

// Index the lowercase field
await db.collection("users").createIndex({ usernameLower: 1 }, { unique: true });

// Query on lowercase field (standard index, no collation needed)
const user = await db.collection("users").findOne({
  usernameLower: searchTerm.toLowerCase()
});
```

## Summary

For case-insensitive queries in MongoDB, use regex with `$options: "i"` for simple one-off searches, collation with `strength: 2` for index-backed case-insensitive equality queries, or store a pre-lowercased field for the absolute best performance. Setting collation at the collection level makes all queries case-insensitive by default without requiring per-query collation specifications.
