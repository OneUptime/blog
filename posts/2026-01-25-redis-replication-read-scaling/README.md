# How to Set Up Redis Replication for Read Scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, Read Scaling, High Availability, Master-Replica, Performance

Description: Learn how to configure Redis replication to scale read operations and improve availability. This guide covers master-replica setup, automatic failover with Sentinel, and best practices for production deployments.

---

> As your application grows, a single Redis instance may struggle to handle all read requests. Redis replication allows you to distribute reads across multiple replica nodes while maintaining a single source of truth for writes. This architecture scales read capacity linearly with each replica you add.

Redis replication is asynchronous by default, meaning replicas receive updates shortly after the master processes them. This provides excellent performance for read-heavy workloads while maintaining high availability through automatic failover.

---

## Replication Architecture

A typical Redis replication setup consists of one master and multiple replicas:

```
                    Writes
                      |
                      v
              +---------------+
              |    Master     |
              |  (read/write) |
              +---------------+
                   |    |
          +--------+    +--------+
          |                      |
          v                      v
   +---------------+      +---------------+
   |   Replica 1   |      |   Replica 2   |
   |  (read-only)  |      |  (read-only)  |
   +---------------+      +---------------+
          ^                      ^
          |                      |
        Reads                  Reads
```

All writes go to the master, which asynchronously replicates changes to all connected replicas. Reads can be distributed across replicas to scale horizontally.

---

## Setting Up the Master

Start with configuring the master Redis instance:

```conf
# /etc/redis/redis-master.conf

# Network settings
bind 0.0.0.0
port 6379
protected-mode yes

# Require authentication
requirepass your_strong_master_password

# Persistence settings for data durability
appendonly yes
appendfsync everysec

# RDB snapshots as backup
save 900 1
save 300 10
save 60 10000

# Replication settings
# Password replicas must use to connect
masterauth your_strong_master_password

# Allow replicas to serve stale data during sync
# Set to 'no' if you need strict consistency
replica-serve-stale-data yes

# Replicas are read-only by default
replica-read-only yes

# Replication backlog size
# Larger values help replicas catch up after disconnection
repl-backlog-size 64mb

# Remove backlog after this many seconds without replicas
repl-backlog-ttl 3600

# Minimum replicas that must be connected for master to accept writes
# Set to 0 to disable this safety feature
min-replicas-to-write 1
min-replicas-max-lag 10
```

Start the master:

```bash
redis-server /etc/redis/redis-master.conf
```

---

## Configuring Replicas

Each replica needs its own configuration pointing to the master:

```conf
# /etc/redis/redis-replica.conf

# Network settings
bind 0.0.0.0
port 6380
protected-mode yes

# Local authentication
requirepass your_strong_replica_password

# Persistence (replicas should also persist data)
appendonly yes
appendfsync everysec

# Replication configuration
# Point to the master
replicaof master.example.com 6379

# Authentication to connect to master
masterauth your_strong_master_password

# Serve stale data while syncing
replica-serve-stale-data yes

# Replicas are read-only
replica-read-only yes

# Priority for Sentinel failover (lower = higher priority)
# Set to 0 to never promote this replica to master
replica-priority 100

# Announce IP if behind NAT or in containers
# replica-announce-ip 10.0.0.2
# replica-announce-port 6380
```

Start the replica:

```bash
redis-server /etc/redis/redis-replica.conf
```

Verify replication status:

```bash
# On the master
redis-cli -a your_strong_master_password INFO replication

# Output should show connected replicas:
# role:master
# connected_slaves:2
# slave0:ip=10.0.0.2,port=6380,state=online,offset=1234,lag=0
```

---

## Setting Up Redis Sentinel for Failover

Redis Sentinel monitors your master and replicas, automatically promoting a replica to master if the current master fails:

```conf
# /etc/redis/sentinel.conf

# Sentinel port
port 26379

# Monitor the master
# The "2" means 2 Sentinels must agree before failover
sentinel monitor mymaster master.example.com 6379 2

# Master password
sentinel auth-pass mymaster your_strong_master_password

# Consider master down after 5 seconds of no response
sentinel down-after-milliseconds mymaster 5000

# Allow only 1 replica to sync with new master at a time
# Higher values speed up failover but increase load on new master
sentinel parallel-syncs mymaster 1

# Failover timeout (in milliseconds)
sentinel failover-timeout mymaster 60000

# Notification script (optional)
# sentinel notification-script mymaster /path/to/notify.sh

# Reconfiguration script (optional)
# sentinel client-reconfig-script mymaster /path/to/reconfig.sh
```

