# How to Migrate Redis Data with RDB File Transfer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RDB, Migration, Backup, Data Transfer

Description: Learn how to migrate Redis data between servers using RDB file transfer - when to use it, how to create a clean snapshot, and how to restore it safely.

---

RDB file transfer is the simplest Redis migration method: create a snapshot on the source, copy the file to the destination, and start Redis pointing at it. This approach requires a brief maintenance window but no special tooling. It works best for smaller datasets or infrequent migrations.

## When to Use RDB Transfer

- Dataset is small enough that transfer time is acceptable
- A maintenance window is available
- You are migrating to a new hardware server or VM
- You need to clone a Redis instance for staging/testing

For larger datasets or zero-downtime requirements, use replication-based migration instead.

## Step 1: Prepare the Source Redis

```bash
# Check current RDB settings
redis-cli CONFIG GET dir
redis-cli CONFIG GET dbfilename
redis-cli CONFIG GET save

# Check dataset size to estimate transfer time
redis-cli INFO memory | grep used_memory_human
redis-cli DBSIZE
```

## Step 2: Create a Clean RDB Snapshot

```bash
# Option A: BGSAVE (non-blocking, runs in background)
redis-cli BGSAVE

# Wait for completion - check with LASTSAVE (returns Unix timestamp)
# Keep running until the timestamp changes
BEFORE=$(redis-cli LASTSAVE)
redis-cli BGSAVE
while [ "$(redis-cli LASTSAVE)" = "$BEFORE" ]; do
  echo "Waiting for BGSAVE to complete..."
  sleep 2
done
echo "BGSAVE complete"

# Option B: SAVE (blocking - use only in maintenance window)
redis-cli SAVE
```

## Step 3: Verify the RDB File

```bash
# Check RDB file location and size
DIR=$(redis-cli CONFIG GET dir | tail -1)
DBFILE=$(redis-cli CONFIG GET dbfilename | tail -1)
RDB_PATH="$DIR/$DBFILE"

ls -lh "$RDB_PATH"
# Example: -rw-rw-r-- 1 redis redis 245M Mar 31 10:15 /var/lib/redis/dump.rdb

# Validate the file is not corrupted (Redis 3.2+)
redis-check-rdb "$RDB_PATH"
# Expected: [offset 0] Checking RDB file dump.rdb
# [offset ...] CRC64 checksum is valid
```

## Step 4: Stop Writes and Take Final Snapshot

For a consistent migration, briefly pause writes before the final snapshot:

```bash
# Option A: Use CONFIG SET to require replicas (blocks writes if no replica available)
# redis-cli CONFIG SET min-replicas-to-write 1  # only if you have replicas

# Option B: Rename write commands in redis.conf during maintenance
# rename-command SET ""
# rename-command DEL ""

# Option C: Application-level - put app in read-only mode
# Then take final snapshot:
redis-cli BGSAVE
```

## Step 5: Transfer the RDB File

```bash
# Using scp
scp "$RDB_PATH" user@target-host:/tmp/dump.rdb

# Using rsync (better for large files - resumes on failure)
rsync -avz --progress "$RDB_PATH" user@target-host:/tmp/dump.rdb

# If transferring between cloud providers, use S3/GCS as intermediary
aws s3 cp "$RDB_PATH" s3://my-bucket/redis-migration/dump.rdb
# On target:
aws s3 cp s3://my-bucket/redis-migration/dump.rdb /tmp/dump.rdb
```

## Step 6: Configure and Start Target Redis

```bash
# On the target host, stop Redis if running
sudo systemctl stop redis

# Set correct ownership and permissions
sudo mv /tmp/dump.rdb /var/lib/redis/dump.rdb
sudo chown redis:redis /var/lib/redis/dump.rdb
sudo chmod 660 /var/lib/redis/dump.rdb

# Ensure target redis.conf points to the correct dir and dbfilename
sudo grep -E "^dir|^dbfilename" /etc/redis/redis.conf
# Should show:
# dir /var/lib/redis
# dbfilename dump.rdb

# Start Redis - it will load the RDB on startup
sudo systemctl start redis

# Watch the logs
sudo journalctl -u redis -f
# Look for: DB loaded from disk: X.XXX seconds
```

## Step 7: Validate the Migration

```bash
# Compare key counts
redis-cli -h source-host DBSIZE
redis-cli -h target-host DBSIZE

# Check memory
redis-cli -h target-host INFO memory | grep used_memory_human

# Spot check values
redis-cli -h target-host RANDOMKEY
redis-cli -h target-host GET "some-known-key"

# Verify persistence is working on target
redis-cli -h target-host CONFIG GET save
redis-cli -h target-host LASTSAVE
```

## RDB Version Compatibility

RDB format versions must be compatible between source and target:

```text
Redis 2.6  - RDB version 6
Redis 2.8  - RDB version 6
Redis 3.2  - RDB version 7
Redis 4.0  - RDB version 8
Redis 5.0  - RDB version 9
Redis 6.0  - RDB version 9
Redis 7.0  - RDB version 10
Redis 7.2  - RDB version 11
```

You can migrate from older to newer Redis versions but NOT from newer to older.

## Summary

RDB file transfer is the simplest Redis migration method, requiring only three steps: snapshot, copy, restore. It is best suited for maintenance window migrations of moderate-sized datasets. Always validate with `redis-check-rdb` before transfer and compare key counts after loading on the target server.
