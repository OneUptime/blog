# How to Configure Redis Persistence (RDB vs AOF)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Persistence, RDB, AOF, Database, Data Durability

Description: Learn how to configure Redis persistence using RDB snapshots and AOF logs, including hybrid persistence and choosing the right strategy for your use case.

---

> Redis is blazing fast because it stores data in memory. But memory is volatile - a restart means data loss. Persistence bridges this gap, letting you keep Redis fast while protecting your data.

## Why Persistence Matters

Redis without persistence is just a cache. With persistence, it becomes a durable data store suitable for:

- Session storage
- Rate limiting counters
- Queues and job data
- Real-time analytics
- Leaderboards and rankings

The two persistence mechanisms - RDB and AOF - offer different tradeoffs between performance, durability, and recovery time.

## RDB (Redis Database) Snapshots

RDB creates point-in-time snapshots of your dataset at specified intervals. Think of it as periodic full backups.

### How RDB Works

```
Time ─────────────────────────────────────────────────────►

     │         │         │         │
     ▼         ▼         ▼         ▼
   [Save]   [Save]    [Save]    [Save]
     │         │         │         │
     ▼         ▼         ▼         ▼
  dump.rdb  dump.rdb  dump.rdb  dump.rdb
```

Redis forks a child process to write the snapshot, so the parent continues serving requests without blocking.

### Configuring RDB

```conf
# redis.conf - RDB Configuration

# Save after 900 seconds (15 min) if at least 1 key changed
save 900 1

# Save after 300 seconds (5 min) if at least 10 keys changed
save 300 10

# Save after 60 seconds if at least 10000 keys changed
save 60 10000

# Filename for the RDB file
dbfilename dump.rdb

# Directory where RDB file will be stored
dir /var/lib/redis

# Compress the RDB file using LZF compression
rdbcompression yes

# Include checksum at the end of the RDB file
rdbchecksum yes

# Stop accepting writes if RDB save fails
stop-writes-on-bgsave-error yes
```

### Manual RDB Operations

```bash
# Trigger a background save (non-blocking)
redis-cli BGSAVE

# Trigger a synchronous save (blocks all clients)
redis-cli SAVE

# Check last save time
redis-cli LASTSAVE

# Check background save status
redis-cli INFO persistence | grep rdb
```

### RDB Pros and Cons

**Advantages:**
- Compact single-file backups
- Perfect for disaster recovery
- Faster restarts with large datasets
- Minimal performance impact during normal operation

**Disadvantages:**
- Data loss between snapshots (minutes of data)
- Fork operation can be slow with large datasets
- Not suitable when you cannot afford data loss

## AOF (Append Only File) Logging

AOF logs every write operation, allowing you to replay the log to reconstruct the dataset. It provides much better durability than RDB.

### How AOF Works

```
Client Commands          AOF File
      │                     │
      ▼                     │
   SET foo bar ───────────► SET foo bar
   INCR counter ──────────► INCR counter
   LPUSH list x ──────────► LPUSH list x
   DEL foo ───────────────► DEL foo
      │                     │
      ▼                     ▼
  [Response]          [Durable Log]
```

### Configuring AOF

```conf
# redis.conf - AOF Configuration

# Enable AOF persistence
appendonly yes

# AOF filename
appendfilename "appendonly.aof"

# Directory for AOF file (same as RDB)
dir /var/lib/redis

# Fsync policy: always, everysec, or no
# always   - fsync after every write (safest, slowest)
# everysec - fsync once per second (good balance)
# no       - let OS decide when to fsync (fastest, least safe)
appendfsync everysec

# Disable fsync during rewrite (faster rewrite, less safe)
no-appendfsync-on-rewrite no

# Auto-rewrite when AOF grows by this percentage
auto-aof-rewrite-percentage 100

# Minimum size for auto-rewrite to trigger
auto-aof-rewrite-min-size 64mb
```

### AOF Fsync Policies Explained

```
┌─────────────────────────────────────────────────────────────────┐
│ Policy      │ Durability       │ Performance    │ Use Case      │
├─────────────────────────────────────────────────────────────────┤
│ always      │ No data loss     │ Slowest        │ Critical data │
│ everysec    │ ~1 sec loss max  │ Good balance   │ Most cases    │
│ no          │ OS dependent     │ Fastest        │ Caching only  │
└─────────────────────────────────────────────────────────────────┘
```

### Manual AOF Operations

```bash
# Trigger AOF rewrite manually
redis-cli BGREWRITEAOF

# Check AOF status
redis-cli INFO persistence | grep aof

# Verify AOF file integrity
redis-check-aof --fix /var/lib/redis/appendonly.aof
```

