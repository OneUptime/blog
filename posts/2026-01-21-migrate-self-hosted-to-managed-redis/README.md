# How to Migrate from Self-Hosted Redis to Managed Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Migration, AWS, Azure, GCP, Cloud, DevOps, Database Migration

Description: A comprehensive guide to migrating from self-hosted Redis to managed Redis services, covering migration strategies, data transfer methods, application updates, and best practices for zero-downtime migrations.

---

Migrating from self-hosted Redis to a managed service like AWS ElastiCache, Azure Cache for Redis, or Google Cloud Memorystore can significantly reduce operational overhead while improving reliability. This guide covers various migration strategies, data transfer methods, and best practices to ensure a smooth transition.

## Why Migrate to Managed Redis?

Before diving into the migration process, understand the benefits:

- **Reduced Operational Burden**: No more patching, updates, or infrastructure management
- **Built-in High Availability**: Automatic failover and replication
- **Scalability**: Easy vertical and horizontal scaling
- **Monitoring and Alerts**: Integrated monitoring dashboards
- **Security**: Managed encryption, VPC integration, and compliance certifications
- **Backup and Recovery**: Automated backups and point-in-time recovery

## Migration Strategies Overview

| Strategy | Downtime | Complexity | Data Loss Risk | Best For |
|----------|----------|------------|----------------|----------|
| Blue-Green | Near-zero | High | Low | Production systems |
| Dual-Write | Zero | High | Low | Critical applications |
| Snapshot and Restore | Minutes-Hours | Low | Medium | Development/Staging |
| Online Migration | Near-zero | Medium | Low | Most scenarios |

## Pre-Migration Checklist

Before starting your migration, complete these steps:

### 1. Audit Your Current Redis Setup

```bash
# Connect to your existing Redis
redis-cli -h your-redis-host -p 6379

# Get server info
INFO

# Check memory usage
INFO memory

# Get database size
DBSIZE

# Analyze key patterns
redis-cli --scan --pattern '*' | head -1000 | cut -d: -f1 | sort | uniq -c | sort -rn

# Check persistence configuration
CONFIG GET save
CONFIG GET appendonly
```

### 2. Document Your Configuration

```bash
# Export current configuration
redis-cli CONFIG GET '*' > redis-config-backup.txt

# Key configurations to note:
# - maxmemory and maxmemory-policy
# - timeout
# - tcp-keepalive
# - appendonly and appendfsync
# - cluster settings (if applicable)
```

### 3. Identify Dependencies

Create a list of all applications and services that connect to Redis:

```python
# Script to analyze Redis client connections
import redis

def analyze_connections():
    r = redis.Redis(host='your-redis-host', port=6379)
    client_list = r.client_list()

    print(f"Total connections: {len(client_list)}")

    # Group by client name/address
    clients = {}
    for client in client_list:
        addr = client.get('addr', 'unknown')
        name = client.get('name', 'unnamed')
        key = f"{addr} - {name}"
        clients[key] = clients.get(key, 0) + 1

    for client, count in sorted(clients.items(), key=lambda x: -x[1]):
        print(f"{client}: {count} connections")

analyze_connections()
```

## Strategy 1: Snapshot and Restore

The simplest approach, suitable for non-critical systems or when downtime is acceptable.

### Step 1: Create RDB Snapshot

```bash
# On source Redis, trigger a background save
redis-cli BGSAVE

# Wait for save to complete
redis-cli LASTSAVE

# Locate the dump file
redis-cli CONFIG GET dir
redis-cli CONFIG GET dbfilename
```

### Step 2: Transfer to Managed Service

#### For AWS ElastiCache

```bash
# Upload RDB to S3
aws s3 cp dump.rdb s3://my-bucket/redis-backup/dump.rdb

# Create cluster from snapshot (using CLI)
aws elasticache create-replication-group \
    --replication-group-id my-migrated-redis \
    --replication-group-description "Migrated from self-hosted" \
    --engine redis \
    --cache-node-type cache.r6g.large \
    --num-cache-clusters 2 \
    --snapshot-arns arn:aws:s3:::my-bucket/redis-backup/dump.rdb
```