Run at least 3 Sentinel instances for quorum:

```bash
# Start on each Sentinel node
redis-sentinel /etc/redis/sentinel.conf
```

Query Sentinel for master address:

```bash
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
```

---

## Python Client with Read Replicas

Here is how to use replicas for read scaling in Python:

```python
import redis
from redis.sentinel import Sentinel
from typing import Optional, Any
import random

class RedisReplicationClient:
    """
    Redis client that distributes reads across replicas
    while sending writes to the master.
    """

    def __init__(
        self,
        sentinel_hosts: list,
        master_name: str,
        password: str,
        db: int = 0
    ):
        """
        Initialize the replication-aware client.

        Args:
            sentinel_hosts: List of (host, port) tuples for Sentinel
            master_name: Name of the master in Sentinel config
            password: Redis password
            db: Database number
        """
        self.sentinel = Sentinel(
            sentinel_hosts,
            socket_timeout=0.5,
            password=password
        )
        self.master_name = master_name
        self.password = password
        self.db = db

        # Connection pools for master and replicas
        self._master = None
        self._replicas = []

    def get_master(self) -> redis.Redis:
        """Get a connection to the master for writes."""
        if self._master is None:
            self._master = self.sentinel.master_for(
                self.master_name,
                socket_timeout=0.5,
                password=self.password,
                db=self.db
            )
        return self._master

    def get_replica(self) -> redis.Redis:
        """Get a connection to a replica for reads."""
        return self.sentinel.slave_for(
            self.master_name,
            socket_timeout=0.5,
            password=self.password,
            db=self.db
        )

    def write(self, key: str, value: Any, ex: Optional[int] = None) -> bool:
        """
        Write a value to Redis (goes to master).

        Args:
            key: Redis key
            value: Value to store
            ex: Optional expiration in seconds

        Returns:
            True if successful
        """
        master = self.get_master()
        return master.set(key, value, ex=ex)

    def read(self, key: str, prefer_replica: bool = True) -> Optional[str]:
        """
        Read a value from Redis.

        Args:
            key: Redis key
            prefer_replica: If True, read from replica; if False, read from master

        Returns:
            The value or None if not found
        """
        if prefer_replica:
            try:
                replica = self.get_replica()
                return replica.get(key)
            except redis.ConnectionError:
                # Fall back to master if no replica available
                pass

        master = self.get_master()
        return master.get(key)

    def read_many(self, keys: list, prefer_replica: bool = True) -> dict:
        """
        Read multiple keys efficiently.

        Args:
            keys: List of keys to read
            prefer_replica: If True, read from replica

        Returns:
            Dictionary mapping keys to values
        """
        if prefer_replica:
            try:
                replica = self.get_replica()
                values = replica.mget(keys)
                return dict(zip(keys, values))
            except redis.ConnectionError:
                pass

        master = self.get_master()
        values = master.mget(keys)
        return dict(zip(keys, values))


# Direct replica pool for more control
class ReplicaPool:
    """
    Manages connections to multiple replicas for load balancing.
    """

    def __init__(self, replica_configs: list, password: str):
        """
        Args:
            replica_configs: List of dicts with 'host' and 'port'
            password: Redis password
        """
        self.replicas = []
        for config in replica_configs:
            pool = redis.ConnectionPool(
                host=config['host'],
                port=config['port'],
                password=password,
                max_connections=10,
                decode_responses=True
            )
            self.replicas.append(redis.Redis(connection_pool=pool))

    def get_replica(self) -> redis.Redis:
        """Get a random healthy replica."""
        # Shuffle to distribute load
        candidates = self.replicas.copy()
        random.shuffle(candidates)

        for replica in candidates:
            try:
                replica.ping()
                return replica
            except redis.ConnectionError:
                continue

        raise redis.ConnectionError("No healthy replicas available")

    def read_with_fallback(self, key: str, master: redis.Redis) -> Optional[str]:
        """Read from replica with fallback to master."""
        try:
            replica = self.get_replica()
            return replica.get(key)
        except redis.ConnectionError:
            return master.get(key)


# Usage example
if __name__ == '__main__':
    # Using Sentinel
    sentinel_hosts = [
        ('sentinel1.example.com', 26379),
        ('sentinel2.example.com', 26379),
        ('sentinel3.example.com', 26379)
    ]

    client = RedisReplicationClient(
        sentinel_hosts=sentinel_hosts,
        master_name='mymaster',
        password='your_strong_password'
    )

    # Write goes to master
    client.write('user:123', 'John Doe')

    # Read goes to replica
    value = client.read('user:123')
    print(f"Read from replica: {value}")

    # Force read from master for consistency
    value = client.read('user:123', prefer_replica=False)
    print(f"Read from master: {value}")
```

