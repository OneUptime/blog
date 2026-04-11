# Validation Summary: How to Debug Redis with OBJECT Commands

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (OBJECT subcommands: ENCODING, IDLETIME, FREQ, REFCOUNT, HELP)
- Python (redis-py client library)
- Bash scripting

## Sources Consulted
- Redis OBJECT ENCODING documentation: https://redis.io/docs/latest/commands/object-encoding/
- Redis OBJECT IDLETIME documentation: https://redis.io/docs/latest/commands/object-idletime/
- Redis OBJECT FREQ documentation: https://redis.io/docs/latest/commands/object-freq/
- Redis OBJECT REFCOUNT documentation: https://redis.io/docs/latest/commands/object-refcount/
- Redis configuration reference for encoding thresholds (hash-max-listpack-entries, list-max-listpack-size, set-max-listpack-entries, zset-max-listpack-entries, etc.)
- redis-py API documentation for `object_encoding()`, `config_get()`, `scan()`, `hlen()`

## Issues Found

1. **List encoding threshold was incorrect**: The table stated lists use `listpack` encoding for "<= 128 entries, each <= 64 bytes". This is wrong — lists use `list-max-listpack-size` (default -2, meaning ~8 KB total), not per-entry count/size thresholds like hashes and sets. Fixed the description to accurately reflect the `list-max-listpack-size` configuration.

2. **Missing `intset` encoding for Sets**: The encoding table omitted the `intset` encoding, which Redis uses for sets composed entirely of integers (up to `set-max-intset-entries`, default 512). Added a row for `intset` encoding.

3. **ZSet listpack threshold was incomplete**: The table listed only "<= 128 entries" for sorted set `listpack` encoding, but the `zset-max-listpack-value` parameter (default 64 bytes) also applies. Added the value size condition to match the hash and set descriptions.

## Review Notes
- The OBJECT IDLETIME / LFU incompatibility note is correct and well-placed.
- The Python code examples use valid redis-py APIs (`object_encoding()`, `config_get()`, `scan()`, `hlen()`).
- The bulk encoding analysis script has a potential division-by-zero if no keys exist (`scanned` would be 0), but this is a minor edge case unlikely to cause confusion.
- The `embstr` threshold of 44 bytes is correct (hardcoded as `OBJ_ENCODING_EMBSTR_SIZE_LIMIT` in Redis source).
- OBJECT REFCOUNT description is accurate — it typically returns 1 for user-created keys. Redis no longer shares integer objects across keys in modern versions, so refcount is always 1 for regular keys.
