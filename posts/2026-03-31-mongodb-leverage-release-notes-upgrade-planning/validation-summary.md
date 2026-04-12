# Validation Summary: How to Leverage MongoDB Release Notes for Upgrade Planning

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (server versions 5.0, 6.0, 7.0)
- mongosh (MongoDB Shell)
- Docker (for test environments)
- systemctl / apt-get (Linux package management)
- MongoDB replica sets

## Sources Consulted
- MongoDB 6.0 Release Notes and Compatibility Changes — https://www.mongodb.com/docs/v6.0/release-notes/6.0-compatibility/
- MongoDB 5.0 Deprecations — https://www.mongodb.com/docs/v5.0/release-notes/5.0-compatibility/
- MongoDB `setFeatureCompatibilityVersion` command reference (7.0) — https://www.mongodb.com/docs/v7.0/reference/command/setFeatureCompatibilityVersion/
- MongoDB `$lookup` documentation — https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB `setParameter` command reference — https://www.mongodb.com/docs/manual/reference/command/setParameter/
- Docker Hub `mongo` image — https://hub.docker.com/_/mongo
- MongoDB `db.collection.save()` deprecation (4.2) — https://www.mongodb.com/docs/v4.2/reference/method/db.collection.save/
- MongoDB `db.collection.ensureIndex()` deprecation (3.0) — https://www.mongodb.com/docs/v3.0/reference/method/db.collection.ensureIndex/

## Issues Found

### 1. Fabricated `$lookup` compatibility change (line 38)
- **What was wrong:** The post claimed "MongoDB 6.0 compatibility changes - `$lookup` on sharded collections now requires the `localField` to match the shard key." This is not a real MongoDB 6.0 compatibility change. MongoDB 5.1+ added support for `$lookup` on sharded collections without any such shard key requirement.
- **What was changed:** Replaced with an accurate MongoDB 6.0 compatibility change: the removal of legacy wire protocol opcodes (`OP_INSERT`, `OP_DELETE`, `OP_UPDATE`, `OP_QUERY`), which requires driver upgrades.
- **Why:** The original claim could mislead users into unnecessarily restructuring their aggregation pipelines.

### 2. Incorrect deprecation version attributions (lines 44-49)
- **What was wrong:** The post listed `db.collection.save()` and `db.collection.ensureIndex()` as "MongoDB 5.0 deprecated" items. In fact, `save()` was deprecated in MongoDB 4.2 and `ensureIndex()` was deprecated in MongoDB 3.0.
- **What was changed:** Added version-accurate deprecation notes (e.g., "deprecated since 4.2", "deprecated since 3.0") to each entry.
- **Why:** Correct version attribution matters for upgrade planning — users need to know when features were actually deprecated to plan their migration timeline.

### 3. Missing `confirm: true` in `setFeatureCompatibilityVersion` (line 122)
- **What was wrong:** The command `db.adminCommand({ setFeatureCompatibilityVersion: '7.0' })` is incomplete for MongoDB 7.0. Starting in MongoDB 7.0, the `confirm: true` parameter is mandatory and the command will fail without it.
- **What was changed:** Added `confirm: true` to the command: `db.adminCommand({ setFeatureCompatibilityVersion: '7.0', confirm: true })`.
- **Why:** Without this fix, users following the guide would encounter an error during the final step of their replica set upgrade.

## Review Notes
- The Docker test setup using `mongo:7.0` with `mongosh` is correct — `mongosh` is included in MongoDB Docker images starting from 6.0.
- The `logLevel` command syntax (`db.adminCommand({ setParameter: 1, logLevel: 1 })`) is correct.
- The rolling upgrade procedure (secondaries first, step down primary, upgrade primary, then set FCV) is the correct recommended approach.
- The release notes URL `https://www.mongodb.com/docs/manual/release-notes/` is correct.
- The `apt-get install mongodb-org=7.0.x` placeholder syntax is fine for illustration, though users should substitute an actual version number (e.g., `7.0.12`).
