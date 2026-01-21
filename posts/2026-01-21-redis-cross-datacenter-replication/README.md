# How to Set Up Cross-Datacenter Redis Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cross-Datacenter, Geo-Replication, Disaster Recovery, Active-Passive, Active-Active, High Availability, DevOps

Description: A comprehensive guide to setting up cross-datacenter Redis replication for disaster recovery and global distribution. Learn active-passive, active-active patterns, and best practices for geo-distributed deployments.

---

> Deploying Redis across datacenters provides disaster recovery and brings data closer to users. But cross-datacenter replication introduces latency, consistency challenges, and complex failure scenarios. This guide covers patterns and practices for reliable geo-distributed Redis.

Choose the right pattern based on your consistency requirements, write patterns, and recovery time objectives.

---

## Cross-Datacenter Patterns

### Pattern Comparison

| Pattern | Consistency | Write Location | Failover | Complexity |
|---------|-------------|----------------|----------|------------|
| Active-Passive | Strong | Single DC | Manual/Auto | Low |
| Active-Active | Eventual | Any DC | Automatic | High |
| Read Replicas | Strong (writes) | Single DC | Manual | Medium |

### Architecture Options

```
Active-Passive (DR)
────────────────────────────────────────────────────────────
┌─────────────────┐     Async Replication    ┌─────────────────┐
│   DC1 (Active)  │ ─────────────────────▶  │  DC2 (Passive)  │
│  Master + Sentinel                        │  Replica + Sentinel │
│  [WRITES + READS]                         │  [STANDBY]      │
└─────────────────┘                         └─────────────────┘

Active-Active (Geo-Distribution)
────────────────────────────────────────────────────────────
┌─────────────────┐     Conflict Resolution   ┌─────────────────┐
│   DC1 (Active)  │ ◀────────────────────▶   │   DC2 (Active)  │
│  Master + Sentinel                         │  Master + Sentinel │
│  [WRITES + READS]                          │  [WRITES + READS] │
└─────────────────┘                          └─────────────────┘
```

---

## Active-Passive Setup

### DC1 (Primary Datacenter)

```bash
# redis.conf - Master in DC1
bind 0.0.0.0
port 6379
requirepass your-password
masterauth your-password

# Replication settings
repl-backlog-size 256mb
repl-backlog-ttl 7200

# Minimum replicas (including cross-DC)
min-replicas-to-write 1
min-replicas-max-lag 60  # Allow higher lag for cross-DC

# Persistence
appendonly yes
appendfsync everysec
```

### DC2 (Disaster Recovery Datacenter)

```bash
# redis.conf - Replica in DC2
bind 0.0.0.0
port 6379
requirepass your-password
masterauth your-password

# Point to DC1 master
replicaof dc1-master.example.com 6379

# Replica settings
replica-read-only yes
replica-serve-stale-data yes

# Persistence
appendonly yes
```

### Sentinel Configuration for Both DCs

```bash
# sentinel.conf - DC1
port 26379
sentinel monitor mymaster dc1-master.example.com 6379 2
sentinel auth-pass mymaster your-password
sentinel down-after-milliseconds mymaster 10000
sentinel failover-timeout mymaster 180000
sentinel parallel-syncs mymaster 1

# Announce IP (important for cross-DC)
sentinel announce-ip dc1-sentinel1.example.com
sentinel announce-port 26379

# sentinel.conf - DC2
port 26379
sentinel monitor mymaster dc1-master.example.com 6379 2
sentinel auth-pass mymaster your-password
sentinel down-after-milliseconds mymaster 10000
sentinel failover-timeout mymaster 180000
sentinel parallel-syncs mymaster 1

sentinel announce-ip dc2-sentinel1.example.com
sentinel announce-port 26379
```

### Failover Configuration

```bash
# Prevent automatic failover to DC2 replica
# Set higher priority on DC1 replicas
# On DC1 replicas:
replica-priority 100

# On DC2 replicas (DR only):
replica-priority 200  # Higher number = lower priority

# For manual DR failover only:
replica-priority 0   # Never auto-promote
```

### Manual DR Failover Script

