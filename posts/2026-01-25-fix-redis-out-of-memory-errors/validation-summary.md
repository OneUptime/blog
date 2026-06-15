# Validation Summary: How to Fix 'Redis out of memory' Errors

## Status
validated

## Post Type
Troubleshooting guide / technical tutorial

## Technologies Covered
- Redis Open Source
- redis-cli
- Redis memory management and eviction policies
- Redis active defragmentation
- redis-py
- Python

## Sources Consulted
- Redis FAQ: https://redis.io/docs/latest/develop/get-started/faq/
- Redis key eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Redis MEMORY USAGE command documentation: https://redis.io/docs/latest/commands/memory-usage/
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/
- Redis memory optimization documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/
- Redis OBJECT ENCODING command documentation: https://redis.io/docs/latest/commands/object-encoding/
- Redis example redis.conf: https://raw.githubusercontent.com/redis/redis/unstable/redis.conf
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html

## Issues Found
- The `redis-cli --bigkeys` description said it randomly samples keys and was presented as memory analysis. Redis documents `--bigkeys` as looking for keys with many elements, while `--memkeys` is for memory-heavy keys. Updated the wording and added `redis-cli --memkeys`.
- The eviction policy table omitted the current Redis 8.6+ LRM policies. Added `allkeys-lrm` and `volatile-lrm` with version notes.
- The hash example wrote a string to `user:123` and then attempted `HSET` on the same key, which would fail with a WRONGTYPE error. Changed the example to use separate string and hash keys.
- The compression example used `value: any`, which is syntactically valid but technically wrong as a type annotation. Changed it to `typing.Any`.
- The integer encoding example claimed `r.set('counter', '12345')` takes more memory than `r.set('counter', 12345)`. Redis stores string values representing signed 64-bit integers with `int` encoding, so the claim was misleading. Rewrote the example to show `OBJECT ENCODING` and compare against JSON wrapping.
- The "Hash Field Compression" section described listpack thresholds as compression. Renamed it to "Hash Listpack Encoding" and clarified that these settings control memory-efficient encoding for small hashes.
- The defragmentation shell snippet used bare `CONFIG SET` and `INFO memory | grep` in a bash block. Updated those commands to use `redis-cli`.
- The application sharding class claimed to implement consistent hashing but used modulo hashing. Updated the description to "hash-based sharding."

## Review Notes
Python code blocks were syntax-checked locally with `ast.parse`. Redis commands were not executed locally because `redis-cli` is not installed in this environment; command and configuration validation was performed against official Redis documentation and the Redis example configuration.
