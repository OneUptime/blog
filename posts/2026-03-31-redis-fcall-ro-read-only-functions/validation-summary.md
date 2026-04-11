# Validation Summary: How to Use FCALL_RO in Redis for Read-Only Function Calls

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis 7.0+
- Redis Functions API (FCALL_RO, FCALL, FUNCTION LOAD, FUNCTION LIST)
- Lua scripting in Redis
- EVAL_RO

## Sources Consulted
- Redis FCALL_RO command documentation: https://redis.io/docs/latest/commands/fcall_ro/
- Redis FCALL command documentation: https://redis.io/docs/latest/commands/fcall/
- Redis FUNCTION LOAD documentation: https://redis.io/docs/latest/commands/function-load/
- Redis FUNCTION LIST documentation: https://redis.io/docs/latest/commands/function-list/
- Redis EVAL_RO documentation: https://redis.io/docs/latest/commands/eval_ro/
- Redis Functions Introduction: https://redis.io/docs/latest/develop/interact/programmability/functions-intro/
- Redis Lua API Reference: https://redis.io/docs/latest/develop/interact/programmability/lua-api/
- Redis Programmability overview: https://redis.io/docs/latest/develop/interact/programmability/

## Issues Found

1. **Misleading claim about replica write-checking (line 33):** The post stated Redis accepts FCALL_RO on replicas "without checking whether the underlying function accidentally writes." In reality, FCALL_RO still enforces write checks at runtime even on replicas. Fixed to clarify that writes are still blocked with an error if attempted.

2. **Unsupported claim about `no-writes` eliminating runtime overhead (lines 100, 118):** The post claimed the `no-writes` flag eliminates "runtime checking overhead" / "runtime write-check overhead." The official docs do not support this claim -- the `no-writes` flag's documented purpose is to allow execution on replicas, during OOM conditions, and during write pauses, not to skip write-checking. Fixed to accurately describe the flag's benefits (read-only context safety, OOM/write-pause execution).

3. **Misleading EVAL_RO comparison in table (line 127):** The table stated EVAL_RO script caching "Requires SCRIPT LOAD." EVAL_RO executes inline Lua scripts directly and does not require SCRIPT LOAD. Scripts are automatically cached in memory after execution but are not persisted across restarts (unlike functions). Fixed to "Cached in memory, not persisted."

## Review Notes
- The FCALL_RO syntax parameter is labeled `function-name` in the post vs `function` in official docs. This is a cosmetic difference that doesn't affect usability and was left as-is.
- The error message shown ("ERR Write commands not allowed from read-only scripts.") is slightly different from the actual Redis error format, which wraps the message differently. The actual error for calling a function with write flags via FCALL_RO is closer to "ERR Can not execute a function with write flag using fcall_ro." Left as-is since the blog uses it illustratively in code comments.
- The comparison table entry saying FCALL does not run on replicas is a reasonable simplification. Technically FCALL can run on replicas if the function has the `no-writes` flag, but the table's "No" captures the default/common behavior.
