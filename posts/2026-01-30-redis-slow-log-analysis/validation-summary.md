# Validation Summary: How to Build Redis Slow Log Analysis

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- Redis (SLOWLOG, CONFIG SET, KEYS, SCAN, SSCAN, HSCAN, LRANGE, SMEMBERS, HGETALL, BLPOP, DEL, UNLINK, CLIENT SETNAME)
- Redis Lua scripting (`redis.call`)
- Python `redis` library (redis-py) — `slowlog_get`, `Redis()` client
- `prometheus_client` Python library (Counter, Histogram, Gauge)
- Prometheus alerting rules (YAML)
- Mermaid diagrams

## Sources Consulted
- Redis SLOWLOG documentation: https://redis.io/docs/latest/commands/slowlog-get/, https://redis.io/docs/latest/commands/slowlog-len/, https://redis.io/docs/latest/commands/slowlog-reset/
- Redis configuration reference for `slowlog-log-slower-than` and `slowlog-max-len` (defaults: 10000 microseconds and 128 entries respectively; -1 disables, 0 logs every command)
- Redis SCAN family documentation: https://redis.io/docs/latest/commands/scan/
- Redis UNLINK documentation (introduced in Redis 4.0): https://redis.io/docs/latest/commands/unlink/
- Redis CLIENT SETNAME documentation: https://redis.io/docs/latest/commands/client-setname/
- redis-py source code, `redis/_parsers/helpers.py` — `parse_slowlog_get` parser confirming dict keys `id`, `start_time`, `duration`, `command`, `client_address`, `client_name`, and that `command` is the args joined with a space
- prometheus_client Python library API for Counter/Histogram/Gauge with labels
- Prometheus alerting rule syntax for `groups`/`rules`/`expr`/`for`/`labels`/`annotations`

## Issues Found
1. **Bug in `collect_slowlog` command-name extraction.** The original code had:
   ```python
   # Extract command name (first element of args)
   command = entry['command'].upper() if entry.get('command') else 'UNKNOWN'
   ```
   The comment promised to extract the command name, but redis-py's `slowlog_get` returns the `command` field as the full command joined with its arguments (e.g. `"KEYS *session*"`), not just the verb. Calling `.upper()` on the whole string left arguments embedded in the key used by `analyze_slowlog`, which would have grouped each unique `KEYS *foo*` / `KEYS *bar*` invocation into its own bucket and broken the "top offenders" aggregation.
   
   Fixed by splitting on whitespace and taking the first token before uppercasing, matching the comment's stated intent and producing correct grouping:
   ```python
   full_command = entry.get('command', '')
   command = full_command.split(' ', 1)[0].upper() if full_command else 'UNKNOWN'
   ```
   Also reused the `full_command` local variable for the `full_command` dict key to avoid calling `entry.get('command', '')` twice.

## Review Notes
- The SLOWLOG entry layout with 6 fields (ID, timestamp, duration, command+args, client address, client name) is accurate for Redis 4.0+. Older Redis versions only return the first four fields; the blog implicitly assumes a modern Redis. The redis-py parser handles the older layout by omitting the optional keys, so the Python code remains compatible.
- The `slowlog-log-slower-than` default value of 10000 microseconds (10ms) and `slowlog-max-len` default of 128 are correct per the reference `redis.conf`.
- The claim that setting `slowlog-log-slower-than` to `-1` disables slow log and `0` logs every command is correct per Redis documentation.
- The note that `UNLINK` is asynchronous and available from Redis 4.0+ is correct.
- BLPOP timeout is in seconds (integer in pre-6.0, fractional allowed in 6.0+); the examples use integer seconds, which is universally compatible.
- The Lua-script "solution" using `SCAN` inside a Lua script will work, but readers should be aware that Lua scripts themselves run atomically and block Redis for their full duration. For very large keyspaces, executing the iteration from the client side is generally safer. This is a minor design caveat, not a technical error, so no change was made.
- The Prometheus alert rule has both `for: 5m` and an `increase(...[5m])` expression on the same alert; the rule will only fire after the spike has sustained for 5 minutes, which may be intentional but is slower to alert than readers might expect. Left as written.
