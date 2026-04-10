# Validation Summary: How to Implement Multi-Tenancy with Redis Databases

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (logical databases, SELECT, FLUSHDB, INFO keyspace, DBSIZE)
- Python (redis-py client library)
- Bash scripting

## Sources Consulted
- Redis official documentation on SELECT command: https://redis.io/docs/latest/commands/select/
- Redis official documentation on DBSIZE command: https://redis.io/docs/latest/commands/dbsize/
- Redis official documentation on FLUSHDB command: https://redis.io/docs/latest/commands/flushdb/
- Redis official documentation on INFO command: https://redis.io/docs/latest/commands/info/
- Redis configuration documentation (`databases` directive): https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis Cluster specification (db 0 only): https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- redis-py documentation: https://redis-py.readthedocs.io/

## Issues Found

### Issue 1: Incorrect claim that Redis has a hard limit of 16 databases
- **What was wrong:** The post stated "Redis supports up to 16 logical databases" and listed "Maximum 16 databases per instance" as a limitation, implying a hard limit. In reality, 16 is the default value of the `databases` directive in `redis.conf`, and it is configurable to a higher number.
- **What was changed:** Updated the opening paragraph to say "Redis defaults to 16 logical databases" and added a note about the `databases` config directive. Updated the limitations section to say "Defaults to 16 databases per instance (configurable via `databases` in redis.conf)".
- **Why:** Presenting a configurable default as a hard limit is technically inaccurate and could mislead readers into thinking they cannot use more than 16 databases.

### Issue 2: Monitoring script would fail due to redis-cli output format
- **What was wrong:** The script used `KEYCOUNT=$(redis-cli -n "$db" DBSIZE)` and then compared it numerically with `-gt 0`. However, `redis-cli` in its default output mode returns `(integer) N` (e.g., `(integer) 42`), not a bare number. The bash numeric comparison would fail on this string.
- **What was changed:** Added the `--raw` flag to the `redis-cli` command (`redis-cli --raw -n "$db" DBSIZE`), which outputs just the bare number without the type prefix.
- **Why:** Without `--raw`, the script would produce a bash error on the `-gt` comparison and never output any database information.

## Review Notes
- The post's advice about Redis Cluster only supporting db 0 is correct and an important caveat.
- The Python code examples use correct redis-py API calls.
- The `INFO keyspace` output format shown is accurate.
- The post could mention in the future that many managed Redis services (AWS ElastiCache, Redis Cloud, etc.) may restrict the number of available databases or only support db 0, but this is not an error in the current content.
