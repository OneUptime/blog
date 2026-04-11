# How to Use redis-check-aof for AOF File Repair

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, AOF, Persistence

Description: Learn how to use redis-check-aof to validate and repair corrupted AOF files so you can recover Redis data after unexpected crashes or disk errors.

---

`redis-check-aof` is a utility that validates and repairs Redis AOF (Append Only File) persistence files. When Redis crashes mid-write, the AOF file can have a truncated or malformed tail. This tool can detect and fix these issues.

## Understanding AOF Files

AOF persistence logs every write operation to disk:

```text
# redis.conf
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
```

AOF files are stored as Redis protocol text:

```text
*3
$3
SET
$5
mykey
$7
myvalue
```

Check AOF status:

```bash
redis-cli CONFIG GET appendonly
redis-cli INFO persistence | grep aof
ls -lh /var/lib/redis/appendonly.aof
```

## Running redis-check-aof

Validate an AOF file without modifying it:

```bash
redis-check-aof /var/lib/redis/appendonly.aof
```

Output when valid:

```text
AOF analyzed: size=2048576, ok_up_to=2048576, ok_up_to_line=15234, diff=0
AOF is valid
```

Output when corrupted:

```text
AOF analyzed: size=2048576, ok_up_to=2041234, ok_up_to_line=14892, diff=7342
AOF is not valid. Use the --fix option to try fixing it.
```

## Repairing a Corrupted AOF File

Use the `--fix` flag to truncate the file at the last valid position:

```bash
# Always back up first
cp /var/lib/redis/appendonly.aof /var/lib/redis/appendonly.aof.backup

# Then repair
redis-check-aof --fix /var/lib/redis/appendonly.aof
```

You will be prompted to confirm:

```text
This will shrink the AOF from 2048576 bytes, with 7342 bytes, to 2041234 bytes
Continue? [y/N]: y
Successfully truncated AOF
```

## Automating AOF Validation

Run validation as part of your health check routine:

```bash
#!/bin/bash
AOF="/var/lib/redis/appendonly.aof"
RESULT=$(redis-check-aof "$AOF" 2>&1)

if echo "$RESULT" | grep -q "AOF is valid"; then
  echo "AOF validation passed"
  exit 0
else
  echo "AOF validation failed: $RESULT"
  # Alert your on-call team
  exit 1
fi
```

## Handling Multi-Part AOF (Redis 7+)

Redis 7 introduced multi-part AOF files stored in a directory:

```bash
# Check AOF directory
ls /var/lib/redis/appendonlydir/
# appendonly.aof.1.base.rdb
# appendonly.aof.1.incr.aof
# appendonly.aof.manifest
```

Validate the incremental AOF:

```bash
redis-check-aof /var/lib/redis/appendonlydir/appendonly.aof.1.incr.aof
```

## Recovery Workflow After Crash

```bash
#!/bin/bash
set -e
AOF="/var/lib/redis/appendonly.aof"
BACKUP="${AOF}.$(date +%Y%m%d%H%M%S).bak"

# 1. Stop Redis if running
systemctl stop redis

# 2. Back up the damaged file
cp "$AOF" "$BACKUP"
echo "Backed up to $BACKUP"

# 3. Check and fix
redis-check-aof --fix "$AOF"

# 4. Restart Redis
systemctl start redis
echo "Redis restarted successfully"
```

## Summary

`redis-check-aof` is a critical recovery tool for AOF-enabled Redis instances. Run it without `--fix` to assess damage, then use `--fix` after backing up to truncate corrupted tails. Integrating AOF validation into crash recovery runbooks ensures faster, safer data restoration.
