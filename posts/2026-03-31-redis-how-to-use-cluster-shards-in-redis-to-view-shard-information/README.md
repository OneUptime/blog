# How to Use CLUSTER SHARDS in Redis to View Shard Information

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Shard, Topology, Operation

Description: Learn how to use CLUSTER SHARDS in Redis to retrieve structured shard information including slot ranges, primary nodes, and replica details.

---

## What Is CLUSTER SHARDS?

`CLUSTER SHARDS` is a Redis 7.0 command that returns structured information about the shards in a Redis Cluster. Unlike `CLUSTER NODES`, which returns a flat text representation of all nodes, `CLUSTER SHARDS` returns data organized by shard - each entry groups a primary node with its replicas and the slot ranges they own.

This structured format is easier to parse programmatically and is the preferred way to discover cluster topology in modern Redis clients.

## Basic Usage

```bash
CLUSTER SHARDS
```

The response is an array where each element represents one shard. Each shard contains:
- `slots` - list of slot ranges owned by this shard
- `nodes` - list of nodes in this shard (primary and replicas)

## Sample Output Structure

```text
1) 1) "slots"
   2) 1) (integer) 0
      2) (integer) 5460
   3) "nodes"
   4) 1) 1) "id"
         2) "a1b2c3d4..."
         3) "port"
         4) (integer) 6379
         5) "ip"
         6) "192.168.1.10"
         7) "endpoint"
         8) "192.168.1.10"
         9) "role"
        10) "primary"
        11) "replication-offset"
        12) (integer) 54321
        13) "health"
        14) "online"
      2) 1) "id"
         2) "d4e5f6a1..."
         3) "role"
         4) "replica"
         5) "health"
         6) "online"
```

## Understanding Shard Fields

| Field | Description |
|---|---|
| slots | Pairs of integers representing inclusive slot ranges |
| id | Node identifier (40-char hex) |
| ip | IP address of the node |
| port | Client-facing port |
| endpoint | Hostname or IP used for client connections |
| role | `primary` or `replica` |
| replication-offset | Replication offset for consistency checks |
| health | `online`, `failed`, or `loading` |

## Parsing CLUSTER SHARDS with Python

```python
from redis.cluster import RedisCluster

r = RedisCluster(host='localhost', port=6379, decode_responses=True)

shards = r.cluster_shards()

for i, shard in enumerate(shards):
    print(f"Shard {i + 1}:")
    slots = shard.get('slots', [])
    # Slots are returned as pairs [start, end, start, end, ...]
    for j in range(0, len(slots), 2):
        print(f"  Slot range: {slots[j]}-{slots[j+1]}")

    nodes = shard.get('nodes', [])
    for node in nodes:
        role = node.get('role', 'unknown')
        ip = node.get('ip', 'unknown')
        port = node.get('port', 'unknown')
        health = node.get('health', 'unknown')
        print(f"  Node [{role}]: {ip}:{port} ({health})")
    print()
```

## Checking Node Health Across All Shards

```python
from redis.cluster import RedisCluster

r = RedisCluster(host='localhost', port=6379, decode_responses=True)

shards = r.cluster_shards()
unhealthy = []

for shard in shards:
    for node in shard.get('nodes', []):
        if node.get('health') != 'online':
            unhealthy.append(node)

if unhealthy:
    print(f"Found {len(unhealthy)} unhealthy node(s):")
    for node in unhealthy:
        print(f"  {node.get('ip')}:{node.get('port')} - {node.get('health')}")
else:
    print("All nodes are online.")
```

## CLUSTER SHARDS vs CLUSTER NODES

| Feature | CLUSTER SHARDS | CLUSTER NODES |
|---|---|---|
| Format | Structured array | Flat text |
| Organized by | Shard (primary + replicas) | Individual node |
| Health field | Yes | Via flags |
| Available since | 7.0 | 3.0 |
| Parsing | Easy | Manual parsing |

Prefer `CLUSTER SHARDS` for programmatic cluster topology discovery in Redis 7.0+.

## Use Case: Building a Cluster Connection Map

```python
from redis.cluster import RedisCluster

def get_cluster_map(host, port):
    r = RedisCluster(host=host, port=port, decode_responses=True)
    shards = r.cluster_shards()
    cluster_map = {}

    for shard in shards:
        slots = shard.get('slots', [])
        primary = None

        for node in shard.get('nodes', []):
            if node.get('role') == 'primary':
                primary = f"{node['ip']}:{node['port']}"
                break

        for j in range(0, len(slots), 2):
            for slot in range(slots[j], slots[j+1] + 1):
                cluster_map[slot] = primary

    return cluster_map
```

## Summary

`CLUSTER SHARDS` provides a clean, structured view of Redis Cluster topology organized by shard rather than individual node. It includes slot ranges, node roles, health status, and replication offsets, making it ideal for programmatic cluster discovery and health monitoring in Redis 7.0 and later. Use it as a modern replacement for parsing the raw text output of `CLUSTER NODES`.
