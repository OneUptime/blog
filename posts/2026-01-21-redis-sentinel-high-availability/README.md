# How to Set Up Redis Sentinel for High Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sentinel, High Availability, Failover, Monitoring, DevOps, Production, Clustering

Description: A comprehensive guide to setting up Redis Sentinel for automatic failover, monitoring, and high availability. Learn configuration best practices, deployment patterns, and client integration.

---

> Redis Sentinel provides high availability for Redis through automatic failover. When your master fails, Sentinel automatically promotes a replica to master and reconfigures other replicas and clients - all without manual intervention.

Sentinel is ideal for Redis deployments that require automatic failover but don't need the horizontal scaling of Redis Cluster. It's simpler to set up and works with existing Redis clients.

---

## Understanding Redis Sentinel

### Key Features

- **Monitoring**: Continuously checks if master and replica instances are working
- **Notification**: Alerts administrators via API when something goes wrong
- **Automatic failover**: Promotes replica to master when master fails
- **Configuration provider**: Clients connect to Sentinel to get current master address

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Sentinel Cluster                          │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│   │Sentinel 1│    │Sentinel 2│    │Sentinel 3│             │
│   └────┬─────┘    └────┬─────┘    └────┬─────┘             │
└────────┼───────────────┼───────────────┼────────────────────┘
         │               │               │
         │     Monitor   │               │
         ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │  Master │───▶│Replica 1│───▶│Replica 2│
    │ (Write) │    │ (Read)  │    │ (Read)  │
    └─────────┘    └─────────┘    └─────────┘
```

### Quorum and Failover

```
Sentinel Agreement Process:
1. Sentinel detects master is down (SDOWN - subjective)
2. Sentinel asks other Sentinels to confirm (ODOWN - objective)
3. If quorum agrees, failover begins
4. One Sentinel is elected leader
5. Leader promotes best replica to master
6. Other replicas reconfigured to follow new master
```

---

## Installation and Basic Setup

### Prerequisites

Create the following nodes:
- 1 Master (redis-master)
- 2 Replicas (redis-replica-1, redis-replica-2)
- 3 Sentinels (sentinel-1, sentinel-2, sentinel-3)

### Master Configuration

```bash
# /etc/redis/redis.conf on master
bind 0.0.0.0
port 6379
daemonize yes
pidfile /var/run/redis/redis-server.pid
logfile /var/log/redis/redis-server.log
dir /var/lib/redis

# Security
requirepass your-strong-password
masterauth your-strong-password  # Needed for replication after failover

# Persistence
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec

# Memory
maxmemory 4gb
maxmemory-policy allkeys-lru
```

### Replica Configuration

```bash
# /etc/redis/redis.conf on replicas
bind 0.0.0.0
port 6379
daemonize yes
pidfile /var/run/redis/redis-server.pid
logfile /var/log/redis/redis-server.log
dir /var/lib/redis

# Replication - point to master
replicaof redis-master 6379
masterauth your-strong-password

# Security
requirepass your-strong-password

# Replica settings
replica-read-only yes
replica-serve-stale-data yes

# Persistence
save 900 1
save 300 10
save 60 10000
appendonly yes
```

### Sentinel Configuration

```bash
# /etc/redis/sentinel.conf on each Sentinel node
port 26379
daemonize yes
pidfile /var/run/redis/redis-sentinel.pid
logfile /var/log/redis/sentinel.log
dir /var/lib/redis

# Monitor master with name "mymaster"
# Last number is quorum (minimum Sentinels to agree on failover)
sentinel monitor mymaster redis-master 6379 2

# Authentication
sentinel auth-pass mymaster your-strong-password

# Timing parameters
sentinel down-after-milliseconds mymaster 5000    # 5 seconds to detect failure
sentinel failover-timeout mymaster 60000           # 60 seconds failover timeout
sentinel parallel-syncs mymaster 1                 # 1 replica syncs at a time

# Notification script (optional)
# sentinel notification-script mymaster /path/to/notify.sh

# Client reconfiguration script (optional)
# sentinel client-reconfig-script mymaster /path/to/reconfig.sh
```

### Starting Services

```bash
# Start Redis on master
redis-server /etc/redis/redis.conf

# Start Redis on replicas
redis-server /etc/redis/redis.conf

# Verify replication
redis-cli -a your-strong-password INFO replication

# Start Sentinels (on each Sentinel node)
redis-sentinel /etc/redis/sentinel.conf

