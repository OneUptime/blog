# How to Migrate from Redis 6 to Redis 7

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Migration, Upgrade, Redis 7, DevOps

Description: Step-by-step guide to migrating from Redis 6 to Redis 7, covering breaking changes, ACL updates, replication-based migration, and validation steps.

---

Redis 7 introduced significant changes including multi-part AOF, ACL improvements, command key specifications, and new cluster features. Migrating from Redis 6 requires attention to a few breaking changes before you cut over traffic.

## Key Changes in Redis 7

- Multi-part AOF replaces single AOF file (AOF directory instead of single file)
- ACL LOG now stores more detail; selector-based ACLs added
- `OBJECT HELP` output changed
- `SINTERCARD` and `LMPOP`/`ZMPOP` commands added
- `DEBUG SLEEP` behavior changed
- Cluster improvements: sharded pub/sub, `CLUSTER SHARDS` command

## Pre-Migration Checklist

```bash
# Check current Redis version
redis-cli INFO server | grep redis_version

# Check if you use ACL files - backup them
redis-cli ACL LIST

# Check AOF status
redis-cli CONFIG GET appendonly
redis-cli CONFIG GET aof-use-rdb-preamble

# Review slow log for any commands that may behave differently
redis-cli SLOWLOG GET 50
```

## Migration Strategy: Replica Promotion

The safest approach is to spin up a Redis 7 instance as a replica of your Redis 6 primary, then promote it.

**Step 1: Install Redis 7 on the new host**

```bash
# On Ubuntu/Debian
sudo apt-get install -y lsb-release
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" \
  | sudo tee /etc/apt/sources.list.d/redis.list
sudo apt-get update
sudo apt-get install redis=6:7.*
```

**Step 2: Configure Redis 7 as a replica of Redis 6**

```bash
# In redis7.conf
replicaof <redis6-host> 6379
requirepass "your-password"
masterauth "your-password"
```

**Step 3: Verify replication is in sync**

```bash
redis-cli -h <redis7-host> INFO replication | grep -E "role|master_link_status|master_repl_offset"
# Expected: role:slave, master_link_status:up
```

**Step 4: Handle AOF migration**

Redis 7 uses a multi-part AOF directory. If your Redis 6 instance has AOF enabled, the new replica will start fresh with RDB then switch to streaming replication. When you promote, enable the new AOF format:

```bash
# In redis7.conf - enable multi-part AOF
appendonly yes
appenddirname "appendonlydir"
aof-use-rdb-preamble yes
```

**Step 5: Promote the replica**

```bash
# Pause writes to Redis 6 briefly, then promote Redis 7
redis-cli -h <redis7-host> REPLICAOF NO ONE

# Update your application's Redis connection string to point to Redis 7
# Then verify
redis-cli -h <redis7-host> INFO server | grep redis_version
```

## Validate After Migration

```bash
# Check key count matches
redis-cli -h <redis6-host> DBSIZE
redis-cli -h <redis7-host> DBSIZE

# Spot-check values
redis-cli -h <redis7-host> GET some-key
redis-cli -h <redis7-host> LLEN some-list

# Check memory usage
redis-cli -h <redis7-host> INFO memory | grep used_memory_human
```

## ACL Changes to Review

Redis 7 adds `RESET` to `ACL LOG` and supports selector-based ACLs. If you use ACL files, test them before cutover:

```bash
# Test ACL file loads correctly on Redis 7
redis-cli -h <redis7-host> ACL LOAD

# Review any ACL log entries
redis-cli -h <redis7-host> ACL LOG
```

## Rollback Plan

Keep the Redis 6 instance running as a standby for at least 24 hours after migration. If issues arise, update your application connection string to point back to Redis 6.

```bash
# Point your application connection string back to Redis 6
# Verify Redis 6 is still accepting writes:
redis-cli -h <redis6-host> PING
redis-cli -h <redis6-host> SET rollback-test "ok"
redis-cli -h <redis6-host> DEL rollback-test
```

## Summary

Migrating from Redis 6 to Redis 7 is straightforward using the replica promotion strategy. The main areas to review are AOF configuration changes, ACL updates, and any application code relying on command behaviors that changed. Run both instances in parallel for at least a day to confirm stability before decommissioning Redis 6.
