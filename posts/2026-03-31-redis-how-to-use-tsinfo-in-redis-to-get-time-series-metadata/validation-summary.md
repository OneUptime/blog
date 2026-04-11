# Validation Summary: How to Use TS.INFO in Redis to Get Time Series Metadata

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis
- RedisTimeSeries module (TS.INFO, TS.CREATE, TS.ADD commands)
- Python redis-py client library (TimeSeries interface)

## Sources Consulted
- Official Redis TS.INFO command documentation: https://redis.io/docs/latest/commands/ts.info/
- redis-py source code for TSInfo class: https://github.com/redis/redis-py/blob/master/redis/commands/timeseries/info.py

## Issues Found
No technical issues found.

## Review Notes
- The TS.INFO syntax (`TS.INFO key [DEBUG]`) is correct per official docs.
- All 12 output fields (totalSamples, memoryUsage, firstTimestamp, lastTimestamp, retentionTime, chunkCount, chunkSize, chunkType, duplicatePolicy, labels, sourceKey, rules) match the official documentation exactly.
- DEBUG mode correctly described as adding `keySelfName` and `Chunks` array with per-chunk fields (startTimestamp, endTimestamp, samples, size, bytesPerSample).
- All Python redis-py TSInfo attribute names (`total_samples`, `memory_usage`, `retention_msecs`, `first_timestamp`, `last_timestamp`, `labels`, `rules`) verified against the redis-py source code. Note: the class has legacy class-level defaults with different naming (e.g., `first_time_stamp`) but the instance attributes used at runtime match what the blog uses.
- The timestamp arithmetic in the freshness-check example is correct (converting `time.time()` to milliseconds, comparing against `last_timestamp` in ms, converting back to seconds).
- The sample `bytesPerSample` value of `"9.216"` in the DEBUG output is plausible for 3 compressed samples and is correctly shown as a string, matching Redis RESP2 behavior.