# Check Sentinel status
redis-cli -p 26379 SENTINEL master mymaster
redis-cli -p 26379 SENTINEL replicas mymaster
redis-cli -p 26379 SENTINEL sentinels mymaster
```

---

## Docker Compose Setup

### docker-compose.yml

```yaml
version: '3.8'

services:
  redis-master:
    image: redis:7-alpine
    container_name: redis-master
    command: redis-server /etc/redis/redis.conf
    volumes:
      - ./redis-master.conf:/etc/redis/redis.conf
      - redis-master-data:/data
    networks:
      - redis-network
    ports:
      - "6379:6379"

  redis-replica-1:
    image: redis:7-alpine
    container_name: redis-replica-1
    command: redis-server /etc/redis/redis.conf
    volumes:
      - ./redis-replica.conf:/etc/redis/redis.conf
      - redis-replica-1-data:/data
    networks:
      - redis-network
    depends_on:
      - redis-master

  redis-replica-2:
    image: redis:7-alpine
    container_name: redis-replica-2
    command: redis-server /etc/redis/redis.conf
    volumes:
      - ./redis-replica.conf:/etc/redis/redis.conf
      - redis-replica-2-data:/data
    networks:
      - redis-network
    depends_on:
      - redis-master

  sentinel-1:
    image: redis:7-alpine
    container_name: sentinel-1
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./sentinel.conf:/etc/redis/sentinel.conf
    networks:
      - redis-network
    ports:
      - "26379:26379"
    depends_on:
      - redis-master
      - redis-replica-1
      - redis-replica-2

  sentinel-2:
    image: redis:7-alpine
    container_name: sentinel-2
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./sentinel.conf:/etc/redis/sentinel.conf
    networks:
      - redis-network
    ports:
      - "26380:26379"
    depends_on:
      - redis-master

  sentinel-3:
    image: redis:7-alpine
    container_name: sentinel-3
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./sentinel.conf:/etc/redis/sentinel.conf
    networks:
      - redis-network
    ports:
      - "26381:26379"
    depends_on:
      - redis-master

networks:
  redis-network:
    driver: bridge

volumes:
  redis-master-data:
  redis-replica-1-data:
  redis-replica-2-data:
```

### Configuration Files for Docker

```bash
# redis-master.conf
bind 0.0.0.0
port 6379
requirepass redispassword
masterauth redispassword
appendonly yes

# redis-replica.conf
bind 0.0.0.0
port 6379
requirepass redispassword
masterauth redispassword
replicaof redis-master 6379
appendonly yes

# sentinel.conf
port 26379
sentinel monitor mymaster redis-master 6379 2
sentinel auth-pass mymaster redispassword
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
```

---

## Client Configuration

### Python with redis-py

```python
from redis.sentinel import Sentinel

# Connect to Sentinel cluster
sentinel = Sentinel(
    [
        ('sentinel-1', 26379),
        ('sentinel-2', 26379),
        ('sentinel-3', 26379)
    ],
    socket_timeout=0.5,
    password='redispassword'  # Sentinel password if set
)

# Get master connection (for writes)
master = sentinel.master_for(
    'mymaster',
    socket_timeout=0.5,
    password='redispassword'
)

# Get replica connection (for reads)
replica = sentinel.slave_for(
    'mymaster',
    socket_timeout=0.5,
    password='redispassword'
)

# Use connections
master.set('key', 'value')    # Write to master
value = replica.get('key')     # Read from replica

# The client automatically handles failover
# If master fails, it will reconnect to new master
```

### Python with Connection Pool

```python
from redis.sentinel import Sentinel, SentinelConnectionPool

sentinel = Sentinel(
    [
        ('sentinel-1', 26379),
        ('sentinel-2', 26379),
        ('sentinel-3', 26379)
    ],
    socket_timeout=0.5
)

# Create connection pool for master
pool = SentinelConnectionPool(
    'mymaster',
    sentinel,
    password='redispassword',
    max_connections=50
)

# Use pool
import redis
r = redis.Redis(connection_pool=pool)
r.set('key', 'value')
```

### Node.js with ioredis

```javascript
const Redis = require('ioredis');

// ioredis has built-in Sentinel support
const redis = new Redis({
    sentinels: [
        { host: 'sentinel-1', port: 26379 },
        { host: 'sentinel-2', port: 26379 },
        { host: 'sentinel-3', port: 26379 }
    ],
    name: 'mymaster',  // Sentinel master name
    password: 'redispassword',
    sentinelPassword: 'sentinelpassword',  // If Sentinel has auth
    role: 'master',  // or 'slave' for read replicas

    // Retry strategy
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },

    // Reconnect on errors
    reconnectOnError(err) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
            return true;  // Reconnect when replica is promoted
        }
        return false;
    }
});

