# How to Migrate from Standalone Redis to Redis Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Migration, Cluster, Sharding, Database Migration, DevOps, Production, Scaling

Description: A comprehensive guide to migrating from standalone Redis to Redis Cluster. Learn data migration strategies, client code changes, and step-by-step migration procedures with minimal downtime.

---

> Outgrowing a single Redis instance? Migrating to Redis Cluster enables horizontal scaling but requires careful planning. This guide covers everything from data migration strategies to client code changes, ensuring a smooth transition with minimal downtime.

The migration involves three main challenges: moving data, updating client code to handle sharding, and adapting your data model for multi-key operations.

---

## Migration Overview

### Key Differences

| Aspect | Standalone | Cluster |
|--------|-----------|---------|
| Data Distribution | Single node | Sharded across nodes |
| Multi-key Operations | All work | Only with hash tags |
| Transactions | Full support | Limited to single slot |
| Lua Scripts | Full support | Keys must be in same slot |
| Database Selection | 0-15 | Only database 0 |
| Pub/Sub | Global | Per-node by default |

### Migration Strategies

1. **Offline Migration**: Stop writes, migrate data, switch clients
2. **Online Migration**: Dual-write during migration
3. **Gradual Migration**: Migrate key patterns incrementally
4. **Proxy-Based**: Use proxy to route traffic during migration

---

## Pre-Migration Checklist

### 1. Analyze Your Data Model

```python
import redis
from collections import defaultdict

def analyze_key_patterns(host, password):
    """Analyze key patterns for cluster compatibility"""
    r = redis.Redis(host=host, password=password)

    patterns = defaultdict(int)
    multi_key_commands = []

    # Sample keys
    cursor = 0
    while True:
        cursor, keys = r.scan(cursor, count=1000)

        for key in keys:
            # Extract pattern (replace numbers/UUIDs with placeholders)
            pattern = re.sub(r'\d+', '{id}', key.decode())
            pattern = re.sub(r'[a-f0-9-]{36}', '{uuid}', pattern)
            patterns[pattern] += 1

        if cursor == 0:
            break

    return dict(patterns)

# Identify keys that need hash tags
patterns = analyze_key_patterns('localhost', 'password')
for pattern, count in sorted(patterns.items(), key=lambda x: -x[1])[:20]:
    print(f"{count:>8} {pattern}")
```

### 2. Identify Multi-Key Operations

```python
# Check your code for these operations
MULTI_KEY_COMMANDS = [
    'MGET', 'MSET', 'DEL', 'UNLINK',  # Basic multi-key
    'SDIFF', 'SINTER', 'SUNION',       # Set operations
    'ZDIFF', 'ZINTER', 'ZUNION',       # Sorted set operations
    'PFMERGE',                          # HyperLogLog
    'RENAME', 'RENAMENX',               # Key operations
    'RPOPLPUSH', 'LMOVE',               # List operations
    'SMOVE',                            # Set operations
    'COPY',                             # Key operations
]

# Review Lua scripts for multi-key access
# Review MULTI/EXEC transactions
```

### 3. Plan Hash Tags

```python
# Before: Keys that might be on different slots
user_profile = "user:1000:profile"
user_settings = "user:1000:settings"
user_orders = "user:1000:orders"

# After: Hash tags ensure same slot
user_profile = "{user:1000}:profile"
user_settings = "{user:1000}:settings"
user_orders = "{user:1000}:orders"
```

---

## Data Migration Methods

### Method 1: Using redis-cli --cluster import

```bash
# Set up target cluster first
redis-cli --cluster create \
    node1:7000 node2:7001 node3:7002 \
    node4:7003 node5:7004 node6:7005 \
    --cluster-replicas 1

# Import from standalone
redis-cli --cluster import \
    node1:7000 \
    --cluster-from standalone:6379 \
    --cluster-replace \
    --cluster-copy

# Options:
# --cluster-copy: Copy keys (don't delete from source)
# --cluster-replace: Replace existing keys in target
```

### Method 2: Using MIGRATE Command

