# How to Configure Redis Replication (Master-Replica)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, Master-Replica, Read Scaling, High Availability, DevOps, Sync, Persistence

Description: A comprehensive guide to configuring Redis replication with master-replica setup. Learn about synchronization modes, read scaling, replica promotion, and best practices for production deployments.

---

> Redis replication provides data redundancy and read scaling by maintaining copies of data on multiple servers. A master handles writes while replicas serve reads and provide failover capability. Understanding replication is fundamental to building resilient Redis deployments.

Replication is the foundation for both Redis Sentinel and Redis Cluster high availability features.

---

## Understanding Redis Replication

### How Replication Works

```
┌──────────────────────────────────────────────────────────────┐
│                      Write Path                               │
│   Client ───► Master ───► Replicas (async/sync)              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                      Read Path                                │
│   Client ───► Master (writes + reads)                        │
│   Client ───► Replica (reads only)                           │
└──────────────────────────────────────────────────────────────┘

Replication Flow:
1. Replica connects to master
2. Master starts BGSAVE (creates RDB snapshot)
3. Master sends RDB to replica
4. Replica loads RDB into memory
5. Master sends backlog of commands during BGSAVE
6. Replica is now synchronized
7. Master streams new commands to replica (async)
```

### Replication Types

| Type | Consistency | Performance | Data Safety |
|------|------------|-------------|-------------|
| Async (default) | Eventual | High | Risk of data loss |
| Semi-sync (WAIT) | Strong | Medium | Configurable |
| Sync (diskless) | Eventual | Higher | Risk of data loss |

---

## Basic Master-Replica Setup

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
requirepass your-master-password
masterauth your-master-password  # For chained replication or failover

# Persistence
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec

# Replication settings
repl-backlog-size 64mb           # Buffer for partial resync
repl-backlog-ttl 3600            # Keep backlog for 1 hour after all replicas disconnect
min-replicas-to-write 1          # Require at least 1 replica for writes
min-replicas-max-lag 10          # Replica must be within 10 seconds
```

### Replica Configuration

```bash
# /etc/redis/redis.conf on replica
bind 0.0.0.0
port 6379
daemonize yes
pidfile /var/run/redis/redis-server.pid
logfile /var/log/redis/redis-server.log
dir /var/lib/redis

# Security - same password for auth
requirepass your-master-password
masterauth your-master-password

# Replication - point to master
replicaof master-hostname 6379

# Replica behavior
replica-read-only yes            # Replica is read-only
replica-serve-stale-data yes     # Serve data during sync
replica-priority 100             # Priority for promotion (lower = higher priority)

# Persistence on replica
save 900 1
save 300 10
save 60 10000
appendonly yes
```

### Starting Replication

```bash
# Start master
redis-server /etc/redis/redis.conf

# Start replica (replication begins automatically)
redis-server /etc/redis/redis.conf

# Or configure replication at runtime
redis-cli -a password REPLICAOF master-hostname 6379

# Check replication status on master
redis-cli -a password INFO replication

# Output:
# role:master
# connected_slaves:1
# slave0:ip=192.168.1.2,port=6379,state=online,offset=12345,lag=0
```

---

## Docker Compose Setup

```yaml
version: '3.8'

services:
  redis-master:
    image: redis:7-alpine
    container_name: redis-master
    command: >
      redis-server
      --requirepass redispassword
      --masterauth redispassword
      --appendonly yes
    volumes:
      - redis-master-data:/data
    ports:
      - "6379:6379"
    networks:
      - redis-network

  redis-replica-1:
    image: redis:7-alpine
    container_name: redis-replica-1
    command: >
      redis-server
      --replicaof redis-master 6379
      --requirepass redispassword
      --masterauth redispassword
      --replica-read-only yes
      --appendonly yes
    volumes:
      - redis-replica-1-data:/data
    ports:
      - "6380:6379"
    depends_on:
      - redis-master
    networks:
      - redis-network

  redis-replica-2:
    image: redis:7-alpine
    container_name: redis-replica-2
    command: >
      redis-server
      --replicaof redis-master 6379
      --requirepass redispassword
      --masterauth redispassword
      --replica-read-only yes
      --appendonly yes
    volumes:
      - redis-replica-2-data:/data
    ports:
      - "6381:6379"
    depends_on:
      - redis-master
    networks:
      - redis-network

