# How to Analyze Multi-Key Index Scans in MongoDB Explain Plans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Multi-Key Index, Explain Plan, Array, Query Optimization

Description: Learn how to identify and interpret multi-key index scans in MongoDB explain plans, including their limitations and performance implications for array fields.

---

A multi-key index in MongoDB is an index on a field that contains an array. MongoDB automatically creates one index key per array element, enabling efficient array-field queries. However, multi-key indexes have unique characteristics and limitations that appear in explain plans and affect performance.

## What Makes an Index Multi-Key

When you index an array field, MongoDB creates a separate index entry for every element in the array:

```javascript
// Document with array field
{ _id: 1, tags: ["mongodb", "database", "nosql"] }

// Index on tags field becomes multi-key:
// Index entries:
// "mongodb" -> document 1
// "database" -> document 1
// "nosql" -> document 1
```

MongoDB automatically marks an index as multi-key when any document has an array value for the indexed field.

## Identifying Multi-Key in explain()

The explain plan shows `isMultiKey: true` when a multi-key index is used:

```javascript
db.articles.find({ tags: "mongodb" }).explain("executionStats");
```

```json
{
  "winningPlan": {
    "stage": "FETCH",
    "inputStage": {
      "stage": "IXSCAN",
      "indexName": "tags_1",
      "isMultiKey": true,
      "multiKeyPaths": {
        "tags": ["tags"]
      },
      "indexBounds": {
        "tags": ["[\"mongodb\", \"mongodb\"]"]
      }
    }
  },
  "executionStats": {
    "nReturned": 42,
    "totalKeysExamined": 42,
    "totalDocsExamined": 42
  }
}
```

`isMultiKey: true` confirms the index is multi-key. This is informational - queries still use the index efficiently.

## Multi-Key Index Query Patterns

Multi-key indexes support several query operators on array fields:

```javascript
// Find documents where tags array contains "mongodb"
db.articles.find({ tags: "mongodb" });

// Find documents where tags contains all specified values
db.articles.find({ tags: { $all: ["mongodb", "database"] } });

// Find documents where tags contains any of the specified values
db.articles.find({ tags: { $in: ["mongodb", "redis"] } });
```

All of these efficiently use the multi-key index.

## The Compound Multi-Key Limitation

MongoDB has a critical restriction: **at most one field in a compound index can be an array field**. Attempting to create a compound index where two fields contain arrays is not allowed:

```javascript
// Collection has documents like:
// { categories: ["tech", "news"], authors: ["alice", "bob"] }

// INVALID - both categories and authors can be arrays
db.posts.createIndex({ categories: 1, authors: 1 });
// Error: cannot index parallel arrays

// VALID - only one array field in compound index
db.posts.createIndex({ categories: 1, authorId: 1 });
// Works fine when authorId is a scalar (not an array)
```

## Multi-Key Indexes and Covered Queries

Multi-key indexes cannot support covered queries. Even if the projection only includes the indexed field, MongoDB still fetches the document:

```javascript
db.articles.find(
  { tags: "mongodb" },
  { tags: 1, _id: 0 }
).explain("executionStats");

// Despite projecting only the indexed field:
// totalDocsExamined > 0 (documents are still fetched)
// No PROJECTION_COVERED stage
```

This is a known limitation: the deduplication required for multi-key queries prevents index-only answers.

## Performance Considerations for Large Arrays

Multi-key indexes grow proportionally with array size. A document with 1000 tags creates 1000 index entries:

```javascript
// Monitor index size on array-heavy collections
db.articles.stats().indexSizes;
// {"_id_": 1048576, "tags_1": 52428800}  // tags index is large
```

If arrays are very large and searches within them are infrequent, consider a text index or restructuring to a separate collection instead.

## Checking if Your Index Became Multi-Key

```javascript
// Run explain on a query that uses the index in question
var result = db.articles.find({ tags: "mongodb" }).explain();
var ixscan = result.queryPlanner.winningPlan.inputStage;
print(`${ixscan.indexName} isMultiKey: ${ixscan.isMultiKey}`);
// Output: tags_1 isMultiKey: true

// The "isMultiKey" field in the IXSCAN stage confirms whether
// the index has been marked as multi-key
```

## Summary

Multi-key indexes in MongoDB enable efficient queries on array fields by indexing each array element separately. Recognize them in explain plans by `isMultiKey: true`. Key limitations include: compound indexes can only have one array field, covered queries are not possible with multi-key indexes, and index size grows with array cardinality. Design schemas to keep arrays reasonably sized and understand that multi-key indexes require document fetches even for single-field projections.
