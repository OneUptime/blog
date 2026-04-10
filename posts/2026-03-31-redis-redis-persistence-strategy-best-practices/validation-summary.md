# Validation Summary: Redis Persistence Strategy Best Practices

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (RDB persistence, AOF persistence, hybrid mode)
- redis-cli commands (BGSAVE, LASTSAVE, BGREWRITEAOF, DBSIZE, INFO persistence)
- redis.conf configuration directives
- Linux systemctl and cron

## Sources Consulted
- Redis official documentation on persistence: https://redis.io/docs/management/persistence/
- Redis official documentation on redis.conf: https://redis.io/docs/management/config/
- Redis official documentation on INFO command: https://redis.io/commands/info/
- Redis official documentation on BGSAVE: https://redis.io/commands/bgsave/
- Redis official documentation on BGREWRITEAOF: https://redis.io/commands/bgrewriteaof/
- Redis 7.0 release notes (multi-part AOF changes): https://github.com/redis/redis/releases/tag/7.0.0

## Issues Found
No technical issues found.

## Review Notes
- In Redis 7.0+, the AOF subsystem was rewritten to use multi-part AOF files (a base RDB file plus incremental AOF files stored in a directory). The `appendfilename` directive still works but the on-disk layout changed. The configuration shown in the post remains valid and is the correct way to configure AOF across all supported Redis versions.
- In Redis 7.0+, `aof-use-rdb-preamble` is no longer a meaningful setting because the multi-part AOF always uses RDB format for the base file. The directive is still accepted in the config for backward compatibility but has no effect. This does not make the post incorrect, but readers on Redis 7.0+ should be aware the hybrid format is always active when AOF is enabled.
- The `~1/10 throughput` estimate for `appendfsync always` is a rough approximation. Actual impact varies significantly by workload and disk I/O characteristics, but the relative ordering (always slowest, everysec moderate, no fastest) is correct.
- The post's recommendation of RDB + AOF hybrid with `appendfsync everysec` aligns with the official Redis documentation's recommendation for most production use cases.