### AOF Pros and Cons

**Advantages:**
- Much better durability (1 second or less data loss)
- Append-only format is corruption resistant
- Human-readable format for debugging
- Auto-rewrite prevents unlimited growth

**Disadvantages:**
- Larger files than RDB
- Slower restarts (must replay all operations)
- Slightly slower writes depending on fsync policy

## AOF Rewrite and Compaction

The AOF file grows as operations are logged. Rewrite compacts it by generating the minimal set of commands to recreate the current dataset.

### Before Rewrite

```
SET counter 1
INCR counter
INCR counter
INCR counter
INCR counter
SET name "alice"
SET name "bob"
DEL name
```

### After Rewrite

```
SET counter 5
```

The rewrite happens in the background without blocking clients.

### Monitoring AOF Size

```bash
# Check AOF file size
redis-cli INFO persistence | grep aof_current_size

# Check base size for rewrite calculation
redis-cli INFO persistence | grep aof_base_size

# Monitor rewrite progress
redis-cli INFO persistence | grep aof_rewrite
```

## Hybrid Persistence (RDB + AOF)

Redis 4.0+ supports hybrid persistence, combining the best of both approaches. The AOF file contains an RDB preamble followed by AOF commands.

### Configuring Hybrid Mode

```conf
# redis.conf - Hybrid Persistence

# Enable AOF
appendonly yes

# Enable hybrid format (RDB preamble in AOF)
aof-use-rdb-preamble yes

# Standard AOF settings
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

### How Hybrid Works

```
┌──────────────────────────────────────────────┐
│              AOF File (Hybrid)               │
├──────────────────────────────────────────────┤
│  ┌────────────────────────────────────────┐  │
│  │        RDB Preamble (Binary)           │  │
│  │    Full dataset at rewrite time        │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │      AOF Commands (Text)               │  │
│  │   Operations since last rewrite        │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

**Benefits:**
- Fast restarts (RDB preamble loads quickly)
- Good durability (AOF tail captures recent changes)
- Smaller files than pure AOF
- Best of both worlds for most use cases

## Performance vs Durability Tradeoffs

### Choosing the Right Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│ Use Case                 │ Recommendation        │ Data Loss Risk      │
├────────────────────────────────────────────────────────────────────────┤
│ Pure cache               │ No persistence        │ All data            │
│ Session store            │ RDB only              │ Minutes             │
│ Job queue                │ AOF everysec          │ ~1 second           │
│ Financial data           │ AOF always            │ None                │
│ General purpose          │ Hybrid (recommended)  │ ~1 second           │
└────────────────────────────────────────────────────────────────────────┘
```

### Configuration Examples by Use Case

**Cache Only (No Persistence)**
```conf
# Disable all persistence
save ""
appendonly no
```

**Session Store (RDB)**
```conf
# Save every 5 minutes or on 100 changes
save 300 100
appendonly no
```

**Job Queue (AOF everysec)**
```conf
save ""
appendonly yes
appendfsync everysec
aof-use-rdb-preamble yes
```

**Critical Data (AOF always)**
```conf
save ""
appendonly yes
appendfsync always
aof-use-rdb-preamble yes
```

## Backup Strategies

### Automated Backup Script

```bash
#!/bin/bash
# redis-backup.sh - Automated Redis backup

REDIS_DIR="/var/lib/redis"
BACKUP_DIR="/backups/redis"
DATE=$(date +%Y%m%d-%H%M%S)
RETENTION_DAYS=7

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Trigger a fresh RDB snapshot
redis-cli BGSAVE

# Wait for background save to complete
while [ "$(redis-cli LASTSAVE)" == "$(redis-cli LASTSAVE)" ]; do
    sleep 1
done
sleep 2

# Copy the RDB file
cp "$REDIS_DIR/dump.rdb" "$BACKUP_DIR/dump-$DATE.rdb"

# Copy AOF if enabled
if [ -f "$REDIS_DIR/appendonly.aof" ]; then
    cp "$REDIS_DIR/appendonly.aof" "$BACKUP_DIR/appendonly-$DATE.aof"
fi

# Compress the backup
gzip "$BACKUP_DIR/dump-$DATE.rdb"
[ -f "$BACKUP_DIR/appendonly-$DATE.aof" ] && gzip "$BACKUP_DIR/appendonly-$DATE.aof"

