# How to Use CLUSTER MYID and CLUSTER MYSHARDID in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Node Identity, Operation, Administration

Description: Learn how to use CLUSTER MYID and CLUSTER MYSHARDID in Redis to retrieve the current node's unique identifiers for scripting and automation.

---

## What Are CLUSTER MYID and CLUSTER MYSHARDID?

`CLUSTER MYID` returns the unique node ID of the current Redis Cluster node - the 40-character hexadecimal string that identifies it within the cluster.

`CLUSTER MYSHARDID` (added in Redis 7.2) returns the shard ID of the node. In Redis Cluster, a shard consists of a primary node and its replicas. All nodes in the same shard share the same shard ID.

## CLUSTER MYID

### Basic Usage

```bash
CLUSTER MYID
# Returns: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
```

The node ID is a stable identifier that persists across restarts (stored in the cluster configuration file).

### Use Cases for CLUSTER MYID

- Getting the node ID for use in `CLUSTER REPLICATE`
- Scripting cluster setup automation
- Identifying the current node in monitoring scripts

### Retrieving Node ID in Bash Scripts

```bash
# Store the node ID in a variable for use in other commands
NODE_ID=$(redis-cli -h 127.0.0.1 -p 7001 CLUSTER MYID)
echo "Node ID: $NODE_ID"

# Use it to replicate from this master
redis-cli -h 127.0.0.1 -p 7004 CLUSTER REPLICATE $NODE_ID
```

### Automating Cluster Setup

```bash
#!/bin/bash

# Get IDs for the three master nodes
MASTER1=$(redis-cli -h 127.0.0.1 -p 7001 CLUSTER MYID)
MASTER2=$(redis-cli -h 127.0.0.1 -p 7002 CLUSTER MYID)
MASTER3=$(redis-cli -h 127.0.0.1 -p 7003 CLUSTER MYID)

echo "Master 1: $MASTER1"
echo "Master 2: $MASTER2"
echo "Master 3: $MASTER3"

# Assign replicas
redis-cli -h 127.0.0.1 -p 7004 CLUSTER REPLICATE $MASTER1
redis-cli -h 127.0.0.1 -p 7005 CLUSTER REPLICATE $MASTER2
redis-cli -h 127.0.0.1 -p 7006 CLUSTER REPLICATE $MASTER3

echo "Replication configured."
```

## CLUSTER MYSHARDID

### Basic Usage

```bash
CLUSTER MYSHARDID
# Returns: "f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2"
```

### Shard Identity in Redis 7.2+

In Redis 7.2, the concept of shards became more explicit. A shard is a group of nodes that collectively own a set of hash slots. The primary node and all its replicas share the same shard ID. This is distinct from the node ID, which is unique per node.

### Checking Shard Membership

```bash
# Get shard ID on master
redis-cli -h 127.0.0.1 -p 7001 CLUSTER MYSHARDID
# Returns: "abc123..."

# Get shard ID on replica
redis-cli -h 127.0.0.1 -p 7004 CLUSTER MYSHARDID
# Returns: "abc123..."  (same as master - they are in the same shard)
```

### Comparing Node ID vs Shard ID

```bash
# Node IDs are unique per node
redis-cli -h 127.0.0.1 -p 7001 CLUSTER MYID
# Returns: "a1b2c3..."

redis-cli -h 127.0.0.1 -p 7004 CLUSTER MYID
# Returns: "d4e5f6..."  (different)

# Shard IDs are shared within a shard group
redis-cli -h 127.0.0.1 -p 7001 CLUSTER MYSHARDID
# Returns: "shard1..."

redis-cli -h 127.0.0.1 -p 7004 CLUSTER MYSHARDID
# Returns: "shard1..."  (same - replica of 7001)
```

## Python Example

```python
import redis

r = redis.Redis(host='127.0.0.1', port=7001, decode_responses=True)

# Get node ID
node_id = r.execute_command('CLUSTER', 'MYID')
print(f"Node ID: {node_id}")

# Get shard ID (Redis 7.2+)
try:
    shard_id = r.execute_command('CLUSTER', 'MYSHARDID')
    print(f"Shard ID: {shard_id}")
except redis.ResponseError as e:
    print(f"MYSHARDID not supported (requires Redis 7.2+): {e}")
```

## Using Both in a Health Check Script

```python
import redis

def get_node_identity(host, port):
    r = redis.Redis(host=host, port=port, decode_responses=True)

    identity = {
        'node_id': r.execute_command('CLUSTER', 'MYID'),
        'host': host,
        'port': port,
    }

    try:
        identity['shard_id'] = r.execute_command('CLUSTER', 'MYSHARDID')
    except redis.ResponseError:
        identity['shard_id'] = None

    info = r.info('replication')
    identity['role'] = info.get('role')

    return identity

nodes = [
    ('127.0.0.1', 7001),
    ('127.0.0.1', 7002),
    ('127.0.0.1', 7004),
]

for host, port in nodes:
    ident = get_node_identity(host, port)
    print(f"{host}:{port} - Node: {ident['node_id'][:12]}... Shard: {str(ident.get('shard_id', 'N/A'))[:12]}... Role: {ident['role']}")
```

## Summary

`CLUSTER MYID` returns the unique identifier of the current Redis node and is essential for scripting cluster configuration tasks like `CLUSTER REPLICATE`. `CLUSTER MYSHARDID` (Redis 7.2+) returns the shard identifier shared by a primary and all its replicas, useful for understanding shard grouping in the cluster. Both commands are lightweight and safe to call frequently in automation scripts.
