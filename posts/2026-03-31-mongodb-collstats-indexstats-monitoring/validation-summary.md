# Validation Summary: How to Use $collStats and $indexStats for Performance Monitoring in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework
- `$collStats` aggregation stage
- `$indexStats` aggregation stage
- MongoDB shell (mongosh)

## Sources Consulted
- MongoDB `$collStats` documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/collStats/
- MongoDB `$indexStats` documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/
- MongoDB `queryExecStats` documentation (added in MongoDB 6.0): https://www.mongodb.com/docs/manual/reference/operator/aggregation/collStats/#queryexecstats

## Issues Found

1. **Incorrect `queryExecStats` field names (line 65)**: The post claimed `queryExecStats` returns `queryExecStats.collScans` and `queryExecStats.indexesUsed`. The actual fields are `queryExecStats.collectionScans.total` and `queryExecStats.collectionScans.nonTailable`. There is no `indexesUsed` field in the `queryExecStats` output. Fixed the field names and updated the description accordingly.

2. **Variable shadowing bug in `collectionReport` function (line 110)**: `const db = db.getSiblingDB("myApp")` attempts to reference `db` within its own `const` declaration, which causes a ReferenceError because `const` variables are not accessible before their declaration completes. Renamed the variable to `myDb` and updated all references within the function.

3. **Imprecise description of `$indexStats` tracking window (line 69)**: The post stated that `$indexStats` shows usage "since the last server restart." The `accesses.since` field actually reflects the later of the last server restart or the index creation time. Added this clarification.

## Review Notes
- The `queryExecStats` option was introduced in MongoDB 6.0. The post does not mention version requirements, which could cause confusion for users on older MongoDB versions. A future update could note the minimum version requirement.
- The `count` option for `$collStats` was deprecated in MongoDB 6.0 in favor of using `storageStats` which also includes a `count` field. The code examples still work but a future update could note this deprecation.
