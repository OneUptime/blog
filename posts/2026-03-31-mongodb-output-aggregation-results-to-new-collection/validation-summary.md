# Validation Summary: How to Output Aggregation Results to a New Collection in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework (`$out`, `$merge` stages)
- mongosh (MongoDB Shell)
- Bash scripting / cron scheduling

## Sources Consulted
- MongoDB official documentation on `$out`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/
- MongoDB official documentation on `$merge`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/
- MongoDB official documentation on aggregation pipeline stages: https://www.mongodb.com/docs/manual/reference/operator/aggregation-pipeline/

## Issues Found
1. **Incorrect claim about `$out` dropping indexes**: The post stated that "`$out` drops and recreates the target collection, so any indexes on it are lost." This is incorrect. According to MongoDB documentation, when `$out` replaces an existing collection, it atomically creates a temporary collection, copies the indexes from the existing collection to the temp collection, inserts documents, and then renames the temp collection. Indexes on the previous collection are preserved. Fixed the "Index Considerations" section and the Summary to reflect the correct behavior.

## Review Notes
- The cross-database `$out` syntax (`{ db: "...", coll: "..." }`) was introduced in MongoDB 4.4. The post does not mention version requirements, which could be noted in a future update.
- All code examples use correct MongoDB aggregation syntax and would work as described.
- The `$merge` stage options (`whenMatched`, `whenNotMatched`, `on`) are all correctly used.
- The cron scheduling example is correct and practical.
