# Validation Summary: How to Use New Features in MongoDB 7.0 (Compound Wildcard Indexes, AutoMerger)

## Status
validated

## Post Type
Tutorial / Feature overview

## Technologies Covered
- MongoDB 7.0
- Compound Wildcard Indexes
- AutoMerger (sharded cluster chunk management)
- mongosh shell helpers

## Sources Consulted
- [Compound Wildcard Indexes - MongoDB Manual](https://www.mongodb.com/docs/manual/core/indexes/index-types/index-wildcard/index-wildcard-compound/)
- [Wildcard Index Restrictions - MongoDB Manual](https://www.mongodb.com/docs/manual/core/indexes/index-types/index-wildcard/reference/restrictions/)
- [Wildcard Indexes - MongoDB Manual v4.2 (original introduction)](https://www.mongodb.com/docs/v4.2/core/index-wildcard/)
- [The AutoMerger - MongoDB Manual](https://www.mongodb.com/docs/manual/core/automerger-concept/)
- [sh.disableAutoMerger() - MongoDB Manual](https://www.mongodb.com/docs/manual/reference/method/sh.disableautomerger/)
- [sh.stopAutoMerger() - MongoDB Manual](https://www.mongodb.com/docs/manual/reference/method/sh.stopautomerger/)
- [mergeAllChunksOnShard - MongoDB Manual](https://www.mongodb.com/docs/manual/reference/command/mergeallchunksonshard/)
- [Release Notes for MongoDB 7.0](https://www.mongodb.com/docs/manual/release-notes/7.0/)
- [configureCollectionBalancing - MongoDB Manual v7.0](https://www.mongodb.com/docs/v7.0/reference/command/configurecollectionbalancing/)
- [mongorestore - MongoDB Database Tools](https://www.mongodb.com/docs/database-tools/mongorestore/)

## Issues Found

1. **Wildcard indexes introduction version was wrong**: The post stated "MongoDB 6.0 introduced wildcard indexes." Wildcard indexes were actually introduced in MongoDB 4.2. Fixed to "MongoDB 4.2."

2. **Compound wildcard index position restriction was incorrect**: The post claimed "The wildcard component must be a suffix in the compound index (not the leading field)." In reality, the wildcard term can appear in any position within the compound index. The actual restriction is that only one wildcard term is allowed. Replaced with the correct limitation.

3. **Array fields limitation was misleading**: The post stated "Compound wildcard indexes cannot include array fields alongside the wildcard." The actual restriction is that the non-wildcard fields cannot be multikey (array-valued). The wildcard portion itself can index into arrays. Corrected the wording.

4. **Covered queries claim was incorrect**: The post stated "Covered queries are not supported for the wildcard portion." Covered queries are actually supported under specific conditions (single wildcard field in predicate, explicit `_id` exclusion, field is never an array). Corrected to describe the actual conditions.

5. **`autoMergerStatus` command does not exist**: The post showed `db.adminCommand({ autoMergerStatus: 1 })` to check AutoMerger status. This command does not exist in MongoDB. Removed this fabricated command.

6. **`configureAutoMerger` command does not exist**: The post showed `db.adminCommand({ configureAutoMerger: 1, enable: false })` to disable AutoMerger globally. This command does not exist. The correct method is `sh.stopAutoMerger()`. Replaced with the correct commands.

7. **"Additional Highlights" section contained inaccurate claims**:
   - "$lookup pushes $match inside the lookup pipeline" — This optimization predates MongoDB 7.0. Replaced with the accurate 7.0 highlight about SBE supporting more aggregation stages.
   - "Time series collections gain secondary index support on non-time and non-metadata fields" — This was introduced in MongoDB 6.0, not 7.0. Replaced with the actual 7.0 time series enhancement (TTL index with partialFilterExpression on metaField).
   - "--numInsertionWorkersPerCollection flag" — This flag predates MongoDB 7.0 and only applies to mongorestore (not mongodump). Replaced with an accurate 7.0 highlight.

## Review Notes
- The `mergeAllChunksOnShard` command syntax appears correct based on available documentation.
- The compound wildcard index creation syntax and explain() usage are correct.
- The overall structure and explanation of why these features matter is accurate and well-written.
