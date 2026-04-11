# Validation Summary: How to Estimate Redis Memory for Strings Workload

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (string data type, memory internals, encoding types)
- Python (redis-py client library)
- Redis CLI (MEMORY USAGE, OBJECT ENCODING, --scan)

## Sources Consulted
- Redis documentation on String data type: https://redis.io/docs/data-types/strings/
- Redis documentation on MEMORY USAGE command: https://redis.io/commands/memory-usage/
- Redis documentation on OBJECT ENCODING command: https://redis.io/commands/object-encoding/
- Redis source code (SDS header sizes, redisObject struct, dictEntry struct)
- Redis documentation on encoding thresholds (embstr limit of 44 bytes since Redis 3.2)

## Issues Found

### 1. Session key length off by one
- **What was wrong:** The post stated the key `"session:a9f3bc7e-1234-5678-abcd-ef0123456789"` is 43 bytes, but it is actually 44 bytes.
- **What was changed:** Corrected to 44 bytes, and updated the per-key estimate from 377 to 378 bytes and the 1-million-key total from 377 MB to 378 MB.

### 2. embstr encoding description was backwards
- **What was wrong:** The post stated "Values over 44 bytes use embstr encoding (inline, slightly more efficient)." This is the opposite of how Redis works — strings up to 44 bytes use embstr encoding, and strings over 44 bytes use raw encoding. The code examples below the text were correct and contradicted the prose.
- **What was changed:** Corrected the text to: "Strings up to 44 bytes use the more compact embstr encoding (single allocation). Strings over 44 bytes use raw encoding (separate allocation)."

### 3. Python script expected output was incorrect
- **What was wrong:** The comment showing expected output claimed `"total_mb": 2203.0, "total_gb": 2.152`, but running the actual code (424 bytes/key * 5,000,000 keys * 1.1 fragmentation = 2,332,000,000 bytes) yields `total_mb: 2224.0` and `total_gb: 2.172`.
- **What was changed:** Corrected the output comment to `{"num_keys": 5000000, "bytes_per_key": 424, "total_mb": 2224.0, "total_gb": 2.172}`.

## Review Notes
- The per-key overhead model (~134 bytes base) is a simplified approximation. In practice, Redis keys do not get wrapped in a redisObject (only values do), and SDS header sizes vary by string length (3 bytes for strings under 256 bytes via sdshdr8, not the 9 bytes stated). However, the overall ~134-byte estimate is a reasonable conservative approximation for capacity planning purposes, and the post correctly advises verifying with `MEMORY USAGE` on real data.
- The practical examples compute "MB" and "GB" using decimal (1 MB = 1,000,000 bytes), while the Python script uses binary (1 MB = 1,048,576 bytes). This inconsistency is minor for an estimation guide but worth noting.
- The `redis` Python import is correct (the package `redis-py` is imported as `redis`).
- The MEMORY USAGE sampling pipeline using `redis-cli --scan` piped through `xargs` is functional; `redis-cli` outputs raw integers when stdout is not a TTY, so the `awk` parsing works correctly.
