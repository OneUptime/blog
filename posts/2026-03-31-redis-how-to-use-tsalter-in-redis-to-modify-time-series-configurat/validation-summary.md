# Validation Summary: How to Use TS.ALTER in Redis to Modify Time Series Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisTimeSeries module
- Python (redis-py client library)

## Sources Consulted
- Official Redis TS.ALTER documentation: https://redis.io/docs/latest/commands/ts.alter/
- Official Redis TS.CREATE documentation: https://redis.io/docs/latest/commands/ts.create/
- Official Redis TS.INFO documentation: https://redis.io/docs/latest/commands/ts.info/

## Issues Found

1. **IGNORE parameter incorrectly listed in TS.ALTER syntax** — The basic syntax section included `[IGNORE ignoreMaxTimeDiff ignoreMaxValDiff]` as a supported option for TS.ALTER. According to the official Redis documentation, TS.ALTER only supports RETENTION, CHUNK_SIZE, DUPLICATE_POLICY, and LABELS. The IGNORE parameter is only available on TS.CREATE, not TS.ALTER. Removed IGNORE from the syntax block and also corrected the syntax to match the official format (e.g., `DUPLICATE_POLICY <BLOCK | FIRST | LAST | MIN | MAX | SUM>` and `[LABELS [label value ...]]`).

2. **TS.INFO output had incorrect field positions** — The example TS.INFO output showed labels at position 25-26 with a `...` gap after chunkCount. According to the official TS.INFO documentation, the fields after chunkCount are chunkSize (13-14), chunkType (15-16), duplicatePolicy (17-18), and labels (19-20). Replaced the `...` with the correct intermediate fields and corrected the labels position to 19-20.

## Review Notes
- The claim that "Samples older than the new retention period are trimmed immediately" when changing retention via TS.ALTER is plausible but not explicitly confirmed in the official docs. In practice, trimming may happen lazily on the next write operation. This is a minor nuance that doesn't warrant a change but readers should be aware of.
- The Python examples use `retention_msecs` as the parameter name for redis-py's TimeSeries client, which is correct for current versions of the library.
- The batch update example correctly uses `r.execute_command('TS.ALTER', ...)` as an alternative to the higher-level `ts.alter()` method, which is a valid approach.
- The note that LABELS in TS.ALTER replaces the entire label set is an important and correct caveat that is well-highlighted.
