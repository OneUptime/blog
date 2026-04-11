# Validation Summary: How to Migrate from Valkey to Redis

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Redis (server, CLI, replication, RDB persistence)
- Valkey (community fork of Redis)
- Python redis-py client library
- Linux systemd service management
- SCP for file transfer

## Sources Consulted
- Redis BGSAVE documentation: https://redis.io/docs/latest/commands/bgsave/
- Redis SAVE documentation: https://redis.io/docs/latest/commands/save/
- Redis LPOS documentation: https://redis.io/docs/latest/commands/lpos/ (added in Redis 6.0.6)
- Redis OBJECT FREQ documentation: https://redis.io/docs/latest/commands/object-freq/ (added in Redis 4.0)
- Redis WAITAOF documentation: https://redis.io/docs/latest/commands/waitaof/ (added in Redis 7.2)
- Redis replication documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- Valkey project documentation: https://valkey.io/docs/
- redis-py client documentation: https://redis-py.readthedocs.io/

## Issues Found
1. **BGSAVE comment incorrectly said "synchronous save"**: The command `BGSAVE` performs an asynchronous (background) save. The synchronous equivalent is `SAVE`. Changed the comment from "Trigger a synchronous save" to "Trigger a background save".

2. **WAITAOF incorrectly labeled as Valkey-specific**: The `WAITAOF` command was introduced in Redis 7.2 and is not Valkey-specific. Changed "WAITAOF (Valkey-specific, check Redis equivalent)" to "WAITAOF (available in Redis 7.2+)".

3. **Misleading "Common Valkey additions" framing**: The commands listed (LPOS, OBJECT FREQ, WAITAOF) are all standard Redis commands that existed before the Valkey fork. Changed the comment header from "Common Valkey additions to check" to "Commands to verify exist in your target Redis version" to accurately reflect the purpose of the list.

## Review Notes
- The live replication approach (Option 2) relies on Valkey and Redis maintaining replication protocol compatibility. This is true for current versions but could diverge as both projects evolve independently. Users should verify compatibility between their specific Valkey and Redis versions.
- The `valkey-cli COMMAND DOCS` command requires Redis 7.0+ protocol support. Older Valkey versions based on Redis 6.x may not support this command.
- The post correctly notes that `valkey-cli INFO server` reports a `redis_version` field for backward compatibility. Users may also want to check `valkey_version` for the actual Valkey version.
- The Python client code is correct and uses current redis-py API conventions.
