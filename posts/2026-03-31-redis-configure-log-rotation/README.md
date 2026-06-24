# How to Configure Redis Log Rotation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Log Rotation, Logrotate, Linux, Operation

Description: Configure log rotation for Redis using logrotate to prevent Redis log files from growing unbounded, with daily rotation, compression, and signal-based log reopening.

---

Redis logs to a file in production, and without log rotation that file can grow until it fills the disk. The standard tool for managing log rotation on Linux is `logrotate`, which is already installed on most distributions.

## Check the Current Log File Location

```bash
redis-cli CONFIG GET logfile
# 1) "logfile"
# 2) "/var/log/redis/redis-server.log"
```

If `logfile` is empty, Redis is logging to stdout. Set it in redis.conf:

```text
logfile /var/log/redis/redis-server.log
```

Then restart Redis.

## Create a logrotate Configuration

```bash
sudo tee /etc/logrotate.d/redis > /dev/null <<'EOF'
/var/log/redis/redis-server.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 640 redis redis
}
EOF
```

Options explained:
- `daily` - rotate once per day.
- `rotate 14` - keep 14 rotated log files.
- `compress` - gzip rotated files.
- `delaycompress` - compress the previous rotation, not the current one (allows the file to be fully closed first).
- `missingok` - no error if the log file is missing.
- `notifempty` - do not rotate empty files.
- `create 640 redis redis` - create the new log file with correct permissions.

## Why No Postrotate Script Is Needed

Unlike many daemons, Redis does not keep the log file descriptor open between writes. It opens the log file, writes the message, and closes the file on every single log entry. This means that after logrotate renames the old log file, Redis will automatically create a new file at the configured path on the next log write. No signal or postrotate command is required.

Note that `SIGUSR1` does not cause Redis to reopen its log file. In Redis, `SIGUSR1` is used to terminate the background RDB-saving child process. Sending `SIGUSR1` to the main Redis process has no effect on logging.

## Test the logrotate Configuration

```bash
# Dry run - shows what would happen
sudo logrotate --debug /etc/logrotate.d/redis

# Force rotation (even if not due)
sudo logrotate --force /etc/logrotate.d/redis

# Verify rotation happened
ls -lh /var/log/redis/
```

## Rotating Multiple Redis Instances

If you run multiple Redis instances with separate log files, add them to the same logrotate config:

```text
/var/log/redis/redis-server.log
/var/log/redis/redis-replica.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 640 redis redis
}
```

## Summary

Configure Redis log rotation with logrotate by creating `/etc/logrotate.d/redis` with daily rotation, 14-file retention, and gzip compression. No postrotate script is needed because Redis opens and closes the log file on every write, so it automatically starts writing to the new file after rotation. Use `logrotate --force` to test your configuration without waiting for the scheduled run.
