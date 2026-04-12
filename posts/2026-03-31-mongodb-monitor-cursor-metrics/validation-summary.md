# Validation Summary: How to Monitor MongoDB Cursor Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (serverStatus, $currentOp, cursor management)
- Python (PyMongo driver)
- JavaScript (mongo shell)

## Sources Consulted
- MongoDB `serverStatus` command reference: https://www.mongodb.com/docs/manual/reference/command/serverstatus/
- MongoDB `$currentOp` aggregation stage reference: https://www.mongodb.com/docs/manual/reference/operator/aggregation/currentop/
- MongoDB cursor timeout documentation: https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.cursorTimeoutMillis
- PyMongo documentation for `find()` and cursor management: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html

## Issues Found

1. **Incorrect `open.singleTarget` description** (Key Metrics Explained section): Described as "Cursors targeting a single collection/index". This is wrong — `singleTarget` counts cursors targeting a single shard and is only reported by `mongos` instances. Changed to "Cursors targeting a single shard (mongos only)".

2. **Misleading `open.pinned` description** (Key Metrics Explained section): Described as "used by change streams, getMore chains". Pinned cursors are cursors currently in active use by any operation, pinned to prevent deletion — not specific to change streams or getMore. Changed to "Cursors currently in active use by an operation (pinned to prevent deletion)".

3. **Wrong field reference `op.cursor.ns`** ($currentOp code example): The `ns` field is at the top level of the idle cursor document, not nested under `cursor`. Changed `op.cursor.ns` to `op.ns`.

4. **Wrong field name `createdAt`** ($currentOp code example): The correct MongoDB field name is `createdDate`, not `createdAt`. Changed to `op.cursor.createdDate`.

5. **Non-existent field `secsIdle`** ($currentOp code example): There is no `secsIdle` field in `$currentOp` output. The closest field is `cursor.lastAccessDate`, from which idle time can be computed. Replaced `secsIdle` with `lastAccessDate`.

## Review Notes
- The `open.singleTarget` and `open.multiTarget` metrics are only reported by `mongos` instances. The post doesn't mention this sharding context, which could confuse readers running standalone or replica set deployments. A future improvement could note this distinction.
- The PyMongo context manager pattern (`with collection.find({}) as cursor:`) is correct for PyMongo 3.x+.
- The `cursorTimeoutMillis` parameter, default value (600,000ms / 10 minutes), and configuration methods are all correct.
- The Python monitoring code correctly accesses `serverStatus` metrics paths and the alerting logic is sound.