redis.on('connect', () => console.log('Connected to Redis'));
redis.on('error', (err) => console.error('Redis error:', err));
redis.on('+switch-master', () => console.log('Master switched!'));

// Usage
await redis.set('key', 'value');
const value = await redis.get('key');

// For read replicas
const replicaRedis = new Redis({
    sentinels: [
        { host: 'sentinel-1', port: 26379 },
        { host: 'sentinel-2', port: 26379 },
        { host: 'sentinel-3', port: 26379 }
    ],
    name: 'mymaster',
    password: 'redispassword',
    role: 'slave'  // Connect to replica for reads
});
```

### Go with go-redis

```go
package main

import (
    "context"
    "fmt"
    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()

    // Create Sentinel client
    rdb := redis.NewFailoverClient(&redis.FailoverOptions{
        MasterName: "mymaster",
        SentinelAddrs: []string{
            "sentinel-1:26379",
            "sentinel-2:26379",
            "sentinel-3:26379",
        },
        Password:         "redispassword",
        SentinelPassword: "sentinelpassword",

        // Pool settings
        PoolSize:     50,
        MinIdleConns: 10,

        // Timeouts
        DialTimeout:  5 * time.Second,
        ReadTimeout:  3 * time.Second,
        WriteTimeout: 3 * time.Second,
    })

    // Test connection
    pong, err := rdb.Ping(ctx).Result()
    if err != nil {
        panic(err)
    }
    fmt.Println(pong)

    // Use client
    err = rdb.Set(ctx, "key", "value", 0).Err()
    if err != nil {
        panic(err)
    }

    val, err := rdb.Get(ctx, "key").Result()
    if err != nil {
        panic(err)
    }
    fmt.Println(val)
}
```

---

## Monitoring and Operations

### Sentinel Commands

```bash
# Get master info
redis-cli -p 26379 SENTINEL master mymaster

# Get replica list
redis-cli -p 26379 SENTINEL replicas mymaster

# Get Sentinel list
redis-cli -p 26379 SENTINEL sentinels mymaster

# Check if master is down
redis-cli -p 26379 SENTINEL ckquorum mymaster

# Force failover (manual)
redis-cli -p 26379 SENTINEL failover mymaster

# Reset Sentinel state
redis-cli -p 26379 SENTINEL reset mymaster

# Get master address
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
```

### Monitoring Script

```python
import redis
from prometheus_client import Gauge, start_http_server
import time

# Prometheus metrics
sentinel_masters = Gauge('redis_sentinel_masters', 'Number of monitored masters')
sentinel_replicas = Gauge('redis_sentinel_replicas', 'Number of replicas', ['master'])
sentinel_sentinels = Gauge('redis_sentinel_sentinels', 'Number of Sentinels', ['master'])
master_status = Gauge('redis_master_status', 'Master status (1=up, 0=down)', ['master'])

def monitor_sentinel():
    sentinel = redis.Redis(host='sentinel-1', port=26379)

    while True:
        try:
            # Get master info
            master_info = sentinel.execute_command('SENTINEL', 'master', 'mymaster')
            master_dict = dict(zip(master_info[::2], master_info[1::2]))

            # Update metrics
            flags = master_dict.get(b'flags', b'').decode()
            is_up = 1 if 'master' in flags and 's_down' not in flags else 0
            master_status.labels(master='mymaster').set(is_up)

            # Get replicas
            replicas = sentinel.execute_command('SENTINEL', 'replicas', 'mymaster')
            sentinel_replicas.labels(master='mymaster').set(len(replicas))

            # Get Sentinels
            sentinels = sentinel.execute_command('SENTINEL', 'sentinels', 'mymaster')
            sentinel_sentinels.labels(master='mymaster').set(len(sentinels) + 1)

        except Exception as e:
            print(f"Error monitoring: {e}")

        time.sleep(10)

if __name__ == '__main__':
    start_http_server(8000)
    monitor_sentinel()
