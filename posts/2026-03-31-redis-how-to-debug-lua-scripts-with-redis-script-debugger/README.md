# How to Debug Lua Scripts with Redis Script Debugger

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Debugging, Script Debugger, Development

Description: Use the Redis Lua script debugger (redis-cli --ldb) to set breakpoints, inspect variables, and step through Lua scripts interactively.

---

## Overview of the Redis Lua Script Debugger

Redis 3.2 introduced a built-in Lua script debugger (LDB) accessible via `redis-cli --ldb`. It lets you:

- Set breakpoints inside Lua scripts
- Step through execution line by line
- Inspect local variables and Redis key values
- Print debug output with `redis.debug()`

The debugger runs in a forked child process so it does not block the production server, but it does use a real Redis connection and key namespace.

## Step 1 - Start the Debugger

```bash
redis-cli --ldb --eval /path/to/script.lua key1 key2 , arg1 arg2
```

The `,` separates keys from arguments (similar to how `EVAL` separates keys and args, but using a comma instead of a numkeys count). Example:

```bash
redis-cli --ldb --eval ratelimit.lua user:123 , 100 60
```

You will see the debugger prompt:

```text
Lua debugging session started, please use:
quit    -- End the session.
restart -- Restart the script in debug mode again.
help    -- Show Lua script debugger's help.

* Stopped at 1, stop reason = step over
-> 1   local key = KEYS[1]
lua debugger>
```

## Step 2 - Debugger Commands

```text
step (s)   - Execute next line
next (n)   - Step over (execute line without entering function)
continue (c) - Continue until next breakpoint or end
break (b) N  - Set breakpoint at line N
print (p) [var] - Print variable or all locals
redis <cmd> - Execute a Redis command
list (l)   - Show current script with line numbers
restart    - Restart the script in debug mode
quit       - Exit debugger
```

## Step 3 - Step Through a Script

Given this rate limiting script (`ratelimit.lua`):

```lua
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call('INCR', key)

if current == 1 then
    redis.call('EXPIRE', key, window)
end

if current > limit then
    return 0
end

return current
```

Debugger session:

```text
lua debugger> list
-> 1   local key = KEYS[1]
   2   local limit = tonumber(ARGV[1])
   3   local window = tonumber(ARGV[2])
   4
   5   local current = redis.call('INCR', key)
   ...

lua debugger> step
* Stopped at 2, stop reason = step over
-> 2   local limit = tonumber(ARGV[1])

lua debugger> step
* Stopped at 3, stop reason = step over
-> 3   local window = tonumber(ARGV[2])

lua debugger> step
* Stopped at 5, stop reason = step over
-> 5   local current = redis.call('INCR', key)

lua debugger> print key
<value> "user:123"

lua debugger> step
* Stopped at 7, stop reason = step over
-> 7   if current == 1 then

lua debugger> print current
<value> 1
```

## Step 4 - Set Breakpoints

```text
lua debugger> break 10
   Added breakpoint: line 10

lua debugger> continue
* Stopped at 10, stop reason = break point
-> 10  if current > limit then
```

## Step 5 - Inspect Redis State Mid-Execution

You can run Redis commands from within the debugger to inspect the current state:

```text
lua debugger> redis GET user:123
<reply> "5"

lua debugger> redis TTL user:123
<reply> (integer) 55
```

## Step 6 - Add Debug Output in Scripts

Use `redis.debug()` to print values at specific points without pausing execution:

```lua
local key = KEYS[1]
local current = redis.call('INCR', key)
redis.debug('current value', current, 'key', key)
```

In LDB mode, `redis.debug()` prints to the debugger console. In production mode, it is a no-op (does not affect performance).

## Step 7 - Use Synchronous Debugging Mode (ldb-sync)

By default, LDB uses a forked child so the script runs on a copy of the dataset. Use `--ldb-sync-mode` to debug against the actual dataset:

```bash
redis-cli --ldb-sync-mode --eval script.lua mykey , myarg
```

**Warning:** In sync mode, the script modifies real data and blocks other clients during debugging. Use only in a development Redis instance.

## Step 8 - Async LDB (Default) for Safety

The default `--ldb` mode forks a child process and copies the current dataset to the child. Changes made during debugging do not affect the real dataset. The copy is discarded when you quit.

This is safe for production troubleshooting but means changes you see in the debugger are not persisted.

## Summary

The Redis Lua script debugger provides a full interactive debugging experience with breakpoints, variable inspection, and Redis command execution from within the debug session. Use `redis-cli --ldb --eval` to start, `step` to advance line by line, `print` to inspect variables, and `redis` to query key state mid-execution. Add `redis.debug()` calls to scripts for lightweight non-blocking debug output.
