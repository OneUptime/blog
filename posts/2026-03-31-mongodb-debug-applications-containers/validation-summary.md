# Validation Summary: How to Debug MongoDB Applications in Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (mongosh, profiler, explain)
- Docker (exec, logs, network inspect, healthcheck)
- MongoDB Node.js Driver (command monitoring, logging)

## Sources Consulted
- MongoDB Node.js Driver v5.0 changelog: https://github.com/mongodb/node-mongodb-native/blob/main/etc/notes/CHANGES_5.0.0.md
- MongoDB Node.js Driver What's New (v5.0): https://www.mongodb.com/docs/drivers/node/v5.0/whats-new/
- MongoDB Node.js Driver Logging (current): https://www.mongodb.com/docs/drivers/node/current/monitoring-and-logging/logging/
- MongoDB Node.js Driver Command Monitoring: https://www.mongodb.com/docs/drivers/node/current/monitoring-and-logging/monitoring/
- MongoDB Explain Results: https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB Database Profiler: https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- Docker CLI reference (docker exec, logs, network inspect): https://docs.docker.com/reference/cli/docker/

## Issues Found

### 1. Deprecated `Logger` class in MongoDB Node.js driver
**What was wrong:** The code imported `Logger` from the `mongodb` package and called `Logger.setLevel("debug")` and `Logger.filter("class", ["Connection", "Pool"])`. The `Logger` class was non-functional in driver v4.x, formally deprecated in v4.14, and completely removed in v5.0.

**What was changed:** Removed the `Logger` import and its method calls. Replaced with the modern `mongodbLogPath: "stderr"` client option, which is the current way to enable driver-level logging in v5.x/v6.x. The `monitorCommands: true` option and command event listeners were already correct and were kept as-is.

### 2. Incorrect explain() field name `totalDocsReturned`
**What was wrong:** The code referenced `result.executionStats.totalDocsReturned`, which is not a valid field in MongoDB explain output. MongoDB has never used this field name.

**What was changed:** Replaced `totalDocsReturned` with the correct field name `nReturned`.

## Review Notes
- The `MONGODB_LOG_ALL=debug` environment variable can also be used to enable verbose driver logging. The post uses `mongodbLogPath` which is sufficient, but users may also want to set log level via environment variables for containerized deployments.
- The `db.currentOp()` call in the profiler section uses the legacy helper syntax. In MongoDB 5.0+ the `$currentOp` aggregation stage is preferred, but the legacy helper still works and is more readable for a tutorial context.
- The healthcheck YAML snippet is valid for Docker Compose format. The `--quiet` flag for mongosh suppresses non-essential output, which is appropriate for health checks.