```python
import redis
from redis.sentinel import Sentinel
import time

class CrossDCFailover:
    def __init__(self, dc1_sentinels, dc2_sentinels, master_name, password):
        self.dc1_sentinel = Sentinel(dc1_sentinels, password=password)
        self.dc2_sentinel = Sentinel(dc2_sentinels, password=password)
        self.master_name = master_name
        self.password = password

    def check_dc1_health(self):
        """Check if DC1 is healthy"""
        try:
            master = self.dc1_sentinel.master_for(
                self.master_name,
                password=self.password
            )
            master.ping()
            return True
        except Exception:
            return False

    def failover_to_dc2(self):
        """Manual failover to DC2"""
        print("Initiating failover to DC2...")

        # Get DC2 replica info
        dc2_sentinel_client = redis.Redis(
            host=self.dc2_sentinel.sentinels[0][0],
            port=self.dc2_sentinel.sentinels[0][1]
        )

        # Get DC2 replica address
        replicas = dc2_sentinel_client.execute_command(
            'SENTINEL', 'replicas', self.master_name
        )

        if not replicas:
            raise Exception("No DC2 replicas found")

        # Find best DC2 replica
        dc2_replica = None
        for replica in replicas:
            replica_dict = dict(zip(replica[::2], replica[1::2]))
            ip = replica_dict[b'ip'].decode()
            if 'dc2' in ip:  # Assuming DC2 replicas have 'dc2' in hostname
                dc2_replica = replica_dict
                break

        if not dc2_replica:
            raise Exception("No DC2 replica found")

        # Promote DC2 replica
        dc2_host = dc2_replica[b'ip'].decode()
        dc2_port = int(dc2_replica[b'port'])

        dc2_client = redis.Redis(
            host=dc2_host,
            port=dc2_port,
            password=self.password
        )

        # Stop replication and become master
        dc2_client.replicaof('NO', 'ONE')

        print(f"DC2 replica {dc2_host}:{dc2_port} promoted to master")

        # Update Sentinel configuration
        # (In production, update Sentinel config files and restart)

        return dc2_host, dc2_port

    def failback_to_dc1(self, dc1_master_host, dc1_master_port):
        """Failback to DC1 after recovery"""
        print("Initiating failback to DC1...")

        # Get current master (in DC2)
        current_master = self.dc2_sentinel.master_for(
            self.master_name,
            password=self.password
        )

        # Sync DC1 master from DC2
        dc1_client = redis.Redis(
            host=dc1_master_host,
            port=dc1_master_port,
            password=self.password
        )

        # Make DC1 a replica of DC2 temporarily
        current_master_info = self.dc2_sentinel.discover_master(self.master_name)
        dc1_client.replicaof(current_master_info[0], current_master_info[1])

        # Wait for sync
        print("Waiting for DC1 to sync from DC2...")
        time.sleep(30)  # Adjust based on data size

        # Promote DC1 back to master
        dc1_client.replicaof('NO', 'ONE')

        # Reconfigure DC2 as replica
        current_master.replicaof(dc1_master_host, dc1_master_port)

        print("Failback to DC1 complete")

# Usage
failover = CrossDCFailover(
    dc1_sentinels=[('dc1-sentinel1', 26379), ('dc1-sentinel2', 26379)],
    dc2_sentinels=[('dc2-sentinel1', 26379), ('dc2-sentinel2', 26379)],
    master_name='mymaster',
    password='password'
)

# Check DC1 health
if not failover.check_dc1_health():
    # Failover to DC2
    new_master = failover.failover_to_dc2()
```

---

## Active-Active Setup

### Using CRDT (Conflict-Free Replicated Data Types)

Active-active requires conflict resolution. Redis Enterprise provides built-in CRDT support. For open-source Redis, implement application-level conflict resolution.

### Application-Level Active-Active

