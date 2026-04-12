# Validation Summary: How to Respond to MongoDB High Connection Count Alerts

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (server commands: `serverStatus`, `currentOp`, `setParameter`)
- MongoDB Node.js Driver (connection pool options)
- PyMongo (Python MongoDB driver)
- MongoDB Atlas (tier connection limits, alerts)
- MongoDB Atlas CLI (`atlas alerts settings create`)
- AWS Lambda / Serverless patterns

## Sources Consulted
- MongoDB Server Parameters documentation: https://www.mongodb.com/docs/manual/reference/parameters/
- MongoDB `serverStatus` command reference: https://www.mongodb.com/docs/manual/reference/command/serverstatus/
- MongoDB Node.js Driver connection pool options: https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/connection-pools/
- MongoDB Atlas service limits (connection limits per tier): https://www.mongodb.com/docs/atlas/reference/atlas-limits/
- MongoDB Atlas CLI source code on GitHub (`mongodb/mongodb-atlas-cli`) for `alerts settings create` flag names
- MongoDB `setParameter` command reference: https://www.mongodb.com/docs/manual/reference/command/setparameter/

## Issues Found
1. **Atlas CLI command used incorrect flag names and wrong event type (Step 5):**
   - `--eventTypeName CONNECTIONS_PERCENT` was changed to `--event OUTSIDE_METRIC_THRESHOLD`. The correct event type for any metric-based alert is `OUTSIDE_METRIC_THRESHOLD`, and the correct flag name is `--event`, not `--eventTypeName`. `CONNECTIONS_PERCENT` is a metric name, not an event type.
   - `--metricThresholdMetricName` was changed to `--metricName`.
   - `--metricThresholdMode` was changed to `--metricMode`.
   - `--metricThresholdOperator` was changed to `--metricOperator`.
   - `--metricThresholdThreshold` was changed to `--metricThreshold`.
   - `--metricThresholdUnits` was changed to `--metricUnits`.

   The flag names in the original post appear to have been derived from the Atlas Administration API field names (e.g., `metricThreshold.metricName`) rather than the actual CLI flag names.

## Review Notes
- The description of `mongos` as a "connection pooler" in Step 4 is slightly misleading. `mongos` is primarily a query router for sharded clusters; while it does manage and pool connections to shard members, calling it a "connection pooler" could confuse readers. This is a minor terminology nuance and was not changed.
- The `setParameter` command for `maxIncomingConnections` is correct but the post does not mention that runtime changes do not persist across server restarts. For production use, `net.maxIncomingConnections` in `mongod.conf` would be more appropriate. This was not changed as it's supplementary information rather than an error.
- All MongoDB shell commands, driver code examples (Node.js and Python), session handling patterns, and serverless reuse patterns are technically correct and use current APIs.
