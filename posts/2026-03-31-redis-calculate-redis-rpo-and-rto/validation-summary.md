# Validation Summary: How to Calculate Redis RPO and RTO

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- Redis (persistence: RDB, AOF)
- Redis Sentinel
- Redis Cluster
- AWS ElastiCache Multi-AZ
- Redis WAIT command (synchronous replication)
- Bash scripting for measurement

## Sources Consulted
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis Cluster documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- Redis WAIT command reference: https://redis.io/docs/latest/commands/wait/
- Redis CONFIG GET command reference: https://redis.io/docs/latest/commands/config-get/
- Redis INFO command reference: https://redis.io/docs/latest/commands/info/
- AWS ElastiCache Multi-AZ documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/AutoFailover.html
- GNU bc manual (integer arithmetic behavior)

## Issues Found
1. **`bc` integer division bug in RDB load time estimation**: The expression `echo "$RDB_SIZE_MB / 1024 * 4" | bc` produces 0 for any RDB file smaller than 1 GB because `bc` uses integer arithmetic by default (scale=0), so `$RDB_SIZE_MB / 1024` truncates to 0 before the multiplication. Fixed by reordering to `echo "$RDB_SIZE_MB * 4 / 1024" | bc` so multiplication happens first, giving correct non-zero results for RDB files as small as 256 MB.

## Review Notes
- The `date +%s%3N` syntax in the Sentinel failover script works on Linux (GNU coreutils) but not on macOS (where `%3N` is output literally). This is acceptable since Redis servers typically run on Linux.
- The RDB load time estimate of "1 GB in 3-5 seconds" is a rough approximation that varies significantly based on hardware and data complexity, but is reasonable as a ballpark for modern SSDs with simple data structures.
- The `CONFIG GET appendfsync` comment annotation (`# appendfsync: everysec`) doesn't match the exact redis-cli output format (which returns key and value on separate lines), but it serves as a readable annotation rather than literal output.
