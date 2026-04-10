# How to Use redis-shake for Redis Data Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, redis-shake, Migration, Data Transfer, DevOps

Description: Learn how to use redis-shake to migrate data between Redis instances, filter keys, transform data, and validate migration results in production.

---

redis-shake (also known as RedisShake) is an open-source tool originally from Alibaba (now maintained under the tair-opensource organization) for migrating data between Redis instances. It supports sync (live replication via PSync), RDB restore, scan (key-by-key copy), and AOF import, making it flexible for different migration scenarios.

## Installation

```bash
# Download the latest release (Linux amd64 example)
wget https://github.com/tair-opensource/RedisShake/releases/latest/download/redis-shake-linux-amd64.tar.gz
tar xzf redis-shake-linux-amd64.tar.gz
ls redis-shake/
# redis-shake  shake.toml  (binary and sample config)
```

## Configuration File

redis-shake uses a TOML configuration file. The behavior is determined by which reader and writer sections you include. You pick exactly one reader and one writer per config file:

```toml
# shake.toml

[sync_reader]
address = "source-host:6379"
username = ""
password = "source-password"
tls = false

[redis_writer]
cluster = false
address = "target-host:6379"
username = ""
password = "target-password"
tls = false

[advanced]
# Number of CPU cores to use (0 = all cores)
ncpu = 4

# Key filter - only migrate keys matching prefix
# [filter]
# allow_key_prefix = ["session:"]

# Log level: debug, info, warn
log_level = "info"
log_file = "shake.log"
```

## Sync Mode (Live Replication)

Sync mode uses the `[sync_reader]` section. It does an initial full sync then streams live changes via the PSync protocol, making it suitable for near-zero downtime migration.

```bash
# Run sync mode
./redis-shake shake.toml

# redis-shake output will show progress:
# [INFO] start syncing...
# [INFO] all entries synced
# [INFO] start incremental sync
```

While in incremental sync, you can monitor progress:

```bash
# Check key count on target
redis-cli -h target-host -a "target-password" DBSIZE

# Monitor redis-shake log
tail -f shake.log
```

## Restore Mode (From RDB File)

If you have an RDB dump file, use the `[rdb_reader]` section:

```toml
[rdb_reader]
filepath = "/path/to/dump.rdb"

[redis_writer]
address = "target-host:6379"
password = "target-password"
```

```bash
./redis-shake shake.toml
```

## Scan Mode (Key-by-Key Copy)

Scan mode uses the `[scan_reader]` section. It reads keys from the source using SCAN and writes them to the target. It is slower but works when you cannot use replication:

```toml
[scan_reader]
address = "source-host:6379"
password = "source-password"

[redis_writer]
address = "target-host:6379"
password = "target-password"
```

## Filtering Keys During Migration

Filtering is configured in the `[filter]` section:

```toml
[filter]
# Migrate only keys matching a prefix
allow_key_prefix = ["user:"]

# Exclude keys matching a prefix
block_key_prefix = ["temp:"]

# Migrate only specific databases
allow_db = [0]
```

## Cluster to Cluster Migration

For cluster-to-cluster migration, set `cluster = true` on both the reader and writer:

```toml
[sync_reader]
cluster = true
address = "source-cluster-node1:6379"
password = "source-password"

[redis_writer]
cluster = true
address = "target-cluster-node1:6379"
password = "target-password"
```

## Validate Migration Results

```bash
# Compare key counts
SOURCE_KEYS=$(redis-cli -h source-host -a "source-password" DBSIZE)
TARGET_KEYS=$(redis-cli -h target-host -a "target-password" DBSIZE)
echo "Source: $SOURCE_KEYS, Target: $TARGET_KEYS"

# Spot check specific keys
redis-cli -h source-host -a "source-password" GET user:1001
redis-cli -h target-host -a "target-password" GET user:1001

# Compare TTLs
redis-cli -h source-host -a "source-password" TTL session:abc123
redis-cli -h target-host -a "target-password" TTL session:abc123
```

## Cutover Steps with redis-shake

1. Start redis-shake in sync mode
2. Wait for initial sync to complete (watch for "start incremental sync" in logs)
3. Monitor the offset gap - it should stay near zero
4. Update application connection strings to point to target
5. Stop redis-shake after confirming traffic is flowing to target

```bash
# Stop redis-shake gracefully
kill -SIGTERM $(pgrep redis-shake)
```

## Summary

redis-shake is the most capable tool for Redis migrations, supporting live sync, RDB restore, and key filtering. Use sync mode for production migrations where downtime must be minimal. Validate key counts and data integrity after migration before decommissioning the source instance.
