# Validation Summary: How to Recover MongoDB from a Primary Failure

## Status
validated

## Post Type
Tutorial / Recovery Guide

## Technologies Covered
- MongoDB replica sets
- MongoDB shell (mongosh)
- MongoDB Node.js driver
- systemctl (Linux service management)
- mongorestore / bsondump CLI tools

## Sources Consulted
- MongoDB Replica Set Configuration reference: https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB `hello` command documentation (replacement for deprecated `isMaster`): https://www.mongodb.com/docs/manual/reference/command/hello/
- MongoDB Replica Set Elections: https://www.mongodb.com/docs/manual/core/replica-set-elections/
- MongoDB Rollback documentation: https://www.mongodb.com/docs/manual/core/replica-set-rollbacks/
- MongoDB `rs.reconfig()` reference: https://www.mongodb.com/docs/manual/reference/method/rs.reconfig/
- MongoDB Node.js Driver Connection Options: https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/
- MongoDB `setDefaultRWConcern` command: https://www.mongodb.com/docs/manual/reference/command/setDefaultRWConcern/

## Issues Found

### 1. Deprecated `rs.isMaster()` usage
- **What was wrong:** The post used `rs.isMaster()` in Step 2 and the Summary section. The `isMaster` command and its shell helper `rs.isMaster()` were deprecated in MongoDB 5.0, replaced by the `hello` command and `db.hello()` shell helper.
- **What was changed:** Replaced `rs.isMaster()` with `db.hello()` in Step 2 code examples and in the Summary paragraph.
- **Why:** A 2026 blog post should use current, non-deprecated APIs. `db.hello()` returns the same information (including the `primary` field) and is the supported method going forward.

### 2. Invalid `heartbeatTimeoutSecs` configuration setting
- **What was wrong:** Step 7 set `cfg.settings.heartbeatTimeoutSecs = 5` as a tuning recommendation. This setting only applies to `protocolVersion: 0`, which was removed in MongoDB 5.0. On modern MongoDB (5.0+), this setting has no effect.
- **What was changed:** Removed the `heartbeatTimeoutSecs` line from the tuning code block. The `electionTimeoutMillis` setting (which IS valid for the current protocol version 1) was already present and correctly documented.
- **Why:** Including a no-op configuration setting is misleading and could cause readers to believe they've improved their failure detection when nothing has changed.

## Review Notes
- The `rs.printSecondaryReplicationInfo()` helper is functional but has been noted as potentially deprecated in future mongosh versions in favor of `db.printSecondaryReplicationInfo()`. Worth monitoring for future updates.
- The `socketTimeoutMS` driver option in the Application Reconnection section is still accepted by the Node.js driver but its relevance has diminished in newer driver versions that handle timeouts differently. Not incorrect, but worth revisiting if the post is updated for newer driver versions.
- The rollback file path `/var/lib/mongodb/rollback/` assumes the default Linux package data directory. This is correct for standard installations but may differ for custom deployments. The post's audience (recovery scenarios) likely makes this assumption acceptable.
- The force reconfig approach correctly warns it is "emergency only" -- this is good practice as it can lead to data loss if not handled carefully.