---

## Node.js Client with Read Replicas

```javascript
// redis-replication-client.js
const Redis = require('ioredis');

class RedisReplicationClient {
    constructor(options) {
        // Sentinel configuration for automatic failover
        this.sentinels = options.sentinels;
        this.masterName = options.masterName;
        this.password = options.password;

        // Master connection
        this.master = new Redis({
            sentinels: this.sentinels,
            name: this.masterName,
            password: this.password,
            role: 'master'
        });

        // Replica connection (Sentinel handles selection)
        this.replica = new Redis({
            sentinels: this.sentinels,
            name: this.masterName,
            password: this.password,
            role: 'slave',
            // Prefer reading from replica
            preferredSlaves: [
                // Can specify preference order
                { ip: 'replica1.example.com', port: 6380, prio: 1 },
                { ip: 'replica2.example.com', port: 6380, prio: 2 }
            ]
        });

        this._setupEventHandlers();
    }

    _setupEventHandlers() {
        this.master.on('error', (err) => {
            console.error('Master connection error:', err.message);
        });

        this.replica.on('error', (err) => {
            console.error('Replica connection error:', err.message);
        });

        this.master.on('+switch-master', () => {
            console.log('Master switched due to failover');
        });
    }

    async write(key, value, options = {}) {
        if (options.expireSeconds) {
            return await this.master.setex(key, options.expireSeconds, value);
        }
        return await this.master.set(key, value);
    }

    async read(key, preferReplica = true) {
        try {
            if (preferReplica) {
                return await this.replica.get(key);
            }
        } catch (error) {
            console.warn('Replica read failed, falling back to master');
        }

        return await this.master.get(key);
    }

    async readMany(keys, preferReplica = true) {
        try {
            if (preferReplica) {
                return await this.replica.mget(...keys);
            }
        } catch (error) {
            console.warn('Replica read failed, falling back to master');
        }

        return await this.master.mget(...keys);
    }

    async close() {
        await this.master.quit();
        await this.replica.quit();
    }
}

// Usage
const client = new RedisReplicationClient({
    sentinels: [
        { host: 'sentinel1.example.com', port: 26379 },
        { host: 'sentinel2.example.com', port: 26379 },
        { host: 'sentinel3.example.com', port: 26379 }
    ],
    masterName: 'mymaster',
    password: 'your_strong_password'
});

async function example() {
    await client.write('session:abc', JSON.stringify({ userId: 123 }));
    const session = await client.read('session:abc');
    console.log('Session:', session);
}

example();

module.exports = RedisReplicationClient;
```

---

## Monitoring Replication Lag

Replication lag is the delay between when data is written to master and when it appears on replicas:

```python
def check_replication_health(master_client: redis.Redis) -> dict:
    """
    Check replication health and lag across all replicas.

    Returns:
        Dictionary with replication status and any issues
    """
    info = master_client.info('replication')

    if info['role'] != 'master':
        return {'error': 'Connected to replica, not master'}

    status = {
        'role': info['role'],
        'connected_slaves': info['connected_slaves'],
        'replicas': []
    }

    # Parse each replica's status
    for i in range(info['connected_slaves']):
        replica_key = f'slave{i}'
        replica_info = info.get(replica_key, '')

        if replica_info:
            # Parse the comma-separated values
            parts = dict(item.split('=') for item in replica_info.split(','))

            replica_status = {
                'ip': parts.get('ip'),
                'port': parts.get('port'),
                'state': parts.get('state'),
                'lag_seconds': int(parts.get('lag', 0))
            }

            # Flag high lag
            if replica_status['lag_seconds'] > 5:
                replica_status['warning'] = 'High replication lag'

            status['replicas'].append(replica_status)

    return status
```

---

## Best Practices

1. **Use Sentinel for production**: Manual failover is error-prone; Sentinel automates it reliably

2. **Set appropriate replication backlog**: A larger backlog helps replicas recover from temporary disconnections without full resync

3. **Monitor replication lag**: High lag indicates replicas cannot keep up with write load

4. **Consider read consistency requirements**: Replicas may be slightly behind; read from master for critical consistency needs

5. **Use separate connection pools**: Keep master and replica connections independent for better failure isolation

6. **Configure min-replicas-to-write**: Prevents data loss if all replicas fail, but trades availability for consistency

Redis replication provides a straightforward way to scale read capacity and improve availability. Combined with Sentinel for automatic failover, it forms a robust foundation for high-traffic applications.