```python
import redis
from redis.cluster import RedisCluster

def migrate_keys(source_host, target_cluster_host, password, pattern='*'):
    """Migrate keys from standalone to cluster"""
    source = redis.Redis(host=source_host, password=password)
    target = RedisCluster(host=target_cluster_host, password=password)

    migrated = 0
    errors = 0
    cursor = 0

    while True:
        cursor, keys = source.scan(cursor, match=pattern, count=100)

        for key in keys:
            try:
                # Get key type
                key_type = source.type(key)

                # Get TTL
                ttl = source.ttl(key)
                ttl = ttl if ttl > 0 else 0

                # Migrate based on type
                if key_type == b'string':
                    value = source.get(key)
                    target.set(key, value, ex=ttl if ttl > 0 else None)

                elif key_type == b'hash':
                    data = source.hgetall(key)
                    target.hset(key, mapping=data)
                    if ttl > 0:
                        target.expire(key, ttl)

                elif key_type == b'list':
                    values = source.lrange(key, 0, -1)
                    if values:
                        target.rpush(key, *values)
                        if ttl > 0:
                            target.expire(key, ttl)

                elif key_type == b'set':
                    members = source.smembers(key)
                    if members:
                        target.sadd(key, *members)
                        if ttl > 0:
                            target.expire(key, ttl)

                elif key_type == b'zset':
                    members = source.zrange(key, 0, -1, withscores=True)
                    if members:
                        target.zadd(key, dict(members))
                        if ttl > 0:
                            target.expire(key, ttl)

                migrated += 1

            except Exception as e:
                print(f"Error migrating {key}: {e}")
                errors += 1

        if cursor == 0:
            break

    return migrated, errors

# Run migration
migrated, errors = migrate_keys(
    'standalone.example.com',
    'cluster-node1.example.com',
    'password'
)
print(f"Migrated: {migrated}, Errors: {errors}")
```

### Method 3: Using DUMP/RESTORE

```python
def migrate_with_dump_restore(source, target, keys):
    """Migrate using DUMP and RESTORE (preserves TTL and type)"""
    pipeline_size = 100

    for i in range(0, len(keys), pipeline_size):
        batch = keys[i:i + pipeline_size]

        # Dump from source
        dumps = []
        for key in batch:
            try:
                dump = source.dump(key)
                ttl = source.pttl(key)  # TTL in milliseconds
                ttl = max(0, ttl)  # -1 means no TTL, -2 means key doesn't exist
                dumps.append((key, dump, ttl))
            except redis.ResponseError:
                continue

        # Restore to target
        for key, dump, ttl in dumps:
            if dump:
                try:
                    # RESTORE command: key ttl serialized-value [REPLACE]
                    target.restore(key, ttl, dump, replace=True)
                except redis.ResponseError as e:
                    print(f"Error restoring {key}: {e}")
```

---

## Online Migration with Dual-Write

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Migration Layer                        │    │
│  │   Write: Standalone + Cluster                           │    │
│  │   Read:  Standalone (initially) -> Cluster (later)      │    │
│  └─────────────────────────────────────────────────────────┘    │
└───────────────┬───────────────────────────┬─────────────────────┘
                │                           │
                ▼                           ▼
        ┌───────────────┐           ┌───────────────┐
        │  Standalone   │           │   Cluster     │
        │   (Source)    │           │   (Target)    │
        └───────────────┘           └───────────────┘
```

### Implementation

```python
import redis
from redis.cluster import RedisCluster
from threading import Thread
import queue

