# How Redis Handles Lua Script Timeout

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Scripting

Description: Learn how Redis enforces Lua script timeouts, what happens when a script exceeds the limit, and how to handle long-running scripts safely.

---

Redis Lua scripts run atomically and block all other commands while executing. If a script runs too long, Redis enters a special "script timeout" state that has significant operational implications. Understanding this behavior is essential for safe Lua script design.

## The Default Script Timeout

Redis has a configurable maximum script execution time. By default it is 5 seconds:

```bash
redis-cli CONFIG GET lua-time-limit
# Default: 5000 (milliseconds)
```

## What Happens When the Limit Is Exceeded

When a Lua script exceeds `lua-time-limit`:
1. Redis starts logging a warning
2. Redis begins rejecting most commands with a BUSY error, but accepts SCRIPT KILL, FUNCTION KILL (Redis 7+), and SHUTDOWN NOSAVE
3. The script continues running - the timeout does not forcibly stop it

Redis does NOT automatically terminate the script at the timeout. The timeout only enables admin intervention.

```bash
# Check script memory usage
redis-cli INFO memory | grep scripts
```

## Killing a Running Script

If a script is hung, kill it:

```bash
redis-cli SCRIPT KILL
```

This works only if the script has not yet performed any write operations. If the script has already written data, SCRIPT KILL returns an error because killing it midway would leave data in an inconsistent state:

```text
(error) UNKILLABLE Sorry the script already executed write commands against the dataset. You can either wait the script termination or kill the server in a hard way using the SHUTDOWN NOSAVE command.
```

In that case, your only option is SHUTDOWN NOSAVE (which loses data since the last save):

```bash
redis-cli SHUTDOWN NOSAVE
```

## Designing Scripts That Respect Timeout

Keep Lua scripts short and focused. Avoid loops that could run indefinitely:

```lua
-- Bad: can loop forever
local cursor = "0"
repeat
  local result = redis.call("SCAN", cursor, "MATCH", ARGV[1], "COUNT", 1000000)
  cursor = result[1]
until cursor == "0"

-- Better: limit iterations
local cursor = "0"
local iterations = 0
repeat
  local result = redis.call("SCAN", cursor, "MATCH", ARGV[1], "COUNT", 100)
  cursor = result[1]
  iterations = iterations + 1
  if iterations > 100 then break end
until cursor == "0"
```

## Redis 7+ Functions and Script Timeout

Redis 7 introduced Functions as a replacement for EVAL scripts. Functions are subject to the same `lua-time-limit` timeout. You can declare a function as read-only with the `no-writes` flag, which ensures it can always be killed with FUNCTION KILL even after execution begins:

```bash
redis-cli FUNCTION LOAD "#!lua name=mylib\nredis.register_function{function_name='myfunc', callback=function(keys, args) return 'ok' end, flags={'no-writes'}}"
redis-cli FCALL myfunc 0
```

## Monitoring Script Execution

Track script execution time via the slow log:

```bash
redis-cli CONFIG SET slowlog-log-slower-than 1000
redis-cli SLOWLOG GET 10
```

## Summary

Redis Lua scripts have a configurable timeout (default 5 seconds) that does not kill the script but enables admin intervention via SCRIPT KILL. Scripts that have written data cannot be killed without SHUTDOWN NOSAVE. Design scripts to complete quickly, avoid unbounded loops, and use the slow log to detect scripts that approach the timeout threshold.
