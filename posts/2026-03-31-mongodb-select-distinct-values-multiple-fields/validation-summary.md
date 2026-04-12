# Validation Summary: How to Select Distinct Values on Multiple Fields in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (shell commands, aggregation framework)
- MongoDB `distinct()` method
- MongoDB aggregation pipeline stages: `$group`, `$match`, `$replaceRoot`, `$sort`
- MongoDB indexing (`createIndex`)

## Sources Consulted
- MongoDB official documentation: `db.collection.distinct()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.distinct/
- MongoDB official documentation: `$group` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB official documentation: `$replaceRoot` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceRoot/
- MongoDB official documentation: `$match` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/match/
- MongoDB official documentation: `allowDiskUse` option — https://www.mongodb.com/docs/manual/reference/method/db.collection.aggregate/
- MongoDB official documentation: Compound indexes — https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/

## Issues Found
No technical issues found.

## Review Notes
- Starting in MongoDB 6.0, the server parameter `allowDiskUseByDefault` is set to `true` by default, meaning aggregation stages can spill to disk without explicitly passing `allowDiskUse: true`. The post's advice remains valid for all versions but could note this for readers on MongoDB 6.0+.
- The `$sum: 1` accumulator pattern for counting is correct and universally supported. MongoDB 5.0+ also introduced `$count` as a group accumulator (`count: { $count: {} }`), which is an alternative but not a replacement — both are valid.
- All code examples use correct MongoDB shell (mongosh) syntax and would work as described.
