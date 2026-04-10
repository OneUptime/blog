# How to Troubleshoot Redis RDB Save Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RDB, Persistence, Troubleshooting, Snapshot

Description: Learn how to diagnose and resolve Redis RDB save failures, including fork errors, disk space issues, and BGSAVE permission problems.

---

Redis RDB (Redis Database) saves are background snapshots that persist your data to disk. When they fail, you risk data loss on restart. Common symptoms include `BGSAVE failed` errors in logs or `rdb_last_bgsave_status:err` in INFO output.

## Check RDB Save Status

Start by inspecting the current persistence state:

```bash
redis-cli INFO persistence | grep rdb
```

Key fields to check:

```text
rdb_last_bgsave_status:err
rdb_last_bgsave_time_sec:-1
rdb_last_cow_size:0
```

If `rdb_last_bgsave_status` is `err`, the last BGSAVE failed.

## Common Cause 1 - Disk Space

RDB save requires enough disk space to write the snapshot file:

```bash
df -h /var/lib/redis
```

If the disk is full, free space or move the `dir` config to a larger partition:

```bash
# In redis.conf
dir /mnt/large-disk/redis-data
```

## Common Cause 2 - Fork Failure

Redis uses `fork()` to create a child process for BGSAVE. On systems with high memory usage, this can fail:

```bash
redis-cli INFO server | grep "os:"
dmesg | grep "Cannot allocate memory"
```

Enable overcommit memory to allow fork to succeed:

```bash
echo 1 | sudo tee /proc/sys/vm/overcommit_memory
# Make permanent
echo "vm.overcommit_memory = 1" | sudo tee -a /etc/sysctl.conf
```

## Common Cause 3 - File Permissions

Redis must be able to write to the configured `dir` directory:

```bash
ls -la /var/lib/redis/
# Should be owned by redis user
sudo chown -R redis:redis /var/lib/redis/
```

Also check the `dbfilename` setting:

```bash
grep "dbfilename\|dir" /etc/redis/redis.conf
```

## Trigger and Monitor BGSAVE

Manually trigger a save and watch the result:

```bash
redis-cli BGSAVE
# Then check status after a moment
redis-cli LASTSAVE
redis-cli INFO persistence | grep rdb_last_bgsave
```

To monitor BGSAVE progress:

```bash
redis-cli INFO persistence | grep rdb_bgsave_in_progress
redis-cli INFO persistence | grep rdb_current_bgsave_time_sec
```

## Prevent Future Failures

Configure Redis to alert when saves fail using the `stop-writes-on-bgsave-error` option:

```text
# redis.conf
stop-writes-on-bgsave-error yes
save 900 1
save 300 10
save 60 10000
```

With `stop-writes-on-bgsave-error yes`, Redis will refuse writes if a save fails, preventing silent data loss.

## Summary

Redis RDB save failures are usually caused by disk space exhaustion, fork failures due to memory overcommit settings, or file permission issues. Check `INFO persistence` to confirm failure, review system logs for fork errors, and ensure the Redis data directory has sufficient space and correct ownership. Enabling `stop-writes-on-bgsave-error` protects data consistency when saves fail.
