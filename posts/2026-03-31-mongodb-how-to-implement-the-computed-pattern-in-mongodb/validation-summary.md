# Validation Summary: How to Implement the Computed Pattern in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (aggregation framework, change streams, update operators)
- JavaScript / Node.js (async/await, MongoDB driver)
- MongoDB Change Streams (watch API, fullDocument options)

## Sources Consulted
- MongoDB Manual: Change Streams — https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Manual: Change Events — https://www.mongodb.com/docs/manual/reference/change-events/
- MongoDB Manual: `$inc` operator — https://www.mongodb.com/docs/manual/reference/operator/update/inc/
- MongoDB Manual: Aggregation Pipeline — https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- MongoDB Manual: `db.collection.watch()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.watch/
- MongoDB Building Patterns: The Computed Pattern — https://www.mongodb.com/blog/post/building-with-patterns-the-computed-pattern

## Issues Found

### 1. Incorrect "atomically" claim in section heading
- **What was wrong:** The "Updating Pre-Computed Values on Write" section stated the computed fields were updated "atomically," but the code performs three separate operations (insertOne, updateOne with $inc, findOne + updateOne with $set). These are not atomic — a concurrent write between the $inc and the subsequent read + $set could cause the average to be computed from inconsistent data.
- **What was changed:** Removed the word "atomically" from the section description.
- **Why:** The claim was misleading. True atomicity would require either a transaction or a single pipeline-based updateOne (MongoDB 4.2+).

### 2. Change stream code had multiple bugs
- **What was wrong:**
  - `change.documentKey?.movieId` does not work — `documentKey` only contains `{ _id: <reviewId> }`, not the `movieId` field.
  - For `update` events, `change.fullDocument` is not populated unless the `fullDocument: "updateLookup"` option is passed to `watch()`.
  - For `delete` events, `change.fullDocument` is always `undefined`, so the `movieId` could never be retrieved. The `fullDocumentBeforeChange` option (MongoDB 6.0+) is needed.
- **What was changed:** Added `fullDocument: "updateLookup"` and `fullDocumentBeforeChange: "whenAvailable"` options to the `watch()` call. Changed the fallback from `change.documentKey?.movieId` to `change.fullDocumentBeforeChange?.movieId`. Added a null check before calling `recomputeMovieStats`.
- **Why:** The original code would silently fail to retrieve the `movieId` for update and delete events, causing recomputation to never trigger for those operation types.

## Review Notes
- `ObjectId("m001")` used throughout the examples is not a valid ObjectId (requires 24 hex characters) and would throw at runtime. This is a common tutorial simplification for readability but readers should be aware real code needs valid ObjectIds.
- The batch recomputation example uses `db.movies.find({}).toArray()` which loads all documents into memory. For large collections, a cursor-based approach would be more appropriate.
- The sorting example uses a single-field index `{ popularityScore: -1 }`, but a compound index `{ category: 1, popularityScore: -1 }` would be more efficient for the shown query that filters by `category` and sorts by `popularityScore`.
- The `fullDocumentBeforeChange` option requires MongoDB 6.0+ and the collection must have `changeStreamPreAndPostImages` enabled. This version requirement could be noted in the post.
