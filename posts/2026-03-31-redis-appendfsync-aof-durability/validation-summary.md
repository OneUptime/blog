# Validation Summary: How to Configure Redis appendfsync for AOF Durability

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis AOF (Append-Only File) persistence
- Redis `appendfsync` directive (`always`, `everysec`, `no`)
- Redis CLI (`redis-cli CONFIG SET/GET`, `redis-cli INFO persistence`)
- `redis-benchmark` tool
- `no-appendfsync-on-rewrite` configuration

## Sources Consulted
- Redis official documentation on persistence: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis official documentation on redis.conf directives: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis `redis-benchmark` documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/
- Redis `INFO` command documentation: https://redis.io/docs/latest/commands/info/

## Issues Found
- **Internal throughput inconsistency for `always` mode**: The `always` section originally stated throughput is "typically a few hundred writes per second," but the benchmark section later shows 2,000-5,000 ops/sec on a standard SSD. "A few hundred" is appropriate for HDDs but not SSDs, creating a contradiction with the SSD-specific benchmark numbers. Fixed by clarifying: "typically a few hundred writes per second on HDDs or a few thousand on SSDs."

## Review Notes
- The `everysec` description states "you lose at most one second of data on a crash." This matches Redis's official documentation, but in practice the worst case can be closer to ~2 seconds if a previous background fsync was still in-progress when the crash occurred. This is a known subtlety documented in Redis source comments but is consistent with how the official docs present it.
- The `INFO persistence` output fields shown (e.g., `aof_buffer_length`, `aof_rewrite_buffer_length`) are accurate for Redis 6.x. In Redis 7.0+, the AOF subsystem was reworked to use multi-part AOF files, and some of these field names may differ. The post does not specify a Redis version, so this is not an error but a version-specific caveat.
- All CLI commands (`CONFIG SET`, `CONFIG GET`, `INFO persistence`) are correct and use proper syntax.
- The `redis-benchmark` command syntax is valid — passing `SET key value` as trailing arguments benchmarks that specific command.
- The three `appendfsync` modes, their behaviors, and the `no-appendfsync-on-rewrite` interplay are all accurately described and match official Redis documentation.
