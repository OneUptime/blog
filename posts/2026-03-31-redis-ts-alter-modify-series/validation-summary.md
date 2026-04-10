# Validation Summary: How to Use TS.ALTER in Redis Time Series to Modify Series

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- Redis Time Series (RedisTimeSeries module)
- TS.ALTER command

## Sources Consulted
- Official Redis TS.ALTER documentation: https://redis.io/docs/latest/commands/ts.alter/
- Official Redis TS.CREATE documentation: https://redis.io/docs/latest/commands/ts.create/
- Redis Time Series command reference: https://redis.io/docs/latest/develop/data-types/timeseries/

## Issues Found

### Issue 1: IGNORE parameter incorrectly listed in TS.ALTER syntax
- **What was wrong:** The syntax block included `[IGNORE ignoreMaxTimediff ignoreMaxValDiff]` as a valid parameter for TS.ALTER. According to the official documentation, the IGNORE parameter is only available in TS.CREATE and cannot be modified after series creation.
- **What was changed:** Removed the `[IGNORE ignoreMaxTimediff ignoreMaxValDiff]` line from the syntax block.
- **Why:** The IGNORE parameter does not exist in the TS.ALTER command specification. Including it would mislead readers into attempting to use it, resulting in an error.

### Issue 2: Incorrect claim about immediate deletion when reducing retention
- **What was wrong:** The post stated in two places that reducing retention via TS.ALTER "immediately triggers deletion of expired chunks" and "immediately causes Redis to purge data." Redis TimeSeries uses passive expiration — expired data is pruned on the next write operation (TS.ADD, TS.MADD, TS.INCRBY, TS.DECRBY), not immediately upon calling TS.ALTER.
- **What was changed:** Updated the "Reducing Retention to Save Memory" use case and the "Performance Considerations" bullet to accurately state that expired data is pruned on the next write operation.
- **Why:** The original wording could give users a false expectation that memory would be freed instantly after calling TS.ALTER with a shorter retention, when in reality the pruning is deferred until the next write.

## Review Notes
- The label replacement behavior is correctly documented — LABELS in TS.ALTER replaces the entire label set rather than merging.
- The RETENTION 0 behavior (keep data forever) is correctly documented.
- The CHUNK_SIZE behavior (only affects new chunks) is correctly documented.
- All example commands use valid syntax and correct parameter values.
- The DUPLICATE_POLICY values used (BLOCK, LAST) are valid options.
