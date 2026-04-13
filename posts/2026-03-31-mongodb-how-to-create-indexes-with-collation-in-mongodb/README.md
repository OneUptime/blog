# How to Create Indexes with Collation in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Collation, Locale, Sorting, Query

Description: Learn how to create collation-aware indexes in MongoDB to support locale-sensitive string comparisons and case-insensitive queries.

---

## Introduction

Collation in MongoDB defines language-specific rules for string comparison, including case sensitivity, accent sensitivity, and sort order. Creating indexes with collation allows queries that use the same collation to use those indexes efficiently, enabling fast case-insensitive searches and locale-correct sorting.

## What Is Collation?

A collation document specifies a locale and optional strength settings:

```javascript
{
  locale: "en",
  strength: 2  // 1=base characters only, 2=case-insensitive, 3=exact (default)
}
```

Strength 2 means comparisons ignore case but respect accents.

## Creating a Collation Index

```javascript
db.users.createIndex(
  { username: 1 },
  {
    collation: { locale: "en", strength: 2 },
    name: "username_ci"
  }
);
```

## Using the Index in Queries

For the query planner to use a collation index, the query must specify the same collation:

```javascript
db.users.find(
  { username: "alice" }
).collation({ locale: "en", strength: 2 });
```

Without specifying the same collation in the query, MongoDB will not use the collation index.

## Case-Insensitive Lookup Example

Find a user regardless of how they typed their username:

```javascript
db.users.find(
  { username: "ALICE" }
).collation({ locale: "en", strength: 2 }).limit(1);
```

This matches "alice", "Alice", "ALICE", and "aLiCe".

## Locale-Correct Sorting

Create an index for locale-aware sorting of names in French:

```javascript
db.customers.createIndex(
  { lastName: 1 },
  { collation: { locale: "fr", strength: 1 } }
);

db.customers.find().sort({ lastName: 1 }).collation({ locale: "fr", strength: 1 });
```

French collation correctly handles accented characters like "é", "è", and "ê" in sort order.

## Collection-Level Collation

Set a default collation on the collection so all operations use it automatically:

```javascript
db.createCollection("products", {
  collation: { locale: "en", strength: 2 }
});
```

Indexes created on this collection inherit the default collation unless overridden.

## Verifying Index Collation

Check a collection's indexes and their collation settings:

```javascript
db.users.getIndexes().forEach(idx => {
  if (idx.collation) {
    print(`${idx.name}: locale=${idx.collation.locale}, strength=${idx.collation.strength}`);
  }
});
```

## Summary

Collation indexes enable MongoDB to perform efficient case-insensitive and locale-aware string queries without full collection scans. Creating indexes with the correct locale and strength, and matching that collation in queries, ensures the index is used. For applications serving international users, collection-level collation simplifies the configuration by applying locale rules automatically.
