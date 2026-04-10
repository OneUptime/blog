# How to Configure Redis Sentinel for Multiple Masters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sentinel, Configuration, Multi-Master, High Availability

Description: Learn how to configure a single Redis Sentinel cluster to monitor multiple independent Redis primary instances for high availability.

---

A single set of Sentinel processes can monitor multiple independent Redis primary instances. This lets you share Sentinel infrastructure across several Redis deployments instead of running separate Sentinels for each.

## Architecture

```text
Sentinel-1, Sentinel-2, Sentinel-3

Monitor:
  - master "auth" (192.168.1.10:6379)
  - master "cache" (192.168.1.20:6379)
  - master "sessions" (192.168.1.30:6379)
```

Each monitored master has its own name, quorum, and failover settings.

## Configuration

```bash
# sentinel.conf

port 26379
daemonize yes
logfile /var/log/redis/sentinel.log
dir /tmp

# Monitor "auth" service
sentinel monitor auth 192.168.1.10 6379 2
sentinel down-after-milliseconds auth 5000
sentinel failover-timeout auth 60000
sentinel parallel-syncs auth 1

# Monitor "cache" service (less critical, higher timeout)
sentinel monitor cache 192.168.1.20 6379 2
sentinel down-after-milliseconds cache 10000
sentinel failover-timeout cache 120000
sentinel parallel-syncs cache 2

# Monitor "sessions" service (critical, faster failover)
sentinel monitor sessions 192.168.1.30 6379 2
sentinel down-after-milliseconds sessions 3000
sentinel failover-timeout sessions 30000
sentinel parallel-syncs sessions 1
```

Each master can have its own tuning independent of the others.

## Verifying All Masters

```bash
redis-cli -p 26379 SENTINEL masters
```

Output lists all monitored masters:

```text
1) name -> auth
   ip -> 192.168.1.10
   port -> 6379
   flags -> master
   ...
2) name -> cache
   ip -> 192.168.1.20
   port -> 6379
   flags -> master
   ...
3) name -> sessions
   ip -> 192.168.1.30
   port -> 6379
   flags -> master
   ...
```

Check each master individually:

```bash
redis-cli -p 26379 SENTINEL master auth
redis-cli -p 26379 SENTINEL master cache
redis-cli -p 26379 SENTINEL replicas auth
```

## Adding a New Master at Runtime

```bash
redis-cli -p 26379 SENTINEL MONITOR newservice 192.168.1.40 6379 2
redis-cli -p 26379 SENTINEL SET newservice down-after-milliseconds 5000
redis-cli -p 26379 SENTINEL SET newservice failover-timeout 60000
```

Do this on all three Sentinel instances.

## Removing a Master at Runtime

```bash
redis-cli -p 26379 SENTINEL REMOVE cache
redis-cli -p 26380 SENTINEL REMOVE cache
redis-cli -p 26381 SENTINEL REMOVE cache
```

## Quorum Per Master

Each master can have a different quorum:

```bash
redis-cli -p 26379 SENTINEL SET auth quorum 2
redis-cli -p 26379 SENTINEL SET sessions quorum 3  # Requires all 3 Sentinels
```

## Client Configuration Per Service

Each application connects to Sentinel using its master name:

```python
from redis.sentinel import Sentinel

sentinel = Sentinel([('sentinel-1', 26379), ('sentinel-2', 26380)])

auth_master = sentinel.master_for('auth')
cache_master = sentinel.master_for('cache')
sessions_master = sentinel.master_for('sessions')
```

## Summary

A single Redis Sentinel cluster can monitor multiple independent Redis primary instances by adding multiple `sentinel monitor` lines with different names. Each master has independent failover settings (timeout, quorum, parallel-syncs). This approach reduces operational overhead while giving you per-service failover tuning flexibility.
