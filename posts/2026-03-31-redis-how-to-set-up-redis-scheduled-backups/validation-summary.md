# Validation Summary: How to Set Up Redis Scheduled Backups

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (RDB snapshots, AOF persistence, BGSAVE, BGREWRITEAOF)
- Bash scripting
- cron
- systemd timers and services
- AWS CLI / S3
- gzip compression

## Sources Consulted
- Redis official documentation on persistence (https://redis.io/docs/management/persistence/)
- Redis official documentation on CONFIG GET command (https://redis.io/commands/config-get/)
- Redis official documentation on BGSAVE (https://redis.io/commands/bgsave/)
- Redis official documentation on LASTSAVE (https://redis.io/commands/lastsave/)
- Redis official documentation on BGREWRITEAOF (https://redis.io/commands/bgrewriteaof/)
- Redis official documentation on SHUTDOWN (https://redis.io/commands/shutdown/)
- systemd.timer man page (https://www.freedesktop.org/software/systemd/man/systemd.timer.html)
- AWS CLI s3 cp documentation (https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html)
- crontab(5) man page

## Issues Found
1. **CONFIG GET commands missing password authentication in backup script**: The `CONFIG GET dir` and `CONFIG GET dbfilename` commands used to construct the `RDB_FILE` path did not include the `-a "$REDIS_PASSWORD"` flag, while all other `redis-cli` calls in the script properly handled the password case. This would cause the script to fail when Redis requires authentication. Fixed by wrapping the CONFIG GET calls in the same `if [ -n "$REDIS_PASSWORD" ]` pattern used elsewhere in the script.

## Review Notes
- The AOF backup snippet (standalone, not part of the main script) uses bare `redis-cli` calls without host/port/password parameters. This is acceptable for a conceptual example but readers connecting to a remote or password-protected Redis would need to add those flags.
- Starting with Redis 7.0, AOF uses a multi-part format stored in a subdirectory (`appendonlydir/`). The AOF backup snippet copies a single file via `appendfilename`, which works for Redis 6.x and earlier but not for Redis 7+. The post does not specify a Redis version, so this is noted as a caveat rather than an error.
- The verification script's `DBSIZE` output includes the Redis response prefix (e.g., `(integer) 42`), which is fine for display but would not work in arithmetic comparisons. This is acceptable since the script only echoes the value.
