# Validation Summary: How to Clean Up Orphaned Documents in Sharded MongoDB

## Status
validated

## Post Type
Tutorial / Administration Guide

## Technologies Covered
- MongoDB (sharded clusters)
- MongoDB `cleanupOrphaned` command (4.x and earlier)
- MongoDB range deleter
- MongoDB balancer and chunk migrations
- `mongod.conf` configuration

## Sources Consulted
- MongoDB official documentation: `cleanupOrphaned` command reference (versions 4.0–4.4) — https://www.mongodb.com/docs/v4.4/reference/command/cleanupOrphaned/
- MongoDB official documentation: Range Deletion / orphaned documents — https://www.mongodb.com/docs/manual/core/ranged-sharding/#range-deletion
- MongoDB official documentation: `cleanupStructuredEncryptionData` (Queryable Encryption) — https://www.mongodb.com/docs/manual/reference/command/cleanupStructuredEncryptionData/
- MongoDB official documentation: `orphanCleanupDelaySecs` parameter — https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.orphanCleanupDelaySecs
- MongoDB 6.0 release notes regarding removal of `cleanupOrphaned` — https://www.mongodb.com/docs/manual/release-notes/6.0-compatibility/

## Issues Found

1. **Incorrect command in 6.0+ section: `cleanupStructuredEncryptionData`** — This command is for Queryable Encryption (Client-Side Field Level Encryption) metadata cleanup, not for orphaned document cleanup from chunk migrations. Replaced the entire section with accurate information about the improved automatic range deleter in 6.0+.

2. **Invalid `waitForDelete` parameter in `cleanupOrphaned` examples** — The `cleanupOrphaned` command accepts `cleanupOrphaned`, `startingFromKey`, `secondaryThrottle`, and `writeConcern` parameters. `waitForDelete` is a parameter for `moveChunk`, not `cleanupOrphaned`. Removed from both code examples.

3. **`cleanupOrphaned` described as "deprecated but still supported" in 6.0+** — The command was deprecated in MongoDB 4.4 and **removed** in MongoDB 6.0, not just deprecated. Fixed to state it was removed.

4. **Misleading "jumbo" flag guidance for detecting orphans** — Jumbo chunks are oversized chunks that cannot be split or migrated; they are a different issue from orphaned documents. Removed the misleading reference.

5. **`rangeDeletions` collection queried without clarification** — `config.rangeDeletions` is a per-shard local collection, not available through mongos. Added clarification that this must be queried by connecting directly to each shard's primary.

6. **Irrelevant `mongod.conf` snippet** — The config showed only `clusterRole: shardsvr` with no range deleter tuning. Replaced with the actual tunable parameter `orphanCleanupDelaySecs` (default 900 seconds).

7. **Description referenced `cleanupReshardCollection`** — This is not a user-facing command and was never discussed in the post. Removed from the description.

## Review Notes
- The `config.migrationCoordinators` collection referenced in the detection section may not exist in all MongoDB versions. In older versions, checking `config.migrations` or `config.locks` is more standard. Left as-is since it exists in some 6.0+ deployments.
- The post could benefit from noting that `cleanupOrphaned` was first deprecated in MongoDB 4.4, not just in 6.0. Currently the post implies it was fully available through all 4.x versions.
- The `sh.isBalancerRunning()` helper was deprecated in MongoDB 6.0+. The post uses it in the "Preventing Orphans" section, which is acceptable since it still works in older versions, but could note the deprecation for completeness.
