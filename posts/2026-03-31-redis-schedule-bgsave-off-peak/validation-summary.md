# Validation Summary: How to Schedule Redis BGSAVE at Off-Peak Hours

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (BGSAVE, CONFIG SET, INFO persistence, LASTSAVE, redis-check-rdb)
- Linux cron and /etc/cron.d
- Bash scripting
- Kubernetes CronJob (batch/v1)

## Sources Consulted
- Redis BGSAVE command documentation: https://redis.io/docs/latest/commands/bgsave/
- Redis CONFIG SET documentation: https://redis.io/docs/latest/commands/config-set/
- Redis CONFIG GET documentation: https://redis.io/docs/latest/commands/config-get/
- Redis INFO command (persistence section): https://redis.io/docs/latest/commands/info/
- Redis LASTSAVE documentation: https://redis.io/docs/latest/commands/lastsave/
- Redis persistence (RDB) documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- crontab(5) and cron(8) man pages for /etc/cron.d format

## Issues Found
No technical issues found.

## Review Notes
- The BGSAVE wait loop checks `rdb_current_bgsave_time_sec` for `-1` to detect completion. There is a theoretical race condition where the check could run before the fork starts and see `-1` from the prior state, but this window is negligible in practice and the approach is standard.
- `date -d @timestamp` is GNU/Linux-specific. On macOS, the equivalent is `date -r <timestamp>`. Since Redis servers overwhelmingly run on Linux, this is appropriate for the target audience.
- `redis-cli -a yourpassword` works but prints a security warning in Redis 6+. Using the `REDISCLI_AUTH` environment variable is the recommended alternative, but the command shown is not incorrect.