networks:
  redis-network:
    driver: bridge

volumes:
  redis-master-data:
  redis-replica-1-data:
  redis-replica-2-data:
```

---

## Synchronization Modes

### Asynchronous Replication (Default)

```bash
# Master doesn't wait for replicas
# Highest performance, risk of data loss on failover

# Default behavior - no special config needed
```

### Synchronous Writes with WAIT

```bash
# Client can request sync confirmation
redis-cli -a password SET key value
redis-cli -a password WAIT 1 1000
# Waits for 1 replica to acknowledge, timeout 1000ms
# Returns number of replicas that acknowledged

# Python example
import redis

r = redis.Redis(host='master', password='password')
r.set('important_key', 'value')
# Wait for at least 1 replica, timeout 5 seconds
acked = r.wait(1, 5000)
if acked < 1:
    raise Exception("Write not replicated to any replica")
```

### Diskless Replication

```bash
# Master sends RDB directly over socket (no disk I/O)
# Faster for slow disk, fast network scenarios

# Master config
repl-diskless-sync yes
repl-diskless-sync-delay 5     # Wait 5 seconds for more replicas
repl-diskless-sync-max-replicas 0  # 0 = wait for all replicas

# Replica config (optional - diskless load)
repl-diskless-load swapdb      # Load RDB while serving old data
# Options: disabled, on-empty-db, swapdb
```

---

## Read Scaling

### Distributing Reads

```python
import redis
from random import choice

class ReadScaler:
    """Distribute reads across replicas"""

    def __init__(self, master_config, replica_configs):
        self.master = redis.Redis(**master_config)
        self.replicas = [redis.Redis(**config) for config in replica_configs]
        self.all_nodes = [self.master] + self.replicas

    def set(self, key, value):
        """Writes always go to master"""
        return self.master.set(key, value)

    def get(self, key, prefer_replica=True):
        """Reads can go to replicas"""
        if prefer_replica and self.replicas:
            replica = choice(self.replicas)
            try:
                return replica.get(key)
            except redis.ConnectionError:
                # Fallback to master
                return self.master.get(key)
        return self.master.get(key)

    def get_from_master(self, key):
        """Force read from master (for consistency)"""
        return self.master.get(key)

# Usage
scaler = ReadScaler(
    master_config={'host': 'master', 'port': 6379, 'password': 'pass'},
    replica_configs=[
        {'host': 'replica1', 'port': 6379, 'password': 'pass'},
        {'host': 'replica2', 'port': 6379, 'password': 'pass'},
    ]
)

# Write to master
scaler.set('key', 'value')

# Read from random replica
value = scaler.get('key')

# Read from master (when consistency matters)
value = scaler.get_from_master('key')
```

### Node.js Read Scaling with ioredis

```javascript
const Redis = require('ioredis');

// Master for writes
const master = new Redis({
    host: 'master',
    port: 6379,
    password: 'password'
});

// Replicas for reads
const replicas = [
    new Redis({ host: 'replica1', port: 6379, password: 'password' }),
    new Redis({ host: 'replica2', port: 6379, password: 'password' })
];

// Round-robin replica selection
let replicaIndex = 0;

function getReadReplica() {
    const replica = replicas[replicaIndex];
    replicaIndex = (replicaIndex + 1) % replicas.length;
    return replica;
}

// Write to master
async function write(key, value) {
    return master.set(key, value);
}

// Read from replica
async function read(key) {
    try {
        return await getReadReplica().get(key);
    } catch (err) {
        // Fallback to master
        return master.get(key);
    }
}