```python
import redis
import time
import json
from typing import Any, Optional
import hashlib

class ActiveActiveRedis:
    """
    Application-level active-active Redis.
    Uses last-write-wins with vector clocks for conflict resolution.
    """

    def __init__(self, local_redis, remote_redis, dc_id):
        self.local = local_redis
        self.remote = remote_redis
        self.dc_id = dc_id

    def set(self, key: str, value: Any, propagate: bool = True):
        """Set with conflict resolution metadata"""
        timestamp = time.time()

        # Create versioned value
        versioned = {
            'value': value,
            'timestamp': timestamp,
            'dc': self.dc_id,
            'version': f"{self.dc_id}:{timestamp}"
        }

        # Store locally
        self.local.set(
            key,
            json.dumps(versioned)
        )

        # Propagate to remote DC
        if propagate:
            self._propagate_to_remote(key, versioned)

    def get(self, key: str) -> Optional[Any]:
        """Get value, resolving conflicts if needed"""
        local_data = self.local.get(key)

        if local_data:
            return json.loads(local_data)['value']

        return None

    def _propagate_to_remote(self, key: str, versioned: dict):
        """Propagate write to remote DC with conflict resolution"""
        try:
            # Get remote version
            remote_data = self.remote.get(key)

            if remote_data:
                remote_versioned = json.loads(remote_data)

                # Last-write-wins
                if remote_versioned['timestamp'] > versioned['timestamp']:
                    # Remote is newer - pull to local
                    self.local.set(key, remote_data)
                    return
                elif remote_versioned['timestamp'] == versioned['timestamp']:
                    # Tie-breaker: higher DC ID wins
                    if remote_versioned['dc'] > versioned['dc']:
                        self.local.set(key, remote_data)
                        return

            # Our version wins - push to remote
            self.remote.set(key, json.dumps(versioned))

        except redis.ConnectionError:
            # Remote unavailable - queue for later sync
            self._queue_for_sync(key, versioned)

    def _queue_for_sync(self, key: str, versioned: dict):
        """Queue failed propagations for retry"""
        self.local.lpush(
            'sync_queue',
            json.dumps({'key': key, 'data': versioned})
        )

    def sync_pending(self):
        """Process pending sync queue"""
        while True:
            item = self.local.rpop('sync_queue')
            if not item:
                break

            data = json.loads(item)
            self._propagate_to_remote(data['key'], data['data'])

# Usage
dc1_local = redis.Redis(host='dc1-redis', password='password')
dc1_remote = redis.Redis(host='dc2-redis', password='password')

client = ActiveActiveRedis(dc1_local, dc1_remote, dc_id='dc1')

# Write (automatically propagates)
client.set('user:1000:name', 'John Doe')

# Read
name = client.get('user:1000:name')

# Sync pending writes (run periodically)
client.sync_pending()
```

### CRDB-Style Counters

```python
class CRDTCounter:
    """
    CRDT counter that supports concurrent increments across DCs.
    Uses positive-negative counter (PN-Counter).
    """

    def __init__(self, local_redis, dc_id):
        self.local = local_redis
        self.dc_id = dc_id

    def increment(self, key: str, amount: int = 1):
        """Increment counter (conflict-free)"""
        counter_key = f"counter:{key}"

        # Use hash with per-DC fields
        if amount > 0:
            self.local.hincrby(counter_key, f"p:{self.dc_id}", amount)
        else:
            self.local.hincrby(counter_key, f"n:{self.dc_id}", abs(amount))

    def decrement(self, key: str, amount: int = 1):
        """Decrement counter"""
        self.increment(key, -amount)

    def get(self, key: str) -> int:
        """Get counter value (sum of all DCs)"""
        counter_key = f"counter:{key}"
        data = self.local.hgetall(counter_key)

        if not data:
            return 0

        positive = sum(int(v) for k, v in data.items()
                      if k.decode().startswith('p:'))
        negative = sum(int(v) for k, v in data.items()
                      if k.decode().startswith('n:'))

        return positive - negative

    def merge(self, key: str, remote_data: dict):
        """Merge counter from remote DC"""
        counter_key = f"counter:{key}"

        for field, value in remote_data.items():
            current = self.local.hget(counter_key, field)
            current = int(current) if current else 0

            # Take max (CRDT merge)
            if int(value) > current:
                self.local.hset(counter_key, field, value)

# Usage
dc1_counter = CRDTCounter(dc1_redis, 'dc1')
dc2_counter = CRDTCounter(dc2_redis, 'dc2')

# Concurrent increments in both DCs
dc1_counter.increment('page_views')  # DC1: +1
dc2_counter.increment('page_views')  # DC2: +1

# After sync/merge, both see 2
# No conflict - counters are additive
```

---

## Network Considerations

### Latency Management

```python
import redis
from functools import wraps
import time

def with_local_read_preference(local, remote, timeout=0.1):
    """
    Read from local with timeout, fallback to remote.
    Useful for cross-DC read replicas.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(key, *args, **kwargs):
            # Try local first with short timeout
            try:
                local.ping()
                return getattr(local, func.__name__)(key, *args, **kwargs)
            except (redis.ConnectionError, redis.TimeoutError):
                pass

            # Fallback to remote
            return getattr(remote, func.__name__)(key, *args, **kwargs)

        return wrapper
    return decorator

# Configure with appropriate timeouts
local_redis = redis.Redis(
    host='local-dc',
    socket_timeout=0.1,      # Short local timeout
    socket_connect_timeout=0.05
)

remote_redis = redis.Redis(
    host='remote-dc',
    socket_timeout=1.0,      # Longer cross-DC timeout
    socket_connect_timeout=0.5
)
```

### Bandwidth Optimization

```bash
# Enable compression for cross-DC replication
# In redis.conf:
repl-compression yes

# Increase output buffer for remote replicas
client-output-buffer-limit replica 1gb 512mb 120
```

---

## Monitoring Cross-DC Replication

