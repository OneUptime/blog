# Redis vs etcd for Distributed Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, etcd, Distributed System, Configuration Management, Consensus

Description: Compare Redis and etcd for distributed configuration storage, covering consistency guarantees, watch semantics, TTL, and leader election patterns.

---

## Overview

Distributed systems need a reliable store for configuration, service discovery, and coordination. etcd is the go-to solution for Kubernetes and CoreOS-based systems. Redis is often used for lightweight configuration distribution. Their consistency models and guarantees are fundamentally different.

## Consistency Model

etcd uses the Raft consensus algorithm, providing strong consistency (linearizability). Every read reflects the latest committed write across the cluster.

Redis replication is asynchronous. In a Redis Cluster or Sentinel setup, a replica may lag behind the primary, so reads from replicas can return stale data.

```bash
# etcd: strongly consistent read (default)
etcdctl get /config/db/host

# etcd: serializable read (may be slightly stale, faster)
etcdctl get /config/db/host --serializable

# Redis: read from primary (consistent)
redis-cli GET config:db:host

# Redis: read from replica (potentially stale)
redis-cli -p 6380 GET config:db:host
```

## Writing Configuration

```bash
# etcd: put a key
etcdctl put /config/db/host "db.internal.example.com"
etcdctl put /config/db/port "5432"

# etcd: atomic compare-and-swap (CAS)
etcdctl txn <<EOF
value("/config/db/host") = "old.host.example.com"

put /config/db/host "new.host.example.com"

EOF
```

```bash
# Redis: set a config key
SET config:db:host "db.internal.example.com"
SET config:db:port "5432"

# Redis: atomic CAS with Lua
EVAL "
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('SET', KEYS[1], ARGV[2])
  else
    return 0
  end
" 1 config:db:host "old.host.example.com" "new.host.example.com"
```

## Watch Semantics

etcd provides a native watch that delivers all changes in order, even across reconnects.

```python
import etcd3

client = etcd3.client()

# Watch a key prefix
events_iterator, cancel = client.watch_prefix('/config/')
for event in events_iterator:
    print(f"Key: {event.key}, Value: {event.value}")
    if some_condition:
        cancel()
```

Redis keyspace notifications provide watch-like behavior but are best-effort (no delivery guarantees):

```python
import redis

r = redis.Redis()
pubsub = r.pubsub()

# Enable keyspace notifications first
r.config_set('notify-keyspace-events', 'KEA')

# Subscribe to changes on config: keys
pubsub.psubscribe('__keyevent@0__:set')

for message in pubsub.listen():
    if message['type'] == 'pmessage':
        key = message['data'].decode()
        if key.startswith('config:'):
            print(f"Config changed: {key}")
```

## TTL and Lease Management

etcd uses leases, which must be refreshed to keep keys alive - ideal for service registration:

```bash
# Create a lease with 10-second TTL
LEASE_ID=$(etcdctl lease grant 10 | awk '{print $2}')

# Attach key to lease
etcdctl put /services/api-1 "192.168.1.10:8080" --lease=$LEASE_ID

# Keep alive (run in background)
etcdctl lease keep-alive $LEASE_ID

# When the process dies, the key is automatically removed
```

Redis TTL is simpler but not tied to a session:

```bash
# Set config with TTL (service registration)
SET service:api-1 "192.168.1.10:8080" EX 10

# Heartbeat - refresh TTL
EXPIRE service:api-1 10
```

## Leader Election

etcd provides a native election mechanism:

```python
import etcd3

client = etcd3.client()
election = client.election("/leader/my-service")

# Campaign for leadership (blocks until elected)
election.campaign(b"node-1")
print("I am the leader!")

# Resign leadership
election.resign()
```

Redis leader election using `SET NX` with expiry:

```python
import redis
import time

r = redis.Redis()

def try_acquire_lock(node_id: str, ttl: int = 10) -> bool:
    result = r.set("leader:my-service", node_id, nx=True, ex=ttl)
    return result is True

def is_leader(node_id: str) -> bool:
    return r.get("leader:my-service") == node_id.encode()

def renew_leadership(node_id: str, ttl: int = 10) -> bool:
    script = """
    if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('EXPIRE', KEYS[1], ARGV[2])
    else
        return 0
    end
    """
    result = r.eval(script, 1, "leader:my-service", node_id, ttl)
    return result == 1
```

## When to Use etcd

- You need strong consistency (linearizability) for configuration
- You are building Kubernetes or CoreOS-style distributed systems
- You need guaranteed ordered watch delivery with no missed events
- You need native lease-based session management

## When to Use Redis

- Strong consistency is not required (eventual consistency is acceptable)
- You already run Redis and want to consolidate infrastructure
- You need simple key-value configuration with flexible TTL
- You need higher write throughput than etcd typically provides

## Summary

etcd provides strong consistency guarantees via Raft consensus, making it the right choice for critical distributed configuration and coordination where correctness is non-negotiable. Redis offers higher throughput and simpler operation with asynchronous replication, suitable for configuration that tolerates brief eventual-consistency windows. For Kubernetes-style coordination, use etcd; for application-level configuration caching and simple feature flags, Redis is a practical choice.
