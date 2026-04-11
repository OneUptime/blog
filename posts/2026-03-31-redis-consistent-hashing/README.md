# How to Scale Redis with Consistent Hashing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Consistent Hashing, Sharding, Scalability, Distributed System

Description: Use consistent hashing to distribute Redis keys across shards with minimal remapping when nodes are added or removed, reducing cache invalidation storms.

---

Standard modulo sharding remaps most keys when the number of shards changes. Consistent hashing solves this by distributing keys on a virtual ring, so adding or removing a node only remaps a fraction of the keys - typically 1/N where N is the total number of nodes.

## How Consistent Hashing Works

Keys and nodes are placed on a circular hash ring using their hash values. A key is assigned to the first node clockwise from its position on the ring. Virtual nodes (vnodes) spread each physical node across multiple ring positions for better balance.

## Implementing Consistent Hashing in Python

```python
import hashlib
import redis
from sortedcontainers import SortedDict

class ConsistentHashRing:
    def __init__(self, nodes: dict, vnodes: int = 150):
        self.ring = SortedDict()
        self.vnodes = vnodes
        self.clients = {}
        for name, client in nodes.items():
            self.add_node(name, client)

    def _hash(self, key: str) -> int:
        return int(hashlib.md5(key.encode()).hexdigest(), 16)

    def add_node(self, name: str, client: redis.Redis):
        self.clients[name] = client
        for i in range(self.vnodes):
            vnode_key = f"{name}:vnode:{i}"
            self.ring[self._hash(vnode_key)] = name

    def remove_node(self, name: str):
        for i in range(self.vnodes):
            vnode_key = f"{name}:vnode:{i}"
            del self.ring[self._hash(vnode_key)]
        del self.clients[name]

    def get_client(self, key: str) -> redis.Redis:
        if not self.ring:
            raise RuntimeError("No nodes in ring")
        h = self._hash(key)
        idx = self.ring.bisect_left(h)
        if idx == len(self.ring):
            idx = 0
        node_name = self.ring.values()[idx]
        return self.clients[node_name]
```

## Using the Ring

```python
nodes = {
    "redis-0": redis.Redis(host="redis-0", port=6379, decode_responses=True),
    "redis-1": redis.Redis(host="redis-1", port=6379, decode_responses=True),
    "redis-2": redis.Redis(host="redis-2", port=6379, decode_responses=True),
}

ring = ConsistentHashRing(nodes)

def get(key: str) -> str:
    return ring.get_client(key).get(key)

def set_key(key: str, value: str, ttl: int = 300):
    ring.get_client(key).setex(key, ttl, value)
```

## Adding a Node with Minimal Remapping

```python
new_client = redis.Redis(host="redis-3", port=6379, decode_responses=True)
ring.add_node("redis-3", new_client)

# Only ~25% of keys (1/4) remap to the new node
# The rest continue hitting the same nodes
print("Node added. Approximately 25% of keys remapped.")
```

## Measuring Key Distribution

Check how evenly keys are distributed across nodes:

```python
from collections import Counter

test_keys = [f"user:{i}" for i in range(10000)]
distribution = Counter()

for key in test_keys:
    client = ring.get_client(key)
    # Find which node this client belongs to
    for name, c in ring.clients.items():
        if c is client:
            distribution[name] += 1

for node, count in sorted(distribution.items()):
    print(f"{node}: {count} keys ({count/len(test_keys)*100:.1f}%)")
```

## Install the Dependency

```bash
pip install sortedcontainers redis
```

## Summary

Consistent hashing minimizes cache invalidation when scaling Redis shards. By placing nodes and keys on a virtual ring with many virtual nodes per physical node, you achieve even key distribution and limit remapping to roughly 1/N of keys when topology changes. This approach is especially valuable when horizontal scaling happens frequently in production.