#### For Google Cloud Memorystore

```bash
# Upload RDB to GCS
gsutil cp dump.rdb gs://my-bucket/redis-backup/dump.rdb

# Import into Memorystore
gcloud redis instances import my-redis-instance \
    --region=us-central1 \
    gs://my-bucket/redis-backup/dump.rdb
```

### Step 3: Update Application Configuration

```python
# Update connection string
import os

# Before (self-hosted)
# REDIS_HOST = "10.0.0.50"

# After (managed)
REDIS_HOST = os.environ.get('REDIS_HOST', 'my-redis.xxxxx.cache.amazonaws.com')
REDIS_PORT = int(os.environ.get('REDIS_PORT', 6379))
REDIS_PASSWORD = os.environ.get('REDIS_PASSWORD', '')
REDIS_SSL = os.environ.get('REDIS_SSL', 'true').lower() == 'true'
```

## Strategy 2: Online Migration with MIGRATE

For smaller datasets, use Redis's built-in MIGRATE command:

```bash
# Migrate keys one by one (or in batches)
redis-cli -h source-host MIGRATE target-host 6379 "" 0 5000 COPY KEYS key1 key2 key3

# Script to migrate all keys in batches
```

```python
import redis

def migrate_keys_batch(source, target, batch_size=100):
    """Migrate keys from source to target Redis"""
    cursor = 0

    while True:
        cursor, keys = source.scan(cursor=cursor, count=batch_size)

        if keys:
            # Use pipeline for efficiency
            pipe = source.pipeline()
            for key in keys:
                pipe.dump(key)
            dumps = pipe.execute()

            # Restore to target
            pipe = target.pipeline()
            for key, dump_data in zip(keys, dumps):
                if dump_data:
                    ttl = source.pttl(key)
                    ttl = 0 if ttl < 0 else ttl
                    pipe.restore(key, ttl, dump_data, replace=True)

            pipe.execute()
            print(f"Migrated {len(keys)} keys")

        if cursor == 0:
            break

    print("Migration complete!")

# Usage
source = redis.Redis(host='source-host', port=6379)
target = redis.Redis(
    host='target-managed-host',
    port=6379,
    password='your-auth-token',
    ssl=True
)

migrate_keys_batch(source, target)
```

## Strategy 3: Dual-Write Pattern (Zero Downtime)

The safest approach for production systems, writing to both old and new Redis simultaneously.

### Step 1: Implement Dual-Write Layer

```python
import redis
from typing import Any, Optional
import threading
import logging

logger = logging.getLogger(__name__)

class DualWriteRedis:
    """Redis client that writes to both old and new Redis"""

    def __init__(self, primary_config: dict, secondary_config: dict, write_to_secondary: bool = True):
        self.primary = redis.Redis(**primary_config)
        self.secondary = redis.Redis(**secondary_config)
        self.write_to_secondary = write_to_secondary
        self.read_from_secondary = False  # Start reading from primary

    def _write_to_secondary_async(self, method: str, *args, **kwargs):
        """Write to secondary in background thread"""
        def _write():
            try:
                getattr(self.secondary, method)(*args, **kwargs)
            except Exception as e:
                logger.error(f"Secondary write failed for {method}: {e}")

        thread = threading.Thread(target=_write)
        thread.start()

    def set(self, key: str, value: Any, ex: Optional[int] = None, **kwargs):
        """Set value in both Redis instances"""
        result = self.primary.set(key, value, ex=ex, **kwargs)

        if self.write_to_secondary:
            self._write_to_secondary_async('set', key, value, ex=ex, **kwargs)

        return result

    def get(self, key: str) -> Optional[bytes]:
        """Get value from primary (or secondary if configured)"""
        if self.read_from_secondary:
            return self.secondary.get(key)
        return self.primary.get(key)

    def delete(self, *keys):
        """Delete from both instances"""
        result = self.primary.delete(*keys)

        if self.write_to_secondary:
            self._write_to_secondary_async('delete', *keys)

        return result

    def hset(self, name: str, key: str = None, value: str = None, mapping: dict = None):
        """Hash set in both instances"""
        result = self.primary.hset(name, key, value, mapping=mapping)

        if self.write_to_secondary:
            self._write_to_secondary_async('hset', name, key, value, mapping=mapping)

        return result

    def hget(self, name: str, key: str):
        """Hash get from primary"""
        if self.read_from_secondary:
            return self.secondary.hget(name, key)
        return self.primary.hget(name, key)

    def lpush(self, name: str, *values):
        """List push to both instances"""
        result = self.primary.lpush(name, *values)

        if self.write_to_secondary:
            self._write_to_secondary_async('lpush', name, *values)

        return result

    def expire(self, name: str, time: int):
        """Set expiry on both instances"""
        result = self.primary.expire(name, time)

        if self.write_to_secondary:
            self._write_to_secondary_async('expire', name, time)

        return result

    def switch_to_secondary(self):
        """Switch reads to secondary (new managed Redis)"""
        self.read_from_secondary = True
        logger.info("Switched reads to secondary (managed Redis)")

    def disable_secondary_writes(self):
        """Stop writing to secondary after migration complete"""
        self.write_to_secondary = False
        logger.info("Disabled secondary writes")


# Usage
primary_config = {
    'host': 'old-self-hosted-redis',
    'port': 6379,
    'decode_responses': True
}

secondary_config = {
    'host': 'new-managed-redis.amazonaws.com',
    'port': 6379,
    'password': 'your-auth-token',
    'ssl': True,
    'decode_responses': True
}

redis_client = DualWriteRedis(primary_config, secondary_config)

# Normal operations write to both
redis_client.set('user:123', 'data')
redis_client.hset('session:abc', mapping={'user_id': '123', 'expires': '3600'})
```

