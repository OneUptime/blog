# Validation Summary: How to Choose Between RDB and AOF Persistence in Redis

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Redis Open Source persistence
- RDB snapshots
- AOF persistence and AOF rewrites
- Redis CLI commands
- redis.conf configuration
- Node.js monitoring with ioredis
- Bash backup and restore procedures

## Sources Consulted
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis 8.8 redis.conf sample: https://raw.githubusercontent.com/redis/redis/8.8/redis.conf
- Redis BGSAVE command documentation: https://redis.io/docs/latest/commands/bgsave/
- Redis SAVE command documentation: https://redis.io/docs/latest/commands/save/
- Redis LASTSAVE command documentation: https://redis.io/docs/latest/commands/lastsave/
- Redis BGREWRITEAOF command documentation: https://redis.io/docs/latest/commands/bgrewriteaof/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- ioredis README/API documentation: https://github.com/redis/ioredis

## Issues Found
- The post described AOF as a single `appendonly.aof` file throughout. Redis 7.0 and newer use multi-part AOF files in an `appenddirname` directory tracked by a manifest. Updated the AOF explanation, diagram label, configuration snippet, hybrid persistence description, backup script, and recovery notes to account for Redis 7.0+.
- The backup script did not reliably wait for the fresh `BGSAVE` to finish on first run because it compared `LASTSAVE` to a temporary file that might not exist. Changed it to capture `LASTSAVE` before `BGSAVE` and wait until the value changes.
- The backup script copied AOF data directly without handling Redis 7.0+ multi-part AOF rewrite safety. Updated it to disable automatic AOF rewrites, wait for any active rewrite to complete, archive `appendonlydir`, and then restore the rewrite percentage.
- The AOF restore procedure only showed the pre-Redis 7 single-file path. Added Redis 7.0+ restore comments for `appendonlydir` and manifest validation.
- The decision tree implied `appendfsync always` gives "zero" data loss. Changed that wording to "minimal" because Redis persistence still depends on the operating system and storage guarantees.

## Review Notes
The corrected post is technically accurate for current Redis Open Source behavior. Future improvements could include more production hardening for the sample backup script, such as restoring the AOF rewrite setting on script failure and handling authentication, TLS, non-default ports, or Redis Cluster deployments.
