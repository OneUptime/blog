# How to Test Redis Sentinel Failover Before Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sentinel, Testing, Failover, High Availability

Description: Learn how to safely test Redis Sentinel failover in staging and production-like environments before relying on it for real high-availability scenarios.

---

Sentinel failover that has never been tested is a liability. This guide covers safe ways to test failover behavior, measure recovery time, and verify your applications handle it correctly.

## Method 1 - SENTINEL failover Command (Safest)

The cleanest test - forces a Sentinel-managed failover without simulating a crash:

```bash
redis-cli -p 26379 SENTINEL failover mymaster
```

This triggers the full failover process: replica election, promotion, and reconfiguration. Your application must survive this.

Verify the new primary:

```bash
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
```

## Method 2 - DEBUG SLEEP (Non-destructive)

Makes the primary unresponsive for N seconds without actually crashing it:

```bash
redis-cli -p 6379 DEBUG SLEEP 30
```

Sentinels see the primary as down, trigger failover, then the original primary comes back as a replica.

```bash
# In another terminal, watch for failover
redis-cli -p 26379 PSUBSCRIBE '*' &

# Trigger the sleep
redis-cli -p 6379 DEBUG SLEEP 30

# Expected output:
# +sdown master mymaster ...
# +odown master mymaster ...
# +try-failover ...
# +switch-master mymaster old-ip 6379 new-ip 6379
```

## Method 3 - Network Isolation (Most Realistic)

Block network access to the primary using iptables:

```bash
# Block incoming connections to primary port
sudo iptables -I INPUT -p tcp --dport 6379 -j DROP

# Wait for failover to complete
sleep 10

# Restore connectivity
sudo iptables -D INPUT -p tcp --dport 6379 -j DROP
```

This simulates a real network partition and is the most realistic test.

## Method 4 - Process Kill

Simply kill the Redis primary process:

```bash
# Get the Redis primary PID
redis-cli -p 6379 INFO server | grep process_id

# Kill it
sudo kill -9 <pid>
```

The primary will restart (if configured to do so), then rejoin as a replica.

## Measuring Failover Time

```bash
#!/bin/bash
START=$(date +%s%N)

# Record current primary address
OLD_MASTER=$(redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster 2>/dev/null | xargs)

# Trigger failover
redis-cli -p 26379 SENTINEL failover mymaster

# Wait until a new primary is promoted and writable
while true; do
  MASTER_HOST=$(redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster 2>/dev/null | sed -n '1p')
  MASTER_PORT=$(redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster 2>/dev/null | sed -n '2p')
  CURRENT="$MASTER_HOST $MASTER_PORT"
  if [ "$CURRENT" != "$OLD_MASTER" ] && [ -n "$MASTER_HOST" ]; then
    ROLE=$(redis-cli -h "$MASTER_HOST" -p "$MASTER_PORT" ROLE 2>/dev/null | head -1)
    if [ "$ROLE" = "master" ]; then
      break
    fi
  fi
  sleep 0.1
done

END=$(date +%s%N)
echo "Failover time: $(( (END - START) / 1000000 ))ms"
```

## Testing Application Behavior During Failover

```python
import redis
from redis.sentinel import Sentinel
import time

sentinel = Sentinel([('sentinel-1', 26379)], socket_timeout=0.5)
master = sentinel.master_for('mymaster', socket_timeout=0.5)

# Write in a loop, observe failures during failover
for i in range(100):
    try:
        master.set(f'test:{i}', i)
        print(f"Write {i}: OK")
    except Exception as e:
        print(f"Write {i}: FAILED - {e}")
        master = sentinel.master_for('mymaster', socket_timeout=0.5)
    time.sleep(0.1)
```

Expect a few failures during the failover window. Count them to measure your actual data loss window.

## Post-Failover Verification Checklist

```bash
# 1. Verify new primary
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster

# 2. Verify replicas follow new primary
redis-cli -p 26379 SENTINEL replicas mymaster | grep master-link-status

# 3. Verify all Sentinels agree
for port in 26379 26380 26381; do
  echo "Sentinel $port:"
  redis-cli -p $port SENTINEL get-master-addr-by-name mymaster
done
```

## Summary

Test Redis Sentinel failover using `SENTINEL failover` (safest, good for regular drills), `DEBUG SLEEP` (non-destructive, simulates unresponsiveness), or process kill (realistic crash simulation). Measure failover duration, verify application resilience, and use the post-failover checklist to confirm a clean recovery before trusting Sentinel in production.
