# Validation Summary: How to Troubleshoot Redis RDB Save Failures

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Redis (RDB persistence, BGSAVE)
- Linux system administration (vm.overcommit_memory, sysctl, file permissions)
- Redis CLI commands (INFO, BGSAVE, LASTSAVE)

## Sources Consulted
- Redis official documentation on persistence: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis BGSAVE command documentation: https://redis.io/docs/latest/commands/bgsave/
- Redis DEBUG command documentation: https://redis.io/docs/latest/commands/debug/
- Redis configuration documentation (stop-writes-on-bgsave-error, save directives): https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Linux kernel documentation on vm.overcommit_memory: https://www.kernel.org/doc/Documentation/vm/overcommit-accounting

## Issues Found
1. **Incorrect use of `DEBUG SLEEP 0` with misleading comment**: The post claimed `redis-cli DEBUG SLEEP 0` would "force config flush." In reality, `DEBUG SLEEP` makes the Redis server sleep for the specified number of seconds — it has nothing to do with config flushing or BGSAVE monitoring. Replaced with `redis-cli INFO persistence | grep rdb_bgsave_in_progress` which correctly checks whether a BGSAVE is currently running.

2. **Wrong INFO section for RDB fields**: The post used `redis-cli INFO stats | grep rdb` to monitor RDB progress. RDB-related fields (`rdb_bgsave_in_progress`, `rdb_current_bgsave_time_sec`, etc.) are under the `persistence` section, not `stats`. The `stats` section does not contain RDB fields, so this grep would return no results. Replaced with `redis-cli INFO persistence | grep rdb_current_bgsave_time_sec` which correctly shows the duration of an ongoing BGSAVE operation.

## Review Notes
- The `save 900 1`, `save 300 10`, `save 60 10000` values shown are the classic Redis defaults. Note that as of Redis 6.2+, the defaults changed slightly, but these remain valid and commonly used configuration values.
- The post correctly recommends `vm.overcommit_memory = 1`, which is the standard Redis recommendation documented in the official Redis administration guide.
- The `stop-writes-on-bgsave-error yes` behavior is accurately described — Redis will return errors on write commands when the last BGSAVE failed, which is the default behavior.
