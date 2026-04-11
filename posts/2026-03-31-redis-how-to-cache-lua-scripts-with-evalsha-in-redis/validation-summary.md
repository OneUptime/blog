# Validation Summary: How to Cache Lua Scripts with EVALSHA in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (EVAL, EVALSHA, SCRIPT LOAD, SCRIPT EXISTS, SCRIPT FLUSH)
- Lua scripting in Redis
- Python redis-py client library
- SHA1 hashing (hashlib)

## Sources Consulted
- Redis EVAL documentation: https://redis.io/docs/latest/commands/eval/
- Redis EVALSHA documentation: https://redis.io/docs/latest/commands/evalsha/
- Redis SCRIPT LOAD documentation: https://redis.io/docs/latest/commands/script-load/
- Redis SCRIPT FLUSH documentation: https://redis.io/docs/latest/commands/script-flush/
- Redis SCRIPT EXISTS documentation: https://redis.io/docs/latest/commands/script-exists/
- Redis Lua scripting guide: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- Python redis-py documentation: https://redis-py.readthedocs.io/

## Issues Found

### 1. Incorrect SHA1 hash (3 occurrences)
- **What was wrong:** The post claimed the SHA1 of `return redis.call('SET', KEYS[1], ARGV[1])` was `2067d915024a3e1657c4169c84f809f8ec75b9a7`. The actual SHA1 is `d8f2fad9f8e86a53d2a6ebd960b33c4972cacc37`. This incorrect hash appeared in the Step 1 output, the Step 2 EVALSHA command, and the Step 5 SCRIPT EXISTS command.
- **What was changed:** Replaced all three occurrences with the correct SHA1 hash.
- **Why:** Using the wrong SHA1 hash would cause NOSCRIPT errors when readers try the examples, making the tutorial non-functional.

### 2. Incorrect claim about EVAL compiling on every call
- **What was wrong:** The introductory section stated EVAL "requires Redis to compile the script on every call." This is incorrect — Redis caches compiled scripts after the first EVAL call. Subsequent EVAL calls with the same script body reuse the cached compilation.
- **What was changed:** Rewrote the sentence to accurately state that Redis caches compiled scripts after the first EVAL, and that EVALSHA's benefit is avoiding retransmission of the script body.
- **Why:** The original claim misrepresents how Redis scripting works. The primary advantage of EVALSHA over EVAL is reduced network payload, not avoiding recompilation.

### 3. Misleading "falling back to EVAL" description in Step 4
- **What was wrong:** The text said "Handle this gracefully by falling back to EVAL and re-loading the script" but the accompanying code actually uses `script_load()` followed by `evalsha()` retry — it never falls back to EVAL.
- **What was changed:** Updated the text to "Handle this gracefully by re-loading the script and retrying with EVALSHA" to match the code.
- **Why:** The description should accurately reflect what the code does to avoid confusing readers.

## Review Notes
- The Python code examples use `redis-py` APIs correctly (`script_load`, `evalsha`, `script_exists`).
- The Lua scripts are syntactically correct and use proper Redis Lua idioms (checking `== false` for nil returns from GET, using `redis.call` for commands).
- The NOSCRIPT error handling pattern (reload + retry) is a well-established best practice.
- The `SCRIPT FLUSH ASYNC` option is correctly noted as Redis 6.2+.
- The redis-py library's `register_script()` method is a higher-level alternative that handles NOSCRIPT fallback automatically; mentioning it could be a useful future addition but is not a correctness issue.
