# How to Handle Redis Persistence Failures in Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Persistence, Production, Reliability

Description: Diagnose and recover from Redis RDB and AOF persistence failures in production, including disk full errors, permission issues, and write blocking scenarios.

---

Redis persistence failures can cause write blocking, silent data loss, or complete inability to save state. This guide covers the most common failure modes, how to diagnose them, and how to recover without downtime.

## Detecting Persistence Failures

Check persistence status immediately when you suspect issues:

```bash
redis-cli INFO persistence
```

```text
rdb_last_bgsave_status:err
rdb_last_bgsave_time_sec:-1
aof_last_bgrewrite_status:err
aof_last_write_status:ok
```

A status of `err` indicates the last save failed. Check Redis logs for details:

```bash
tail -100 /var/log/redis/redis-server.log | grep -E "ERROR|WARN|Failed|error"
```

## Failure Mode 1: Disk Full

The most common cause of BGSAVE failure:

```text
# Redis log
Background saving error. The disk is full.
```

```bash
# Check disk usage
df -h /var/lib/redis

# Check Redis file sizes
ls -lh /var/lib/redis/
```

Resolution:

```bash
# Free space by removing old backup files
find /backup/redis -name "*.rdb" -mtime +7 -delete

# Or move the Redis data directory to a larger volume
redis-cli CONFIG SET dir /mnt/large-disk/redis/

# Trigger a new save after freeing space
redis-cli BGSAVE
```

## Failure Mode 2: Permission Denied

```text
# Redis log
Failed opening the RDB file dump.rdb (in server root dir /var/lib/redis) for saving: Permission denied
```

```bash
# Fix directory ownership
sudo chown -R redis:redis /var/lib/redis
sudo chmod 750 /var/lib/redis

# Restart Redis if permissions changed on config file
sudo systemctl restart redis
```

## Failure Mode 3: stop-writes-on-bgsave-error Blocking Writes

When persistence fails and `stop-writes-on-bgsave-error yes` is set (the default), Redis blocks all write commands:

```text
(error) MISCONF Redis is configured to save RDB snapshots, but it's currently unable to persist to disk.
```

Emergency workaround to restore writes while you investigate:

```bash
redis-cli CONFIG SET stop-writes-on-bgsave-error no
```

Fix the underlying disk/permission issue, then re-enable:

```bash
redis-cli CONFIG SET stop-writes-on-bgsave-error yes
redis-cli BGSAVE
```

## Failure Mode 4: AOF Write Failure

```text
# Redis log
Asynchronous AOF fsync is taking too long (disk is busy?). Writing the AOF buffer without waiting for fsync to complete, this may slow down Redis.
```

Check disk I/O:

```bash
iostat -x 1 5
redis-cli INFO persistence | grep aof_delayed_fsync
```

If the disk is permanently overloaded, consider moving the AOF file to a faster disk:

```bash
redis-cli CONFIG SET dir /mnt/fast-ssd/redis/
redis-cli BGREWRITEAOF
```

## Failure Mode 5: Fork Failure

On systems with low free memory or when `vm.overcommit_memory=0`:

```text
# Redis log
Background saving error: fork: Cannot allocate memory
```

Fix:

```bash
sudo sysctl -w vm.overcommit_memory=1
echo 'vm.overcommit_memory=1' | sudo tee -a /etc/sysctl.conf
redis-cli BGSAVE
```

## Recovery Checklist

When a persistence failure is detected:

```bash
# 1. Check disk space
df -h /var/lib/redis

# 2. Check permissions
ls -la /var/lib/redis/

# 3. Check system memory
free -h
sudo sysctl vm.overcommit_memory

# 4. Check last save status
redis-cli INFO persistence | grep last_bgsave_status

# 5. Review recent logs
tail -200 /var/log/redis/redis-server.log

# 6. Once fixed, trigger a save
redis-cli BGSAVE

# 7. Verify success
sleep 10
redis-cli INFO persistence | grep rdb_last_bgsave_status
```

## Preventing Future Failures

```text
# redis.conf - resilient persistence settings
stop-writes-on-bgsave-error yes     # Fail loud, not silent
rdbcompression yes                   # Reduce file size
rdbchecksum yes                      # Detect corruption early
```

Set disk space alerts at 70% full to act before Redis runs out of room for its temporary save files.

## Summary

Redis persistence failures fall into five categories: disk full, permission denied, write blocking from `stop-writes-on-bgsave-error`, fork failure, and AOF write errors. Diagnose using `INFO persistence` and Redis logs. Temporarily disable `stop-writes-on-bgsave-error` to restore writes during an outage, then fix the root cause (disk space, permissions, or `vm.overcommit_memory`) before re-enabling. Monitor disk usage proactively to prevent failures from occurring in the first place.
