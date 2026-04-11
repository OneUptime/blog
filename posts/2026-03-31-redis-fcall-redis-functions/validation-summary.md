# Validation Summary: How to Use FCALL in Redis for Redis Functions (Redis 7+)

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis 7.0+
- Redis FCALL and FCALL_RO commands
- Redis FUNCTION LOAD command
- Redis Functions (Lua scripting engine)
- Redis EVAL / EVALSHA (for comparison)

## Sources Consulted
- Redis FCALL command reference: https://redis.io/docs/latest/commands/fcall/
- Redis FCALL_RO command reference: https://redis.io/docs/latest/commands/fcall_ro/
- Redis FUNCTION LOAD command reference: https://redis.io/docs/latest/commands/function-load/
- Redis Functions introduction: https://redis.io/docs/latest/develop/interact/programmability/functions-intro/
- Redis EVAL command reference: https://redis.io/docs/latest/commands/eval/
- Redis EVAL_RO command reference: https://redis.io/docs/latest/commands/eval_ro/

## Issues Found

### 1. Incorrect claim that EVAL has no read-only variant (Line 159)
- **What was wrong:** The FCALL vs EVAL comparison table stated "No" for EVAL's read-only variant, implying EVAL has no read-only counterpart.
- **What was changed:** Updated from "No" to "EVAL_RO (7.0+)" in the comparison table.
- **Why:** `EVAL_RO` is a real Redis command introduced in Redis 7.0.0 (along with `EVALSHA_RO`). It allows running read-only Lua scripts on replicas, similar to how FCALL_RO works for Redis Functions. Claiming EVAL has no read-only variant is factually incorrect.

## Review Notes
- The error message shown for calling a nonexistent function (`(error) ERR Library not loaded. Please use FUNCTION LOAD.`) could not be verified from official documentation alone. The actual error message may differ (e.g., `(error) ERR Function not found`). This would need testing against a live Redis 7.0+ instance to confirm exact wording.
- All other technical claims (FCALL syntax, lowercase `keys`/`args` vs uppercase `KEYS`/`ARGV`, FUNCTION LOAD shebang format, `redis.register_function` simple and extended forms, persistence in RDB/AOF, replication to replicas, FUNCTION LOAD REPLACE flag) are accurate per official Redis documentation.
- The Lua code examples are syntactically correct and demonstrate proper usage patterns.
- The `get_with_ttl` function returns a Lua table `{val, ttl}` which Redis correctly serializes as a multi-bulk reply, as shown in the example output.
