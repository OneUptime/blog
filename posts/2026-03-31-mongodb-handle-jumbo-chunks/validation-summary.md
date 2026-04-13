# Validation Summary: How to Handle Jumbo Chunks in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (sharding, chunk management, balancer)
- MongoDB Shell (`mongosh` / `mongo`)
- `mongoexport` / `mongoimport` CLI tools
- `reshardCollection` admin command

## Sources Consulted
- MongoDB Documentation: Sharding — Chunks (https://www.mongodb.com/docs/manual/core/sharding-data-partitioning/)
- MongoDB Documentation: `sh.splitAt()` (https://www.mongodb.com/docs/manual/reference/method/sh.splitAt/)
- MongoDB Documentation: `sh.moveChunk()` (https://www.mongodb.com/docs/manual/reference/method/sh.moveChunk/)
- MongoDB Documentation: `reshardCollection` (https://www.mongodb.com/docs/manual/reference/command/reshardCollection/)
- MongoDB Documentation: `unshardCollection` (https://www.mongodb.com/docs/manual/reference/command/unshardCollection/)
- MongoDB Documentation: `mongoexport` (https://www.mongodb.com/docs/database-tools/mongoexport/)
- MongoDB Documentation: `mongoimport` (https://www.mongodb.com/docs/database-tools/mongoimport/)
- MongoDB Documentation: Manage Jumbo Chunks (https://www.mongodb.com/docs/manual/tutorial/manage-sharded-cluster-balancer/)

## Issues Found

1. **`sh.splitAt` split point included non-shard-key field**: The example used `{ category: "electronics", _id: ObjectId("...") }` as the split point, but the shard key in all examples is `{ category: 1 }`. The split point must consist only of shard key fields. Fixed to `{ category: "furniture" }` to match the shard key definition.

2. **Incorrect version claim for `unshardCollection`**: The post stated "MongoDB 5.0+ supports unshard collection and resharding." The `unshardCollection` command was introduced in MongoDB 8.0, not 5.0. Only `reshardCollection` was introduced in 5.0. Removed the incorrect unshard claim.

3. **Wrong version in `reshardCollection` comment**: The code comment said "MongoDB 7.0+ resharding" but `reshardCollection` was introduced in MongoDB 5.0. Fixed the comment to say "MongoDB 5.0+".

4. **Missing `--db` flag in `mongoexport`/`mongoimport` commands**: Both commands were missing the `--db` flag, which means they would target the default `test` database instead of the intended database. Added `--db myapp` to both commands for correctness.

## Review Notes
- The default chunk size of 128 MB is correct for MongoDB 6.0.3+. For versions prior to 6.0.3, the default was 64 MB. Since the post targets modern MongoDB, the stated value is acceptable.
- Starting in MongoDB 5.0, the `config.chunks` collection uses `uuid` instead of `ns` to identify collections. The queries filtering by `ns` (detect jumbo chunks, clear jumbo flag) work on older versions but may not work on 5.0+. For 5.0+, the recommended approach to clear the jumbo flag is the `clearJumboFlag` admin command (introduced in 4.4).
- Starting in MongoDB 6.0.3, the balancer no longer relies on the `jumbo` flag to determine chunk migration eligibility; it uses the chunk size relative to the configured maximum instead. The `jumbo` field queries are most applicable to pre-6.0.3 deployments.
- Moving a jumbo chunk with `sh.moveChunk()` may fail if the chunk exceeds the configured maximum chunk size. In practice, you may need to temporarily increase the chunk size limit before the move succeeds. The post does not mention this caveat.
