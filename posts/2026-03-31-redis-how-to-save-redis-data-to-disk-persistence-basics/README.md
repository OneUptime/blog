# How to Save Redis Data to Disk (Persistence Basics)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Persistence, RDB, AOF, Data Durability, Disk

Description: Learn the two Redis persistence options - RDB snapshots and AOF logging - and how to configure each for your durability requirements.

---

## Why Redis Persistence Matters

Redis is an in-memory database. By default, all data lives in RAM. If Redis restarts or the server crashes, all data is lost unless you have persistence configured. Redis offers two persistence mechanisms: RDB (snapshot files) and AOF (append-only log).

## Option 1: RDB (Redis Database Snapshots)

RDB creates point-in-time snapshots of your entire dataset and saves them to disk as a binary `.rdb` file. Redis forks the process to create the snapshot without blocking clients.

### Configure RDB

In `redis.conf`:

```text
# Save after 900 seconds if at least 1 key changed
save 900 1

# Save after 300 seconds if at least 10 keys changed
save 300 10

# Save after 60 seconds if at least 10000 keys changed
save 60 10000

# RDB file location
dir /var/lib/redis
dbfilename dump.rdb

# Compress RDB file (recommended)
rdbcompression yes
```

### Trigger a Manual Snapshot

```bash
# Synchronous save (blocks Redis until done - avoid in production)
redis-cli SAVE

# Asynchronous save (non-blocking, recommended)
redis-cli BGSAVE

# Check when the last save occurred
redis-cli LASTSAVE
# 1711900000 (Unix timestamp)
```

### RDB Pros and Cons

Pros:
- Compact single file, easy to backup and transfer
- Faster restart - Redis loads the binary file quickly
- Minimal performance impact - fork-based, non-blocking

Cons:
- Data loss between snapshots (up to 15 minutes with default save rules)
- Fork can be slow with very large datasets

## Option 2: AOF (Append-Only File)

AOF logs every write command to disk. On restart, Redis replays the log to reconstruct the dataset. It provides much better durability than RDB.

### Configure AOF

In `redis.conf`:

```text
# Enable AOF
appendonly yes

# AOF file name
appendfilename "appendonly.aof"

# Sync behavior - controls durability vs. performance
# always: fsync after every write (safest, slowest)
# everysec: fsync every second (good balance) - DEFAULT
# no: let OS decide when to flush (fastest, least safe)
appendfsync everysec

# Directory for AOF file
dir /var/lib/redis
```

### AOF Rewrite (Compaction)

The AOF file grows over time. Redis can rewrite it to compact redundant operations:

```bash
# Trigger AOF rewrite manually
redis-cli BGREWRITEAOF

# In redis.conf - auto-rewrite when AOF size doubles
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

### AOF Pros and Cons

Pros:
- Much lower risk of data loss (as low as 1 second)
- Human-readable log format
- Safer - Redis can repair a truncated AOF on restart

Cons:
- Larger file size than RDB
- Slightly slower than RDB for the same dataset

## Option 3: Hybrid Persistence (RDB + AOF)

Use both for the best of both worlds:

```text
# redis.conf - enable both
save 900 1
save 300 10
appendonly yes
appendfsync everysec

# Use RDB preamble in AOF for faster reloads
aof-use-rdb-preamble yes
```

With `aof-use-rdb-preamble yes`, AOF rewrites start with an RDB snapshot, then append only the commands since the snapshot. This gives fast load times and low data loss.

## Disabling Persistence (Cache Mode)

If you use Redis purely as a cache and data loss is acceptable:

```text
# redis.conf
save ""
appendonly no
```

Or at runtime:

```bash
redis-cli CONFIG SET save ""
redis-cli CONFIG SET appendonly no
```

## Checking Persistence Status

```bash
# Check current persistence config
redis-cli CONFIG GET save
redis-cli CONFIG GET appendonly
redis-cli CONFIG GET appendfsync

# View persistence info
redis-cli INFO persistence
# rdb_changes_since_last_save:5
# rdb_bgsave_in_progress:0
# rdb_last_save_time:1711900000
# aof_enabled:1
# aof_rewrite_in_progress:0
# aof_current_size:1048576
```

## Backup Strategy

```bash
# Copy the RDB snapshot file for backup
cp /var/lib/redis/dump.rdb /backup/redis-$(date +%Y%m%d-%H%M%S).rdb

# For AOF, backup both files
cp /var/lib/redis/dump.rdb /backup/
cp /var/lib/redis/appendonly.aof /backup/

# Automate with cron (daily at 2 AM)
# 0 2 * * * cp /var/lib/redis/dump.rdb /backup/redis-$(date +\%Y\%m\%d).rdb
```

## Persistence Recommendations by Use Case

| Use Case | Recommendation |
|---|---|
| Cache only (data loss OK) | No persistence |
| Session store (some loss OK) | RDB only |
| Primary data store | AOF with everysec |
| Maximum durability | RDB + AOF hybrid |
| Analytics counters | AOF with everysec |

## Summary

Redis offers two persistence mechanisms: RDB for efficient point-in-time snapshots and AOF for a durable write log. For most production applications, the hybrid mode combining both gives the fastest restart times with minimal data loss. Always configure `appendfsync everysec` rather than `no` if data durability matters, and set up regular backups of your `.rdb` and `.aof` files to external storage.
