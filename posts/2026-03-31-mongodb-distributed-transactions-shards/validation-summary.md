# Validation Summary: How to Implement Distributed Transactions Across Shards in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (4.2+ sharded clusters)
- MongoDB Node.js Driver
- MongoDB sharding (`sh.enableSharding`, `shardCollection`)
- MongoDB distributed transactions (two-phase commit)
- MongoDB monitoring (`currentOp`)

## Sources Consulted
- MongoDB Manual: Transactions on Sharded Clusters — https://www.mongodb.com/docs/manual/core/transactions-sharded-clusters/
- MongoDB Manual: Production Considerations for Sharded Clusters — https://www.mongodb.com/docs/manual/core/transactions-production-consideration/
- MongoDB Manual: `transactionLifetimeLimitSeconds` parameter — https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.transactionLifetimeLimitSeconds
- MongoDB Manual: `currentOp` output fields — https://www.mongodb.com/docs/manual/reference/command/currentOp/
- MongoDB Node.js Driver: Transactions API (`session.withTransaction`) — https://www.mongodb.com/docs/drivers/node/current/fundamentals/transactions/
- MongoDB Manual: `coordinateCommitTransaction` internal command — https://www.mongodb.com/docs/manual/reference/command/coordinateCommitTransaction/

## Issues Found

### 1. Incorrect 2PC coordinator attribution (intro paragraph and "How Distributed Transactions Work" section)
- **What was wrong:** The post stated that `mongos` coordinates the two-phase commit protocol, sends `prepareTransaction` to each shard, and sends `commitTransaction`/`abortTransaction`. In reality, `mongos` forwards the commit request to a designated **coordinator shard** (via `coordinateCommitTransaction`), and it is the coordinator shard that drives the two-phase commit protocol by sending `prepareTransaction` and `commitTransaction`/`abortTransaction` to participant shards.
- **What was changed:** Updated the intro and the 2PC explanation to correctly identify the coordinator shard as the entity running the two-phase commit. Added a clarifying sentence explaining that `mongos` initiates the process via `coordinateCommitTransaction` but does not directly run the 2PC.
- **Why:** This is a material architectural inaccuracy. Understanding which component coordinates the commit is important for debugging transaction failures and understanding failover behavior.

### 2. Typo in `currentOp` field name (Monitoring section)
- **What was wrong:** The field name was written as `transaction.timeopenMicros` (lowercase 'o' in "open").
- **What was changed:** Corrected to `transaction.timeOpenMicros` (capital 'O' in "Open") to match the actual `currentOp` output field name.
- **Why:** An incorrect field name would cause confusion when users try to inspect transaction monitoring output.

## Review Notes
- `sh.enableSharding()` was deprecated in MongoDB 6.0 and removed in MongoDB 8.0. Since the post targets MongoDB 4.2+, the command is valid for that version, but readers on MongoDB 6.0+ no longer need to call it — sharding is automatically enabled on a database when a collection is sharded. A future update could note this deprecation.
- The `withTransaction` callback in the code example uses `async (session) =>` which shadows the outer `session` variable. This works correctly because the MongoDB Node.js driver passes the session to the callback, but using a different parameter name (or no parameter, relying on the outer scope) would be clearer. This is a style preference, not a bug.
- The `shardCollection` command syntax used (`db.adminCommand({ shardCollection: ... })`) is correct but is the older form. MongoDB 5.0+ also supports `sh.shardCollection()` as a helper. Both forms remain valid.