// Read from master (strong consistency)
async function readFromMaster(key) {
    return master.get(key);
}
```

---

## Replica Promotion

### Manual Promotion

```bash
# On replica - remove replication and become master
redis-cli -a password REPLICAOF NO ONE

# Verify new role
redis-cli -a password INFO replication
# role:master

# Reconfigure other replicas to follow new master
redis-cli -h other-replica -a password REPLICAOF new-master 6379
```

### Automated Promotion Script

```python
import redis
import time

class ReplicationManager:
    def __init__(self, master_host, master_port, replicas, password):
        self.password = password
        self.master_host = master_host
        self.master_port = master_port
        self.replicas = replicas  # List of (host, port) tuples

    def get_connection(self, host, port):
        return redis.Redis(host=host, port=port, password=self.password)

    def check_master_health(self):
        """Check if master is healthy"""
        try:
            master = self.get_connection(self.master_host, self.master_port)
            master.ping()
            return True
        except redis.ConnectionError:
            return False

    def get_best_replica(self):
        """Find replica with most recent data"""
        best_replica = None
        best_offset = -1

        for host, port in self.replicas:
            try:
                conn = self.get_connection(host, port)
                info = conn.info('replication')

                # Check replication offset
                offset = info.get('master_repl_offset', 0)
                if offset > best_offset:
                    best_offset = offset
                    best_replica = (host, port)

            except redis.ConnectionError:
                continue

        return best_replica

    def promote_replica(self, host, port):
        """Promote replica to master"""
        conn = self.get_connection(host, port)

        # Stop replication
        conn.replicaof('NO', 'ONE')

        # Verify role
        info = conn.info('replication')
        if info['role'] != 'master':
            raise Exception("Promotion failed")

        return True

    def reconfigure_replicas(self, new_master_host, new_master_port):
        """Point all replicas to new master"""
        for host, port in self.replicas:
            if host == new_master_host and port == new_master_port:
                continue  # Skip the new master

            try:
                conn = self.get_connection(host, port)
                conn.replicaof(new_master_host, new_master_port)
            except redis.ConnectionError:
                print(f"Could not reconfigure {host}:{port}")

    def failover(self):
        """Perform failover to best replica"""
        if self.check_master_health():
            print("Master is healthy, no failover needed")
            return False

        best_replica = self.get_best_replica()
        if not best_replica:
            raise Exception("No healthy replicas available")

        host, port = best_replica
        print(f"Promoting {host}:{port} to master")

        # Promote
        self.promote_replica(host, port)

        # Reconfigure other replicas
        self.reconfigure_replicas(host, port)

        # Update master reference
        self.master_host = host
        self.master_port = port

        return True

# Usage
manager = ReplicationManager(
    master_host='master',
    master_port=6379,
    replicas=[('replica1', 6379), ('replica2', 6379)],
    password='password'
)

# Check and failover if needed
if manager.failover():
    print("Failover completed successfully")
```

---

## Monitoring Replication

### Key Metrics

```bash
# On master
redis-cli -a password INFO replication

# Important metrics:
# role: master/slave
# connected_slaves: number of replicas
# slave0: ip=x.x.x.x,port=6379,state=online,offset=123456,lag=0
# master_repl_offset: current replication offset

# On replica
redis-cli -a password INFO replication

# Important metrics:
# role: slave
# master_host: master hostname
# master_port: master port
# master_link_status: up/down
# master_last_io_seconds_ago: seconds since last communication
# master_sync_in_progress: 0/1
# slave_repl_offset: replica's offset
# slave_read_repl_offset: read offset
```

### Prometheus Monitoring

```python
from prometheus_client import Gauge, start_http_server
import redis
import time

# Metrics
replication_offset = Gauge('redis_replication_offset', 'Replication offset', ['role', 'host'])
replication_lag = Gauge('redis_replication_lag_seconds', 'Replication lag', ['replica'])
replicas_connected = Gauge('redis_replicas_connected', 'Connected replicas')
master_link_status = Gauge('redis_master_link_status', 'Master link status (1=up)', ['replica'])

