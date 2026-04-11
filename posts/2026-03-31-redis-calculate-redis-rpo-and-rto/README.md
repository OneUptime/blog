# How to Calculate Redis RPO and RTO

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Disaster Recovery, High Availability, SLA, DevOps

Description: Learn how to define and calculate Redis RPO and RTO based on your persistence configuration, replication setup, and failover speed to meet your SLA requirements.

---

RPO (Recovery Point Objective) and RTO (Recovery Time Objective) are the two most important metrics for any Redis disaster recovery plan. Understanding how your Redis configuration determines each helps you make informed decisions about persistence, replication, and failover.

## Definitions

- **RPO**: The maximum age of data you can recover. If RPO is 5 minutes, you can lose up to 5 minutes of writes.
- **RTO**: The maximum time to restore service after a failure. If RTO is 30 seconds, Redis must be back accepting writes within 30 seconds.

## How Redis Configuration Affects RPO

RPO is determined by how frequently you persist data:

```text
No persistence (memory only):
  RPO = infinity (all data lost on restart)

RDB snapshots (save "900 1"):
  RPO = up to 15 minutes (time since last successful snapshot)

AOF with appendfsync everysec:
  RPO = up to 1 second

AOF with appendfsync always:
  RPO = 0 (every write is persisted before acknowledgment)

Synchronous replication (WAIT command):
  RPO = 0 for replicated writes
```

## Measuring Your Actual RPO

Check your last successful RDB save time:

```bash
redis-cli INFO persistence | grep rdb_last_save_time
# rdb_last_save_time: 1711900800

# Calculate seconds since last save
LAST_SAVE=$(redis-cli INFO persistence | grep rdb_last_save_time | cut -d: -f2 | tr -d ' \r')
NOW=$(date +%s)
echo "Seconds since last RDB save: $((NOW - LAST_SAVE))"
```

For AOF, the maximum data loss is bounded by `appendfsync` interval:

```bash
redis-cli CONFIG GET appendfsync
# appendfsync: everysec  -> RPO = 1 second
```

## How Redis Configuration Affects RTO

RTO depends on your HA setup:

```text
Single node, no HA:
  RTO = restart time + RDB load time
  (10s restart + 30s to load 1GB RDB = ~40 seconds)

Redis Sentinel (3 sentinels):
  RTO = down-after-milliseconds + election time
  (5s detection + 3s election = ~8 seconds)

Redis Cluster:
  RTO = cluster-node-timeout (default 15s)

Managed service (ElastiCache Multi-AZ):
  RTO = ~60 seconds (AWS SLA-backed automatic failover)
```

## Measuring Your Actual RTO

Benchmark your Sentinel failover time:

```bash
#!/bin/bash
# Measure actual failover time
START=$(date +%s%3N)  # milliseconds

# Trigger failover
redis-cli -p 26379 SENTINEL failover mymaster

# Poll until new primary accepts writes
while true; do
  NEW_HOST=$(redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster | head -1)
  if redis-cli -h "$NEW_HOST" SET rto_test "ok" 2>/dev/null; then
    END=$(date +%s%3N)
    echo "RTO: $((END - START))ms"
    break
  fi
  sleep 0.2
done
```

## Calculating RTO for RDB Restart

If Sentinel is not available, RTO includes RDB load time:

```bash
# Estimate load time based on RDB size
RDB_SIZE_MB=$(du -m /var/lib/redis/dump.rdb | cut -f1)
# Redis loads approximately 1 GB in 3-5 seconds
LOAD_TIME_SEC=$(echo "$RDB_SIZE_MB * 4 / 1024" | bc)
echo "Estimated RDB load time: ${LOAD_TIME_SEC}s"
```

## RPO/RTO Matrix by Configuration

| Configuration | RPO | RTO |
|--------------|-----|-----|
| No persistence | infinity | ~5s (restart only) |
| RDB only | 1-15 min | 5s + load time |
| AOF everysec | ~1s | 5s + replay time |
| AOF always | 0 | 5s + replay time |
| Sentinel (3 nodes) | depends on persistence | 5-15s |
| Cluster | depends on persistence | 10-20s |
| ElastiCache Multi-AZ | ~1s (replica lag) | ~60s |

## Summary

Redis RPO is determined by persistence configuration - AOF with `appendfsync always` achieves RPO of 0, while RDB-only can lose up to 15 minutes of data. RTO depends on your HA setup - Sentinel typically achieves failover in under 15 seconds, while a single node restart with a large RDB can take minutes. Measure both regularly in staging to verify you meet your SLA commitments.