class MigrationClient:
    """Client that supports dual-write during migration"""

    def __init__(self, standalone_config, cluster_config):
        self.standalone = redis.Redis(**standalone_config)
        self.cluster = RedisCluster(**cluster_config)

        # Migration state
        self.write_mode = 'dual'      # 'standalone', 'dual', 'cluster'
        self.read_mode = 'standalone'  # 'standalone', 'cluster'

        # Async write queue for cluster writes
        self.cluster_queue = queue.Queue()
        self._start_async_writer()

    def _start_async_writer(self):
        """Background thread for async cluster writes"""
        def writer():
            while True:
                try:
                    cmd, args, kwargs = self.cluster_queue.get(timeout=1)
                    getattr(self.cluster, cmd)(*args, **kwargs)
                except queue.Empty:
                    continue
                except Exception as e:
                    print(f"Async write error: {e}")

        thread = Thread(target=writer, daemon=True)
        thread.start()

    def set(self, key, value, **kwargs):
        """Set with dual-write support"""
        if self.write_mode in ('standalone', 'dual'):
            self.standalone.set(key, value, **kwargs)

        if self.write_mode in ('dual', 'cluster'):
            if self.write_mode == 'dual':
                # Async write to cluster during dual-write
                self.cluster_queue.put(('set', (key, value), kwargs))
            else:
                self.cluster.set(key, value, **kwargs)

    def get(self, key):
        """Get based on read mode"""
        if self.read_mode == 'standalone':
            return self.standalone.get(key)
        else:
            return self.cluster.get(key)

    def delete(self, *keys):
        """Delete with dual-write"""
        if self.write_mode in ('standalone', 'dual'):
            self.standalone.delete(*keys)

        if self.write_mode in ('dual', 'cluster'):
            for key in keys:
                if self.write_mode == 'dual':
                    self.cluster_queue.put(('delete', (key,), {}))
                else:
                    self.cluster.delete(key)

    def switch_to_cluster_reads(self):
        """Switch reads to cluster"""
        self.read_mode = 'cluster'

    def switch_to_cluster_only(self):
        """Complete migration - cluster only"""
        self.write_mode = 'cluster'
        self.read_mode = 'cluster'

# Usage during migration
client = MigrationClient(
    standalone_config={'host': 'standalone', 'password': 'pass'},
    cluster_config={'host': 'cluster-node', 'password': 'pass'}
)

# Phase 1: Dual-write, read from standalone
# ... migrate historical data ...

# Phase 2: Dual-write, read from cluster (verify cluster data)
client.switch_to_cluster_reads()

# Phase 3: Cluster only (decommission standalone)
client.switch_to_cluster_only()
```

---

## Client Code Changes

### Before (Standalone)

```python
import redis

r = redis.Redis(host='standalone', password='password')

# Multi-key operations work
r.mset({'key1': 'val1', 'key2': 'val2', 'key3': 'val3'})
r.mget('key1', 'key2', 'key3')

# Transactions work on any keys
pipe = r.pipeline()
pipe.incr('counter1')
pipe.incr('counter2')
pipe.execute()

# Lua scripts work on any keys
script = """
local val1 = redis.call('GET', KEYS[1])
local val2 = redis.call('GET', KEYS[2])
return val1 .. val2
"""
r.eval(script, 2, 'key1', 'key2')
```

### After (Cluster)

```python
from redis.cluster import RedisCluster

rc = RedisCluster(host='cluster-node', password='password')

# Multi-key operations need hash tags
rc.mset({'{app}.key1': 'val1', '{app}.key2': 'val2', '{app}.key3': 'val3'})
rc.mget('{app}.key1', '{app}.key2', '{app}.key3')

# Transactions limited to same slot
pipe = rc.pipeline()
pipe.incr('{counters}.counter1')
pipe.incr('{counters}.counter2')
pipe.execute()

# Lua scripts - all keys must be in same slot
script = """
local val1 = redis.call('GET', KEYS[1])
local val2 = redis.call('GET', KEYS[2])
return val1 .. val2
"""
rc.eval(script, 2, '{mykeys}.key1', '{mykeys}.key2')

# For operations across slots, use individual commands
keys = ['key1', 'key2', 'key3']  # Different slots
values = [rc.get(key) for key in keys]  # Individual GETs
```

### Handling CROSSSLOT Errors

```python
from redis.cluster import RedisCluster
from redis.exceptions import RedisClusterException

rc = RedisCluster(host='cluster-node', password='password')

def safe_mget(keys):
    """MGET that works across slots"""
    try:
        return rc.mget(*keys)
    except RedisClusterException:
        # Fallback to individual GETs
        return [rc.get(key) for key in keys]

def safe_mset(mapping):
    """MSET that works across slots"""
    try:
        return rc.mset(mapping)
    except RedisClusterException:
        # Fallback to individual SETs
        for key, value in mapping.items():
            rc.set(key, value)
        return True

