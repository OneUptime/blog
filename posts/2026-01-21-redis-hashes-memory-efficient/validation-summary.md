# Validation Summary: How to Use Redis Hashes for Memory-Efficient Storage

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Redis hashes
- Redis hash encodings: listpack, ziplist, hashtable
- Redis configuration via CONFIG GET and CONFIG SET
- Redis CLI commands: MEMORY USAGE, OBJECT ENCODING, HSET, HGET, HMGET, HINCRBY, HSCAN
- Python
- redis-py

## Sources Consulted
- Redis memory optimization documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/
- Redis OBJECT ENCODING command documentation: https://redis.io/docs/latest/commands/object-encoding/
- Redis CONFIG GET command documentation: https://redis.io/docs/latest/commands/config-get/
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/
- Redis HGETALL command documentation: https://redis.io/docs/latest/commands/hgetall/
- Redis HSCAN command documentation: https://redis.io/docs/latest/commands/hscan/
- Redis MEMORY USAGE command documentation: https://redis.io/docs/latest/commands/memory-usage/
- Redis DEBUG command documentation: https://redis.io/docs/latest/commands/debug/
- Redis HINCRBY command documentation: https://redis.io/docs/latest/commands/hincrby/
- Redis HMGET command documentation: https://redis.io/docs/latest/commands/hmget/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html

## Issues Found
- Updated Redis 7.0+ hash encoding terminology from ziplist-first wording to listpack/current compact hash encoding. Redis uses listpack for small hashes in Redis 7.0+ and ziplist in Redis 6.2 and earlier.
- Replaced current configuration examples from hash-max-ziplist-* to hash-max-listpack-* and added Redis 6.2-and-earlier notes for the ziplist settings.
- Replaced the normal monitoring recommendation from DEBUG OBJECT to OBJECT ENCODING. DEBUG is an internal development/testing command, while OBJECT ENCODING is the documented command for checking the internal encoding of a key.
- Replaced INFO memory | grep hash with MEMORY USAGE myhash for per-key memory inspection.
- Fixed Python bucket hashing examples that used Python's built-in hash(), which is randomized between interpreter processes and can map the same string ID to a different bucket after restart. The examples now use hashlib.sha256 for deterministic bucket selection.
- Fixed the counter bucketing example so the constructor's bucket count setting is actually used.
- Removed an unused local variable from the bucket hash memory comparison example.

## Review Notes
All Python code blocks were parsed successfully with python3. The memory comparison numbers remain example-dependent; actual values vary by Redis version, allocator, platform, configuration, and dataset shape.
