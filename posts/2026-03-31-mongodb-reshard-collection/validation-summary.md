# Validation Summary: How to Reshard a Collection in MongoDB 5.0+

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 5.0+
- MongoDB Sharding (reshardCollection, abortReshardCollection, commitReshardCollection)
- mongos shell commands

## Sources Consulted
- MongoDB reshardCollection command reference: https://www.mongodb.com/docs/manual/reference/command/reshardCollection/
- MongoDB resharding guide: https://www.mongodb.com/docs/manual/core/sharding-reshard-a-collection/
- MongoDB abortReshardCollection reference: https://www.mongodb.com/docs/manual/reference/command/abortReshardCollection/
- MongoDB commitReshardCollection reference: https://www.mongodb.com/docs/manual/reference/command/commitReshardCollection/
- MongoDB $currentOp aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/currentOp/
- MongoDB server source code (resharding IDL and metrics field names)

## Issues Found

1. **Incorrect `currentOp` filter field name**: The `currentOp` command and `$currentOp` aggregation both used `command.reshardCollection` to filter resharding operations. The correct field is `originatingCommand.reshardCollection`. Fixed in both the `currentOp` admin command example and the `$currentOp` aggregation pipeline.

2. **Incorrect `commitQuorum` parameter claim**: The post claimed you could pass `commitQuorum: "majority"` to `reshardCollection` to require manual commit. This parameter does not exist on `reshardCollection`. The `commitReshardCollection` command is used to force early completion (blocking writes until done), not to manually approve a quorum-gated commit. Rewrote the section to accurately describe `commitReshardCollection` as an early-commit mechanism.

3. **Misleading `_presetReshardedChunks` parameter**: The post showed `_presetReshardedChunks: []` as a production option for controlling chunk distribution. This is an internal/testing-only parameter (prefixed with underscore, documented as "only for testing purposes" in the IDL). Replaced with `numInitialChunks`, which is the supported production parameter for controlling initial chunk count, and mentioned zones as an alternative.

4. **Imprecise resharding process description**: The post said MongoDB "creates temporary recipient shards," implying new shards are provisioned. In reality, MongoDB assigns recipient roles to existing shards. Changed to "assigns recipient roles to existing shards." Also changed "donor shards" to match the official terminology.

5. **Inaccurate change streams claim**: The post said "change streams capture all writes during the clone phase." The resharding process actually uses oplog tailing (tracking `oplogEntriesFetched` and `oplogEntriesApplied`), not the public change streams API. Fixed to "oplog entries are captured during the clone phase."

6. **Summary section**: Updated "via change streams" to "via oplog replication" to match the correction above.

## Review Notes
- The `remainingOperationTimeEstimatedSecs` field name was verified as correct against the MongoDB server source code.
- The claim that cutover takes "typically under a second" could not be confirmed from official documentation, but was left as-is since it is a reasonable approximation and not explicitly contradicted.
- The minimum total duration for a resharding operation is 5 minutes according to the docs; the post does not mention this, which could be added in a future update.
- The `abortReshardCollection` command can only be used before the commit phase begins; the post does not mention this caveat.
