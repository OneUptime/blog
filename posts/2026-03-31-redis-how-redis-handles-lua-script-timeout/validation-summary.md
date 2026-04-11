# Validation Summary: How Redis Handles Lua Script Timeout

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (server behavior, configuration)
- Lua scripting in Redis (EVAL, SCRIPT KILL)
- Redis Functions (Redis 7+, FUNCTION LOAD, FCALL)
- Redis Slow Log monitoring

## Sources Consulted
- Redis EVAL command documentation: https://redis.io/docs/latest/commands/eval/
- Redis SCRIPT KILL command documentation: https://redis.io/docs/latest/commands/script-kill/
- Redis FUNCTION LOAD command documentation: https://redis.io/docs/latest/commands/function-load/
- Redis Lua scripting API documentation: https://redis.io/docs/latest/develop/interact/programmability/lua-api/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis source code (server.c, script.c) for exact error message strings

## Issues Found

1. **Incorrect allowed commands during script timeout (line 27)**: The post listed "SCRIPT KILL, SHUTDOWN, and INFO" as the commands accepted during script timeout. INFO is not allowed during the BUSY state. Fixed to: "SCRIPT KILL, FUNCTION KILL (Redis 7+), and SHUTDOWN NOSAVE". Also clarified that Redis rejects most commands with a BUSY error (not "begins accepting a limited set").

2. **Non-existent INFO field (lines 31-33)**: The command `redis-cli INFO server | grep lua_scripts` referenced a field `lua_scripts` that does not exist in any Redis INFO section. Script-related fields are in the `memory` section (e.g., `used_memory_scripts`, `number_of_cached_scripts`). Fixed to: `redis-cli INFO memory | grep scripts`.

3. **Incorrect UNKILLABLE error message (line 47)**: The error message said "against the server" but the actual Redis error says "against the dataset". Also included the full error message text to match actual Redis output.

4. **Misleading Redis Functions section (lines 79-86)**: The section claimed "Functions support timeout flags" which is inaccurate. Functions use the same `lua-time-limit` timeout as EVAL scripts. The relevant feature is the `no-writes` flag that declares a function as read-only, ensuring it can always be killed with FUNCTION KILL. Updated the section title, explanation, and example to demonstrate the `no-writes` flag with the table-style `redis.register_function` syntax.

## Review Notes
- The `slowlog-log-slower-than` configuration is in microseconds, so the value 1000 shown means a 1ms threshold. This is correct but could potentially confuse readers since `lua-time-limit` is in milliseconds. Not changed since it's technically accurate.
- The FUNCTION LOAD example uses inline `\n` escape sequences. This works in redis-cli per the official documentation examples, though readers may find multi-line heredoc approaches more readable for complex functions.
- The post could benefit from mentioning `busy-reply-threshold` (Redis 7.0+) as the generalized successor to `lua-time-limit`, but this is an enhancement rather than a correction.
