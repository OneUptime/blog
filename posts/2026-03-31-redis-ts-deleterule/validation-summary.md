# Validation Summary: How to Use TS.DELETERULE in Redis Time Series

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- Redis Time Series (RedisTimeSeries module)
- TS.DELETERULE command
- TS.CREATERULE command
- TS.INFO, TS.RANGE, TS.CREATE, TS.ADD commands

## Sources Consulted
- Official Redis TS.DELETERULE documentation: https://redis.io/docs/latest/commands/ts.deleterule/
- Official Redis TS.CREATERULE documentation: https://redis.io/docs/latest/commands/ts.createrule/

## Issues Found
1. **Incorrect time complexity**: The post stated "`TS.DELETERULE` is O(N) where N is the number of rules on the source series." The official Redis documentation states the time complexity is **O(1)**, and the command is categorized under the `@fast` ACL category. Fixed by replacing the O(N) claim with the correct O(1) complexity.

## Review Notes
- The error message `(error) TSDB: compaction rule does not exist` is plausible but the exact wording is not specified in the official docs (docs only say a "simple error reply" is returned). This is acceptable for illustrative purposes.
- The claim that deleting the source key with DEL removes attached rules automatically is a logical consequence of key deletion (all metadata is removed with the key), though the official docs only explicitly confirm that deleting the *destination* key automatically removes the compaction rule. The blog's statement is not incorrect but relies on implicit Redis behavior rather than documented RedisTimeSeries behavior.
- All command syntax, parameter ordering, and return values are correct per official documentation.
- The examples are well-structured and demonstrate realistic use cases.
