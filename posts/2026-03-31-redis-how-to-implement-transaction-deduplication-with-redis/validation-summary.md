# Validation Summary: How to Implement Transaction Deduplication with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Lua scripting, SET with EX, pipelines, register_script)
- Python 3.9+ (redis-py library)
- Idempotency patterns for financial transactions

## Sources Consulted
- Redis SET command documentation: https://redis.io/commands/set/ — verified SET with EX flag syntax and behavior
- Redis EVAL / Lua scripting documentation: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/ — confirmed atomicity guarantees of Lua scripts and KEYS/ARGV usage
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/ — verified `register_script`, `pipeline`, `rpush`, `lrange`, `expire` API usage and `decode_responses` behavior
- Python hashlib documentation: https://docs.python.org/3/library/hashlib.html — verified sha256 usage

## Issues Found

1. **Misleading section title "Core Deduplication with NX"**: The section was titled "Core Deduplication with NX" but the Redis NX flag (`SET key value NX`) is never used anywhere in the code. The deduplication is implemented via an atomic Lua script using a GET-then-SET pattern, not the NX flag. Renamed to "Core Deduplication Setup" to accurately describe the section content (key generation utilities).

2. **Inaccurate comment on first call result**: The inline comment for `result1` showed `"duplicate": False` in the expected output, but the `process_transaction` function never adds a `"duplicate"` key to `success_data` for new (non-duplicate) transactions. Only duplicate returns include `"duplicate": True` (added via dict unpacking). Changed the comment to `{"status": "success", "transaction_id": "ch_...", ...}` to avoid implying a non-existent key.

## Review Notes
- The Lua script declares `dedup_ttl` and `tx_data` variables (from ARGV[2] and ARGV[3]) that are never used within the script — they are only used in the Python code after the script returns. This isn't a runtime error but could confuse readers about where TTL is applied.
- `r.register_script(DEDUP_SCRIPT)` is called inside `process_transaction` on every invocation. While redis-py caches the script SHA internally so this works correctly, moving it to module level would be slightly more idiomatic.
- The `list[dict]` return type annotation on `get_transaction_attempts` requires Python 3.9+. Earlier versions would need `from typing import List` and `List[dict]`.
- The pipeline used to store the result and delete the lock (lines 114-117) is not atomic in the same way a Lua script is — it batches commands but doesn't guarantee they execute without interleaving from other clients. In practice this is fine here since the dedup key is already set before the lock is deleted, so the worst case is a brief window where both exist.