### Step 2: Backfill Historical Data

```python
import redis
from concurrent.futures import ThreadPoolExecutor
import logging

logger = logging.getLogger(__name__)

def backfill_data(source_config: dict, target_config: dict, batch_size: int = 1000, workers: int = 4):
    """Backfill data from source to target Redis"""
    source = redis.Redis(**source_config)
    target = redis.Redis(**target_config)

    def migrate_batch(keys):
        pipe_source = source.pipeline()
        for key in keys:
            pipe_source.type(key)
            pipe_source.dump(key)
            pipe_source.pttl(key)

        results = pipe_source.execute()

        pipe_target = target.pipeline()
        for i, key in enumerate(keys):
            key_type = results[i * 3]
            dump_data = results[i * 3 + 1]
            ttl = results[i * 3 + 2]

            if dump_data:
                ttl = 0 if ttl < 0 else ttl
                pipe_target.restore(key, ttl, dump_data, replace=True)

        try:
            pipe_target.execute()
            return len(keys)
        except Exception as e:
            logger.error(f"Batch migration error: {e}")
            return 0

    cursor = 0
    total_migrated = 0
    batch = []

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = []

        while True:
            cursor, keys = source.scan(cursor=cursor, count=batch_size)
            batch.extend(keys)

            if len(batch) >= batch_size:
                futures.append(executor.submit(migrate_batch, batch[:batch_size]))
                batch = batch[batch_size:]

            if cursor == 0:
                if batch:
                    futures.append(executor.submit(migrate_batch, batch))
                break

        for future in futures:
            total_migrated += future.result()

    logger.info(f"Backfill complete. Total keys migrated: {total_migrated}")
    return total_migrated

# Run backfill
backfill_data(
    source_config={'host': 'old-redis', 'port': 6379},
    target_config={
        'host': 'new-managed.amazonaws.com',
        'port': 6379,
        'password': 'auth-token',
        'ssl': True
    }
)
```

### Step 3: Verify Data Consistency

