# Validation Summary: How to Test Redis Persistence Recovery Before Production

## Status
validated

## Post Type
Tutorial / Hands-on Guide

## Technologies Covered
- Redis (server, CLI, persistence mechanisms)
- RDB snapshots (`BGSAVE`, `redis-check-rdb`)
- AOF (Append Only File) persistence (`redis-check-aof`)
- Hybrid persistence (`aof-use-rdb-preamble`)
- Redis Lua scripting (`EVAL`)
- Bash scripting

## Sources Consulted
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis configuration reference: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis SHUTDOWN command: https://redis.io/docs/latest/commands/shutdown/
- Redis BGSAVE command: https://redis.io/docs/latest/commands/bgsave/
- Redis EVAL command: https://redis.io/docs/latest/commands/eval/
- Redis Lua API reference: https://redis.io/docs/latest/develop/programmability/lua-api/
- Redis source code for redis-check-rdb: https://github.com/redis/redis/blob/unstable/src/redis-check-rdb.c
- Redis source code for redis-check-aof: https://github.com/redis/redis/blob/unstable/src/redis-check-aof.c

## Issues Found

### 1. `mkdir -p` ordered after `redis-server` start (Test Environment Setup)
- **What was wrong:** The `mkdir -p /tmp/redis-test` command appeared after the `redis-server` startup command. Redis requires the `--dir` directory to exist before it starts; without it, the server would fail to launch.
- **What was changed:** Moved `mkdir -p /tmp/redis-test` to before the `redis-server` command.
- **Why:** Redis does not create its working directory automatically. The directory must exist before the server process starts.

### 2. `redis-check-rdb --fix` flag does not exist (Test 3)
- **What was wrong:** The post used `redis-check-rdb --fix /tmp/redis-test/test-dump-corrupt.rdb`, but `redis-check-rdb` is a diagnostic-only tool that does not accept a `--fix` flag. Unlike `redis-check-aof` which does support `--fix`, `redis-check-rdb` can only validate files and report corruption—it cannot repair them.
- **What was changed:** Replaced the `--fix` invocation with a diagnostic-only check and added a comment explaining that corrupt RDB files must be restored from backups since there is no automatic repair tool.
- **Why:** Running `redis-check-rdb --fix` would produce an error, which would confuse readers following the tutorial.

## Review Notes
- **Redis 7.0+ multi-part AOF:** Starting with Redis 7.0, AOF uses a multi-part file structure with a manifest file, base file, and incremental files stored in a subdirectory (controlled by `appenddirname`). The post's `--appendfilename` usage is still valid but readers on Redis 7.0+ should be aware that the on-disk AOF structure is more complex than a single file. The `redis-check-aof` tool in 7.0+ can accept manifest files directly.
- **`redis-check-aof` output format:** The grep for `"AOF is valid"` in the validation script (Test 5) works in most Redis versions but the exact output format may vary across versions. Readers should verify the expected output string for their specific Redis version.
- **Test 4 timing measurement:** The `time` command wrapping a backgrounded process (`& `) will measure fork time rather than recovery time. The `until` loop that follows is the actual recovery time measurement. This is functionally correct but could be clearer about which measurement matters.
- **`SHUTDOWN NOSAVE` after `BGSAVE`:** In Test 4, `BGSAVE` is called followed by `SHUTDOWN NOSAVE`. Since `BGSAVE` was already triggered and given 30 seconds to complete, the `NOSAVE` flag on shutdown prevents a redundant save. This is correct behavior for measuring pure recovery time.
