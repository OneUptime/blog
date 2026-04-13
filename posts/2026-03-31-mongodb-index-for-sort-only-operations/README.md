# How to Index for Sort-Only Operations in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Sort, Performance, Query

Description: Learn how to create indexes that eliminate in-memory sort operations in MongoDB, including multi-field sorts, sort direction matching, and covered sorts.

---

## Why Sort-Only Indexes Matter

When MongoDB cannot use an index to satisfy a sort, it performs an in-memory sort. In-memory sorts are limited to 100 MB of memory. Beyond that, the query fails unless `allowDiskUse` is enabled. Even within the limit, in-memory sorts are significantly slower than index-backed sorts.

## Basic Sort Index

```javascript
// Create an index to support sorting by createdAt descending (most recent first)
db.articles.createIndex({ createdAt: -1 });

// This sort uses the index
db.articles.find().sort({ createdAt: -1 });
```

Confirm with explain:

```javascript
db.articles.find().sort({ createdAt: -1 }).explain("executionStats");
```

No `SORT` stage in the winning plan means the index handles sorting. A `SORT` stage means in-memory sorting is happening.

## Sort Direction Must Match (or All Reversed)

An index can be traversed forwards or backwards. MongoDB can use an index for a sort if the sort directions either exactly match the index or are all reversed:

```javascript
db.articles.createIndex({ category: 1, createdAt: -1 });

// WORKS - exact match
db.articles.find().sort({ category: 1, createdAt: -1 });

// WORKS - all reversed (MongoDB traverses index backward)
db.articles.find().sort({ category: -1, createdAt: 1 });

// FAILS - mixed directions that are neither match nor full reverse
db.articles.find().sort({ category: 1, createdAt: 1 }); // Cannot use this index
```

## Combining Filter + Sort

When a query has both a filter and a sort, the filter fields must appear before the sort field in the compound index (ESR rule):

```javascript
// Query: filter by status, sort by createdAt
db.articles.find({ status: "published" }).sort({ createdAt: -1 });

// Correct index: equality field first, then sort field
db.articles.createIndex({ status: 1, createdAt: -1 });
```

## Covered Sort

A covered sort reads the result directly from the index without fetching the full document. This happens when the projection includes only indexed fields:

```javascript
db.articles.createIndex({ status: 1, createdAt: -1, title: 1 });

// Covered sort - all projected fields are in the index
db.articles.find(
  { status: "published" },
  { _id: 0, createdAt: 1, title: 1 } // _id excluded, all fields in index
).sort({ createdAt: -1 });
```

Verify with explain - look for `totalDocsExamined: 0` which confirms no document fetches occurred.

## Multi-Field Sort

For queries sorting on two fields:

```javascript
db.leaderboard.find({ game: "chess" }).sort({ score: -1, username: 1 });

// Index must match the filter + both sort fields in order
db.leaderboard.createIndex({ game: 1, score: -1, username: 1 });
```

## Sort on _id

The `_id` field has an implicit index. Sorting on `_id` is always index-backed:

```javascript
// Free sort - always uses the _id index
db.collection.find().sort({ _id: 1 }); // Oldest first
db.collection.find().sort({ _id: -1 }); // Newest first (by insertion order)
```

This is useful for cursor-based pagination.

## Detect In-Memory Sort in Logs

Enable the slow query profiler and look for queries with in-memory sort stages:

```javascript
db.setProfilingLevel(1, { slowms: 50 });
db.system.profile.find({ hasSortStage: true }).sort({ ts: -1 }).limit(5);
```

## Summary

Eliminate in-memory sort stages by creating indexes whose field order and directions match your `sort()` call. For combined filter and sort queries, place equality filter fields before sort fields in the compound index. MongoDB can traverse an index backward, so sort directions that are all-reversed from the index also work. Use covered sorts by including all projected fields in the index to avoid document fetches entirely.
