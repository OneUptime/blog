# Validation Summary: How to Build a Config Version History with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Streams (XADD, XREVRANGE, XTRIM)
- Redis Hashes (HGET, HSET)
- Redis Pipelines (MULTI/EXEC)
- Python (redis-py client library)

## Sources Consulted
- redis-py source code and API (v7.x) — confirmed signatures for `xadd`, `xrevrange`, `pipeline`, `hset`, `hget`
- Redis official documentation for Streams commands: XADD, XREVRANGE, XTRIM — https://redis.io/docs/latest/commands/xadd/, https://redis.io/docs/latest/commands/xrevrange/, https://redis.io/docs/latest/commands/xtrim/

## Issues Found

1. **Unused import (`import json`)**: The `json` module was imported but never used anywhere in the code. Removed the unused import.

2. **Off-by-one error in `rollback_config` function**: The rollback logic used `key_changes[steps]` to find the target event, but `xrevrange` returns events newest-first, so `key_changes[0]` is the most recent change for that key. Rolling back `steps=1` (undo the last change) should access `key_changes[0]["old_value"]`, i.e., index `steps - 1`. The original code accessed `key_changes[1]`, which skips one extra change. The boundary check was also off: `len(key_changes) <= steps` was changed to `len(key_changes) < steps` to match the corrected indexing.

## Review Notes
- The `approximate=True` parameter in `r.xadd(stream_key, fields, maxlen=10000, approximate=True)` is technically redundant since `True` is already the default in redis-py. This is not incorrect — it serves as explicit documentation of intent — so it was left as-is.
- The first `update_config` function does the HSET and XADD as two separate commands (not in a pipeline/transaction). If the process crashes between them, the config would be updated but the history entry would be lost. The second version (`update_config_v2`) correctly uses a pipeline. This is acknowledged by the post's structure (v2 as an improvement) so no change was made.
