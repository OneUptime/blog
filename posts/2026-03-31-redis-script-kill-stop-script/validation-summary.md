# Validation Summary: How to Use SCRIPT KILL in Redis to Stop a Running Script

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (server and CLI)
- Redis Lua scripting (EVAL)
- Redis SCRIPT KILL command
- Redis SHUTDOWN NOSAVE command
- Redis lua-time-limit / busy-reply-threshold configuration

## Sources Consulted
- Official Redis SCRIPT KILL documentation: https://redis.io/docs/latest/commands/script-kill/
- Official Redis EVAL documentation: https://redis.io/docs/latest/commands/eval/
- Redis Programmability / Lua API documentation: https://redis.io/docs/latest/develop/interact/programmability/lua-api/
- Redis source code (script.c, script_lua.c, server.c) for exact error message strings

## Issues Found

1. **Conflated error messages (line 84)**: The post showed `UNKILLABLE No scripts in execution right now.` which incorrectly combines two completely different Redis error responses. `-NOTBUSY No scripts in execution right now.` is returned when no script is executing, while `-UNKILLABLE Sorry the script already executed write commands...` is returned when a write-performing script cannot be killed. Fixed by separating these into the correct contexts — moved the NOTBUSY message to the "check if a script is running" section and kept only the UNKILLABLE message in the unkillable section.

2. **Incorrect UNKILLABLE error message wording (lines 85-88)**: The post said "wait the script to terminate" and "in a non-graceful way" but the actual Redis error message says "wait the script termination" and "in a hard way". Fixed to match the exact Redis source code strings.

3. **"SHUTDOWN" instead of "SHUTDOWN NOSAVE" (line 37)**: The post said Redis starts accepting "SCRIPT KILL and SHUTDOWN commands" after lua-time-limit. The actual allowed commands are specifically `SCRIPT KILL`, `FUNCTION KILL`, and `SHUTDOWN NOSAVE`. Plain `SHUTDOWN` (which saves data) is not the specific variant accepted. Fixed to say "SHUTDOWN NOSAVE".

4. **Misleading INFO server advice (lines 58-61)**: The post suggested using `INFO server` and checking `redis_is_loading:0` and `blocked_clients` to detect a running Lua script. `redis_is_loading` indicates dataset loading (not script execution), and `blocked_clients` counts clients blocked on commands like BLPOP (not clients blocked by a Lua script). Replaced with the correct approach: simply running SCRIPT KILL and checking for the NOTBUSY error response.

## Review Notes
- In Redis 7.0+, the `lua-time-limit` configuration parameter was renamed to `busy-reply-threshold`. The old name still works as an alias, so the post is not technically wrong, but readers using Redis 7.0+ may want to use the newer name. This was not changed in the post since `lua-time-limit` remains functional.
- The post does not mention `FUNCTION KILL`, which is also accepted during the busy state (alongside `SCRIPT KILL` and `SHUTDOWN NOSAVE`). This is a minor omission since the post's scope is specifically about SCRIPT KILL, not Functions.
- The `CONFIG GET lua-time-limit` example shows the return as just `5000`, but Redis actually returns a two-element array: `["lua-time-limit", "5000"]`. This is a minor display simplification consistent with how Redis CLI shows config values, so it was not changed.
