# How to Configure Redis Sentinel for IPv4 High Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sentinel, IPv4, High Availability, Failover, Monitoring

Description: Set up Redis Sentinel on IPv4 for automatic failover monitoring, configure sentinel.conf with explicit IPv4 bind addresses, and connect applications using Sentinel discovery.

## Introduction

Redis Sentinel provides high availability through monitoring, notification, and automatic failover. In production, deploy at least 3 Sentinels so quorum and majority decisions can still succeed if one Sentinel fails. Sentinels monitor the Redis master and replicas over IPv4 and promote a replica if the master fails.

## Architecture

```text
App → Sentinel 1 (10.0.0.1:26379) ─┐
App → Sentinel 2 (10.0.0.2:26379) ─┼→ Monitor → Redis Master (10.0.0.1:6379)
App → Sentinel 3 (10.0.0.3:26379) ─┘               ↓ replicates
                                            Redis Replica 1 (10.0.0.2:6379)
                                            Redis Replica 2 (10.0.0.3:6379)
```

## Redis Primary Configuration

```bash
# /etc/redis/redis.conf (on primary: 10.0.0.1)

bind 127.0.0.1 10.0.0.1
requirepass "RedisPassword123"
port 6379
```

## Redis Replica Configuration

```bash
# /etc/redis/redis.conf (on replica: 10.0.0.2)

bind 127.0.0.1 10.0.0.2
requirepass "RedisPassword123"
port 6379

# Connect to master

replicaof 10.0.0.1 6379
masterauth "RedisPassword123"
```

## Sentinel Configuration

```bash
# /etc/redis/sentinel.conf (same on all 3 sentinel nodes)
# Adjust bind address per node

# Bind Sentinel to specific IPv4 on this node
bind 127.0.0.1 10.0.0.1

port 26379

# Monitor the master with quorum = 2
sentinel monitor mymaster 10.0.0.1 6379 2

# Auth for master (if requirepass is set)
sentinel auth-pass mymaster RedisPassword123

# Failover timing
# 5 seconds
sentinel down-after-milliseconds mymaster 5000
# 1 minute
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1

# Sentinel password (optional but recommended)
# requirepass SentinelPassword
```

## Starting Sentinels

```bash
# Start Sentinel on each node
sudo systemctl start redis-sentinel
# or
redis-sentinel /etc/redis/sentinel.conf

# Verify Sentinel is running
redis-cli -p 26379 sentinel masters
# Shows: mymaster, ip, port, status

# Check sentinel info
redis-cli -p 26379 sentinel master mymaster
```

## Connecting Applications via Sentinel

```bash
# Python (redis-py with Sentinel):
from redis.sentinel import Sentinel
sentinel = Sentinel(
    [('10.0.0.1', 26379), ('10.0.0.2', 26379), ('10.0.0.3', 26379)],
    socket_timeout=0.1
)
master = sentinel.master_for('mymaster', password='RedisPassword123')
replica = sentinel.slave_for('mymaster', password='RedisPassword123')

# Node.js (ioredis):
const Redis = require('ioredis');
const client = new Redis({
  sentinels: [
    { host: '10.0.0.1', port: 26379 },
    { host: '10.0.0.2', port: 26379 }
  ],
  name: 'mymaster',
  password: 'RedisPassword123'
});
```

## Testing Failover

```bash
# Simulate master failure
redis-cli -h 10.0.0.1 -p 6379 -a RedisPassword123 DEBUG SLEEP 60
# or kill the master process

# Watch Sentinel promote a replica
redis-cli -p 26379 sentinel get-master-addr-by-name mymaster

# Check logs
sudo journalctl -u redis-sentinel -f | grep -i "failover\|promoted\|elected"
```

## Conclusion

For a robust deployment, run at least 3 Sentinel nodes; with 3 Sentinels, a quorum of 2 can detect failure and a majority is still required to authorize failover. Bind each Sentinel to its specific IPv4 with `bind` in `sentinel.conf`. Configure `sentinel monitor` pointing to the master's IPv4 and set `sentinel auth-pass` if Redis requires authentication. Applications connect to Sentinel addresses and discover the current master dynamically.
