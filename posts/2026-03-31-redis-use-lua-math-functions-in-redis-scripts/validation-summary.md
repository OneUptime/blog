# Validation Summary: How to Use Lua Math Functions in Redis Scripts

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (EVAL scripting engine)
- Lua 5.1 (embedded in Redis)
- LuaJIT (used in newer Redis builds)
- Lua math library

## Sources Consulted
- Lua 5.1 Reference Manual - Math Library: https://www.lua.org/manual/5.1/manual.html#5.6
- Redis EVAL command documentation: https://redis.io/docs/latest/commands/eval/
- Redis Scripting with Lua: https://redis.io/docs/latest/develop/programmability/eval-intro/
- Redis Lua API Reference: https://redis.io/docs/latest/develop/programmability/lua-api/

## Issues Found

### 1. `math.random()` incorrectly described as "blocked" (Critical)
**What was wrong:** The post claimed `math.random()` is "blocked" in Redis scripts and showed a fabricated error message (`ERR This Redis command is not allowed from script`). That error applies to blocked Redis commands (like SUBSCRIBE), not Lua math functions. In reality, `math.random()` works in Redis scripts but is seeded with a fixed seed for deterministic replay across replicas. In Redis 7.0+, it is randomly seeded on each invocation.
**What was changed:** Rewrote the section to accurately describe the deterministic seeding behavior and version differences.

### 2. `RANDOMKEY` recommended as randomness source (Incorrect)
**What was wrong:** The post suggested `redis.call('RANDOMKEY')` as an alternative for generating random values. RANDOMKEY returns a random key name from the database, not a random number -- it is not a general-purpose randomness source and is semantically wrong for this purpose.
**What was changed:** Removed the RANDOMKEY recommendation. Replaced with advice to pass random values as ARGV from the client side, or use math.random() freely in Redis 7.0+.

### 3. `%` operator labeled as "integer modulo" (Misleading)
**What was wrong:** Lua 5.1 has no integer type -- all numbers are IEEE 754 doubles. The `%` operator is defined as `a - math.floor(a/b)*b` (flooring modulo), not integer modulo. This differs from `math.fmod` which truncates toward zero.
**What was changed:** Changed label from "integer modulo, preferred" to "flooring modulo" with the formula.

### 4. `math.maxinteger` shown as available constant (Misleading)
**What was wrong:** The post listed `math.maxinteger` under "Math Constants" with a parenthetical "(Lua 5.3+)" but didn't clarify it evaluates to nil in Redis, which uses Lua 5.1. Readers could easily miss the parenthetical and try to use it.
**What was changed:** Removed `math.maxinteger` from the code block and added a note that Lua 5.3+ constants are not available in Redis.

### 5. EVAL return type truncation not mentioned (Significant omission)
**What was wrong:** Multiple code examples showed `return` statements with floating-point comments (e.g., `return math.sqrt(16) -- 4.0`, `return math.pi -- 3.14159...`) without noting that Redis EVAL truncates Lua numbers to integers. A reader using `return math.sqrt(x)` directly would get a truncated integer, not a float.
**What was changed:** Added notes about EVAL integer truncation in the Math Constants section and the Summary. Updated the constants code to use comments rather than `return` statements to avoid implying float values are returned to the client.

## Review Notes
- The practical examples (exponential backoff, normalization, percentile) correctly use `math.floor()` before returning, so they produce correct results despite the truncation behavior. The issue was only in the reference/demo sections.
- The `math.fmod` vs `%` distinction for negative numbers is worth noting: `(-10) % 3` yields `2` (flooring) while `math.fmod(-10, 3)` yields `-1` (truncating toward zero). The post doesn't cover negative cases in depth, but this is acceptable for a tutorial-level post.
- Redis 7.0 removed verbatim script replication entirely, which significantly changed the restrictions around non-deterministic operations in scripts. The post could benefit from noting Redis version differences more explicitly, but the current fixes address the most critical inaccuracies.