# Clean up old backups
find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_DIR/dump-$DATE.rdb.gz"
```

### Cron Schedule

```bash
# Run backup every 6 hours
0 */6 * * * /usr/local/bin/redis-backup.sh >> /var/log/redis-backup.log 2>&1
```

### Offsite Backup

```bash
# Upload to S3 after local backup
aws s3 cp "$BACKUP_DIR/dump-$DATE.rdb.gz" s3://my-backups/redis/

# Or use rsync to remote server
rsync -avz "$BACKUP_DIR/" backup-server:/redis-backups/
```

## Recovery Procedures

### Restoring from RDB

```bash
# Stop Redis
systemctl stop redis

# Replace the dump file
cp /backups/redis/dump-20260127.rdb.gz /var/lib/redis/
cd /var/lib/redis
gunzip dump-20260127.rdb.gz
mv dump-20260127.rdb dump.rdb
chown redis:redis dump.rdb

# Start Redis
systemctl start redis

# Verify data
redis-cli DBSIZE
```

### Restoring from AOF

```bash
# Stop Redis
systemctl stop redis

# Verify and fix AOF if needed
redis-check-aof --fix /backups/redis/appendonly-20260127.aof

# Replace the AOF file
cp /backups/redis/appendonly-20260127.aof /var/lib/redis/appendonly.aof
chown redis:redis /var/lib/redis/appendonly.aof

# Start Redis
systemctl start redis

# Verify data
redis-cli DBSIZE
```

### Recovery Priority

When both RDB and AOF exist, Redis uses AOF by default since it is typically more complete. To force RDB:

```bash
# Temporarily disable AOF to use RDB
mv /var/lib/redis/appendonly.aof /var/lib/redis/appendonly.aof.bak
systemctl restart redis

# Re-enable AOF after verification
redis-cli CONFIG SET appendonly yes
```

## Monitoring Persistence

### Key Metrics to Track

```bash
# Get all persistence info
redis-cli INFO persistence

# Important metrics:
# rdb_last_bgsave_status    - last RDB save success/failure
# rdb_last_bgsave_time_sec  - duration of last RDB save
# aof_last_write_status     - last AOF write success/failure
# aof_current_size          - current AOF file size
# aof_buffer_length         - pending AOF buffer
```

### Prometheus Metrics

```yaml
# Key Redis persistence metrics for alerting
- alert: RedisRDBSaveFailed
  expr: redis_rdb_last_bgsave_status != 1
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Redis RDB save failed"

- alert: RedisAOFWriteFailed
  expr: redis_aof_last_write_status != 1
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Redis AOF write failed"

- alert: RedisAOFTooLarge
  expr: redis_aof_current_size_bytes > 10737418240
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Redis AOF file exceeds 10GB"
```

### Health Check Script

```bash
#!/bin/bash
# redis-persistence-health.sh

# Check RDB status
RDB_STATUS=$(redis-cli INFO persistence | grep rdb_last_bgsave_status | cut -d: -f2 | tr -d '\r')
if [ "$RDB_STATUS" != "ok" ]; then
    echo "CRITICAL: RDB save failed"
    exit 2
fi

# Check AOF status (if enabled)
AOF_ENABLED=$(redis-cli CONFIG GET appendonly | tail -1)
if [ "$AOF_ENABLED" == "yes" ]; then
    AOF_STATUS=$(redis-cli INFO persistence | grep aof_last_write_status | cut -d: -f2 | tr -d '\r')
    if [ "$AOF_STATUS" != "ok" ]; then
        echo "CRITICAL: AOF write failed"
        exit 2
    fi
fi

echo "OK: Redis persistence healthy"
exit 0
```

## Best Practices Summary

1. **Use hybrid persistence** for most production workloads - it combines fast restarts with good durability

2. **Set appendfsync to everysec** - it balances performance and durability for most use cases

3. **Monitor persistence status** - alert immediately on save failures

4. **Test your backups regularly** - restore to a test instance monthly

5. **Store backups offsite** - local backups do not protect against disk failure or disasters

6. **Size your memory correctly** - RDB fork needs memory headroom (up to 2x during save)

7. **Use dedicated backup storage** - do not fill the Redis data disk with backups

8. **Document recovery procedures** - when disaster strikes, you need clear runbooks

9. **Consider replication** - persistence protects data but replicas protect availability

10. **Match persistence to your data** - cache data needs no persistence while critical data needs AOF always

---

Redis persistence is not just about preventing data loss - it is about matching your durability requirements to your performance needs. Start with hybrid persistence and appendfsync everysec, then tune based on your specific requirements.

For monitoring your Redis instances and alerting on persistence failures, check out [OneUptime](https://oneuptime.com) - it provides comprehensive infrastructure monitoring with built-in support for Redis health checks and custom metrics.
