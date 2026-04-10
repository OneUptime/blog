# How to Migrate Redis with Zero Downtime Using Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Migration, Replication, Zero Downtime, DevOps

Description: Migrate Redis to a new server with zero downtime by using replication to sync data live, then promoting the replica and cutting over application traffic.

---

The safest way to migrate Redis without downtime is to use Redis's built-in replication. You set up the new Redis instance as a replica, wait for full sync, then promote it to primary and update your application connection string. The entire process requires only seconds of write pause at cutover.

## Overview

1. Set up the new Redis instance
2. Configure it as a replica of the current primary
3. Wait for full synchronization
4. Pause writes briefly, confirm sync, promote replica
5. Update application configuration
6. Decommission old instance

## Step 1: Prepare the New Redis Instance

```bash
# Install Redis on the new host (Ubuntu example)
sudo apt update
sudo apt install -y redis-server

# Set a strong password and basic config
sudo tee -a /etc/redis/redis.conf << 'EOF'
requirepass "your-strong-password"
bind 0.0.0.0
protected-mode yes
maxmemory 4gb
maxmemory-policy allkeys-lru
EOF

sudo systemctl start redis-server
sudo systemctl enable redis-server
```

## Step 2: Configure as Replica

```bash
# Connect to new Redis and configure replication
redis-cli -h new-host -a "your-strong-password" \
  REPLICAOF old-host 6379

# If old Redis has a password:
redis-cli -h new-host -a "your-strong-password" \
  CONFIG SET masterauth "old-redis-password"
```

Or set these in `redis.conf` permanently:

```text
replicaof old-host 6379
masterauth old-redis-password
requirepass your-strong-password
```

## Step 3: Monitor Synchronization Progress

The initial sync involves a full RDB transfer. For large datasets this can take minutes.

```bash
# Watch replication status
watch -n2 'redis-cli -h new-host -a "your-strong-password" INFO replication'

# Key fields to watch:
# master_sync_in_progress: 0 (sync complete)
# master_link_status: up
# master_repl_offset: should match primary

# Compare offsets
redis-cli -h old-host INFO replication | grep master_repl_offset
redis-cli -h new-host -a "your-strong-password" INFO replication | grep master_repl_offset
```

## Step 4: Minimize the Cutover Window

When offsets are aligned, do a brief write pause:

```bash
# Option A: Put application in read-only mode (application-level)
# Option B: Pause writes at Redis level temporarily (Redis 6.2+)
redis-cli -h old-host CLIENT PAUSE 60000 WRITE
# Pauses write commands for 60 seconds while reads continue
# For Redis < 6.2, use: CLIENT PAUSE 60000 (pauses all commands)

# Confirm replica is fully caught up
redis-cli -h old-host INFO replication | grep master_repl_offset
redis-cli -h new-host -a "your-strong-password" INFO replication | grep master_repl_offset
```

## Step 5: Promote the Replica

```bash
# Promote new-host to primary
redis-cli -h new-host -a "your-strong-password" REPLICAOF NO ONE

# Confirm it is now a primary
redis-cli -h new-host -a "your-strong-password" INFO replication | grep role
# Expected: role:master
```

## Step 6: Update Application Configuration

```python
import redis
import os

# Update your application's Redis connection
r = redis.Redis(
    host=os.environ.get("REDIS_HOST", "new-host"),
    port=6379,
    password="your-strong-password",
    decode_responses=True,
    socket_keepalive=True,
    retry_on_timeout=True
)

# Verify connection
r.ping()
print(f"Connected. Key count: {r.dbsize()}")
```

## Step 7: Validate Data Integrity

```bash
# Compare key counts
OLD_COUNT=$(redis-cli -h old-host INFO keyspace | grep -o "keys=[0-9]*" | cut -d= -f2)
NEW_COUNT=$(redis-cli --raw -h new-host -a "your-strong-password" DBSIZE)
echo "Old: $OLD_COUNT, New: $NEW_COUNT"

# Spot check random keys
for i in $(seq 1 20); do
  KEY=$(redis-cli --raw -h new-host -a "your-strong-password" RANDOMKEY)
  TYPE=$(redis-cli -h new-host -a "your-strong-password" TYPE "$KEY")
  echo "$KEY: $TYPE"
done

# Check no replication errors
redis-cli -h new-host -a "your-strong-password" INFO replication | grep -E "repl_backlog|connected_slaves"
```

## Step 8: Keep Old Instance as Standby

Leave the old Redis instance running for 24-48 hours. You can optionally reconfigure it as a replica of the new primary to keep it in sync as a rollback option:

```bash
# Reconfigure old Redis as replica of new primary (rollback standby)
redis-cli -h old-host CONFIG SET masterauth "your-strong-password"
redis-cli -h old-host REPLICAOF new-host 6379
```

## Summary

Zero-downtime Redis migration with replication requires only seconds of write pause at cutover. The replica promotion approach works for version upgrades, hardware migrations, and cloud migrations. Keep the old instance running briefly as a fallback, and validate key counts and data integrity before decommissioning.
