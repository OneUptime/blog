# How to Implement Sharding with Dapr State Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Sharding, Scalability, Redis

Description: Implement manual and automatic sharding strategies for Dapr state stores to distribute data and load across multiple backend instances.

---

## Why Shard Dapr State?

A single Redis instance tops out at roughly 1M operations per second and is limited by memory. When your state requirements exceed a single store, sharding distributes keys across multiple store instances, each handling a subset of the data.

## Multiple State Store Components

```yaml
# Shard 0
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore-shard-0
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-shard-0.default.svc.cluster.local:6379"
---
# Shard 1
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore-shard-1
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-shard-1.default.svc.cluster.local:6379"
---
# Shard 2
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore-shard-2
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-shard-2.default.svc.cluster.local:6379"
```

## Consistent Hashing Shard Router

```python
import hashlib
import bisect
from dataclasses import dataclass

@dataclass
class VirtualNode:
    shard: str
    position: int

class ConsistentHashRouter:
    def __init__(self, shards: list[str], virtual_nodes: int = 150):
        self.ring: list[VirtualNode] = []
        self.positions: list[int] = []

        for shard in shards:
            for i in range(virtual_nodes):
                key = f"{shard}:vnode:{i}".encode()
                position = int(hashlib.md5(key).hexdigest(), 16)
                node = VirtualNode(shard=shard, position=position)
                idx = bisect.bisect_left(self.positions, position)
                self.positions.insert(idx, position)
                self.ring.insert(idx, node)

    def get_shard(self, key: str) -> str:
        h = int(hashlib.md5(key.encode()).hexdigest(), 16)
        idx = bisect.bisect_left(self.positions, h)
        if idx >= len(self.ring):
            idx = 0
        return self.ring[idx].shard


router = ConsistentHashRouter([
    "statestore-shard-0",
    "statestore-shard-1",
    "statestore-shard-2",
])
```

## Sharded State Client

```python
import httpx

DAPR_PORT = 3500

class ShardedStateClient:
    def __init__(self, router: ConsistentHashRouter):
        self.router = router

    async def save(self, key: str, value: dict):
        store = self.router.get_shard(key)
        async with httpx.AsyncClient() as client:
            await client.post(
                f"http://localhost:{DAPR_PORT}/v1.0/state/{store}",
                json=[{"key": key, "value": value}],
            )

    async def get(self, key: str) -> dict | None:
        store = self.router.get_shard(key)
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"http://localhost:{DAPR_PORT}/v1.0/state/{store}/{key}"
            )
            return resp.json() if resp.status_code == 200 else None

    async def delete(self, key: str):
        store = self.router.get_shard(key)
        async with httpx.AsyncClient() as client:
            await client.delete(
                f"http://localhost:{DAPR_PORT}/v1.0/state/{store}/{key}"
            )
```

## Usage

```python
client = ShardedStateClient(router)

# Keys automatically route to consistent shards
await client.save("user-1001", {"name": "Alice", "plan": "pro"})
await client.save("user-2002", {"name": "Bob", "plan": "free"})
await client.save("user-3003", {"name": "Carol", "plan": "enterprise"})

user = await client.get("user-1001")
print(f"Shard for user-1001: {router.get_shard('user-1001')}")
```

## Rebalancing When Adding Shards

Consistent hashing minimizes the number of keys that move when adding a new shard:

```python
# Before: 3 shards
old_router = ConsistentHashRouter(["shard-0", "shard-1", "shard-2"])

# After: 4 shards
new_router = ConsistentHashRouter(["shard-0", "shard-1", "shard-2", "shard-3"])

# Only keys that moved shards need migration
moved = [k for k in all_keys if old_router.get_shard(k) != new_router.get_shard(k)]
print(f"Keys to migrate: {len(moved)} of {len(all_keys)}")
```

## Summary

Manual sharding with multiple Dapr state store components and a consistent hash router gives full control over data distribution. Adding virtual nodes to the ring distributes keys evenly and minimizes migration when resharding. For most use cases, 150-200 virtual nodes per shard provides good balance without excessive memory overhead.
