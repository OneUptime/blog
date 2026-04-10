# What Does 'BUSY Redis is busy running a script' Mean

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Scripting, Error, Debugging

Description: Understand the Redis BUSY error that occurs when a long-running Lua script blocks the server, and how to terminate it safely with SCRIPT KILL.

---

The `BUSY Redis is busy running a script. You can only call SCRIPT KILL or SHUTDOWN NOSAVE.` error means a Lua script has been running on the Redis server for longer than the configured timeout. Redis is single-threaded for script execution, so a long-running script blocks all other commands.

## What Causes the Error

By default, Redis allows scripts to run for up to 5 seconds (`lua-time-limit 5000` ms). If a script exceeds this limit, Redis starts returning the BUSY error to all clients except for `SCRIPT KILL` and `SHUTDOWN NOSAVE`.

The script keeps running even after the timeout; Redis just starts refusing other commands.

```bash
127.0.0.1:6379> GET mykey
(error) BUSY Redis is busy running a script. You can only call SCRIPT KILL or SHUTDOWN NOSAVE.
```

## Terminating the Script

Use `SCRIPT KILL` to terminate a script that has not yet performed any write operations:

```bash
127.0.0.1:6379> SCRIPT KILL
OK
```

If the script has already written data, `SCRIPT KILL` will fail to protect data integrity:

```bash
127.0.0.1:6379> SCRIPT KILL
(error) UNKILLABLE Sorry the script already executed write commands against the dataset. You can either wait the script termination or kill the server in a hard way using the SHUTDOWN NOSAVE command.
```

In that case, your only safe option is:

```bash
127.0.0.1:6379> SHUTDOWN NOSAVE
```

This shuts down Redis without saving, so unsaved data since the last snapshot or AOF append will be lost.

## Identifying Slow Scripts

Use `SLOWLOG` to review recently slow commands:

```bash
127.0.0.1:6379> SLOWLOG GET 10
```

Use `DEBUG SLEEP` in testing to simulate a long-running script:

```bash
127.0.0.1:6379> EVAL "redis.call('DEBUG', 'SLEEP', 10) return 1" 0
```

## Configuring the Script Timeout

In `redis.conf`, adjust the Lua time limit:

```text
lua-time-limit 5000
```

Setting it lower causes Redis to report BUSY sooner. Setting it to `0` disables the safety timeout, which is dangerous for production.

## Writing Safe Lua Scripts

Avoid infinite loops and unbounded iterations in Lua scripts.

```lua
-- Dangerous: iterates all keys
local keys = redis.call('KEYS', '*')
for _, k in ipairs(keys) do
  redis.call('DEL', k)
end
```

Instead, use cursor-based scanning and process in batches from the application side.

```python
import redis

r = redis.Redis()

cursor = 0
while True:
    cursor, keys = r.scan(cursor, match='prefix:*', count=100)
    if keys:
        r.delete(*keys)
    if cursor == 0:
        break
```

## Monitoring Script Execution Time

```bash
127.0.0.1:6379> INFO commandstats
# Look for: cmdstat_eval, cmdstat_evalsha (calls, usec, usec_per_call)
```

Add `redis.log` calls inside scripts to help diagnose slow paths:

```lua
redis.log(redis.LOG_WARNING, "Starting expensive operation")
local result = redis.call('HGETALL', KEYS[1])
redis.log(redis.LOG_WARNING, "Done")
return result
```

## Summary

The BUSY error means a Lua script has run past the `lua-time-limit` threshold. Use `SCRIPT KILL` to terminate read-only scripts, and avoid write-heavy or unbounded loops in Lua. For large data operations, prefer cursor-based iteration from the application layer instead of a single long-running script.
