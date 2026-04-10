# Validation Summary: Why You Should Not Disable Persistence Without Understanding Risks

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (in-memory data store)
- RDB (Redis Database) persistence
- AOF (Append Only File) persistence
- redis-cli (Redis command-line interface)
- redis-benchmark (Redis benchmarking tool)
- redis.conf configuration

## Sources Consulted
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis CONFIG SET command documentation: https://redis.io/docs/latest/commands/config-set/
- Redis LASTSAVE command documentation: https://redis.io/docs/latest/commands/lastsave/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis DEBUG command documentation: https://redis.io/docs/latest/commands/debug/
- Redis redis-benchmark documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/

## Issues Found
1. **Misleading `DEBUG SLEEP 0` command in Monitoring section**: The original post included `redis-cli DEBUG sleep 0` followed by `redis-cli LASTSAVE` with the comment "Check time since last save." `DEBUG SLEEP 0` is a no-op (sleeps for 0 seconds) and serves no purpose in this context. Additionally, `DEBUG` commands are restricted by default in Redis 7+ (requiring `enable-debug-command yes` in config) and should not be recommended for routine monitoring. Replaced with `redis-cli INFO persistence | grep rdb_last_save_time` and `redis-cli INFO persistence | grep rdb_changes_since_last_save`, which actually provide the relevant information (last save timestamp and number of unsaved changes).

## Review Notes
- The benchmark numbers (~90,000 vs ~95,000 ops/sec) are illustrative approximations, not exact figures. This is acceptable for demonstrating the marginal difference, but actual results vary significantly by hardware, Redis version, and workload.
- The `aof-use-rdb-preamble` option has been enabled by default since Redis 7.0. The post doesn't mention version specifics, which is fine since the config snippet explicitly sets it.
- The `no-appendfsync-on-rewrite` comment says "Reduces I/O during compaction" — technically it reduces I/O during AOF rewrite (BGREWRITEAOF). "Compaction" is a reasonable shorthand but not the official Redis terminology.
- For financial/critical data, the post recommends `AOF always` (`appendfsync always`). This is correct for maximum durability but comes with significant write latency cost. The post could mention this trade-off but it's not technically wrong as-is.
