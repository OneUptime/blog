# Validation Summary: How to Use FCALL in Redis to Call Registered Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7.0+ Functions API
- FCALL and FCALL_RO commands
- FUNCTION LOAD, FUNCTION LIST commands
- Lua scripting (Redis Functions variant)
- redis-py (Python Redis client)
- node-redis (Node.js Redis client)

## Sources Consulted
- Redis FCALL command documentation: https://redis.io/docs/latest/commands/fcall/
- Redis FUNCTION LOAD command documentation: https://redis.io/docs/latest/commands/function-load/
- Redis FCALL_RO command documentation: https://redis.io/docs/latest/commands/fcall_ro/
- Redis FUNCTION LIST command documentation: https://redis.io/docs/latest/commands/function-list/
- Redis Lua API reference: https://redis.io/docs/latest/develop/programmability/lua-api/
- Redis Functions introduction: https://redis.io/docs/latest/develop/programmability/functions-intro/
- redis-py documentation: https://redis.readthedocs.io/en/stable/commands.html
- node-redis GitHub: https://github.com/redis/node-redis

## Issues Found
- **`KEYS` and `ARGS` parameter naming (lines 21-22)**: The post described FCALL key arguments as accessible via the `KEYS` table and extra arguments via the `ARGS` table. In the Redis Functions API, registered function callbacks receive `keys` and `args` as lowercase function parameters — not the uppercase `KEYS` and `ARGV` globals used in EVAL scripts. Changed to clarify these are the `keys` and `args` parameters in the Lua callback.

## Review Notes
- The FCALL syntax, FUNCTION LOAD shebang format, `redis.register_function` API (both positional and named-argument forms), FCALL_RO with `no-writes` flag, and FUNCTION LIST syntax are all correct.
- The EVAL vs FCALL comparison table is accurate. The "Reference by: SHA1 hash" entry for EVAL is a slight simplification (EVAL itself takes raw script text; EVALSHA uses SHA1), but is a reasonable generalization of the EVAL-based scripting workflow.
- The persistence claim "Survives restart (with AOF)" is correct but slightly incomplete — functions are also persisted in RDB snapshots. The AOF qualifier is not wrong, just not the full picture.
- The Python and Node.js client examples use correct API patterns for redis-py and node-redis v4.
- The CLI multi-line FUNCTION LOAD examples use `\n` escaping which is a reasonable representation for blog purposes, though actual redis-cli usage may require different formatting.
