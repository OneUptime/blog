# How to Test Redis Disaster Recovery Procedures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Disaster Recovery, Testing, High Availability, DevOps

Description: Learn how to systematically test your Redis disaster recovery procedures including failover drills, backup restoration, and data integrity verification.

---

A disaster recovery plan is only as good as your last successful test. Regular DR drills reveal gaps in runbooks, automation failures, and human process issues before a real incident exposes them.

## What to Test

A comprehensive Redis DR test covers:

1. Primary node failure (sentinel/cluster automatic failover)
2. Backup restoration to a point in time
3. Cross-region failover (if applicable)
4. Application reconnection after failover
5. Data integrity after recovery

## Test 1: Trigger Sentinel Failover

This tests whether your Sentinel configuration correctly promotes a replica:

```bash
# Check current primary before the test
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster

# Write test data
redis-cli SET dr_test_key "before-failover-$(date +%s)"

# Trigger failover
redis-cli -p 26379 SENTINEL failover mymaster

# Wait for promotion (usually < 10 seconds)
sleep 10

# Verify new primary
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster

# Verify data persisted through failover
redis-cli GET dr_test_key
```

## Test 2: Restore from Backup

Test your RDB restore procedure against a staging Redis instance:

```bash
#!/bin/bash
# restore-test.sh

BACKUP_BUCKET="s3://my-redis-backups"
STAGING_HOST="redis-staging.internal"
STAGING_PORT=6379

# Download latest backup
LATEST=$(aws s3 ls "$BACKUP_BUCKET/daily/" | sort | tail -1 | awk '{print $4}')
echo "Restoring backup: $LATEST"

aws s3 cp "$BACKUP_BUCKET/daily/$LATEST" /tmp/restore-test.rdb

# Stop staging Redis
ssh "$STAGING_HOST" "systemctl stop redis"

# Copy RDB file
scp /tmp/restore-test.rdb "$STAGING_HOST:/var/lib/redis/dump.rdb"
ssh "$STAGING_HOST" "chown redis:redis /var/lib/redis/dump.rdb"

# Start Redis and verify
ssh "$STAGING_HOST" "systemctl start redis"
sleep 3

KEYCOUNT=$(redis-cli -h "$STAGING_HOST" -p "$STAGING_PORT" DBSIZE | awk '{print $2}')
echo "Keys after restore: $KEYCOUNT"

if [ "$KEYCOUNT" -gt 0 ]; then
  echo "PASS: Restore successful"
else
  echo "FAIL: No keys found after restore"
  exit 1
fi
```

## Test 3: Application Reconnection Test

Verify your application reconnects correctly after failover:

```python
from redis.sentinel import Sentinel
import time
import subprocess

sentinel = Sentinel([('sentinel-host', 26379)], socket_timeout=0.5)
r = sentinel.master_for('mymaster', socket_timeout=0.5)

# Write initial data
r.set("reconnect_test", "initial_value")

# Simulate failover by killing primary
subprocess.run(["redis-cli", "-p", "26379", "SENTINEL", "failover", "mymaster"])

# Wait for failover
time.sleep(15)

# Application should auto-reconnect via Sentinel
for attempt in range(5):
    try:
        value = r.get("reconnect_test")
        print(f"Attempt {attempt+1}: Got value '{value}' - reconnection successful")
        break
    except Exception as e:
        print(f"Attempt {attempt+1}: Connection error - {e}")
        time.sleep(2)
```

## Test 4: Measure RTO and RPO

Time your failover tests to verify they meet your objectives:

```bash
#!/bin/bash
START_TIME=$(date +%s%N)

# Write test marker
redis-cli SET rto_test "start"

# Trigger failure (kill primary process)
redis-cli DEBUG SLEEP 60 &  # This blocks the primary
BLOCK_PID=$!

# Measure time until new primary accepts writes
while true; do
  if redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster &>/dev/null; then
    NEW_PRIMARY=$(redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster | head -1)
    if redis-cli -h "$NEW_PRIMARY" SET rto_check "ok" &>/dev/null; then
      END_TIME=$(date +%s%N)
      RTO_MS=$(( (END_TIME - START_TIME) / 1000000 ))
      echo "RTO: ${RTO_MS}ms"
      break
    fi
  fi
  sleep 0.5
done

kill $BLOCK_PID 2>/dev/null
```

## Test Schedule

| Test Type | Frequency | Environment |
|-----------|-----------|------------|
| Sentinel failover | Monthly | Staging |
| Backup restore | Quarterly | Staging |
| Cross-region failover | Quarterly | Staging |
| Full DR drill | Annually | Production off-hours |

## Summary

Regular DR testing transforms your disaster recovery plan from theory into verified reality. Test sentinel failover monthly, backup restoration quarterly, and run a full DR drill at least annually. Measure RTO and RPO against your targets during each test and update your runbook when procedures fail or take longer than expected.