```python
import redis
import random

def verify_consistency(source_config: dict, target_config: dict, sample_size: int = 1000):
    """Verify data consistency between source and target"""
    source = redis.Redis(**source_config)
    target = redis.Redis(**target_config)

    # Get random sample of keys
    all_keys = list(source.scan_iter(count=10000))
    sample_keys = random.sample(all_keys, min(sample_size, len(all_keys)))

    mismatches = []
    missing = []

    for key in sample_keys:
        source_value = source.dump(key)
        target_value = target.dump(key)

        if target_value is None:
            missing.append(key)
        elif source_value != target_value:
            mismatches.append(key)

    print(f"Checked {len(sample_keys)} keys")
    print(f"Missing in target: {len(missing)}")
    print(f"Value mismatches: {len(mismatches)}")

    if missing:
        print(f"Sample missing keys: {missing[:10]}")
    if mismatches:
        print(f"Sample mismatched keys: {mismatches[:10]}")

    return len(missing) == 0 and len(mismatches) == 0

# Verify
is_consistent = verify_consistency(
    source_config={'host': 'old-redis', 'port': 6379},
    target_config={
        'host': 'new-managed.amazonaws.com',
        'port': 6379,
        'password': 'auth-token',
        'ssl': True
    }
)

if is_consistent:
    print("Data is consistent! Safe to switch.")
else:
    print("Data inconsistency detected. Investigate before switching.")
```

### Step 4: Gradual Traffic Switch

```python
# In your application configuration
class RedisConfig:
    # Phase 1: Write to both, read from old
    DUAL_WRITE = True
    READ_FROM_NEW = False

    # Phase 2: Write to both, read from new (test)
    # DUAL_WRITE = True
    # READ_FROM_NEW = True

    # Phase 3: Write to new only, read from new
    # DUAL_WRITE = False
    # READ_FROM_NEW = True
```

## Strategy 4: Using Replication (Redis-to-Redis)

If your managed service supports it, set up replication from self-hosted to managed:

### AWS ElastiCache Global Datastore

```bash
# This requires the self-hosted Redis to be accessible from AWS
# Usually involves VPN or Direct Connect

# Create a Global Datastore
aws elasticache create-global-replication-group \
    --global-replication-group-id-suffix my-migration \
    --primary-replication-group-id my-existing-cluster
```

### Using redis-shake (Open Source Tool)

```yaml
# redis-shake configuration (shake.toml)
[source]
type = "standalone"
address = "old-redis-host:6379"
password = ""

[target]
type = "standalone"
address = "new-managed-redis:6379"
password = "your-auth-token"
tls = true

[sync]
mode = "sync"  # or "restore" for one-time migration
```

```bash
# Run redis-shake
./redis-shake shake.toml
```

## Post-Migration Steps

### 1. Update DNS or Configuration

```python
# Using environment variables for easy switching
import os

REDIS_CONFIG = {
    'host': os.environ.get('REDIS_HOST', 'new-managed-redis.amazonaws.com'),
    'port': int(os.environ.get('REDIS_PORT', 6379)),
    'password': os.environ.get('REDIS_PASSWORD', ''),
    'ssl': os.environ.get('REDIS_SSL', 'true').lower() == 'true',
    'decode_responses': True
}
```

### 2. Monitor Performance

```python
import redis
import time

def monitor_redis_performance(redis_client, duration_seconds=60):
    """Monitor Redis performance metrics"""
    start_time = time.time()
    operations = 0
    latencies = []

    while time.time() - start_time < duration_seconds:
        op_start = time.time()
        redis_client.ping()
        latency = (time.time() - op_start) * 1000  # ms
        latencies.append(latency)
        operations += 1
        time.sleep(0.01)

    avg_latency = sum(latencies) / len(latencies)
    p99_latency = sorted(latencies)[int(len(latencies) * 0.99)]

    print(f"Operations: {operations}")
    print(f"Avg Latency: {avg_latency:.2f}ms")
    print(f"P99 Latency: {p99_latency:.2f}ms")

# Monitor new managed Redis
redis_client = redis.Redis(**REDIS_CONFIG)
monitor_redis_performance(redis_client)
```

### 3. Decommission Old Redis

```bash
# After successful migration and monitoring period

# 1. Stop writes to old Redis
# 2. Wait for any remaining reads to complete
# 3. Take final backup
redis-cli -h old-redis BGSAVE

# 4. Verify backup
ls -la /var/lib/redis/dump.rdb

# 5. Archive backup to cloud storage
aws s3 cp /var/lib/redis/dump.rdb s3://backups/redis-final-$(date +%Y%m%d).rdb

# 6. Shutdown old Redis
redis-cli -h old-redis SHUTDOWN SAVE
```