```

### Alerting Configuration

```yaml
# alertmanager rules for Prometheus
groups:
  - name: redis-sentinel
    rules:
      - alert: RedisMasterDown
        expr: redis_master_status{master="mymaster"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Redis master is down"
          description: "Redis master {{ $labels.master }} has been down for more than 30 seconds"

      - alert: RedisReplicaCountLow
        expr: redis_sentinel_replicas{master="mymaster"} < 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis replica count is low"
          description: "Redis master {{ $labels.master }} has fewer than 2 replicas"

      - alert: SentinelCountLow
        expr: redis_sentinel_sentinels{master="mymaster"} < 3
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Sentinel count is low"
          description: "Fewer than 3 Sentinels monitoring {{ $labels.master }}"
```

---

## Testing Failover

### Manual Failover Test

```bash
# Check current master
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster

# Trigger manual failover
redis-cli -p 26379 SENTINEL failover mymaster

# Watch failover happen
redis-cli -p 26379 SENTINEL master mymaster

# Verify new master
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
```

### Simulate Master Failure

```bash
# Option 1: Stop Redis on master
docker stop redis-master

# Option 2: Debug sleep (blocks Redis)
redis-cli -a redispassword DEBUG sleep 30

# Option 3: Network partition (iptables)
iptables -A INPUT -p tcp --dport 6379 -j DROP

# Watch Sentinels detect failure and failover
watch -n 1 'redis-cli -p 26379 SENTINEL master mymaster | grep -E "flags|num-slaves|num-other"'
```

### Automated Failover Test Script

```python
import redis
from redis.sentinel import Sentinel
import time

def test_failover():
    sentinel = Sentinel([
        ('sentinel-1', 26379),
        ('sentinel-2', 26379),
        ('sentinel-3', 26379)
    ])

    # Get current master
    master_addr = sentinel.discover_master('mymaster')
    print(f"Current master: {master_addr}")

    # Write test data
    master = sentinel.master_for('mymaster', password='redispassword')
    master.set('test_key', 'before_failover')

    print("Triggering failover...")
    sentinel_client = redis.Redis(host='sentinel-1', port=26379)
    sentinel_client.execute_command('SENTINEL', 'failover', 'mymaster')

    # Wait for failover
    time.sleep(10)

    # Get new master
    new_master_addr = sentinel.discover_master('mymaster')
    print(f"New master: {new_master_addr}")

    # Verify data persisted
    new_master = sentinel.master_for('mymaster', password='redispassword')
    value = new_master.get('test_key')
    print(f"Data after failover: {value}")

    assert master_addr != new_master_addr, "Master should have changed"
    assert value == b'before_failover', "Data should persist after failover"

    print("Failover test PASSED!")

if __name__ == '__main__':
    test_failover()
```

---

## Best Practices

### 1. Quorum Configuration

```bash
# For 3 Sentinels, quorum of 2 is recommended
# Allows 1 Sentinel failure while still being able to failover
sentinel monitor mymaster 10.0.0.1 6379 2

# For 5 Sentinels, quorum of 3
sentinel monitor mymaster 10.0.0.1 6379 3
```

### 2. Network Considerations

- Deploy Sentinels on different physical machines
- Use odd number of Sentinels (3, 5, 7)
- Ensure network connectivity between all nodes
- Consider network partitions in your design

### 3. Timing Parameters

```bash
# Aggressive failover (faster detection, higher false positive risk)
sentinel down-after-milliseconds mymaster 3000
sentinel failover-timeout mymaster 30000

# Conservative failover (slower detection, fewer false positives)
sentinel down-after-milliseconds mymaster 10000
sentinel failover-timeout mymaster 180000
```

### 4. Security

```bash
# Require authentication
requirepass your-sentinel-password

# Bind to specific interfaces
bind 10.0.0.0

# Disable dangerous commands
rename-command SENTINEL ""  # If you want to disable Sentinel commands
```

---

## Troubleshooting

### Common Issues

```bash
# Check Sentinel logs
tail -f /var/log/redis/sentinel.log

# Verify Sentinel can reach master
redis-cli -p 26379 SENTINEL ckquorum mymaster

# Check for SDOWN/ODOWN states
redis-cli -p 26379 SENTINEL master mymaster | grep -E "flags|down"

# Reset Sentinel if configuration is stale
redis-cli -p 26379 SENTINEL reset mymaster
```

### Failover Not Happening

1. Check quorum is reachable
2. Verify Sentinel can connect to master/replicas
3. Check authentication is correct
4. Ensure `down-after-milliseconds` has elapsed

---

## Conclusion

Redis Sentinel provides automatic high availability:

- **Automatic failover**: No manual intervention needed
- **Monitoring**: Continuous health checks
- **Configuration provider**: Clients get current master address

Key takeaways:
- Use at least 3 Sentinels for production
- Set quorum to majority (2 for 3 Sentinels)
- Use Sentinel-aware clients that handle failover
- Test failover regularly

---

*Need to monitor your Redis Sentinel deployment? [OneUptime](https://oneuptime.com) provides comprehensive Redis monitoring with failover detection, replica lag alerts, and Sentinel health tracking.*