def monitor_replication(master_host, replicas, password):
    while True:
        # Monitor master
        try:
            master = redis.Redis(host=master_host, password=password)
            info = master.info('replication')

            replication_offset.labels(role='master', host=master_host).set(
                info.get('master_repl_offset', 0)
            )
            replicas_connected.set(info.get('connected_slaves', 0))

            # Parse replica info
            for i in range(info.get('connected_slaves', 0)):
                slave_info = info.get(f'slave{i}', '')
                if slave_info:
                    parts = dict(p.split('=') for p in slave_info.split(','))
                    lag = int(parts.get('lag', 0))
                    replication_lag.labels(replica=parts['ip']).set(lag)

        except redis.ConnectionError:
            pass

        # Monitor replicas
        for host, port in replicas:
            try:
                replica = redis.Redis(host=host, port=port, password=password)
                info = replica.info('replication')

                replication_offset.labels(role='replica', host=host).set(
                    info.get('slave_repl_offset', 0)
                )

                link_up = 1 if info.get('master_link_status') == 'up' else 0
                master_link_status.labels(replica=host).set(link_up)

            except redis.ConnectionError:
                master_link_status.labels(replica=host).set(0)

        time.sleep(5)

if __name__ == '__main__':
    start_http_server(8000)
    monitor_replication(
        'master',
        [('replica1', 6379), ('replica2', 6379)],
        'password'
    )
```

---

## Handling Replication Issues

### Replication Lag

```bash
# Check lag
redis-cli -a password INFO replication | grep lag

# High lag causes:
# 1. Network latency
# 2. Slow replica disk I/O
# 3. Large write volume on master

# Solutions:
# - Increase repl-backlog-size
# - Use diskless replication
# - Add more replicas to distribute reads
# - Upgrade network/disk
```

### Partial vs Full Resync

```bash
# Partial resync (PSYNC) - uses backlog
# Full resync - requires RDB transfer

# Increase backlog for better partial resync chance
repl-backlog-size 256mb

# Monitor resync events
redis-cli -a password INFO stats | grep sync
# sync_full: number of full resyncs
# sync_partial_ok: successful partial resyncs
# sync_partial_err: failed partial resyncs
```

### Stale Data on Replicas

```bash
# Option 1: Serve stale data during sync
replica-serve-stale-data yes

# Option 2: Return error during sync
replica-serve-stale-data no

# Check if replica is syncing
redis-cli -a password INFO replication | grep sync_in_progress
```

---

## Best Practices

### 1. Use masterauth Everywhere

```bash
# Even on master - needed if it becomes a replica after failover
masterauth your-password
```

### 2. Configure Minimum Replicas

```bash
# Refuse writes if not enough replicas
min-replicas-to-write 1
min-replicas-max-lag 10
```

### 3. Size the Backlog Appropriately

```bash
# Calculate based on write rate and expected reconnection time
# Formula: write_rate_per_second * max_reconnection_time
# Example: 10MB/s writes, 60s reconnection = 600MB backlog
repl-backlog-size 600mb
```

### 4. Use Different Priorities

```bash
# On replicas - lower number = higher promotion priority
replica-priority 100  # Default
replica-priority 50   # Preferred for promotion
replica-priority 0    # Never promote (use for read-only replicas)
```

---

## Conclusion

Redis replication provides data redundancy and read scaling:

- **Data safety**: Replicas maintain copies of master data
- **Read scaling**: Distribute reads across replicas
- **Failover capability**: Promote replica to master when needed

Key takeaways:
- Replication is asynchronous by default - use WAIT for sync writes
- Size backlog appropriately for your write volume
- Monitor replication lag continuously
- Test failover procedures regularly

---

*Need to monitor your Redis replication setup? [OneUptime](https://oneuptime.com) provides comprehensive Redis monitoring with replication lag alerts, master link status tracking, and automatic failover detection.*
