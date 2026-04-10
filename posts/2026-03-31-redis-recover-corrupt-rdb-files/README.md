# How to Recover Redis Data from Corrupt RDB Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RDB, Recovery, Data

Description: Use redis-check-rdb and manual repair techniques to recover data from corrupt Redis RDB snapshot files after disk failures or incomplete writes.

---

Redis RDB files can become corrupt due to incomplete writes, disk failures, or file system errors. The `redis-check-rdb` utility and a few manual techniques can often recover most or all of your data.

## Detecting RDB Corruption

Redis validates the RDB file on startup using a CRC64 checksum:

```text
# Redis startup log
Short read or OOM loading DB. Unrecoverable error, aborting now.
```

Or:

```text
DB loaded from disk: 0.000 seconds
```

If Redis refuses to start and the log mentions the RDB file, corruption is likely.

Check manually:

```bash
redis-check-rdb /var/lib/redis/dump.rdb
```

```text
[offset 0] Checking RDB file dump.rdb
[offset 26] AUX FIELD redis-ver = '7.0.5'
[offset 40] AUX FIELD redis-bits = '64'
[offset 52] AUX FIELD ctime = '1711900800'
[offset 64] AUX FIELD used-mem = '2147483648'
[offset 91] Selecting DB ID 0
[offset 100] Scanning type: RDB_TYPE_STRING (key: session:user1)
[err] Segment fault
```

An error mid-scan indicates the corruption location.

## Step 1: Never Modify the Original File

Always work on a copy:

```bash
cp /var/lib/redis/dump.rdb /var/lib/redis/dump.rdb.backup
cp /var/lib/redis/dump.rdb /tmp/dump-repair.rdb
```

## Step 2: Diagnose Corruption with redis-check-rdb

Run `redis-check-rdb` to identify the corruption offset:

```bash
redis-check-rdb /tmp/dump-repair.rdb
```

```text
[offset 0] Checking RDB file dump-repair.rdb
[offset 100] Scanning type: RDB_TYPE_STRING
[err] Corrupted data at offset 512
```

Note: `redis-check-rdb` is a read-only diagnostic tool. Unlike `redis-check-aof --fix` (which can truncate corrupt AOF files), it has no `--fix` mode for RDB files.

If the corruption is a checksum mismatch at the end of the file (common after incomplete writes), try loading with checksum verification disabled:

```text
# redis.conf for recovery only
rdbchecksum no
```

If the data itself is corrupt (not just the checksum), your best option is to recover from a replica or backup (see Step 5).

## Step 3: Load the Repaired File

Test loading the repaired file:

```bash
# Start a temporary Redis instance with the repaired file
redis-server \
  --port 6399 \
  --dir /tmp \
  --dbfilename dump-repair.rdb \
  --daemonize yes \
  --logfile /tmp/redis-repair.log

# Check how many keys loaded
redis-cli -p 6399 DBSIZE

# Inspect keys
redis-cli -p 6399 KEYS "*" | head -20
```

## Step 4: Export Recovered Data

If the recovered dataset looks valid, export it:

```bash
# Dump all keys to a file for import into production
redis-cli -p 6399 --scan --pattern "*" | while read key; do
    type=$(redis-cli -p 6399 TYPE "$key")
    ttl=$(redis-cli -p 6399 TTL "$key")
    echo "TYPE: $type KEY: $key TTL: $ttl"
done
```

For a full migration, use `redis-cli --rdb` to download a consistent RDB snapshot from the repair instance:

```bash
# Download a fresh RDB from the repair instance
redis-cli -p 6399 --rdb /var/lib/redis/dump.rdb
```

## Step 5: Recover from a Replica or Backup

If the primary RDB is corrupt, the best recovery source is a replica or a recent backup:

```bash
# Copy a replica's RDB file to the primary
# First, trigger a save on the replica
redis-cli -h replica-host BGSAVE
sleep 10

# Copy the file
scp replica-host:/var/lib/redis/dump.rdb /var/lib/redis/dump.rdb

# Start primary Redis
sudo systemctl start redis
```

## Preventing Future Corruption

```text
# redis.conf
rdbchecksum yes       # Validate checksum on load
rdbcompression yes    # Compress strings in RDB files
```

```bash
# Validate RDB file after every backup
redis-check-rdb /backup/redis/dump.rdb && echo "Backup is valid"
```

Use filesystem-level protection:

```bash
# Enable journaling on the Redis data filesystem
tune2fs -j /dev/sda1   # ext4 journaling

# Or use ZFS for copy-on-write protection
```

## Summary

Diagnose corrupt RDB files using `redis-check-rdb` to identify the corruption offset. If the corruption is a checksum mismatch, try loading with `rdbchecksum no` temporarily. For actual data corruption, recover from a replica or backup. Always work on a copy, never the original file. Load recovered data in a temporary Redis instance to validate and extract it before replacing the production file. Enable `rdbchecksum yes` and validate backups with `redis-check-rdb` to detect corruption early.
