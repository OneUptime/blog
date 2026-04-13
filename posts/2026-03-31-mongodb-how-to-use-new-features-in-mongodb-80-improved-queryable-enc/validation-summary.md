# Validation Summary: How to Use New Features in MongoDB 8.0

## Status
validated

## Post Type
Tutorial / Feature overview

## Technologies Covered
- MongoDB 8.0
- Queryable Encryption (range queries)
- MongoDB Query Shape and Plan Cache
- MongoDB Time Series Collections
- MongoDB Aggregation Pipeline ($percentile, $median)
- Node.js MongoDB Driver

## Sources Consulted
- MongoDB 8.0 Release Notes: https://www.mongodb.com/docs/v8.0/release-notes/8.0/
- MongoDB 8.0 GA Announcement: https://www.mongodb.com/press/mongo-db-announces-general-availability-of-mongo-db-8-0
- MongoDB 8.0 Version Release Page: https://www.mongodb.com/products/updates/version-release
- MongoDB $percentile documentation: https://www.mongodb.com/docs/v7.0/reference/operator/aggregation/percentile/
- MongoDB 7.0 Query Enhancements Blog: https://www.mongodb.com/company/blog/product-release-announcements/query-enhancement-mongodb-7-0
- MongoDB Queryable Encryption (Encrypted Fields and Enabled Queries): https://www.mongodb.com/docs/manual/core/queryable-encryption/fundamentals/encrypt-and-query/
- MongoDB PlanCache.clearPlansByQuery() documentation: https://www.mongodb.com/docs/manual/reference/method/PlanCache.clearPlansByQuery/
- MongoDB setFeatureCompatibilityVersion documentation: https://www.mongodb.com/docs/v8.0/reference/command/setfeaturecompatibilityversion/

## Issues Found

1. **$percentile and $median incorrectly attributed to MongoDB 8.0**: The post stated "MongoDB 8.0 introduces `$percentile`" and listed `$percentile`/`$median` as "new" in the upgrade considerations. Both operators were actually introduced in MongoDB 7.0, not 8.0. Fixed the section heading from "New $percentile Aggregation Operator" to "$percentile Aggregation Operator", updated the introductory text to credit MongoDB 7.0, updated the upgrade consideration item, and corrected the summary paragraph.

2. **Bulk write performance claim exaggerated ("up to 3x faster")**: The post claimed "up to 3x faster bulk inserts." MongoDB's official benchmarks state up to 54% faster bulk inserts for MongoDB 8.0. Changed all instances of "3x" to "54%" to match the official figures.

## Review Notes
- The Queryable Encryption range query configuration (min, max, precision, sparsity, trimFactor) is accurate for MongoDB 8.0.
- The `confirm: true` parameter for `setFeatureCompatibilityVersion` is correct (required since MongoDB 7.0).
- `PlanCache.clearPlansByQuery()` is still available in MongoDB 8.0, though some users may prefer the `planCacheClear` command for more explicit control.
- The post correctly identifies that range queries on encrypted fields were GA in MongoDB 8.0 (preview in 7.0).
- The code examples use `require()` (CommonJS) syntax. While functional, modern Node.js projects often use ES module imports. This is a style preference, not an error.
