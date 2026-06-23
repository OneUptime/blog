# Validation Summary: How to Choose Between Embedding and Referencing in MongoDB

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MongoDB data modeling
- Embedded documents
- Document references
- MongoDB aggregation `$lookup`
- MongoDB indexes
- BSON `ObjectId`

## Sources Consulted
- MongoDB Manual: Data Modeling in MongoDB - https://www.mongodb.com/docs/manual/data-modeling/
- MongoDB Manual: Best Practices for Data Modeling - https://www.mongodb.com/docs/manual/data-modeling/best-practices/
- MongoDB Manual: Embedded Data in Your MongoDB Schema - https://www.mongodb.com/docs/manual/data-modeling/embedding/
- MongoDB Manual: Reference Data in Your MongoDB Schema - https://www.mongodb.com/docs/manual/data-modeling/referencing/
- MongoDB Manual: Database References - https://www.mongodb.com/docs/manual/reference/database-references/
- MongoDB Manual: Limits and Thresholds - https://www.mongodb.com/docs/manual/reference/limits/
- MongoDB Manual: Atomicity and Transactions - https://www.mongodb.com/docs/manual/core/write-operations-atomicity/
- MongoDB Manual: Transactions - https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB Manual: `$lookup` aggregation stage - https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB Manual: ObjectId() mongosh method - https://www.mongodb.com/docs/manual/reference/method/objectid/
- MongoDB Manual: Indexes - https://www.mongodb.com/docs/manual/indexes/
- MongoDB Manual: Bucket Pattern - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/group-data/bucket-pattern/

## Issues Found
- Several examples used placeholders such as `ObjectId("customer123")`, `ObjectId("product1")`, and `ObjectId("...")`. In mongosh, `ObjectId()` accepts a generated value or a 24-character hexadecimal string, so these string placeholders would fail if pasted into a shell. Replaced them with either `ObjectId()` or valid 24-character hexadecimal ObjectId values while preserving relationships between example documents.
- The bucket pattern example used `new Date("...")`, which creates an invalid date value. Replaced the placeholders with concrete ISO date strings.
- The summary table said referencing "Requires application logic" for data consistency. MongoDB also supports multi-document transactions, so the table now says "Requires application logic or transactions."

## Review Notes
The post's high-level guidance matches MongoDB's official recommendations to choose embedding or referencing based on application access patterns, document growth, update patterns, and the 16 MiB BSON document limit. The "under 100" and "~200 readings per bucket" values are reasonable illustrative heuristics, not MongoDB hard limits.
