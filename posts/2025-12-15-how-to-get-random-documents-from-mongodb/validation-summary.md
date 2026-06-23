# Validation Summary: How to Get Random Documents from MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB aggregation pipeline
- MongoDB `$sample`, `$rand`, `$setWindowFields`, `$toDouble`
- MongoDB Node.js driver query APIs
- BSON ObjectId
- JavaScript / Node.js

## Sources Consulted
- MongoDB `$sample` aggregation stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/sample/
- MongoDB `$rand` aggregation expression documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/rand/
- MongoDB update with aggregation pipeline documentation: https://www.mongodb.com/docs/manual/tutorial/update-documents-with-aggregation-pipeline/
- MongoDB Node.js driver find documents documentation: https://www.mongodb.com/docs/drivers/node/current/crud/query/retrieve/
- MongoDB BSON ObjectId documentation: https://www.mongodb.com/docs/manual/reference/bson-types/#objectid
- MongoDB `$toDouble` aggregation expression documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/todouble/
- MongoDB `$setWindowFields` aggregation stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/setwindowfields/

## Issues Found
- The `$sample` fast-path condition said "no `$match` before"; MongoDB requires `$sample` to be the first stage of the pipeline, so the diagram and performance note were updated.
- The `$sample` limitation incorrectly said MongoDB may return duplicate documents when the requested sample size is larger than the collection. `$sample` selects from input documents and cannot return more documents than the input contains, so the warning was corrected.
- The random-field examples queried by `random` without an explicit sort. Added `sort({ random: 1 })` to make the indexed range scan and wrap-around behavior deterministic.
- The ObjectId-based random example generated an ObjectId using the current timestamp, which would usually be greater than existing `_id` values and fall back to the first document. It also reassigned a `const` and did not handle an empty collection. Updated the example to generate a random ObjectId within the collection's `_id` timestamp range, sort by `_id`, use `let`, and return `null` when there are no documents.
- The A/B test example could pass `{ size: 0 }` to `$sample` when the percentage produced a sample size below 1, but `$sample.size` must be a positive integer. Added an early return for zero-size samples.
- The weighted random example could select a document even when the total weight was zero. Added an early return when total weight is not positive.
- The shuffled pagination example used `{ $toDouble: "$_id" }`, but `$toDouble` does not support ObjectId input. Updated it to use the post's precomputed numeric `random` field plus a seeded offset.

## Review Notes
- `$setWindowFields` is available starting in MongoDB 5.0, so the weighted random example requires MongoDB 5.0 or later.
- The ObjectId-based method remains distribution-sensitive because ObjectIds are approximately time-ordered, not uniformly distributed across documents.
