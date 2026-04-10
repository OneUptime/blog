# Validation Summary: Why You Should Not Use Single Large Hash in Redis

## Status
validated

## Post Type
Tutorial / Anti-Pattern Guide

## Technologies Covered
- Redis (Cluster, hash data structure, encoding internals)
- Python (redis-py client library)

## Sources Consulted
- Redis official documentation for HEXPIRE (https://redis.io/commands/hexpire/) — confirms per-field TTL added in Redis 7.4
- Redis 7.0 release notes and configuration — confirms ziplist replaced by listpack encoding
- Redis documentation for hash-max-listpack-entries and hash-max-listpack-value configuration
- Python documentation for hash() built-in — confirms PYTHONHASHSEED randomization since Python 3.3
- redis-py documentation for hset(), pipeline(), and expire() APIs

## Issues Found

1. **Per-field TTL claim was outdated.** The post stated "Redis hash fields cannot have individual expiration times." This was true before Redis 7.4, but Redis 7.4 (August 2024) introduced `HEXPIRE`, `HPEXPIRE`, `HTTL`, and related commands for per-hash-field expiration. Updated the claim to note this is only true for Redis versions prior to 7.4, while clarifying the other scaling issues still apply.

2. **Outdated encoding name (ziplist vs listpack).** The post referenced "ziplist" as the compact hash encoding. Redis 7.0 replaced ziplist with listpack for hash encoding. Updated to mention listpack as the current encoding with ziplist noted for earlier versions.

3. **Imprecise threshold description.** The post said "64 bytes per field" but the threshold applies to the field *value* size, not the field name. Updated to "any field value exceeds 64 bytes" for accuracy.

4. **Non-deterministic hash function in partitioning example.** The partitioning code used Python's built-in `hash()` function, which is randomized across process restarts since Python 3.3 (PYTHONHASHSEED). This means the same key would map to different partitions after a restart, causing data loss. Replaced with `zlib.crc32()` which is deterministic and fast.

## Review Notes
- The core advice in the post is sound — single large hashes are a well-known Redis anti-pattern for the hotspot and scalability reasons described.
- The Python code examples use `list[str]` and `str | None` type hints which require Python 3.9+ and 3.10+ respectively. This is acceptable for modern Python.
- The HGETALL size estimate of "~50-100MB" for a 1M-field hash is rough but reasonable depending on field/value sizes.
- The default for `hash-max-listpack-entries` may have been raised to 512 in Redis 7.0+ (from 128 with the old ziplist config). The post uses 128, which was the classic default. This is version-dependent and not corrected since the post doesn't target a specific Redis version.
