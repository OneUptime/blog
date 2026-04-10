# Validation Summary: Redis vs Cassandra for Time-Series Data

## Status
validated

## Post Type
Comparison Guide / Tutorial

## Technologies Covered
- Redis (Sorted Sets, RedisTimeSeries module)
- Redis Stack
- Apache Cassandra (CQL, TimeWindowCompactionStrategy)
- Python redis-py client library
- Python cassandra-driver client library

## Sources Consulted
- Redis ZADD documentation: https://redis.io/docs/latest/commands/zadd/
- Redis ZRANGEBYSCORE documentation: https://redis.io/docs/latest/commands/zrangebyscore/
- Redis TS.CREATE documentation: https://redis.io/docs/latest/commands/ts.create/
- Redis TS.ADD documentation: https://redis.io/docs/latest/commands/ts.add/
- Redis TS.RANGE documentation: https://redis.io/docs/latest/commands/ts.range/
- redis-py TimeSeries commands source: https://github.com/redis/redis-py/blob/master/redis/commands/timeseries/commands.py
- Apache Cassandra CQL CREATE TABLE documentation: https://cassandra.apache.org/doc/latest/cql/ddl.html
- Cassandra TimeWindowCompactionStrategy documentation: https://cassandra.apache.org/doc/latest/operating/compaction/twcs.html
- Python cassandra-driver documentation: https://docs.datastax.com/en/developer/python-driver/latest/

## Issues Found
1. **Incorrect `ts.range()` `to_time` parameter in Python RedisTimeSeries example (line 50)**
   - **What was wrong:** The code used `ts.range("temperature:sensor42", 0, -1)`. The `-1` value is not a valid sentinel for "latest timestamp" in the RedisTimeSeries protocol. It would be interpreted as literal timestamp -1 (before epoch), resulting in an empty or invalid range since `from_time` (0) would be greater than `to_time` (-1).
   - **What was changed:** Replaced with `ts.range("temperature:sensor42", "-", "+")`, where `"-"` means the earliest possible timestamp and `"+"` means the latest. This matches the `TS.RANGE key - +` CLI syntax and is the documented approach in redis-py.
   - **Why:** The original code would return no results or raise an error. The fix uses the correct special string values documented in the RedisTimeSeries specification.

## Review Notes
- `ZRANGEBYSCORE` has been deprecated since Redis 6.2.0 in favor of `ZRANGE ... BYSCORE`. The command still functions, but new code should prefer `ZRANGE cpu:server1 1699999800 1700000100 BYSCORE`. Since the post does not target a specific Redis version and the command remains functional, this was not changed.
- The Python code uses `datetime.utcnow()` which is deprecated since Python 3.12 in favor of `datetime.now(datetime.timezone.utc)`. This was not changed as the blog focuses on Cassandra/Redis concepts rather than Python best practices, and the deprecated method still works.
- The `from redis.commands.timeseries import TimeSeries` import in the Python Redis example is unused (the TimeSeries instance is obtained via `client.ts()`). Not changed as it serves to show readers which module is being used.
- The `client` variable in the Redis Python example is not defined in the snippet. This appears intentional as a code snippet rather than a complete program, so it was not changed.
- The comparison table's throughput numbers (~100K writes/sec for Redis, millions/sec for Cassandra) are reasonable ballpark figures that depend heavily on hardware and configuration. They are directionally correct.