# Or group keys by slot
def mget_by_slot(keys):
    """Group keys by slot and batch GET"""
    from redis.cluster import get_key_slot

    # Group keys by slot
    slot_keys = {}
    for key in keys:
        slot = get_key_slot(key)
        if slot not in slot_keys:
            slot_keys[slot] = []
        slot_keys[slot].append(key)

    # MGET per slot
    results = {}
    for slot, slot_key_list in slot_keys.items():
        values = rc.mget(*slot_key_list)
        for key, value in zip(slot_key_list, values):
            results[key] = value

    return [results.get(key) for key in keys]
```

---

## Migration Steps

### Step-by-Step Process

```bash
# Step 1: Set up target cluster
redis-cli --cluster create \
    node1:7000 node2:7001 node3:7002 \
    node4:7003 node5:7004 node6:7005 \
    --cluster-replicas 1

# Step 2: Verify cluster is healthy
redis-cli --cluster check node1:7000

# Step 3: Deploy application with dual-write
# Update application code to use MigrationClient

# Step 4: Migrate historical data
python migrate_data.py

# Step 5: Verify data consistency
python verify_migration.py

# Step 6: Switch reads to cluster
# Update MigrationClient to read from cluster

# Step 7: Monitor for issues
# Watch for CROSSSLOT errors, latency, etc.

# Step 8: Complete migration
# Switch to cluster-only writes

# Step 9: Decommission standalone
# After validation period, shut down standalone
```

### Verification Script

```python
def verify_migration(standalone, cluster, sample_size=10000):
    """Verify data consistency between standalone and cluster"""
    mismatches = []
    missing = []
    extra = []

    cursor = 0
    checked = 0

    while checked < sample_size:
        cursor, keys = standalone.scan(cursor, count=100)

        for key in keys:
            if checked >= sample_size:
                break

            standalone_type = standalone.type(key)
            standalone_value = get_value(standalone, key, standalone_type)

            try:
                cluster_type = cluster.type(key)
                cluster_value = get_value(cluster, key, cluster_type)

                if standalone_value != cluster_value:
                    mismatches.append({
                        'key': key,
                        'standalone': standalone_value,
                        'cluster': cluster_value
                    })
            except Exception:
                missing.append(key)

            checked += 1

        if cursor == 0:
            break

    return {
        'checked': checked,
        'mismatches': len(mismatches),
        'missing': len(missing),
        'mismatch_details': mismatches[:10]  # Sample
    }

def get_value(client, key, key_type):
    """Get value based on type"""
    if key_type == b'string':
        return client.get(key)
    elif key_type == b'hash':
        return client.hgetall(key)
    elif key_type == b'list':
        return client.lrange(key, 0, -1)
    elif key_type == b'set':
        return client.smembers(key)
    elif key_type == b'zset':
        return client.zrange(key, 0, -1, withscores=True)
    return None
```

---

## Common Issues and Solutions

### 1. CROSSSLOT Errors

```python
# Error: CROSSSLOT Keys in request don't hash to the same slot

# Solution: Add hash tags
# Before
r.mget('user:1:name', 'user:1:email')

# After
r.mget('{user:1}:name', '{user:1}:email')
```

### 2. Multiple Database Usage

```python
# Standalone: Can use databases 0-15
r.select(1)

# Cluster: Only database 0
# Solution: Use key prefixes instead
# Before: DB 0 = cache, DB 1 = sessions
# After: cache:*, session:*
```

### 3. Lua Scripts

```lua
-- Before: Keys can be anywhere
local val = redis.call('GET', 'key1')
redis.call('SET', 'key2', val)

-- After: All keys must be passed and in same slot
local val = redis.call('GET', KEYS[1])
redis.call('SET', KEYS[2], val)
-- Call with: EVAL script 2 {mykeys}:key1 {mykeys}:key2
```

---

## Conclusion

Migrating to Redis Cluster requires:

- **Data model changes**: Add hash tags for multi-key operations
- **Code updates**: Handle CROSSSLOT errors, update client libraries
- **Careful migration**: Use dual-write for zero-downtime migration

Key takeaways:
- Analyze your key patterns before migration
- Use hash tags for related keys
- Test thoroughly with production-like data
- Use dual-write for zero-downtime migration

---

*Need to monitor your Redis cluster migration? [OneUptime](https://oneuptime.com) provides comprehensive Redis monitoring with migration progress tracking, data consistency alerts, and cluster health dashboards.*
