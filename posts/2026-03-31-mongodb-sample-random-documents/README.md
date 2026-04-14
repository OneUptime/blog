# How to Use $sample to Randomly Select Documents in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Database

Description: Learn how to use MongoDB's $sample aggregation stage to efficiently retrieve a random subset of documents for sampling, testing, and recommendation features.

---

The `$sample` stage in MongoDB's aggregation pipeline returns a random selection of documents from a collection. It is the idiomatic way to get a random subset without fetching all documents and shuffling them in application code.

## Syntax

```javascript
db.collection.aggregate([
  { $sample: { size: N } }
])
```

`size` is a positive integer specifying how many documents to return.

## Basic Example - Random Sample of 5 Documents

```javascript
db.products.aggregate([
  { $sample: { size: 5 } }
])
```

Each pipeline execution returns a different random set of up to 5 documents.

## Combining $sample with $match

Filter first, then sample from the filtered set:

```javascript
db.products.aggregate([
  { $match: { category: "electronics", inStock: true } },
  { $sample: { size: 3 } }
])
```

This retrieves 3 random in-stock electronics items.

## Building a Recommendation Feature

Return 10 random articles the user has not yet read:

```javascript
db.articles.aggregate([
  { $match: { _id: { $nin: userReadIds }, published: true } },
  { $sample: { size: 10 } },
  { $project: { title: 1, summary: 1, author: 1 } }
])
```

## A/B Testing - Random User Assignment

Randomly assign 20% of users to a test group by sampling the user collection:

```javascript
const totalUsers = await db.users.countDocuments()
const sampleSize = Math.floor(totalUsers * 0.2)

db.users.aggregate([
  { $sample: { size: sampleSize } },
  { $project: { _id: 1 } }
])
```

## How $sample Is Implemented

MongoDB uses two algorithms depending on the position of `$sample` in the pipeline, the `size` relative to the collection, and the collection size:

**Pseudo-random cursor (fast path)** - used when all three conditions are met:

- `$sample` is the first stage of the pipeline.
- `size` is less than 5% of the total documents in the collection.
- The collection contains more than 100 documents.

**Random sort (slow path)** - used when any of the above conditions are not met. MongoDB performs a collection scan, assigns random sort keys, and sorts to select documents. This is slower for large collections.

For the best performance, place `$sample` as the first stage in your pipeline and keep sample sizes below 5% of the total collection size.

## Seeding Test Data with $sample

When writing integration tests, grab a real subset of production-shaped data:

```javascript
db.users.aggregate([
  { $sample: { size: 100 } },
  { $out: "users_test_fixture" }
])
```

This writes 100 random users into a `users_test_fixture` collection.

## Limitations

- `$sample` does not guarantee true uniform randomness for very large collections with the cursor-based algorithm.
- If `size` exceeds the number of documents, all documents are returned (no error).

## Summary

`$sample` provides a simple, server-side way to retrieve a random subset of documents from a MongoDB collection or aggregation pipeline. It is well-suited for recommendations, A/B test cohorts, data sampling, and test fixture generation. For large collection samples, be aware of the performance characteristics - place `$sample` as the first pipeline stage and keep sample sizes below 5% of the collection to use the fast cursor-based path.
