# Validation Summary: How to Use TS.DEL in Redis Time Series to Delete Data Points

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- Redis Time Series (RedisTimeSeries module)
- TS.DEL command (available since RedisTimeSeries 1.6.0)

## Sources Consulted
- Official Redis TS.DEL documentation: https://redis.io/docs/latest/commands/ts.del/
- Official Redis TS.RANGE documentation: https://redis.io/docs/latest/commands/ts.range/
- Official Redis TS.CREATE documentation: https://redis.io/docs/latest/commands/ts.create/

## Issues Found
1. **Incorrect time complexity description**: The post stated `TS.DEL` is "O(N) where N is the number of deleted samples plus the chunk reorganization cost." The official documentation states the complexity is simply "O(N) where N is the number of data points that will be removed" with no mention of chunk reorganization cost. Fixed to match the official documentation.

2. **Undocumented claim about chunk reorganization**: The post stated "After deletion, Redis may reorganize the underlying chunk structure." This is not mentioned in the official TS.DEL documentation. The docs do describe compaction bucket recalculation when compaction rules are defined, but not chunk-level memory reorganization. Replaced with the documented behavior: when compaction rules are defined, affected compaction buckets are recalculated or removed.

## Review Notes
- The official TS.DEL documentation notes that if `fromTimestamp` is older than the retention period compared to the maximum existing timestamp, the deletion is discarded and an error is returned. The blog post does not mention this edge case, which could be relevant for users working with retention-enabled series.
- The docs also note that explicitly deleting samples from a compacted time series (as opposed to the source series) may cause inconsistencies between raw and compacted data. This is not covered in the post.
- The `--` comment syntax used in Redis code blocks is not valid Redis syntax but is a common blog convention for annotation. Left as-is.
- All code examples (TS.CREATE, TS.ADD, TS.DEL, TS.RANGE) use correct syntax and produce accurate expected output.
- The use of `-` and `+` as special timestamp values for earliest/latest is consistent with Redis Time Series timestamp handling conventions.
