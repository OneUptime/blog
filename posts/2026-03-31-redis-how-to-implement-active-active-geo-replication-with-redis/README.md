# How to Implement Active-Active Geo-Replication with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Geo-Replication, Active-Active, CRDT, Multi-Region, High Availability

Description: Learn how to implement active-active geo-replication with Redis Enterprise for multi-region deployments with conflict-free concurrent writes.

---

## What Is Active-Active Geo-Replication

Active-Active geo-replication (also called multi-master replication) allows multiple Redis instances in different geographic regions to accept both reads and writes simultaneously. Changes are replicated to all other regions, and conflicts are resolved automatically using CRDTs (Conflict-free Replicated Data Types).

This differs from standard Redis replication where only the primary accepts writes and replicas are read-only.

## Use Cases

- **Global applications** - users in different continents get low-latency access
- **Disaster recovery** - if one region fails, others continue serving traffic
- **Data residency compliance** - keep data in specific geographic regions
- **Zero-downtime geo-migration** - move users between regions without downtime

## Architecture Overview

```text
Region: US-East (Primary)          Region: EU-West (Primary)
+-------------------+               +-------------------+
| Redis Instance    |<-- replicate ->| Redis Instance    |
| Reads + Writes    |               | Reads + Writes    |
+-------------------+               +-------------------+
         |                                   |
         v                                   v
   US-East Clients                    EU-West Clients
```

Each region is a primary that can serve writes. Replication is bidirectional and eventually consistent.

## Redis Enterprise Active-Active Setup

Active-Active geo-replication is a Redis Enterprise feature (not available in open-source Redis). The setup uses the `crdb-cli` tool:

```bash
# Create an Active-Active database spanning two regions
crdb-cli crdb create \
  --name my-global-db \
  --memory-size 10gb \
  --replication true \
  --instance fqdn=redis-us.example.com,username=admin,password=secret,replication-endpoint=redis-us.example.com:5000,replication-tls-sni=redis-us.example.com \
  --instance fqdn=redis-eu.example.com,username=admin,password=secret,replication-endpoint=redis-eu.example.com:5000,replication-tls-sni=redis-eu.example.com
```

## CRDT Data Types and Conflict Resolution

CRDTs resolve conflicts automatically without human intervention:

### Counters (CRDT Increment)

```bash
# In US-East (counter is at 100)
INCR page:views:home
# 101

# Simultaneously in EU-West (counter is also at 100)
INCR page:views:home
# 101  (both regions think it's 101)

# After sync, both regions see
GET page:views:home
# 102  (CRDT merges by summing independent increments: +1 and +1)
```

### Sets (CRDT Union)

```bash
# US-East adds member
SADD online:users "alice"

# EU-West adds member
SADD online:users "bob"

# After sync, both regions see the union
SMEMBERS online:users
# "alice", "bob"
```

### Last-Writer-Wins for Strings

```bash
# US-East writes at T=100
SET user:42:name "Alice"

# EU-West writes at T=101
SET user:42:name "Alicia"

# After sync, the write with the later timestamp wins
GET user:42:name
# "Alicia"
```

## Simulating Active-Active with Open-Source Redis

For non-Enterprise Redis, you can approximate active-active using application-level logic with conflict resolution:

```python
import redis
import time
import json

# Connect to both region instances
region_us = redis.Redis(host='redis-us.example.com', port=6379)
region_eu = redis.Redis(host='redis-eu.example.com', port=6379)

def write_with_timestamp(key, value, region):
    """Write with a wall clock timestamp for conflict resolution."""
    data = json.dumps({
        'value': value,
        'ts': time.time(),
        'region': region.connection_pool.connection_kwargs['host']
    })
    region.set(key, data)
    # Replicate to other region
    other = region_eu if region == region_us else region_us
    other.set(key, data)

def read_latest(key):
    """Read from both regions and return the most recent write."""
    raw_us = region_us.get(key)
    raw_eu = region_eu.get(key)
    candidates = [json.loads(r) for r in [raw_us, raw_eu] if r]
    if not candidates:
        return None
    # Last-writer-wins
    return max(candidates, key=lambda x: x['ts'])['value']
```

## Handling Replication Lag

In active-active setups, there is always some replication lag between regions. Design your application to tolerate eventual consistency:

```python
def update_counter_globally(key, increment):
    """Use local instance for the write, accept that other regions sync eventually."""
    local_redis = get_local_region_redis()
    new_value = local_redis.incrby(key, increment)
    # Don't wait for cross-region sync - it happens asynchronously
    return new_value

def get_counter(key):
    """Read from local region - may be slightly behind other regions."""
    local_redis = get_local_region_redis()
    return int(local_redis.get(key) or 0)
```

## Monitoring Replication Health

With Redis Enterprise:

```bash
# Check replication status
crdb-cli crdb list

# View replication lag between instances
crdb-cli crdb get --crdb-guid <guid>
```

With custom replication:

```python
def check_replication_consistency(key):
    val_us = region_us.get(key)
    val_eu = region_eu.get(key)
    if val_us != val_eu:
        print(f'Consistency gap for {key}: US={val_us}, EU={val_eu}')
```

## Key Design Considerations

| Topic | Guidance |
|---|---|
| Key naming | Include region in keys that should not conflict |
| Write conflicts | Use CRDTs or last-writer-wins for most data |
| Read consistency | Read from local region for low latency |
| Monitoring | Track replication lag and conflict rates |
| TTLs | Set TTLs on both regions independently |

## Summary

Active-active geo-replication enables Redis to serve reads and writes in multiple regions simultaneously, providing low latency and high availability globally. Redis Enterprise handles conflict resolution automatically via CRDTs, while open-source implementations require application-level conflict resolution logic. The key design principle is to accept eventual consistency between regions while providing strong consistency within each region for local reads and writes.
