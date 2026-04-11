# Validation Summary: How to Write Your First Redis Function Library

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7.0+ Functions
- Lua scripting (Redis embedded Lua engine)
- redis-cli command-line interface
- Python redis-py client library
- FUNCTION LOAD, FCALL, FUNCTION LIST, FUNCTION DELETE, FUNCTION DUMP, FUNCTION RESTORE commands

## Sources Consulted
- Redis Functions Introduction: https://redis.io/docs/latest/develop/interact/programmability/functions-intro/
- FUNCTION LOAD command reference: https://redis.io/commands/function-load/
- FCALL command reference: https://redis.io/commands/fcall/
- FUNCTION LIST command reference: https://redis.io/commands/function-list/
- FUNCTION DELETE command reference: https://redis.io/commands/function-delete/
- FUNCTION DUMP command reference: https://redis.io/commands/function-dump/
- FUNCTION RESTORE command reference: https://redis.io/commands/function-restore/
- Redis Lua API reference for `redis.register_function`

## Issues Found

### 1. Broken shell command in Step 2 (removed)
**What was wrong:** The first loading command `redis-cli FUNCTION LOAD "#!lua name=mylib\n$(cat mylib.lua | tail -n +2)"` used `\n` inside double quotes, which bash does not interpret as a newline. The literal backslash-n would be passed to Redis, producing an invalid library payload that FUNCTION LOAD would reject.
**What was changed:** Removed the broken command entirely. The correct `cat mylib.lua | redis-cli -x FUNCTION LOAD` approach (which was already shown as an alternative) is now the primary and only method shown. This matches the official Redis documentation examples.

### 2. Incorrect `no-writes` flag on a write function in Step 6 (fixed)
**What was wrong:** The `setex_if_new` function calls `redis.call('SET', ...)`, which is a write operation. The example registered it with `flags = { 'no-writes' }`, which tells Redis the function is read-only. At runtime, Redis would reject the function with an error when it attempts to execute the SET command.
**What was changed:** Removed the `flags` field from the `setex_if_new` registration example, since the function performs writes. The example now only demonstrates the `description` field with the table-style registration.

### 3. Incomplete function flags list in Step 6 (fixed)
**What was wrong:** The available flags list was missing `allow-cross-slot-keys`, which allows a function to access keys from multiple hash slots in a Redis Cluster.
**What was changed:** Added `allow-cross-slot-keys` to the list of available flags.

## Review Notes
- The comparison table states EVAL/EVALSHA scripts have "Not replicated" cluster replication while Functions have "Replicated automatically." This is slightly simplified: Functions replicate from master to replicas automatically, but in a multi-shard Redis Cluster, functions must be loaded to each shard master separately (e.g., via `redis-cli --cluster-only-masters --cluster call`). The claim is not wrong for master-to-replica replication but could be more precise for cluster-wide distribution.
- The table claims Functions have "Library-level versioning" but Redis Functions do not have a built-in version field. The REPLACE flag on FUNCTION LOAD updates the library, but there is no explicit version tracking mechanism. This is a slight overstatement but not technically incorrect if interpreted as the ability to replace/update libraries as a unit.
- The FUNCTION DUMP output is saved as `functions.rdb` in the example, which is a cosmetic naming choice. The dump format is a serialized binary payload, not an actual RDB file, but the file extension is the author's preference and not technically wrong.
- All Lua code examples are syntactically correct and use the proper Redis Lua API.
- The Python redis-py examples use the correct API signatures for `function_load()` and `fcall()`.
- The FCALL syntax, FUNCTION LIST output format, and FUNCTION DELETE/DUMP/RESTORE commands are all accurate.
