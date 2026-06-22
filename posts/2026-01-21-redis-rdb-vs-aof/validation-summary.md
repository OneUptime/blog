# Validation Summary: How to Choose Between RDB and AOF (or Both)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Redis persistence
- RDB snapshots
- AOF persistence
- Redis configuration
- redis-check-aof
- Python
- Node.js

## Sources Consulted
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis 7.2 sample redis.conf: https://raw.githubusercontent.com/redis/redis/7.2/redis.conf
- redis-check-aof man page: https://manpages.debian.org/testing/redis-tools/redis-check-aof.1.en.html
- Redis issue discussion confirming Redis 7 multi-part AOF manifest repair target: https://github.com/redis/redis/issues/12951

## Issues Found
- The Python decision framework generated invalid Redis config for multi-line `save` settings because the stored values included `save` on subsequent lines, producing output like `save save 300 10`. Changed those values to `900 1\n300 10\n60 10000` so the generator emits valid `save` directives.
- The post described the RDB preamble feature as Redis 7.0+. Corrected it to Redis 4.0+ and noted that Redis 7.0+ uses multi-part AOF files with RDB base files by default.
- The hybrid file structure and recovery examples showed Redis 7 AOF as a single `appendonly.aof` file. Updated them to use the Redis 7 `appendonlydir` layout with the manifest and base/incremental AOF files.
- The large-dataset recommendation set `no-appendfsync-on-rewrite yes` without calling out the durability trade-off. Added warnings that this weakens durability during rewrites.

## Review Notes
The extracted Python and JavaScript snippets pass syntax checks with Python 3.12.3 and Node.js 22.22.0. Redis command-line tools were not installed locally, so Redis CLI behavior was checked against official Redis documentation and authoritative man page/source references.
