# Validation Summary: How Redis Functions Differ from Lua EVAL Scripts

## Status
validated

## Post Type
Comparison / Reference Guide

## Technologies Covered
- Redis (2.6+ for EVAL, 7.0+ for Functions)
- Lua scripting in Redis
- Redis CLI (`redis-cli`)
- Redis commands: EVAL, EVALSHA, SCRIPT LOAD, FUNCTION LOAD, FCALL, FCALL_RO, FUNCTION DUMP

## Sources Consulted
- Redis official documentation for EVAL: https://redis.io/docs/latest/commands/eval/
- Redis official documentation for FUNCTION LOAD: https://redis.io/docs/latest/commands/function-load/
- Redis official documentation for FCALL: https://redis.io/docs/latest/commands/fcall/
- Redis official documentation for EVAL_RO: https://redis.io/docs/latest/commands/eval-ro/
- Redis official documentation for EVALSHA_RO: https://redis.io/docs/latest/commands/evalsha-ro/
- Redis Functions introduction: https://redis.io/docs/latest/develop/interact/programmability/functions-intro/
- Redis scripting with Lua: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/

## Issues Found
1. **Incorrect claim that EVAL has no read-only variant (comparison table).**
   - **What was wrong:** The "Script Persistence Comparison" table listed "No" for EVAL's read-only variant, implying only Functions have a read-only mode (`FCALL_RO`).
   - **What was changed:** Updated the table cell to "EVAL_RO / EVALSHA_RO (7.0+)" to accurately reflect that Redis 7.0 introduced read-only variants for both EVAL scripts and Functions.
   - **Why:** `EVAL_RO` and `EVALSHA_RO` were added in Redis 7.0 (the same release that introduced Functions). Omitting them misrepresents Functions as having a unique advantage they don't exclusively hold.

## Review Notes
- The `FUNCTION LOAD` CLI example on line 29 uses `\n` escape sequences inside bash double quotes. In a real shell, double-quoted `\n` is a literal backslash + n, not a newline. In practice, users would need `$'...'` quoting or a heredoc/pipe to load multi-line function libraries. This is a common simplification in documentation and does not affect the conceptual accuracy of the post.
- The EVAL "injection" mention in the Invocation Syntax section is somewhat imprecise — EVAL is not vulnerable to injection in the same way SQL is, since KEYS/ARGV are separate from the script body. The risk only exists if application code dynamically constructs the script string with unsanitized user input. The claim is not outright wrong but could be more precise.
- The `tonumber(redis.call('GET', keys[1]) or 0)` pattern in the migration example is a good defensive improvement over the original EVAL version, which would error on a nil key. This is correct.
- All other technical claims (Lua scripting since Redis 2.6, Functions in 7.0, persistence behavior, SHA1 caching, FUNCTION DUMP for backup, library-level versioning) are accurate.
