# Validation Summary: How to Pass Keys and Arguments to Redis Lua Scripts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (EVAL command, Lua scripting engine)
- Lua 5.1 (embedded scripting in Redis)
- Redis Cluster (hash slots, hash tags)

## Sources Consulted
- Redis EVAL command documentation (https://redis.io/docs/latest/commands/eval/)
- Redis Lua scripting reference (https://redis.io/docs/latest/develop/interact/programmability/lua-api/)
- Redis Cluster specification - hash tags (https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/)
- Lua 5.1 reference manual - `tonumber`, `tostring`, length operator `#` (https://www.lua.org/manual/5.1/)

## Issues Found
No technical issues found.

## Review Notes
- The EVAL syntax, KEYS/ARGV semantics, 1-based indexing, and numkeys parameter are all accurately described.
- All code examples use correct Redis commands (GET, SET, EXPIRE, INCRBY, DECRBY) with proper argument handling.
- The `tonumber()` conversions for EXPIRE and INCRBY are correctly applied since all ARGV values arrive as strings in Lua.
- `redis.error_reply()` is the correct API for returning error responses from Lua scripts.
- The cluster hash tag explanation using `{user:123}` is accurate — the substring inside the first `{}` pair determines the hash slot.
- The post uses Redis's embedded Lua 5.1, where all numbers are doubles. The `tonumber()` results passed to integer-expecting commands like INCRBY work correctly because Redis truncates to integers internally.
