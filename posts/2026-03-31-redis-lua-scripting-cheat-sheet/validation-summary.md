# Validation Summary: Redis Lua Scripting Cheat Sheet

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- Redis (EVAL, EVALSHA, SCRIPT commands, FUNCTION)
- Lua scripting within Redis
- cjson library for JSON handling in Redis Lua

## Sources Consulted
- Redis Lua API reference: https://redis.io/docs/latest/develop/programmability/lua-api/
- Redis EVAL command documentation: https://redis.io/docs/latest/commands/eval/
- Redis scripting with Lua introduction: https://redis.io/docs/latest/develop/programmability/eval-intro/
- Redis FUNCTION LOAD documentation: https://redis.io/docs/latest/commands/function-load/
- Redis SCRIPT FLUSH documentation: https://redis.io/docs/latest/commands/script-flush/

## Issues Found

### 1. Incorrect `redis.pcall()` return value unpacking
- **Location**: "Redis Calls in Lua" section
- **What was wrong**: The code used `local ok, err = redis.pcall(...)` which implies `redis.pcall` returns two values like Lua's standard `pcall()`. In reality, `redis.pcall()` returns a single value: the command result on success, or a table with an `err` field on failure. The `err` variable would always be nil.
- **Fix**: Changed to `local result = redis.pcall(...)` and updated the subsequent `if` check to use `result` instead of `ok`.

### 2. Incorrect comment about TIME being "deterministic in scripts"
- **Location**: "Time and Randomness" section
- **What was wrong**: The comment stated `redis.call('TIME')` is "deterministic in scripts", which is incorrect. TIME is inherently non-deterministic (it returns the current server time). What changed is that Redis 7.0+ uses effects replication by default, which allows non-deterministic commands like TIME in scripts without replication issues.
- **Fix**: Changed the comment to "non-deterministic, allowed since Redis 7.0+" to accurately reflect the behavior.

## Review Notes
- The `SCRIPT FLUSH ASYNC` option was introduced in Redis 6.2. The post does not specify version requirements for this, which is acceptable for a cheat sheet.
- The Redis Functions section (Redis 7.0+) shows the shebang-style `FUNCTION LOAD` syntax which became the standard format. This is correct.
- The rate limiter pattern passes `ARGV[1]` directly to `EXPIRE` without `tonumber()`, while using `tonumber(ARGV[2])` for the Lua comparison. This is correct behavior -- Redis handles string-to-integer conversion internally for command arguments, but Lua requires explicit conversion for numeric comparisons.
- The `math.random()` seeding note is correct: Redis seeds the PRNG deterministically before each script execution.
