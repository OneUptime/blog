# How to Troubleshoot Redis AOF File Corruption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, AOF, Persistence, Corruption, Troubleshooting, Recovery

Description: Diagnose and recover from Redis AOF file corruption using redis-check-aof, understand truncation vs. corruption, and prevent future AOF issues.

---

## What Causes AOF File Corruption

The Redis Append-Only File (AOF) records every write command. Corruption can occur when:

- The server loses power or crashes mid-write, leaving an incomplete command at the end of the AOF
- Disk errors write garbage bytes into the middle of the file
- The filesystem runs out of space during an AOF rewrite
- A bug in the AOF rewrite produces incorrect output

Redis distinguishes between truncation (incomplete final command) and corruption (invalid data in the middle of the file). Truncation is safe to auto-repair; mid-file corruption requires manual investigation.

## Step 1 - Identify the Error

Redis logs the AOF error on startup:

```bash
tail -100 /var/log/redis/redis-server.log | grep -iE 'aof|corrupt|error|truncat'
```

Common messages:

```text
Bad file format reading the append only file: make a backup of your AOF file, then use ./redis-check-aof --fix
Unexpected end of file reading the append only file
```

If Redis exits on startup, check the exit code:

```bash
journalctl -u redis --since "10 minutes ago" | grep -iE 'aof|error|exit'
```

## Step 2 - Validate the AOF File

```bash
redis-check-aof /var/lib/redis/appendonly.aof
```

Output for a truncated file (safe to fix):

```text
0x         3db: Expected \r\n, got: 6400
AOF analyzed: size=999, ok_up_to=987, ok_up_to_line=4567, diff=12
AOF is not valid. Use the --fix option to try fixing it.
```

Output for a corrupted file (mid-file corruption):

```text
Checking file integrity...
ERROR: AOF is not valid at offset 1048576
```

## Step 3 - Back Up Before Repair

Always back up before running `--fix`:

```bash
cp /var/lib/redis/appendonly.aof /var/lib/redis/appendonly.aof.backup.$(date +%Y%m%d%H%M%S)
```

## Step 4 - Fix a Truncated AOF

For truncation at the end of the file (most common after a crash):

```bash
redis-check-aof --fix /var/lib/redis/appendonly.aof
```

This removes the incomplete final command and re-validates the file. The data loss is limited to the last partial transaction written before the crash.

## Step 5 - Handle Mid-File Corruption

Mid-file corruption is more serious. The tool reports the byte offset of the first bad entry:

```text
ERROR: AOF is not valid at offset 1048576
```

Options:

1. Truncate at the corruption point (lose all data after that offset):

```bash
truncate -s 1048576 /var/lib/redis/appendonly.aof
redis-check-aof --fix /var/lib/redis/appendonly.aof
```

2. If you have an RDB snapshot that is more recent than the corruption point, consider starting from the RDB instead:

```bash
# Disable AOF temporarily
sed -i 's/appendonly yes/appendonly no/' /etc/redis/redis.conf
systemctl restart redis
```

3. Restore from a backup AOF or RDB snapshot.

## Step 6 - Use AOF with RDB Preamble

With `aof-use-rdb-preamble yes` (default since Redis 5+), the AOF file starts with an RDB snapshot followed by incremental AOF commands. Corruption in the AOF tail is limited to recent changes since the last rewrite.

```bash
redis-cli CONFIG GET aof-use-rdb-preamble
```

If not enabled:

```bash
redis-cli CONFIG SET aof-use-rdb-preamble yes
# Force a rewrite to regenerate the AOF with RDB preamble
redis-cli BGREWRITEAOF
```

## Step 7 - Validate After Fix and Restart

After fixing the AOF:

```bash
# Validate again
redis-check-aof /var/lib/redis/appendonly.aof

# Start Redis and verify it loads
systemctl start redis
redis-cli PING
redis-cli INFO persistence | grep aof_last_bgrewrite_status
```

Expected:

```text
aof_last_bgrewrite_status:ok
aof_last_write_status:ok
```

## Step 8 - Prevent Future Corruption

1. Enable `fsync always` for maximum durability (slower but safer):

```text
appendfsync always
```

2. Enable `no-appendfsync-on-rewrite no` to ensure fsync runs even during rewrites:

```text
no-appendfsync-on-rewrite no
```

3. Monitor filesystem free space and alert before it reaches 0.

4. Use a UPS or filesystem with journaling to reduce crash-related corruption.

## Summary

Redis AOF corruption is most commonly caused by incomplete writes during crashes, resulting in truncation that `redis-check-aof --fix` can automatically repair with minimal data loss. Mid-file corruption is rarer and usually requires truncating at the corruption point or restoring from a backup. Enable `aof-use-rdb-preamble` to limit the scope of potential AOF corruption and always back up the AOF file before attempting repair.
