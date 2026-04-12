# Validation Summary: How to Optimize MongoDB Atlas Costs

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB Atlas (cluster management, auto-scaling, Online Archive, backup)
- MongoDB Atlas Admin API v1.0
- WiredTiger storage engine (block compression with zstd)
- MongoDB shell commands (`createCollection`, `compact`)

## Sources Consulted
- MongoDB Atlas Admin API documentation: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/
- MongoDB Atlas Auto-Scaling documentation: https://www.mongodb.com/docs/atlas/cluster-autoscaling/
- MongoDB `collMod` command reference: https://www.mongodb.com/docs/manual/reference/command/collMod/
- MongoDB `createCollection` command reference: https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB `compact` command reference: https://www.mongodb.com/docs/manual/reference/command/compact/
- MongoDB WiredTiger compression documentation: https://www.mongodb.com/docs/manual/reference/glossary/#std-term-WiredTiger
- MongoDB Atlas Online Archive documentation: https://www.mongodb.com/docs/atlas/online-archive/configure-online-archive/
- MongoDB Atlas Backup documentation: https://www.mongodb.com/docs/atlas/backup/cloud-backup/overview/

## Issues Found

### Issue 1: Misleading curl command in Step 4 (Compression)
**What was wrong:** The first code block in Step 4 was labeled "Change cluster storage compression" but the actual API payload modified `mongoDBMajorVersion` and `replicationSpecs` — neither of which relates to compression. This would confuse readers into thinking this API call enables compression when it does not.
**What was changed:** Removed the misleading curl command entirely and replaced the section with a clearer explanation focused on collection-level compression.

### Issue 2: Incorrect use of `collMod` to change compression
**What was wrong:** The post used `db.runCommand({ collMod: "events", storageEngine: { wiredTiger: { configString: "block_compressor=zstd" } } })` to change compression on an existing collection. The `collMod` command does not support modifying `storageEngine` options — the `storageEngine` configuration is only accepted at collection creation time via `db.createCollection()`. This command would fail with an error.
**What was changed:** Replaced with `db.createCollection()` for new collections with zstd compression, and added a `compact` command approach for recompressing existing collections using the server's default compressor.

### Issue 3: Reversed backup retention values
**What was wrong:** The daily backup retention line read "Daily: 7 days -> 30 days (reduce to 7 if RPO allows)" which is contradictory — it shows an increase from 7 to 30 days while the section is about reducing retention. The values were reversed.
**What was changed:** Corrected to "Daily: 30 days -> 7 days (reduce if RPO allows)" to properly show a reduction.

## Review Notes
- The Atlas Admin API v1.0 endpoints used throughout the post are correct, though MongoDB has been migrating toward v2.0 of the Atlas Admin API. The v1.0 endpoints remain functional but readers should be aware that v2.0 is the latest version.
- The Online Archive pricing claim of "roughly 1/10th the cost of cluster storage" is a reasonable approximation but actual ratios depend on the cluster tier and cloud provider. Readers should check current Atlas pricing for exact figures.
- The `compact` command approach for recompressing existing collections requires sufficient disk space for the operation and will block other operations on the collection. A note about this operational consideration could be helpful in future revisions.
- The auto-scaling API payload uses the v1.0 format. In the v2.0 API, the cluster configuration schema has changed (e.g., `providerSettings` is restructured). The v1.0 format shown is still valid.
