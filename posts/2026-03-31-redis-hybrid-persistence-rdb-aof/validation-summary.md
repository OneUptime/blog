# Validation Summary: How Hybrid Persistence (RDB + AOF) Works in Redis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (persistence subsystem)
- RDB (Redis Database) snapshots
- AOF (Append Only File) logging
- Hybrid persistence (`aof-use-rdb-preamble`)

## Sources Consulted
- Official Redis persistence documentation (https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)
- Redis INFO command documentation (https://redis.io/docs/latest/commands/info/)
- Redis 4.0 default redis.conf (`aof-use-rdb-preamble` introduced with default `no`)
- Redis 5.0 default redis.conf (`aof-use-rdb-preamble` changed to default `yes`)
- Redis 7.0 release notes (multi-part AOF introduction)
- Redis 7.2 source code (`src/rdb.h` for RDB_VERSION, `src/aof.c` for startup log messages)

## Issues Found
- **Incorrect startup log messages**: The recovery process section showed illustrative Redis startup log output that included "RDB loaded, now reading AOF tail..." and "AOF rewritten in 2 seconds". The first message does not match the actual Redis log wording (which is "Reading the remaining AOF tail..."), and "AOF rewritten in 2 seconds" is a background rewrite completion message that would never appear during startup loading. Removed the erroneous rewrite line and corrected the AOF tail message to match the actual Redis source code output.

## Review Notes
- **Redis 7.0+ multi-part AOF**: Since Redis 7.0, the AOF system uses a multi-part format with a directory structure (`appendonlydir/`) containing a base file, incremental files, and a manifest. The post's file paths (e.g., `/var/lib/redis/appendonly.aof` as a single file), `xxd` inspection command, and backup strategy are accurate for Redis 5.x-6.x but would need adjustment for Redis 7.0+. The core concepts of hybrid persistence remain the same across versions.
- **RDB version string**: The `REDIS0011` shown in the `xxd` output corresponds to RDB format version 11 (Redis 7.2+), while the single-file AOF paths shown are pre-7.0. This is a minor inconsistency in the illustrative example but does not affect the tutorial's correctness.
- **`aof_pending_rewrite` field**: Verified as a valid `INFO persistence` field that appears when AOF is enabled. The more commonly documented field `aof_rewrite_scheduled` serves a similar purpose and is always present regardless of AOF state.
- The `redis-check-aof` usage shown works for single-file AOF. For Redis 7.0+ multi-part AOF, users would need to pass the `--fix` flag with the manifest file path.
