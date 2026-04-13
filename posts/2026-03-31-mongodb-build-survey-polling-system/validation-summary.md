# Validation Summary: How to Build a Survey and Polling System with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (document schema design, indexes, aggregation framework)
- MongoDB Node.js Driver (insertOne, findOne, createIndex, aggregate, countDocuments)
- JavaScript (async/await, optional chaining)

## Sources Consulted
- MongoDB Manual — Partial Indexes: https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Manual — Sparse Indexes: https://www.mongodb.com/docs/manual/core/index-sparse/
- MongoDB Manual — $unwind Aggregation Stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/
- MongoDB Manual — $group Aggregation Stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB Manual — $avg Accumulator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/avg/
- MongoDB Manual — Unique Indexes: https://www.mongodb.com/docs/manual/core/index-unique/
- MongoDB Manual — partialFilterExpression supported operators: https://www.mongodb.com/docs/manual/core/index-partial/#restrictions

## Issues Found

### 1. Sparse compound index does not prevent duplicate sessionId entries correctly
**What was wrong:** The anonymous dedup index used `sparse: true` on a compound index `{surveyId: 1, sessionId: 1}`. A sparse compound index only excludes documents where ALL indexed fields are missing. Since `surveyId` is always present, every document is indexed — including those where `sessionId` is explicitly set to `null` (authenticated users). This causes a false duplicate key error when a second authenticated user responds to the same survey, because both have the index key `(surveyId, null)`.

**What was changed:** Replaced `sparse: true` with `partialFilterExpression: { sessionId: { $type: 'string' } }`. This ensures only documents with a string `sessionId` (anonymous responses) are included in the unique index, while authenticated responses (with `sessionId: null`) are excluded entirely.

### 2. Multi-choice aggregation groups by exact array instead of per-option
**What was wrong:** The aggregation for multi_choice questions used `$group` with `_id: "$answers.q2"` directly. When the answer is an array like `["a", "c"]`, `$group` treats the entire array as the group key. This produces combination-level counts (e.g., `["a","c"]: 1, ["a","b"]: 1`) instead of per-option counts (e.g., `"a": 3, "b": 1, "c": 1`).

**What was changed:** Added a separate branch for `multi_choice` questions that includes a `$unwind` stage before `$group`. This flattens the array so each selected option is counted individually, producing the expected per-option distribution.

## Review Notes
- The `submitResponse` function sets `sessionId: null` for authenticated users. This is fine with the corrected partial filter index (which uses `$type: "string"`), since `null` is not of type string and won't be indexed. However, omitting the `sessionId` field entirely for authenticated users would be even cleaner.
- The post treats all questions as required. In a real system, you might want an `optional` flag on questions, but this is a design choice rather than a technical error.
- The `$avg` usage with dot notation on nested fields (`$answers.q3`) is correct MongoDB aggregation syntax.
- Error code 11000 for duplicate key violations is correct.