## Handling Special Cases

### Migrating Pub/Sub

Pub/Sub messages are not persisted, so handle them separately:

```python
class MigratingPubSub:
    """Pub/Sub that works during migration"""

    def __init__(self, old_redis, new_redis):
        self.old_redis = old_redis
        self.new_redis = new_redis
        self.use_new = False

    def publish(self, channel, message):
        """Publish to both during migration"""
        self.old_redis.publish(channel, message)
        self.new_redis.publish(channel, message)

    def subscribe(self, *channels):
        """Subscribe to the active Redis"""
        if self.use_new:
            return self.new_redis.pubsub().subscribe(*channels)
        return self.old_redis.pubsub().subscribe(*channels)

    def switch_to_new(self):
        """Switch to new Redis for subscriptions"""
        self.use_new = True
```

### Migrating Lua Scripts

```python
def migrate_lua_scripts(source, target):
    """Migrate Lua scripts to new Redis"""
    # List all loaded scripts (if tracked)
    scripts = {
        'rate_limiter': """
            local key = KEYS[1]
            local limit = tonumber(ARGV[1])
            local window = tonumber(ARGV[2])
            -- script body
        """,
        # Add more scripts
    }

    loaded_scripts = {}
    for name, script in scripts.items():
        sha = target.script_load(script)
        loaded_scripts[name] = sha
        print(f"Loaded script '{name}' with SHA: {sha}")

    return loaded_scripts
```

### Migrating Cluster to Non-Cluster

If moving from Redis Cluster to a non-clustered managed service:

```python
def migrate_from_cluster(cluster_nodes, target_config):
    """Migrate data from Redis Cluster to single instance"""
    from redis.cluster import RedisCluster

    cluster = RedisCluster(startup_nodes=cluster_nodes)
    target = redis.Redis(**target_config)

    # Iterate through all nodes
    for node in cluster.get_nodes():
        node_client = cluster.get_redis_connection(node)
        cursor = 0

        while True:
            cursor, keys = node_client.scan(cursor=cursor, count=1000)

            for key in keys:
                dump_data = cluster.dump(key)
                ttl = cluster.pttl(key)
                ttl = 0 if ttl < 0 else ttl

                target.restore(key, ttl, dump_data, replace=True)

            if cursor == 0:
                break

    print("Cluster migration complete!")
```

## Rollback Plan

Always have a rollback plan:

```python
class MigrationRollback:
    """Manage migration rollback"""

    def __init__(self, old_config, new_config):
        self.old_redis = redis.Redis(**old_config)
        self.new_redis = redis.Redis(**new_config)
        self.current = 'old'

    def switch_to_new(self):
        """Switch to new managed Redis"""
        self.current = 'new'
        print("Switched to new managed Redis")

    def rollback(self):
        """Rollback to old Redis"""
        if self.current == 'new':
            # Sync any new data back to old Redis
            self._sync_recent_changes()
            self.current = 'old'
            print("Rolled back to old Redis")

    def _sync_recent_changes(self):
        """Sync recent changes from new to old"""
        # Implementation depends on your tracking mechanism
        pass

    def get_client(self):
        """Get the current active Redis client"""
        if self.current == 'new':
            return self.new_redis
        return self.old_redis
```

## Conclusion

Migrating from self-hosted Redis to a managed service requires careful planning and execution. The key to a successful migration is choosing the right strategy based on your requirements:

- **Use Snapshot and Restore** for simple migrations where downtime is acceptable
- **Use Dual-Write** for zero-downtime migrations of critical systems
- **Use Online Migration** for a balance of simplicity and minimal downtime

Key takeaways:

- Thoroughly audit your existing Redis setup before migration
- Test the migration process in a staging environment first
- Implement proper monitoring before, during, and after migration
- Always have a rollback plan ready
- Consider the dual-write pattern for production systems
- Verify data consistency before switching traffic

With proper planning and execution, you can successfully migrate to a managed Redis service and enjoy the benefits of reduced operational overhead and improved reliability.
