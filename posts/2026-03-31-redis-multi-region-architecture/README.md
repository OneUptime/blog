# How to Design a Multi-Region Redis Architecture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Multi-Region, Architecture, Replication, High Availability

Description: Design a multi-region Redis architecture using active-passive replication, geo-routing, and conflict resolution to serve global traffic with low latency and high availability.

---

A single-region Redis deployment is a latency and availability risk for global applications. Users in distant regions experience high read latency, and a regional outage takes down the entire system. A multi-region architecture places Redis instances close to users while keeping data synchronized across regions.

## Architecture Options

**Active-Passive**: One primary region accepts all writes; secondary regions replicate and serve reads.
**Active-Active** (Redis Enterprise): All regions accept reads and writes with conflict resolution via CRDTs.

This guide covers active-passive with local read routing as it works with open-source Redis.

## Active-Passive Replication Setup

Configure the secondary region as a replica:

```bash
# In secondary region's redis.conf
replicaof primary.redis.us-east-1.internal 6379
replica-read-only yes
```

Or set it at runtime:

```bash
redis-cli -h secondary.redis.eu-west-1.internal REPLICAOF primary.redis.us-east-1.internal 6379
```

## Geo-Routing Application Layer

Route reads to the nearest Redis node based on the user's region:

```python
import redis

REDIS_REGIONS = {
    "us-east": redis.Redis(host="redis.us-east-1.internal"),
    "eu-west": redis.Redis(host="redis.eu-west-1.internal"),
    "ap-south": redis.Redis(host="redis.ap-south-1.internal"),
}
WRITE_REGION = REDIS_REGIONS["us-east"]

def get_client_for_region(user_region: str) -> redis.Redis:
    return REDIS_REGIONS.get(user_region, WRITE_REGION)

def read(key: str, user_region: str):
    client = get_client_for_region(user_region)
    return client.get(key)

def write(key: str, value, ttl: int = 3600):
    # All writes go to the primary
    WRITE_REGION.set(key, value, ex=ttl)
```

## Replication Lag Monitoring

Check replication offset to detect lag:

```python
def get_replication_lag(region: str) -> int:
    master_info = WRITE_REGION.info("replication")
    replica_info = REDIS_REGIONS[region].info("replication")
    master_offset = master_info.get("master_repl_offset", 0)
    replica_offset = replica_info.get("master_repl_offset", 0)
    return master_offset - replica_offset

def warn_if_lagging(region: str, max_lag_bytes: int = 1048576):
    lag = get_replication_lag(region)
    if lag > max_lag_bytes:
        alert(f"Region {region} replication lag: {lag} bytes")
```

## Failover Procedure

Promote a secondary to primary during a regional outage:

```bash
# On the standby replica in eu-west
redis-cli -h redis.eu-west-1.internal REPLICAOF NO ONE

# Update DNS or load balancer to point writes at eu-west
```

Automate with Redis Sentinel for automatic failover:

```bash
# sentinel.conf
sentinel monitor mymaster primary.redis.us-east-1.internal 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
```

## Conflict Resolution for Active-Active

For eventual active-active deployments, use CRDT-friendly data structures. Counters work well since increments commute:

```python
def increment_counter(key: str, region_client: redis.Redis):
    # Each region increments independently; convergence happens on sync
    region_client.incr(key)
```

For last-write-wins on strings, always include a timestamp and use Lua to reject stale writes:

```python
def lww_set(key: str, value, ts: float, client: redis.Redis):
    script = """
    local cur = redis.call('HGET', KEYS[1], 'ts')
    if cur and tonumber(cur) >= tonumber(ARGV[2]) then return 0 end
    redis.call('HSET', KEYS[1], 'value', ARGV[1], 'ts', ARGV[2])
    return 1
    """
    client.eval(script, 1, key, value, ts)
```

## Region Health Check

Monitor each region and exclude unhealthy nodes from routing:

```python
def is_region_healthy(region: str) -> bool:
    try:
        REDIS_REGIONS[region].ping()
        return True
    except Exception:
        return False
```

## Summary

A multi-region Redis architecture reduces latency by routing reads to the nearest replica while centralizing writes to the primary region. Replication lag monitoring and Sentinel-based automatic failover keep the system available during regional outages. For active-active setups, CRDT-compatible data types and last-write-wins Lua scripts enable conflict-free convergence across all regions.
