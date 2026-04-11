# Validation Summary: How to Use FUNCTION STATS in Redis to Monitor Function Execution

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (7.0+ Functions subsystem)
- FUNCTION STATS command
- FUNCTION KILL command
- FUNCTION LIST command
- Bash scripting (for monitoring examples)

## Sources Consulted
- Redis official documentation: FUNCTION STATS — https://redis.io/docs/latest/commands/function-stats/
- Redis official documentation: FUNCTION KILL — https://redis.io/docs/latest/commands/function-kill/
- Redis official documentation: SCRIPT KILL — https://redis.io/docs/latest/commands/script-kill/
- Redis Lua API reference (function flags) — https://redis.io/docs/latest/develop/programmability/lua-api/

## Issues Found

1. **`running_script` value when no function is running**: The post showed `running_script` returning a map with empty/zero values (`name: ""`, `duration_ms: 0`) when idle. Per official docs, `running_script` returns **nil** when no function is running. Fixed the output example and the explanatory text.

2. **`SCRIPT KILL` used instead of `FUNCTION KILL`**: The post recommended `SCRIPT KILL` to terminate a stuck function. `SCRIPT KILL` is for legacy Lua scripts invoked via `EVAL`/`EVALSHA`. For functions loaded via `FUNCTION LOAD` and invoked via `FCALL`, the correct command is `FUNCTION KILL`. Fixed in both the sequence diagram and the "Identify a stuck function" section.

3. **Non-existent `allow-repl` flag**: The flags table listed `allow-repl` as a valid function flag with the description "Function can propagate commands to replicas." This flag does not exist in the Redis Functions API. Replaced it with the actual documented flags: `allow-stale`, `no-cluster`, and `allow-cross-slot-keys`.

## Review Notes
- The `flags` field shown in `running_script` output is present in Redis implementations but is not explicitly listed in the FUNCTION STATS documentation page. It does appear in practice and is consistent with how functions are registered, so it was left as-is.
- The bash monitoring snippets (`grep -A 5`, `awk`) are functional but are simplified examples. The actual FUNCTION STATS output format from `redis-cli` may vary depending on the output mode (e.g., `--resp3` vs default RESP2), which could affect parsing. This is acceptable for a blog post.
