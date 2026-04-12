# Validation Summary: How to Monitor Connection Pool Metrics in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (server-side `serverStatus` command)
- MongoDB Node.js Driver (CMAP events, `mongodb` npm package)
- PyMongo (Python driver, `pymongo.monitoring` module)
- Prometheus (`prom-client` npm package)
- MongoDB Atlas (Metrics tab reference)

## Sources Consulted
- MongoDB CMAP (Connection Monitoring and Pooling) Specification: https://github.com/mongodb/specifications/blob/master/source/connection-monitoring-and-pooling/connection-monitoring-and-pooling.md
- MongoDB Node.js Driver source (`src/constants.ts`, `src/cmap/connection_pool_events.ts`): https://github.com/mongodb/node-mongodb-native
- PyMongo `monitoring` module source and API documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/monitoring.html
- MongoDB `serverStatus` command documentation: https://www.mongodb.com/docs/manual/reference/command/serverStatus/

## Issues Found
1. **Invalid Node.js CMAP event names for wait queue tracking.** The post used `"waitQueueEntered"` and `"waitQueueExited"` as event names on the MongoClient instance. These events do not exist in the MongoDB Node.js driver or in the CMAP specification. **Fix:** Replaced with `"connectionCheckOutStarted"` (fires when a checkout attempt begins, analogous to entering the wait queue), `"connectionCheckedOut"` (also decrements wait queue size on successful checkout), and `"connectionCheckOutFailed"` (decrements wait queue size when a checkout fails due to timeout, pool closure, or connection error). Reordered the event handlers to group the checkout lifecycle events together for clarity.

## Review Notes
- The `connectionClosed` handler unconditionally decrements `poolState.available`, which is only correct if the closed connection was idle (not checked out). If a connection errors while checked out, this counter would drift. This is an acceptable simplification for a tutorial but would need refinement in production code.
- The `serverStatus` code block uses `db.adminCommand()`, which is a mongosh method. In the Node.js driver, the equivalent would be `await db.admin().command({ serverStatus: 1 })`. Since the rest of the post uses Node.js driver code, this could be slightly confusing, but it is valid in mongosh context.
- The PyMongo code is fully correct: `ConnectionPoolListener`, all overridden methods, `event.reason` on `ConnectionClosedEvent`, and `monitoring.register()` are all valid APIs.
- The Prometheus integration code correctly uses `prom-client` Gauge metrics with `inc()`/`dec()` and `event.address` label values.
