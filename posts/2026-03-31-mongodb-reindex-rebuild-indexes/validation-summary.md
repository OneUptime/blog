# Validation Summary: How to Rebuild Indexes in MongoDB with reIndex()

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (reIndex command, index management, replica sets)
- MongoDB Shell (mongosh / mongo)

## Sources Consulted
- MongoDB official documentation: `db.collection.reIndex()` method reference (https://www.mongodb.com/docs/manual/reference/method/db.collection.reIndex/)
- MongoDB official documentation: `reIndex` command reference (https://www.mongodb.com/docs/manual/reference/command/reIndex/)
- MongoDB official documentation: `maxIndexBuildMemoryUsageMegabytes` parameter (https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.maxIndexBuildMemoryUsageMegabytes)
- MongoDB 5.0 and 6.0 release notes and compatibility pages

## Issues Found

1. **Incorrect version for replica set restriction (line 15)**: The post claimed "Starting with MongoDB 4.0, `reIndex()` on a replica set secondary is not allowed by default." This was wrong in two ways: the standalone-only hard restriction was introduced in MongoDB 5.0 (not 4.0), and it applies to all replica set members (not just secondaries). Fixed to state that starting with MongoDB 5.0, `reIndex()` can only be run on standalone `mongod` instances.

2. **False claim about replication of reIndex from primary (lines 120-135)**: The post stated "running `reIndex()` on the primary rebuilds the indexes on the primary and the change is replicated to secondaries." The official MongoDB documentation explicitly states that `reIndex()` does **not** propagate from the primary to secondaries — it only affects a single `mongod` instance. Fixed the entire replica set section to accurately describe the standalone-only workflow.

3. **Missing deprecation notice**: The post did not mention that `reIndex()` was deprecated in MongoDB 6.0. Added this information to the introduction.

4. **Flowchart inaccuracy**: The "When to Use" flowchart ended with "Run reIndex on standalone or primary" — corrected to "Run reIndex on standalone instance" since running on a primary is not allowed in MongoDB 5.0+.

## Review Notes
- The `db.collection.stats()` method used in the examples has been deprecated in favor of the `$collStats` aggregation stage in newer MongoDB versions, but it still functions and is widely understood. Not changed since it remains valid.
- The `maxIndexBuildMemoryUsageMegabytes` default of 200 MB is confirmed correct per official docs.
- Given that `reIndex()` is deprecated since MongoDB 6.0, users on current MongoDB versions should prefer manually dropping and recreating specific indexes rather than using `reIndex()`. The post does cover this alternative, which is good.
