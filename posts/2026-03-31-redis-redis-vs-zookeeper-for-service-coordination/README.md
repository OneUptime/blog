# Redis vs Zookeeper for Service Coordination

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ZooKeeper, Distributed System, Service Coordination, Leader Election

Description: Compare Redis and Apache ZooKeeper for distributed service coordination, covering leader election, watches, ephemeral nodes, and operational complexity.

---

## Overview

Apache ZooKeeper has been the backbone of distributed coordination for systems like Kafka, HBase, and Hadoop. Redis, with its atomic operations and pub/sub capabilities, is increasingly used as a lighter-weight alternative for service coordination tasks. This post examines the key differences.

## ZooKeeper Architecture

ZooKeeper maintains a hierarchical namespace of znodes (similar to a file system). It uses ZAB (ZooKeeper Atomic Broadcast) for strong consistency and supports ephemeral nodes that are deleted when a client session ends.

```bash
# Connect to ZooKeeper CLI
zkCli.sh -server localhost:2181

# Create a persistent node
create /services ""

# Create an ephemeral node (deleted on disconnect)
create -e /services/api-1 "192.168.1.10:8080"

# List children
ls /services

# Get node data
get /services/api-1

# Watch a node for changes
get -w /services/api-1
```

## Redis for Service Coordination

Redis achieves similar patterns using keys with TTL, pub/sub for notifications, and Lua scripts for atomic operations.

```python
import redis
import threading
import time

r = redis.Redis()

class ServiceRegistry:
    def __init__(self, service_name: str, address: str, ttl: int = 15):
        self.key = f"service:{service_name}:{address}"
        self.address = address
        self.ttl = ttl
        self._stop_event = threading.Event()
        self._heartbeat_thread = None

    def register(self):
        r.setex(self.key, self.ttl, self.address)
        r.publish("service:registered", f"{self.key}:{self.address}")
        self._start_heartbeat()

    def deregister(self):
        r.delete(self.key)
        r.publish("service:deregistered", self.key)
        self._stop_event.set()

    def _start_heartbeat(self):
        def refresh():
            while not self._stop_event.is_set():
                r.expire(self.key, self.ttl)
                self._stop_event.wait(self.ttl // 2)
        t = threading.Thread(target=refresh, daemon=True)
        t.start()
        self._heartbeat_thread = t
```

## Leader Election

### ZooKeeper Leader Election

ZooKeeper uses sequential ephemeral nodes for leader election - a well-established recipe:

```python
from kazoo.client import KazooClient
from kazoo.recipe.election import Election

zk = KazooClient(hosts='127.0.0.1:2181')
zk.start()

election = Election(zk, "/leader/my-service")

def leader_func():
    print("I am the leader, performing work...")

# This blocks until elected, then calls leader_func
election.run(leader_func)
```

### Redis Leader Election

```python
import redis
import socket
import time

r = redis.Redis()

LEADER_KEY = "leader:my-service"
NODE_ID = socket.gethostname()
TTL = 10  # seconds

def acquire_leadership() -> bool:
    return r.set(LEADER_KEY, NODE_ID, nx=True, ex=TTL) is True

def renew_leadership() -> bool:
    lua_script = """
    if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('EXPIRE', KEYS[1], ARGV[2])
    end
    return 0
    """
    return bool(r.eval(lua_script, 1, LEADER_KEY, NODE_ID, TTL))

def leader_loop():
    while True:
        if acquire_leadership() or renew_leadership():
            print(f"{NODE_ID} is leader - performing work")
            time.sleep(TTL // 2)
        else:
            leader = r.get(LEADER_KEY)
            print(f"Current leader: {leader}")
            time.sleep(TTL // 3)
```

## Watch / Notification Comparison

ZooKeeper watches are one-time triggers registered on specific znodes:

```python
from kazoo.client import KazooClient

zk = KazooClient(hosts='127.0.0.1:2181')
zk.start()

@zk.DataWatch("/config/feature-flag")
def watch_config(data, stat, event=None):
    if event:
        print(f"Config changed: {data}")

# Keep the connection alive
import time
while True:
    time.sleep(1)
```

Redis keyspace notifications provide event-driven updates:

```python
import redis

r = redis.Redis()
r.config_set('notify-keyspace-events', 'KEA')

pubsub = r.pubsub()
pubsub.psubscribe('__keyevent@0__:*')

for message in pubsub.listen():
    if message['type'] == 'pmessage':
        event = message['channel'].decode().split(':')[1]
        key = message['data'].decode()
        print(f"Event: {event} on key: {key}")
```

## Distributed Barriers

```python
# ZooKeeper barrier
from kazoo.recipe.barrier import Barrier

zk = KazooClient(hosts='127.0.0.1:2181')
zk.start()
barrier = Barrier(zk, "/barrier/startup")

# Block until all parties ready
barrier.wait(timeout=30)

# Release when done
barrier.remove()
```

```python
# Redis barrier using a counter and pub/sub
EXPECTED_WORKERS = 5

def wait_at_barrier(worker_id: str, timeout: int = 30):
    count = r.incr("barrier:startup:count")
    r.expire("barrier:startup:count", timeout)

    if count >= EXPECTED_WORKERS:
        r.publish("barrier:startup:ready", "go")
        return

    pubsub = r.pubsub()
    pubsub.subscribe("barrier:startup:ready")
    pubsub.get_message(timeout=timeout)
```

## Operational Complexity

```text
Aspect             | ZooKeeper                     | Redis
-------------------|-------------------------------|---------------------------
Minimum cluster    | 3 nodes (quorum)              | 1 node (or 3 for Sentinel)
Protocol           | ZAB (Paxos-like)              | Async replication
Consistency        | Linearizable                  | Eventual (replica reads)
Session tracking   | Native (ephemeral znodes)     | TTL + heartbeat pattern
Ecosystem          | Kafka, HBase, Hadoop, Solr    | Broad (general purpose)
```

## When to Use ZooKeeper

- You need battle-tested coordination for Kafka or HBase
- You require strongly consistent distributed locks
- You need native ephemeral nodes with automatic cleanup on disconnect
- Your team is already operating ZooKeeper for another service

## When to Use Redis

- You want simpler infrastructure with fewer components
- You need coordination as one capability among many (caching, pub/sub)
- Eventual consistency with TTL-based cleanup is acceptable
- You need higher throughput than ZooKeeper typically handles

## Summary

ZooKeeper provides rock-solid distributed coordination with strong consistency, native session management, and proven patterns for leader election and barriers - making it essential for systems like Kafka. Redis offers a lighter-weight coordination layer with TTL-based expiry and pub/sub notifications, suitable when strong linearizability is not required. Use ZooKeeper when correctness is paramount; use Redis when simplicity and multi-purpose use are more important.
