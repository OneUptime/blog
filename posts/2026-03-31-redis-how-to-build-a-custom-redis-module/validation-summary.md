# Validation Summary: How to Build a Custom Redis Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Module API
- C programming language
- GNU Make
- Python (redis-py client)
- Redis CLI

## Sources Consulted
- Redis Modules API reference: https://redis.io/docs/latest/develop/reference/modules/
- Redis Module API header (`redismodule.h`) — function signatures for `RedisModule_StringDMA`, `RedisModule_StringPtrLen`, `RedisModule_Call`, `RedisModule_CreateCommand`, etc.
- C standard library reference for `<limits.h>` (LLONG_MAX) vs `<stdlib.h>`
- GNU Make manual — variable assignment operators (`=` vs `?=`) and environment variable precedence
- redis-py documentation for `execute_command`: https://redis-py.readthedocs.io/

## Issues Found

### 1. Crash bug: NULL passed to `RedisModule_StringDMA` length parameter (Critical)
**What was wrong:** The "Get current value" block contained `RedisModule_StringDMA(key, NULL, REDISMODULE_READ)` which passes NULL for the required `size_t *len` parameter. The Redis implementation dereferences this pointer unconditionally (`*len = sdslen(...)`), so this would segfault at runtime. Additionally, the block contained several lines of dead code: an unused `current_str` variable, a nonsensical ternary (`RedisModule_GetExpire(key) >= 0 ? argv[1] : argv[1]` — both branches identical), and an unused `ptr` variable. The only functional code in the block was the `RedisModule_Call(ctx, "GET", ...)` approach at the end.
**What was changed:** Removed all dead/broken code and kept only the working `RedisModule_Call` approach to read the current value.
**Why:** The dead code would crash the module and confused the tutorial's teaching purpose.

### 2. Missing `#include <limits.h>` for `LLONG_MAX`
**What was wrong:** The code uses `LLONG_MAX` but only includes `<string.h>` and `<stdlib.h>`. Per the C99 standard, `LLONG_MAX` is defined in `<limits.h>`.
**What was changed:** Added `#include <limits.h>` to the includes.
**Why:** While some compilers/platforms may expose `LLONG_MAX` via other headers, the correct and portable include is `<limits.h>`.

### 3. Makefile `REDIS_SRC` assignment incompatible with environment override
**What was wrong:** The Makefile used `REDIS_SRC=/path/to/redis/src` (simple assignment), but the "Building the Module" section instructs the reader to `export REDIS_SRC=/path/to/redis/src` before running `make`. In GNU Make, a simple `=` assignment in the Makefile takes precedence over environment variables, so the `export` would have no effect.
**What was changed:** Changed `REDIS_SRC=/path/to/redis/src` to `REDIS_SRC ?= /path/to/redis/src` in the Makefile snippet.
**Why:** The `?=` operator uses the environment variable if set, falling back to the default — matching the build instructions.

## Review Notes
- The `RedisModule_AutoMemory` API used in the tutorial is functional but has been noted in Redis documentation as having potential pitfalls in long-running commands. For a simple tutorial like this, it is appropriate.
- The command flags `"write fast"` are correct — `write` marks the command as a write operation and `fast` indicates O(1) or O(log N) time complexity.
- The Python example correctly uses `execute_command()` which is the standard way to invoke custom module commands via redis-py.
- The `RedisModule_CreateCommand` key specification (first=1, last=1, step=1) is correct for a single-key command.
