# Validation Summary: How to Use TS.INFO in Redis Time Series to Get Metadata

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis
- RedisTimeSeries module
- TS.INFO command
- TS.CREATE, TS.ADD, TS.CREATERULE (supporting examples)
- TS.QUERYINDEX (comparison section)

## Sources Consulted
- Official Redis TS.INFO command documentation: https://redis.io/commands/ts.info/
- Official Redis TS.CREATE command documentation: https://redis.io/commands/ts.create/
- Official Redis TS.CREATERULE command documentation: https://redis.io/commands/ts.createrule/

## Issues Found

1. **Time complexity was incorrect (line 193)**: The blog stated `TS.INFO` is "O(N) where N is the number of compaction rules; typically O(1) for simple series." The official documentation states the time complexity is O(1) and the command is categorized under `@fast`. Fixed to "O(1)".

2. **chunkType values were uppercase in the fields table (line 44)**: The table listed values as "COMPRESSED or UNCOMPRESSED" but the actual returned values are lowercase `compressed` or `uncompressed` (as correctly shown in the blog's own example output). Fixed to "compressed or uncompressed".

3. **Rules output format was incorrect (lines 103-110)**: The blog showed compaction rules as nested name-value sub-arrays with keys like `"compactionKey"`, `"bucketDuration"`, and `"aggregationType"`. In RESP2 (the default redis-cli protocol), each rule is returned as a flat positional array: `[destKey, bucketDuration, aggregator]`. Fixed to show the correct flat array format.

## Review Notes
- Since RedisTimeSeries v1.8, compaction rules include a 4th element (`alignment`) in the rules array. The blog does not mention this, which is acceptable since alignment defaults to 0 and is an advanced feature. A future update could note this for completeness.
- The example output timestamps and memoryUsage values are illustrative and will differ in practice (since `*` auto-generates timestamps). This is fine for a tutorial.
- The DEBUG option description is accurate but brief. The official docs note it returns `keySelfName` and per-chunk details (`startTimestamp`, `endTimestamp`, `samples`, `size`, `bytesPerSample`). A future update could expand this section.
