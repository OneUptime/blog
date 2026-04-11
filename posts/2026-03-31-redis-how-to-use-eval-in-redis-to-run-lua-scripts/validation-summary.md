# Validation Summary: How to Use EVAL in Redis to Run Lua Scripts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (EVAL, EVALSHA, SCRIPT LOAD commands)
- Lua scripting in Redis
- Python (redis-py client library)
- Node.js (node-redis client library)

## Sources Consulted
- Redis EVAL command documentation: https://redis.io/docs/latest/commands/eval/
- Redis Lua scripting introduction: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- Redis Lua API reference: https://redis.io/docs/latest/develop/interact/programmability/lua-api/
- Redis Lua debugging documentation: https://redis.io/docs/latest/develop/interact/programmability/lua-debugging/

## Issues Found

### 1. Incorrect `redis.pcall()` error handling pattern
- **What was wrong:** The post used `local ok, err = redis.pcall('GET', KEYS[1])` — a two-return-value pattern mimicking standard Lua's `pcall()`. However, Redis's `redis.pcall()` does NOT behave like standard Lua's `pcall()`. It returns a single value: either the successful result, or a Lua table with an `err` field on error.
- **What was changed:** Updated the example to use the correct single-return-value pattern: `local reply = redis.pcall('GET', KEYS[1])` with error checking via `reply['err'] ~= nil`.
- **Why:** Using the two-return-value pattern would cause `err` to always be `nil` (since `redis.pcall` only returns one value), meaning errors would silently pass through unhandled. The official Redis Lua API documentation confirms that `redis.pcall()` "always returns a reply" as a single value, with errors returned as a `redis.error_reply` table.

## Review Notes
- The `lua-time-limit` description correctly states the default is 5 seconds. Worth noting that this is not a hard kill timeout — when exceeded, Redis starts returning BUSY errors to other clients but the script continues running. Only `SCRIPT KILL` or `SHUTDOWN NOSAVE` can stop it. The post's brief mention is acceptable for a tutorial.
- The return type mapping table is correct for RESP2. In RESP3 mode, some mappings differ (e.g., Lua boolean maps to RESP3 boolean, Lua nil maps to RESP3 null). The post doesn't specify RESP2/RESP3, but RESP2 is the default and most common, so this is fine.
- The Node.js example uses top-level `await` without being wrapped in an async function, which assumes an ES module or async IIFE context. This is a common pattern in documentation examples and is acceptable.
