# Redis Runbook: Handling Persistence Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Persistence, Runbook, RDB, AOF, Operation, Incident Response

Description: A step-by-step operational runbook for diagnosing and recovering from Redis persistence failures, covering RDB snapshot errors and AOF write failures.

---

## Redis Persistence Overview

Redis supports two persistence mechanisms:
- **RDB** - point-in-time snapshots saved to a `.rdb` file at configured intervals
- **AOF** - append-only log of every write operation

Persistence failures can cause data loss or Redis refusing to accept writes. This runbook covers both.

## Detecting Persistence Failures

### Check current persistence status

```bash
redis-cli INFO persistence
```

Look for these critical fields:

```text
rdb_last_bgsave_status:ok       # or 'err'
rdb_last_bgsave_time_sec:2
rdb_last_cow_size:1234567

aof_enabled:1
aof_last_write_status:ok        # or 'err'
aof_last_bgrewrite_status:ok    # or 'err'
aof_last_cow_size:567890
```

### Check for persistence errors in Redis logs

```bash
tail -100 /var/log/redis/redis-server.log | grep -iE "error|failed|persistence|rdb|aof"
```

### Alert if last RDB save failed

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def check_persistence_health():
    info = r.info('persistence')
    issues = []

    if info.get('rdb_last_bgsave_status') == 'err':
        issues.append("RDB BGSAVE failed")

    if info.get('aof_enabled') and info.get('aof_last_write_status') == 'err':
        issues.append("AOF write failed")

    if info.get('aof_last_bgrewrite_status') == 'err':
        issues.append("AOF BGREWRITE failed")

    rdb_save_ago = info.get('rdb_last_bgsave_time_sec', -1)
    if rdb_save_ago == -1:
        issues.append("RDB never saved successfully")

    if issues:
        print("PERSISTENCE ISSUES DETECTED:")
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("Persistence is healthy")

    return issues
```

## Runbook: RDB Snapshot Failure

### Symptoms
- `rdb_last_bgsave_status:err` in INFO persistence
- Log message: `Background saving error`

### Step 1 - Check available disk space

```bash
df -h /var/lib/redis

# Check inode usage too
df -i /var/lib/redis
```

If disk is full: free space or move Redis data directory to a larger volume.

### Step 2 - Check file permissions

```bash
ls -la /var/lib/redis/
# Redis must own the directory

# Fix permissions if needed
chown redis:redis /var/lib/redis/
chmod 750 /var/lib/redis/
```

### Step 3 - Check for OOM or resource limits

```bash
# Check system memory
free -h

# Check Redis process limits
cat /proc/$(pidof redis-server)/limits | grep -E "Max open files|Max processes"
```

### Step 4 - Manually trigger BGSAVE and verify

```bash
# Trigger a manual background save
redis-cli BGSAVE

# Check progress
redis-cli INFO persistence | grep rdb_bgsave_in_progress

# Wait for completion and check status
sleep 5
redis-cli INFO persistence | grep rdb_last_bgsave_status
```

### Step 5 - Disable saves temporarily if unresolvable

```bash
# Disable RDB saves to unblock writes (data loss risk!)
redis-cli CONFIG SET save ""
# Fix the underlying issue, then re-enable
redis-cli CONFIG SET save "3600 1 300 100 60 10000"
```

## Runbook: AOF Write Failure

### Symptoms
- `aof_last_write_status:err`
- Redis logs: `Aborting on data loss: We could not fsync to disk. Aborting.`
- Redis enters read-only mode

### Step 1 - Check if Redis is in read-only mode

```bash
redis-cli SET test_key test_value
# Error: "MISCONF Errors writing to the AOF file: <error details>"
```

### Step 2 - Check disk space and AOF file

```bash
df -h /var/lib/redis
ls -lh /var/lib/redis/*.aof
```

### Step 3 - Fix the AOF write error

After resolving disk issues (freeing space, remounting filesystem):

```bash
# Reset the error condition
redis-cli CONFIG SET appendonly yes

# Or restart Redis with error handling
systemctl restart redis
```

### Step 4 - Repair a corrupted AOF file

```bash
# Check if AOF is corrupted
redis-check-aof /var/lib/redis/appendonly.aof

# Auto-fix truncated AOF (safe - fixes truncation at end)
redis-check-aof --fix /var/lib/redis/appendonly.aof

# Verify Redis can start with repaired AOF
redis-server --appendonly yes --appendfilename appendonly.aof --dir /var/lib/redis
```

### Step 5 - Perform AOF rewrite to compact the file

```bash
# Trigger background AOF rewrite
redis-cli BGREWRITEAOF

# Monitor progress
redis-cli INFO persistence | grep aof_rewrite
```

## Runbook: Recovering from Complete Data Loss

If both RDB and AOF are corrupted or missing:

```bash
# 1. Stop Redis
systemctl stop redis

# 2. Check if replica has current data
redis-cli -h replica-host INFO replication | grep master_repl_offset

# 3. Promote replica to primary
redis-cli -h replica-host REPLICAOF NO ONE

# 4. Trigger BGSAVE on new primary
redis-cli -h replica-host BGSAVE

# 5. Copy RDB to original primary host
scp replica-host:/var/lib/redis/dump.rdb /var/lib/redis/dump.rdb

# 6. Start Redis on original host
systemctl start redis
```

## Prevention Checklist

```text
[ ] Monitor disk usage, alert at 80% full
[ ] Set appropriate save intervals (not too frequent on large datasets)
[ ] Use AOF + RDB for maximum durability
[ ] Set up replicas - they are your fastest recovery path
[ ] Test recovery procedure quarterly
[ ] Configure redis.conf: stop-writes-on-bgsave-error yes (default)
[ ] Set up off-site backup of RDB files
```

## Summary

Redis persistence failures are almost always caused by disk space exhaustion, permission issues, or filesystem errors. The key steps are: detect via `INFO persistence`, check disk and permissions, fix the root cause, then manually trigger BGSAVE or BGREWRITEAOF to resume normal persistence. Always maintain a replica - it is your fastest recovery option and can be promoted with a single command.
