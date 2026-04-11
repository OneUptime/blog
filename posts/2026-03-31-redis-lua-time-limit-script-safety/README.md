# How to Configure Redis lua-time-limit for Script Safety

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Configuration, Performance

Description: Configure lua-time-limit in Redis to prevent runaway Lua scripts from blocking the server, and learn how to kill or handle long-running scripts safely.

---

Redis executes Lua scripts atomically - while a script runs, no other commands are processed. A script stuck in an infinite loop or slow computation can block your entire Redis instance. The `lua-time-limit` directive controls how long a script can run before Redis considers it problematic.

## Understanding lua-time-limit

The default value is 5000 milliseconds (5 seconds):

```text
# redis.conf
lua-time-limit 5000
```

This is not a hard timeout that kills the script. Once the limit is reached, Redis:

1. Starts logging a warning every second
2. Begins accepting `SCRIPT KILL` and `SHUTDOWN NOSAVE` commands
3. Returns `BUSY` errors to other clients trying to run commands

The script continues to run until it completes or is explicitly killed.

## Changing the Limit

You can set `lua-time-limit` in `redis.conf` or via `CONFIG SET`:

```bash
# Set to 2 seconds
redis-cli CONFIG SET lua-time-limit 2000

# Disable the limit entirely (not recommended)
redis-cli CONFIG SET lua-time-limit 0

# Verify
redis-cli CONFIG GET lua-time-limit
```

For most applications, keeping the default 5000ms is appropriate. If your scripts legitimately need longer, investigate whether they can be split into smaller operations.

## Detecting a Blocked Script

If Redis is unresponsive and you suspect a long-running script:

```bash
# From another connection
redis-cli INFO server | grep lua

# Check for BUSY errors in client output
redis-cli PING
# BUSY Redis is busy running a script. You can only call SCRIPT KILL or SHUTDOWN NOSAVE.
```

## Killing a Stuck Script

Use `SCRIPT KILL` to terminate a running script:

```bash
redis-cli SCRIPT KILL
```

`SCRIPT KILL` only works if the script has not performed any write operations. If it has written data, you cannot kill it without data loss - only `SHUTDOWN NOSAVE` will work:

```bash
# This discards all data written since the last save
redis-cli SHUTDOWN NOSAVE
```

## Writing Safe Lua Scripts

Avoid infinite loops and make scripts idempotent:

```lua
-- Bad: potential infinite loop
local i = 0
while redis.call('EXISTS', 'lock') == 1 do
  i = i + 1
end

-- Good: use a counter limit
local i = 0
while redis.call('EXISTS', 'lock') == 1 and i < 1000 do
  i = i + 1
end
```

Use `redis.call` for commands that should abort the script on error, and `redis.pcall` for handled errors:

```lua
-- redis.call raises an error and stops the script
local val = redis.call('GET', KEYS[1])

-- redis.pcall returns the error as a table instead of raising
local result = redis.pcall('GET', KEYS[1])
if type(result) == 'table' and result.err then
  -- handle error
end
```

## Testing Script Execution Time

Before deploying scripts, benchmark their execution time:

```bash
redis-cli --eval myscript.lua key1 key2 , arg1 arg2

# Check slowlog for scripts that exceeded the slowlog threshold
redis-cli SLOWLOG GET 10
```

```text
1) 1) (integer) 14
   2) (integer) 1700000000
   3) (integer) 8500
   4) 1) "EVAL"
      2) "return redis.call('KEYS', '*')"
      3) "0"
```

Keep individual scripts under 1ms where possible. For batch operations, prefer pipelining over Lua scripts.

## Summary

`lua-time-limit` sets the threshold (in milliseconds) after which Redis marks a running Lua script as slow and starts accepting `SCRIPT KILL` commands. It does not hard-terminate scripts. Keep scripts short and deterministic, test execution time before deployment, and use `SCRIPT KILL` to recover a blocked instance when the script has not written data.
