# Validation Summary: How to Troubleshoot MongoDB Disk Space Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- MongoDB Shell (mongosh)
- MongoDB Replica Sets (oplog)
- MongoDB Atlas and Atlas CLI
- TTL Indexes
- Linux disk utilities (df, du)

## Sources Consulted
- MongoDB `compact` command documentation: https://www.mongodb.com/docs/manual/reference/command/compact/
- MongoDB `systemLog` configuration options: https://www.mongodb.com/docs/manual/reference/configuration-options/#systemlog-options
- MongoDB `replSetResizeOplog` command documentation: https://www.mongodb.com/docs/manual/reference/command/replSetResizeOplog/
- MongoDB `$indexStats` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/
- MongoDB TTL Indexes documentation: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Atlas CLI reference: https://www.mongodb.com/docs/atlas/cli/stable/command/atlas-metrics-databases/

## Issues Found

### 1. Incorrect config key `logRotateBehavior` (line ~149)
- **What was wrong:** The mongod.conf snippet used `logRotateBehavior: rename` as the YAML key for configuring log rotation behavior.
- **What was changed:** Corrected to `logRotate: rename`, which is the actual configuration key under `systemLog` in mongod.conf.
- **Why:** The correct YAML key is `systemLog.logRotate`, not `systemLog.logRotateBehavior`. Valid values are `rename` (default) and `reopen`.

### 2. Outdated `compact` blocking behavior claim (lines ~99, ~109)
- **What was wrong:** The post stated that `compact` "blocks reads/writes during execution" and warned that it "blocks the collection," which is only true for MongoDB 5.0 and earlier. Starting in MongoDB 6.0, `compact` is non-blocking.
- **What was changed:** Updated the comment and warning to specify the version-dependent behavior: blocking in MongoDB 5.0 and earlier, non-blocking in MongoDB 6.0+.
- **Why:** MongoDB 6.0 (released July 2022) made the `compact` command non-blocking for the WiredTiger storage engine. Since MongoDB 5.0 and earlier have reached end-of-life, the original blanket statement was misleading for users on current MongoDB versions.

## Review Notes
- The Atlas CLI command `atlas metrics databases` is valid but `atlas metrics disks` would be more directly relevant for disk space monitoring. The current command shows database-level storage stats, which is still useful in context. Both commands also require a process ID (host:port) rather than just a cluster name, but the simplified syntax shown is adequate for a blog post illustration.
- The `replSetResizeOplog` minimum version note says "MongoDB 3.6+" which is correct, though MongoDB 3.6 is long past end-of-life. This is not an error since it correctly identifies when the feature was introduced.
- The 2592000 seconds TTL value correctly equals 30 days (30 * 24 * 60 * 60 = 2,592,000).
