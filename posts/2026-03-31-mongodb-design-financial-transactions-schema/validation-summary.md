# Validation Summary: How to Design a Financial Transactions Schema in MongoDB

## Status
validated

## Post Type
Tutorial / Schema Design Guide

## Technologies Covered
- MongoDB (document model, ACID transactions, aggregation pipeline)
- MongoDB Node.js Driver (session and transaction API)
- MongoDB Shell (mongosh) commands for index creation
- BSON types: ObjectId, NumberDecimal (Decimal128), ISODate

## Sources Consulted
- MongoDB documentation on multi-document transactions: https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB documentation on Decimal128 / NumberDecimal: https://www.mongodb.com/docs/manual/reference/bson-types/#numberdecimal
- MongoDB documentation on TTL indexes: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB documentation on findOneAndUpdate: https://www.mongodb.com/docs/drivers/node/current/usage-examples/findOneAndUpdate/
- MongoDB documentation on createIndex: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB documentation on aggregation pipeline stages ($match, $group, $sort): https://www.mongodb.com/docs/manual/reference/operator/aggregation-pipeline/

## Issues Found
1. **TTL index comment incorrectly described behavior as "archive"**: The original comment on the TTL index read "TTL index to archive old records to cold storage after 7 years." MongoDB TTL indexes permanently **delete** documents when they expire — they do not archive or move them. This is a critical distinction for financial data where regulatory compliance often mandates long-term retention. Fixed the comment to accurately state that TTL indexes delete documents and added a warning recommending a scheduled archival job as an alternative for financial data.

## Review Notes
- The post mixes mongosh syntax (`NumberDecimal()`, `ObjectId()`, `ISODate()`) with Node.js driver syntax (`await`, `client.startSession()`) in the multi-document transaction code example. This is a common convention in MongoDB educational content for readability, but readers copying the code directly into a Node.js application would need to replace `NumberDecimal("150.00")` with `Decimal128.fromString("150.00")` from the `bson` or `mongodb` package. This is not treated as an error since it is a widely accepted shorthand in the MongoDB blogging ecosystem.
- The `expireAfterSeconds: 220752000` value correctly computes to approximately 7 years (220,752,000 / 86,400 / 365 ≈ 7.0 years). However, even with the corrected comment, using a TTL index on financial transactions is risky in practice due to compliance requirements (e.g., SOX, PCI-DSS). The post now includes a warning about this.
- The optimistic concurrency control pattern using a `version` field combined with multi-document ACID transactions is a sound approach. The version check in the filter of `findOneAndUpdate` correctly prevents double-spend scenarios.
- All aggregation pipeline stages and operators are used correctly.
- All index definitions use valid syntax and reasonable field selections for the described query patterns.
