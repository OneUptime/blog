# Validation Summary: How to Perform Rolling Maintenance on a MongoDB Replica Set

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- MongoDB (replica sets, rolling maintenance, index builds)
- mongosh (MongoDB Shell)
- systemctl (Linux service management)
- Bash scripting (automation)

## Sources Consulted
- MongoDB Manual: Perform Maintenance on Replica Set Members — https://www.mongodb.com/docs/manual/tutorial/perform-maintence-on-replica-set-members/
- MongoDB Manual: rs.stepDown() — https://www.mongodb.com/docs/manual/reference/method/rs.stepDown/
- MongoDB Manual: db.hello() — https://www.mongodb.com/docs/manual/reference/method/db.hello/
- MongoDB Manual: Build Indexes on Replica Sets (Rolling Index Builds) — https://www.mongodb.com/docs/manual/tutorial/build-indexes-on-replica-sets/
- MongoDB Manual: rs.isMaster() Deprecation — https://www.mongodb.com/docs/manual/reference/method/rs.isMaster/
- MongoDB Manual: Index Build Process — https://www.mongodb.com/docs/manual/core/index-creation/

## Issues Found

1. **Deprecated `rs.isMaster()` usage**: The post used `rs.isMaster().ismaster` to check if a node is a secondary. `rs.isMaster()` has been deprecated since MongoDB 5.0. Replaced with `db.hello().isWritablePrimary`.

2. **Incorrect rolling index build procedure**: The post instructed readers to connect to each secondary and run `createIndex()` directly. Secondaries in a replica set are read-only and do not accept write operations like `createIndex()`. The correct rolling index build procedure involves stopping each secondary, restarting it as a standalone instance (without `--replSet`), building the index, then restarting it as a replica set member. Rewrote the section with the correct procedure.

3. **Wrong `background: true` deprecation version and misleading replacement advice**: The post stated `background: true` was "deprecated in 4.4+" and suggested using the "hidden index pattern instead." The `background` option was actually deprecated in MongoDB 4.2 (not 4.4). Hidden indexes serve a different purpose (evaluating the impact of dropping an index) and are not a replacement for background builds. Corrected the version and replaced the advice with an accurate explanation that MongoDB 4.2+ uses an optimized build process by default.

4. **SSH with host:port in automation script**: The script used `ssh "$MEMBER"` where `$MEMBER` contained a host:port value like `"secondary1:27017"`. SSH requires just a hostname, not a host:port pair. Added `HOST="${MEMBER%%:*}"` to extract the hostname before passing it to `ssh`.

## Review Notes
- The overall rolling maintenance procedure (update secondaries first, step down primary, update former primary) is correct and follows MongoDB best practices.
- The `rs.stepDown(60)` usage and election timing estimates (~10-30 seconds) are accurate.
- The automation script is illustrative but would need additional error handling for production use (e.g., checking that the new primary is not the same as the old primary before the final maintenance step, handling cases where election takes longer than 30 seconds).