```python
from prometheus_client import Gauge, Counter, Histogram
import redis
import time

# Metrics
replication_lag = Gauge(
    'redis_cross_dc_replication_lag_seconds',
    'Replication lag between datacenters',
    ['source_dc', 'target_dc']
)

replication_bytes = Counter(
    'redis_cross_dc_replication_bytes_total',
    'Bytes replicated',
    ['source_dc', 'target_dc']
)

cross_dc_latency = Histogram(
    'redis_cross_dc_latency_seconds',
    'Cross-DC operation latency',
    ['operation', 'dc']
)

def monitor_cross_dc_replication(dc1_master, dc2_replica, dc1_name, dc2_name):
    """Monitor replication between datacenters"""
    while True:
        try:
            # Get master replication offset
            master_info = dc1_master.info('replication')
            master_offset = master_info.get('master_repl_offset', 0)

            # Get replica offset
            replica_info = dc2_replica.info('replication')
            replica_offset = replica_info.get('slave_repl_offset', 0)

            # Calculate lag
            lag_bytes = master_offset - replica_offset

            # Estimate time lag (rough, based on write rate)
            # In practice, use master_last_io_seconds_ago
            time_lag = replica_info.get('master_last_io_seconds_ago', 0)

            replication_lag.labels(
                source_dc=dc1_name,
                target_dc=dc2_name
            ).set(time_lag)

            # Check link status
            link_status = replica_info.get('master_link_status')
            if link_status != 'up':
                print(f"Warning: Replication link is {link_status}")

        except Exception as e:
            print(f"Monitoring error: {e}")

        time.sleep(5)
```

---

## Disaster Recovery Procedures

### DR Runbook

```markdown
## Redis Cross-DC Disaster Recovery Runbook

### Scenario 1: DC1 (Primary) Complete Failure

1. **Verify DC1 is truly unavailable**
   - Check multiple network paths
   - Confirm with datacenter operations
   - Wait for monitoring alerts to stabilize

2. **Assess data loss window**
   - Check DC2 replica replication lag
   - Note last sync timestamp
   - Document potential data loss

3. **Initiate failover**
   ```bash
   # On DC2 replica
   redis-cli -a password REPLICAOF NO ONE

   # Verify new master
   redis-cli -a password INFO replication
   ```

4. **Update application configuration**
   - Point applications to DC2 Redis
   - Update DNS if using DNS-based discovery
   - Restart application instances if needed

5. **Validate**
   - Verify application connectivity
   - Check for data consistency
   - Monitor error rates

### Scenario 2: DC1 Recovered - Failback

1. **Ensure DC1 is fully operational**
   - Verify network connectivity
   - Check Redis process health

2. **Sync DC1 from DC2**
   ```bash
   # On DC1 (former master, now needs data from DC2)
   redis-cli -a password REPLICAOF dc2-master 6379
   ```

3. **Wait for full sync**
   - Monitor replication progress
   - Verify data consistency

4. **Promote DC1 back to master**
   ```bash
   redis-cli -a password REPLICAOF NO ONE
   ```

5. **Reconfigure DC2 as replica**
   ```bash
   redis-cli -h dc2-redis -a password REPLICAOF dc1-master 6379
   ```
```

---

## Best Practices

### 1. Accept Eventual Consistency

```python
# Design for eventual consistency
# - Idempotent operations where possible
# - Conflict resolution strategy
# - Timestamp all writes
```

### 2. Use Appropriate Timeouts

```python
# Local DC: aggressive timeouts
local_timeout = 0.1  # 100ms

# Cross-DC: account for latency
cross_dc_timeout = 2.0  # 2 seconds

# Replication: be generous
repl_timeout = 60  # 60 seconds
```

### 3. Test Failover Regularly

```bash
# Monthly failover tests
# Document actual RTO/RPO
# Update runbooks based on results
```

### 4. Monitor Replication Lag

```python
# Alert thresholds
WARNING_LAG_SECONDS = 30
CRITICAL_LAG_SECONDS = 120
```

---

## Conclusion

Cross-datacenter Redis replication enables disaster recovery and global distribution:

- **Active-Passive**: Simple, strong consistency for DR
- **Active-Active**: Complex, eventual consistency for global writes
- **Read Replicas**: Balance between simplicity and performance

Key takeaways:
- Choose pattern based on consistency requirements
- Plan for network latency and partitions
- Test failover procedures regularly
- Monitor replication lag continuously

---

*Need to monitor your cross-datacenter Redis deployment? [OneUptime](https://oneuptime.com) provides comprehensive Redis monitoring with cross-DC replication lag alerts, failover detection, and geo-distributed health tracking.*
