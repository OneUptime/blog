# Validation Summary: How to Version and Deploy Redis Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis 7.0+ (Functions feature)
- Redis CLI (`redis-cli`)
- Lua scripting engine for Redis Functions
- Shell scripting (Bash) for deployment automation

## Sources Consulted
- Redis FUNCTION LOAD documentation — https://redis.io/docs/latest/commands/function-load/
- Redis FUNCTION DUMP documentation — https://redis.io/docs/latest/commands/function-dump/
- Redis FUNCTION RESTORE documentation — https://redis.io/docs/latest/commands/function-restore/
- Redis FUNCTION LIST documentation — https://redis.io/docs/latest/commands/function-list/
- Redis FUNCTION DELETE documentation — https://redis.io/docs/latest/commands/function-delete/
- Redis Functions introduction — https://redis.io/docs/latest/develop/interact/programmability/functions-intro/
- Redis FCALL documentation — https://redis.io/docs/latest/commands/fcall/

## Issues Found

### 1. FUNCTION DUMP missing `--raw` flag
- **What was wrong:** The backup command `redis-cli FUNCTION DUMP > functions_backup.rdb` omitted the `--raw` flag. Without it, redis-cli outputs a human-readable quoted/escaped representation rather than the raw binary payload needed for restore. The `.rdb` file extension was also misleading since the output is a serialized binary payload, not an RDB file.
- **What was changed:** Updated to `redis-cli --raw FUNCTION DUMP > functions_backup.bin` with an explanatory comment.

### 2. FUNCTION RESTORE incorrect stdin usage
- **What was wrong:** The restore command `redis-cli FUNCTION RESTORE < functions_backup.rdb` used shell stdin redirect (`<`), which feeds data to redis-cli's command input stream, not as an argument to the FUNCTION RESTORE command. FUNCTION RESTORE expects the serialized payload as a direct argument.
- **What was changed:** Updated to `redis-cli -x FUNCTION RESTORE REPLACE < functions_backup.bin`. The `-x` flag tells redis-cli to read the last argument from stdin, which correctly passes the binary dump as the argument to FUNCTION RESTORE. Added the `REPLACE` policy flag for a realistic restore scenario, and updated the file extension to `.bin`.

## Review Notes
- The Lua function callback signature correctly uses lowercase `(keys, args)` parameters, which is the Redis Functions convention (as opposed to `KEYS`/`ARGV` globals used in ephemeral EVAL scripts).
- `redis.register_function` and `redis.error_reply` are both valid Lua API calls confirmed in the Redis documentation.
- The `FUNCTION LOAD REPLACE` atomicity claim is accurate per Redis documentation.
- The `FUNCTION LIST LIBRARYNAME` and `FUNCTION LIST WITHCODE` flags are both valid.
- Binary data handling in shell can be fragile (null bytes, encoding issues). For production use, a Redis client library is generally more reliable than shell-based dump/restore, but the corrected CLI approach is the standard documented method.
