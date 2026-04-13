# Validation Summary: How to Avoid the Unbounded Array Growth Anti-Pattern in MongoDB

## Status
validated

## Post Type
Tutorial / Best Practice Guide

## Technologies Covered
- MongoDB (document model, update operators, aggregation framework)
- JavaScript / Node.js (MongoDB driver async/await usage)
- MongoDB Schema Design Patterns (subset pattern, bucketing pattern)

## Sources Consulted
- MongoDB documentation: $push with modifiers ($each, $sort, $slice) — https://www.mongodb.com/docs/manual/reference/operator/update/push/
- MongoDB documentation: $slice modifier behavior (positive vs negative values) — https://www.mongodb.com/docs/manual/reference/operator/update/slice/
- MongoDB documentation: $bsonSize aggregation operator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/bsonSize/
- MongoDB documentation: $size aggregation operator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/size/
- MongoDB documentation: $setOnInsert — https://www.mongodb.com/docs/manual/reference/operator/update/setOnInsert/
- MongoDB documentation: Document size limit (16MB) — https://www.mongodb.com/docs/manual/reference/limits/
- MongoDB Blog: Building with Patterns (Subset Pattern, Bucket Pattern) — https://www.mongodb.com/blog/post/building-with-patterns-the-subset-pattern

## Issues Found
1. **Incorrect comment on `$slice` in Fix 4 (line 196):** The comment read `// negative = keep last 100` but the value `$slice: 100` is positive, not negative. In MongoDB's `$push` modifier, a positive `$slice` value keeps the **first** N elements, while a negative value keeps the **last** N. Since the code also uses `$sort: { purchasedAt: -1 }` (descending), the positive `$slice: 100` correctly keeps the first 100 elements after sorting — which are the 100 most recent. The code was functionally correct but the comment was misleading. Changed to: `// keep first 100 after sort (i.e. the 100 most recent)`.

## Review Notes
- The bucketing pattern in Fix 3 does not enforce a maximum number of events per bucket document. In extremely high-throughput scenarios, a single hour bucket could still grow large. A production implementation might add a `$setOnInsert` with a max event count check or use a compound filter that includes `{ eventCount: { $lt: maxEventsPerBucket } }` in the upsert filter. This is a minor design consideration, not an error.
- `$bsonSize` (used in the "Detecting the Anti-Pattern" section) requires MongoDB 4.4+. This is not noted in the post but is unlikely to be an issue for most readers.
- The post correctly covers the four main strategies recommended by MongoDB's official schema design guidance for handling unbounded arrays.
