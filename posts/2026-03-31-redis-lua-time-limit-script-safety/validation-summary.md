# Validation Summary: How to Configure Redis lua-time-limit for Script Safety

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (server configuration, scripting engine)
- Lua (scripting within Redis)
- Redis CLI (`redis-cli`)

## Sources Consulted
- Redis official documentation on Lua scripting: https://redis.io/docs/interact/programmability/eval-intro/
- Redis official documentation on `lua-time-limit` configuration: https://redis.io/docs/reference/configuration/
- Redis official documentation on `SCRIPT KILL`: https://redis.io/docs/latest/commands/script-kill/
- Redis official documentation on `EVAL`: https://redis.io/docs/latest/commands/eval/
- Redis official documentation on `SLOWLOG`: https://redis.io/docs/latest/commands/slowlog-get/

## Issues Found
1. **Incorrect `redis.pcall` code example**: The post described `redis.pcall` behavior in a comment ("redis.pcall returns the error as a table") but the actual code used Lua's built-in `pcall` wrapping `redis.call` instead of using `redis.pcall` directly. This is misleading because `pcall` and `redis.pcall` have different interfaces and return formats. Fixed by replacing the code with a correct `redis.pcall` example that calls `redis.pcall('GET', KEYS[1])` and checks for the `.err` field on the returned table.

## Review Notes
- The claim that Redis "starts logging a warning every second" once `lua-time-limit` is exceeded is a simplification. Redis logs when a script first exceeds the limit and periodically thereafter, but the exact interval depends on the Redis version and internal implementation. The description is close enough for practical purposes.
- The recommendation to "keep individual scripts under 1ms" is aggressive but reasonable as a general guideline for high-throughput systems. Some workloads may tolerate longer scripts.
- The `KEYS` command used in the slowlog example (`redis.call('KEYS', '*')`) is generally discouraged in production. While it serves as a good illustration of a slow command appearing in the slowlog, readers should be aware that `KEYS *` should not be used in production environments.
