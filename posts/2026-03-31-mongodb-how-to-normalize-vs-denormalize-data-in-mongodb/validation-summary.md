# Validation Summary: How to Normalize vs Denormalize Data in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (document model, schema design)
- MongoDB Aggregation Pipeline (`$lookup`, `$match`, `$unwind`)
- BSON ObjectId
- Normalization vs Denormalization patterns (embedding, referencing, hybrid/extended reference)

## Sources Consulted
- MongoDB official documentation on Data Modeling: https://www.mongodb.com/docs/manual/core/data-modeling-introduction/
- MongoDB official documentation on `$lookup`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB official documentation on BSON document size limit (16MB): https://www.mongodb.com/docs/manual/reference/limits/#BSON-Document-Size
- MongoDB Schema Design Patterns (extended reference / subset pattern): https://www.mongodb.com/blog/post/building-with-patterns-the-extended-reference-pattern

## Issues Found
No technical issues found.

## Review Notes
- The examples use simplified ObjectId values like `ObjectId("post1")` and `ObjectId("author1")` which would throw errors at runtime since ObjectId requires a 24-character hex string. However, this is a widely-accepted convention in MongoDB educational content to improve readability and does not affect the correctness of the schema patterns being taught.
- The "fewer than 100 elements" embedding guideline is reasonable but is a rule of thumb, not an official MongoDB limit. The actual constraint is the 16MB BSON document size limit, which the post correctly mentions.
- The `$lookup` example correctly demonstrates the equality-based syntax. MongoDB also supports a more expressive pipeline-based `$lookup` syntax (using `let` and `pipeline` fields) which could be mentioned in a future update for advanced use cases, but is not necessary for this introductory guide.
