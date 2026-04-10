# Validation Summary: Why You Should Not Store Large Blobs in Redis

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (server, replication, memory management, CLI tools)
- Python (redis-py client library, zlib, base64, json)
- Object storage pattern (S3, GCS, Azure Blob)

## Sources Consulted
- Redis official documentation on DEBUG OBJECT: https://redis.io/docs/latest/commands/debug-object/
- Redis official documentation on MEMORY USAGE: https://redis.io/docs/latest/commands/memory-usage/
- Redis official documentation on LATENCY HISTORY: https://redis.io/docs/latest/commands/latency-history/
- Redis official documentation on replication: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- redis-py documentation for setex/get: https://redis-py.readthedocs.io/
- Python documentation for zlib.compress, base64.b64encode: https://docs.python.org/3/library/zlib.html

## Issues Found

1. **`DEBUG OBJECT` is restricted in Redis 7.0+.** The `DEBUG OBJECT` command is disabled by default in Redis 7.0+ and requires the `enable-debug-command` configuration option. Replaced with `MEMORY USAGE <key>`, which has been available since Redis 4.0 and is the recommended way to check a key's memory consumption. Updated the example output to show the integer response format that `MEMORY USAGE` returns.

2. **Size check warning printed character count instead of byte count.** In the `safe_cache_set` function, the guard correctly checks `len(value.encode())` (byte length), but the warning message used `len(value)` (character count) while labeling it "bytes". For multi-byte characters (e.g., UTF-8 encoded text), these values differ. Changed the print statement to use `len(value.encode())` so the reported size matches the actual byte-length check.

## Review Notes
- The `redis-cli --bigkeys` command is correctly described as non-blocking (it uses SCAN internally).
- The Python code uses `dict | None` union syntax which requires Python 3.10+. This is acceptable for modern Python but worth noting for readers on older versions.
- The `__import__("time").time()` pattern in the cache_file_reference function is unconventional but technically correct. A standard `import time` at the top of the file would be more idiomatic, but this is a style choice rather than a technical error.
- The replication description simplifies Redis's async replication model but correctly conveys the practical impact: large keys delay full synchronization and can cause replicas to serve stale data during initial SYNC.
