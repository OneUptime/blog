# Validation Summary: How to Create MongoDB Hidden Index Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB hidden indexes
- MongoDB Shell / mongosh
- MongoDB query planner and explain output
- MongoDB profiling and current operations monitoring
- MongoDB sharded clusters
- MongoDB Atlas

## Sources Consulted
- MongoDB Manual: Hidden Indexes - https://www.mongodb.com/docs/manual/core/index-hidden/
- MongoDB Manual: db.collection.hideIndex() - https://www.mongodb.com/docs/manual/reference/method/db.collection.hideindex/
- MongoDB Manual: db.collection.unhideIndex() - https://www.mongodb.com/docs/manual/reference/method/db.collection.unhideindex/
- MongoDB Manual: db.collection.createIndex() - https://www.mongodb.com/docs/manual/reference/method/db.collection.createindex/
- MongoDB Manual: $indexStats - https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexstats/
- MongoDB Manual: Measure Index Use - https://www.mongodb.com/docs/manual/tutorial/measure-index-use/
- MongoDB Manual: $currentOp - https://www.mongodb.com/docs/manual/reference/operator/aggregation/currentop/
- MongoDB Manual: db.currentOp() - https://www.mongodb.com/docs/manual/reference/method/db.currentop/
- MongoDB Manual: Manage Indexes - https://www.mongodb.com/docs/manual/tutorial/manage-indexes/
- MongoDB Manual: Shard Key Indexes - https://www.mongodb.com/docs/manual/core/sharding-shard-key-indexes/
- MongoDB Atlas CLI: atlas clusters indexes - https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-indexes/
- MongoDB Atlas: Review Drop Index Recommendations - https://www.mongodb.com/docs/atlas/performance-advisor/drop-indexes/

## Issues Found
- The prerequisites only mentioned MongoDB 4.4 or later. I clarified that hidden indexes were introduced in MongoDB 4.4, but the deployment must also satisfy the required `featureCompatibilityVersion` for its MongoDB release, and added a shell command to check FCV.
- The post omitted the `_id` restriction in the prerequisites. I added that the default `_id` index cannot be hidden.
- The introductory diagram and query-plan section implied that hiding an index always causes a collection scan. I changed the diagram to use "Alternative Plan" and clarified that a collection scan is one possible outcome when no other suitable index exists.
- The monitoring snippets used `db.currentOp()`. Because current MongoDB documentation recommends `$currentOp` for modern versions, I replaced those examples with an `admin` database aggregation using `$currentOp`.
- The sharded-cluster section recommended hiding the index on one shard first. That can create inconsistent index options across shards, so I changed the guidance to hide through `mongos` and noted the shard-key-supporting index restriction.
- The Atlas CLI example used an unsupported `atlas clusters indexes update ... --hidden true` command shape for hiding an existing standard index. I replaced it with Atlas UI / `mongosh` guidance.
- The `$indexStats` explanation said zero operations "since creation." I corrected this to the reported `since` timestamp and added the node-local and reset caveats.
- The final workflow printed "since restart" for `$indexStats`. I changed it to print the actual `accesses.since` value.

## Review Notes
The core `hideIndex()`, `unhideIndex()`, `createIndex(..., { hidden: true })`, `getIndexes()`, `explain("executionStats")`, profiler, and `dropIndex()` examples are technically valid for mongosh. The automated script is a lightweight before/after check rather than a full-duration production monitoring system; future improvements could make `durationMinutes` actively drive repeated sampling.
