# Validation Summary: How to Save Redis Data to Disk (Persistence Basics)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (RDB persistence)
- Redis (AOF persistence)
- Redis hybrid persistence (RDB + AOF)
- Redis CLI commands (SAVE, BGSAVE, LASTSAVE, BGREWRITEAOF, CONFIG SET, CONFIG GET, INFO)

## Sources Consulted
- Redis official documentation on persistence: https://redis.io/docs/management/persistence/
- Redis official documentation on redis.conf directives: https://redis.io/docs/management/config/
- Redis SAVE command reference: https://redis.io/commands/save/
- Redis BGSAVE command reference: https://redis.io/commands/bgsave/
- Redis BGREWRITEAOF command reference: https://redis.io/commands/bgrewriteaof/
- Redis INFO command reference: https://redis.io/commands/info/

## Issues Found
1. **Incorrect RDB data loss estimate**: The post claimed "Data loss between snapshots (up to 5 minutes by default)" in the RDB Cons section. This is inaccurate. The default save rules listed in the same post include `save 900 1`, meaning if only 1 key changes, a snapshot won't trigger for up to 900 seconds (15 minutes). The "5 minutes" figure only applies to the `save 300 10` rule, which requires at least 10 keys to have changed. Fixed to "up to 15 minutes with default save rules" to reflect the worst-case scenario.

## Review Notes
- In Redis 7.0+, AOF uses a multi-part format stored in an `appendonlydir` directory rather than a single `appendonly.aof` file. The `appendfilename` directive now serves as a base name prefix. The backup strategy section (`cp appendonly.aof`) would need adjustment for Redis 7+. Since the post does not target a specific version and the older config remains functional, this is not an error but worth noting for a future update.
- The `aof-use-rdb-preamble` option has been enabled by default since Redis 5.0, so the hybrid section's explicit `yes` setting is redundant on modern Redis but not incorrect.
- All CLI commands (SAVE, BGSAVE, LASTSAVE, BGREWRITEAOF, CONFIG SET, CONFIG GET, INFO persistence) are verified correct.
- All redis.conf directives and their values are accurate.
- The persistence recommendations table aligns with community best practices.
