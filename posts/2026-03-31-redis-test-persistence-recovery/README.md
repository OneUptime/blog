# How to Test Redis Persistence Recovery Before Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Persistence, Testing, Reliability

Description: Validate your Redis persistence and recovery configuration by running controlled tests before relying on it in production to ensure data is recoverable after failures.

---

Many teams configure Redis persistence but never verify it actually works. A few hours of pre-production testing can prevent a data loss incident. This guide covers how to test RDB snapshots, AOF recovery, and hybrid persistence before going to production.

## Test Environment Setup

Use a dedicated test instance with the same configuration as production:

```bash
# Create test directory first
mkdir -p /tmp/redis-test

# Start a test Redis instance
redis-server \
  --port 6399 \
  --dir /tmp/redis-test \
  --dbfilename test-dump.rdb \
  --appendonly yes \
  --appendfilename test-appendonly.aof \
  --appendfsync everysec \
  --aof-use-rdb-preamble yes \
  --save "60 1" \
  --daemonize yes \
  --logfile /tmp/redis-test.log
```

## Test 1: Basic RDB Recovery

```bash
# Load test data
redis-cli -p 6399 MSET key1 val1 key2 val2 key3 val3

# Trigger BGSAVE and wait
redis-cli -p 6399 BGSAVE
sleep 5

# Verify RDB file was created
ls -lh /tmp/redis-test/test-dump.rdb

# Kill the instance ungracefully (simulates crash)
kill -9 $(redis-cli -p 6399 INFO server | grep process_id | cut -d: -f2 | tr -d '\r ')

# Restart
redis-server \
  --port 6399 \
  --dir /tmp/redis-test \
  --dbfilename test-dump.rdb \
  --daemonize yes

# Verify data was recovered
sleep 2
redis-cli -p 6399 MGET key1 key2 key3
```

Expected output:

```text
1) "val1"
2) "val2"
3) "val3"
```

## Test 2: AOF Recovery of Recent Writes

```bash
redis-cli -p 6399 CONFIG SET appendonly yes

# Write initial data and trigger RDB
redis-cli -p 6399 SET baseline "exists"
redis-cli -p 6399 BGSAVE
sleep 3

# Write more data after the RDB snapshot
redis-cli -p 6399 SET after_snapshot "should_survive"
redis-cli -p 6399 LPUSH mylist a b c
sleep 2  # Wait for AOF fsync

# Kill ungracefully
kill -9 $(redis-cli -p 6399 INFO server | grep process_id | cut -d: -f2 | tr -d '\r ')

# Restart with AOF enabled
redis-server \
  --port 6399 \
  --dir /tmp/redis-test \
  --appendonly yes \
  --appendfilename test-appendonly.aof \
  --aof-use-rdb-preamble yes \
  --daemonize yes

sleep 2

# Verify all data survived
redis-cli -p 6399 GET baseline
redis-cli -p 6399 GET after_snapshot
redis-cli -p 6399 LRANGE mylist 0 -1
```

## Test 3: Recovery from Corrupt File

```bash
# Save the current state
redis-cli -p 6399 BGSAVE
sleep 5

# Deliberately corrupt the RDB file
dd if=/dev/urandom of=/tmp/redis-test/test-dump.rdb bs=1 count=100 seek=100 conv=notrunc 2>/dev/null

# Verify corruption is detected
redis-check-rdb /tmp/redis-test/test-dump.rdb; echo "Exit code: $?"

# redis-check-rdb is diagnostic only and cannot repair files.
# If the RDB file is corrupt, restore from your most recent valid backup.
cp /tmp/redis-test/test-dump.rdb /tmp/redis-test/test-dump-corrupt.rdb
redis-check-rdb /tmp/redis-test/test-dump-corrupt.rdb; echo "Exit code: $?"
```

## Test 4: Measure Recovery Time

For production capacity planning, measure actual recovery time:

```bash
# Generate a representative dataset
redis-cli -p 6399 eval "
  for i=1,100000 do
    redis.call('SET', 'testkey:' .. i, string.rep('x', 100))
  end
" 0

# Trigger save
redis-cli -p 6399 BGSAVE
sleep 30

# Measure restart and recovery time
redis-cli -p 6399 SHUTDOWN NOSAVE
time redis-server \
  --port 6399 \
  --dir /tmp/redis-test \
  --appendonly yes \
  --daemonize no &

# Measure time until PING succeeds
until redis-cli -p 6399 PING 2>/dev/null; do sleep 0.1; done
```

## Test 5: Validate Backup Files

Before storing backups, validate them:

```bash
#!/bin/bash
# validate-redis-backup.sh

RDB_FILE=$1
AOF_FILE=$2

if [ -n "$RDB_FILE" ]; then
    if redis-check-rdb "$RDB_FILE"; then
        echo "RDB backup valid: $RDB_FILE"
    else
        echo "ERROR: RDB backup corrupt: $RDB_FILE"
        exit 1
    fi
fi

if [ -n "$AOF_FILE" ]; then
    if redis-check-aof "$AOF_FILE" | grep -q "AOF is valid"; then
        echo "AOF backup valid: $AOF_FILE"
    else
        echo "ERROR: AOF backup corrupt: $AOF_FILE"
        exit 1
    fi
fi
```

## Recovery Runbook Template

Document your recovery process:

```text
Redis Recovery Runbook
======================
1. Stop Redis: sudo systemctl stop redis
2. Identify last valid backup: ls -lt /backup/redis/
3. Validate backup: redis-check-rdb /backup/redis/dump-YYYYMMDD.rdb
4. Copy to data directory: cp /backup/redis/dump-YYYYMMDD.rdb /var/lib/redis/dump.rdb
5. Start Redis: sudo systemctl start redis
6. Verify key count: redis-cli DBSIZE
7. Spot-check critical keys: redis-cli GET critical:key
8. Monitor logs: journalctl -u redis -f
```

## Summary

Test Redis persistence recovery by simulating crashes (`kill -9`), corrupting files deliberately, and measuring actual recovery times with production-scale datasets. Validate backup files using `redis-check-rdb` and `redis-check-aof` before trusting them. Document a recovery runbook so your team can execute recovery steps quickly under pressure. Run these tests quarterly or after any infrastructure changes.
