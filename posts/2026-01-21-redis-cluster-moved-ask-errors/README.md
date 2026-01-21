# How to Troubleshoot Redis Cluster MOVED/ASK Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Redis Cluster, Troubleshooting, MOVED, ASK, Sharding

Description: A comprehensive guide to understanding and resolving Redis Cluster MOVED and ASK redirections, including client configuration, slot migration issues, and cluster topology problems.

---

Redis Cluster uses hash slots to distribute keys across nodes. When clients send commands to the wrong node, Redis responds with MOVED or ASK redirections. While these are normal parts of cluster operation, excessive redirections or unexpected errors can indicate configuration problems. This guide covers everything you need to know about troubleshooting these errors.

## Understanding MOVED and ASK Errors

### MOVED Redirections

A MOVED response indicates a permanent redirection:

```
(error) MOVED 12182 192.168.1.100:6379
```

This means:
- The requested key belongs to hash slot 12182
- That slot is permanently assigned to node 192.168.1.100:6379
- The client should update its slot mapping and retry

### ASK Redirections

An ASK response indicates a temporary redirection during slot migration:

```
(error) ASK 12182 192.168.1.101:6379
```

This means:
- Slot 12182 is being migrated to 192.168.1.101:6379
- The client should send an ASKING command, then retry the operation
- The client should NOT update its slot mapping

## Step 1: Check Cluster Health

First, verify the overall cluster state:

```bash
# Connect to any cluster node
redis-cli -c -h 192.168.1.100 -p 6379

# Check cluster status
CLUSTER INFO
```

Key fields to examine:

```
cluster_state:ok
cluster_slots_assigned:16384
cluster_slots_ok:16384
cluster_slots_pfail:0
cluster_slots_fail:0
cluster_known_nodes:6
cluster_size:3
```

If `cluster_state` is not `ok`, there is a fundamental cluster problem.

## Step 2: Examine Slot Distribution

Check how slots are distributed:

```bash
# View slot distribution
CLUSTER SLOTS

# More detailed view
CLUSTER NODES

# Check specific slot ownership
CLUSTER KEYSLOT mykey
CLUSTER GETKEYSINSLOT 12182 10
```

Example CLUSTER NODES output:

```
07c37dfeb235213a872192d90877d0cd55635b91 192.168.1.100:6379@16379 master - 0 1642531234567 1 connected 0-5460
67ed2db8d677e59ec4a4cde8e3c88cf1c5aabc38 192.168.1.101:6379@16379 master - 0 1642531234567 2 connected 5461-10922
e7d1eecce10fd6bb5eb35b9f99a514335d9ba9ca 192.168.1.102:6379@16379 master - 0 1642531234567 3 connected 10923-16383
```

## Step 3: Identify Stuck Migrations

ASK redirections during migrations are normal, but stuck migrations cause persistent issues:

```bash
# Check for migrating slots
CLUSTER NODES | grep -E "migrating|importing"

# Look for slots in migrating state
# Example output:
# [5461-<-67ed2db8d677e59ec4a4cde8e3c88cf1c5aabc38]
# [5461->-07c37dfeb235213a872192d90877d0cd55635b91]
```

### Fix Stuck Migration

```bash
# On the source node (has "migrating" state)
CLUSTER SETSLOT 5461 NODE <destination-node-id>

# On the destination node (has "importing" state)
CLUSTER SETSLOT 5461 NODE <destination-node-id>

# On all other nodes
CLUSTER SETSLOT 5461 NODE <destination-node-id>
```

Or use the redis-cli fix command:

```bash
redis-cli --cluster fix 192.168.1.100:6379
```

## Step 4: Handle Client Configuration Issues

### Using Cluster-Aware Clients

Many MOVED errors occur because the client is not cluster-aware:

```python
# WRONG - Standard Redis client doesn't handle redirections
import redis
r = redis.Redis(host='192.168.1.100', port=6379)
r.get('mykey')  # May get MOVED error

# CORRECT - Use Redis Cluster client
from redis.cluster import RedisCluster
rc = RedisCluster(
    host='192.168.1.100',
    port=6379,
    decode_responses=True
)
rc.get('mykey')  # Handles redirections automatically
```

### Node.js Example

```javascript
// WRONG - Standard ioredis client
const Redis = require('ioredis');
const redis = new Redis({ host: '192.168.1.100', port: 6379 });

// CORRECT - Use Cluster mode
const Redis = require('ioredis');
const cluster = new Redis.Cluster([
  { host: '192.168.1.100', port: 6379 },
  { host: '192.168.1.101', port: 6379 },
  { host: '192.168.1.102', port: 6379 }
]);
```

### Go Example

```go
package main

import (
    "context"
    "github.com/redis/go-redis/v9"
)

func main() {
    // CORRECT - Use Cluster client
    rdb := redis.NewClusterClient(&redis.ClusterOptions{
        Addrs: []string{
            "192.168.1.100:6379",
            "192.168.1.101:6379",
            "192.168.1.102:6379",
        },
    })

    ctx := context.Background()
    val, err := rdb.Get(ctx, "mykey").Result()
}
```

## Step 5: Debug Slot Mapping Issues

Sometimes clients have stale slot mappings:

```python
from redis.cluster import RedisCluster

rc = RedisCluster(host='192.168.1.100', port=6379)

# Force refresh of slot mappings
rc.cluster_slots()

# Check which node owns a specific key
def get_node_for_key(cluster, key):
    slot = cluster.keyslot(key)
    for node in cluster.get_nodes():
        node_slots = cluster.cluster_slots()
        # Find node responsible for this slot
        for slot_range in node_slots:
            if slot_range[0] <= slot <= slot_range[1]:
                return slot_range[2]
    return None

print(get_node_for_key(rc, 'mykey'))
```

## Step 6: Handle Multi-Key Operations

Multi-key operations require all keys to be on the same node:

```bash
# This fails if keys are on different nodes
MGET key1 key2 key3

# Error: CROSSSLOT Keys in request don't hash to the same slot
```

### Solution: Use Hash Tags

```python
from redis.cluster import RedisCluster

rc = RedisCluster(host='192.168.1.100', port=6379)

# Use hash tags to ensure keys go to same slot
# The part inside {} determines the slot
rc.set('{user:1000}:name', 'John')
rc.set('{user:1000}:email', 'john@example.com')
rc.set('{user:1000}:age', '30')

# Now MGET works because all keys hash to same slot
values = rc.mget('{user:1000}:name', '{user:1000}:email', '{user:1000}:age')
```

### Pipeline Operations

```python
# Cluster pipelines work but group commands by slot
pipe = rc.pipeline()
pipe.set('key1', 'value1')
pipe.set('key2', 'value2')
pipe.set('key3', 'value3')
results = pipe.execute()  # Commands grouped by slot automatically
```

## Step 7: Monitor Cluster Redirections

Create a monitoring script:

```python
import redis
from redis.cluster import RedisCluster
import time

def monitor_cluster_health(startup_nodes):
    """Monitor Redis Cluster for issues"""
    rc = RedisCluster(
        startup_nodes=startup_nodes,
        decode_responses=True
    )

    while True:
        try:
            # Check cluster info
            info = rc.cluster_info()

            print(f"Cluster State: {info['cluster_state']}")
            print(f"Slots Assigned: {info['cluster_slots_assigned']}")
            print(f"Slots OK: {info['cluster_slots_ok']}")
            print(f"Slots Fail: {info['cluster_slots_fail']}")

            if info['cluster_state'] != 'ok':
                alert_cluster_problem(info)

            # Check for migrating slots
            nodes_info = rc.cluster_nodes()
            for node_info in nodes_info.values():
                if 'migrating' in str(node_info) or 'importing' in str(node_info):
                    print(f"Migration in progress: {node_info}")

            # Check node health
            for node in rc.get_nodes():
                try:
                    node_client = node.redis_connection
                    node_client.ping()
                except Exception as e:
                    print(f"Node {node.host}:{node.port} unreachable: {e}")

        except Exception as e:
            print(f"Error monitoring cluster: {e}")

        time.sleep(30)

def alert_cluster_problem(info):
    """Send alert for cluster issues"""
    print(f"ALERT: Cluster problem detected - {info}")

if __name__ == '__main__':
    nodes = [
        {'host': '192.168.1.100', 'port': 6379},
        {'host': '192.168.1.101', 'port': 6379},
        {'host': '192.168.1.102', 'port': 6379}
    ]
    monitor_cluster_health(nodes)
```

## Step 8: Rebalance Slots

Uneven slot distribution can cause hot spots:

```bash
# Check current slot distribution
redis-cli --cluster info 192.168.1.100:6379

# Rebalance slots across nodes
redis-cli --cluster rebalance 192.168.1.100:6379

# Rebalance with specific weights
redis-cli --cluster rebalance 192.168.1.100:6379 \
  --cluster-weight <node1-id>=1 \
  --cluster-weight <node2-id>=1 \
  --cluster-weight <node3-id>=2
```

## Step 9: Handle Node Failures

When a master fails, replicas should take over:

```bash
# Check cluster nodes for failures
CLUSTER NODES | grep fail

# Manual failover from a replica
# Connect to the replica that should become master
redis-cli -h replica-host -p 6379
CLUSTER FAILOVER

# Force failover even if master is unreachable
CLUSTER FAILOVER FORCE

# Takeover (last resort - use when master and majority unreachable)
CLUSTER FAILOVER TAKEOVER
```

### Adding a New Node After Failure

```bash
# Add new node to cluster
redis-cli --cluster add-node \
  new-node-ip:6379 \
  existing-node-ip:6379

# Assign it as replica of a master
redis-cli --cluster add-node \
  new-node-ip:6379 \
  existing-node-ip:6379 \
  --cluster-slave \
  --cluster-master-id <master-node-id>
```

## Step 10: Implement Resilient Client Logic

Build resilience into your application:

```python
from redis.cluster import RedisCluster
from redis.exceptions import (
    ClusterDownError,
    MovedError,
    AskError,
    ConnectionError,
    TimeoutError
)
import time

class ResilientRedisCluster:
    def __init__(self, startup_nodes, max_retries=3):
        self.startup_nodes = startup_nodes
        self.max_retries = max_retries
        self.client = None
        self._connect()

    def _connect(self):
        """Connect to cluster with retry logic"""
        for attempt in range(self.max_retries):
            try:
                self.client = RedisCluster(
                    startup_nodes=self.startup_nodes,
                    decode_responses=True,
                    skip_full_coverage_check=True
                )
                return
            except Exception as e:
                if attempt == self.max_retries - 1:
                    raise
                time.sleep(2 ** attempt)

    def execute_with_retry(self, command, *args, **kwargs):
        """Execute command with automatic retry on cluster errors"""
        last_error = None

        for attempt in range(self.max_retries):
            try:
                method = getattr(self.client, command)
                return method(*args, **kwargs)

            except (MovedError, AskError):
                # Cluster client should handle these, but refresh just in case
                self.client.cluster_slots()
                continue

            except ClusterDownError:
                # Cluster is down, wait and retry
                time.sleep(2 ** attempt)
                self._connect()
                continue

            except (ConnectionError, TimeoutError) as e:
                last_error = e
                time.sleep(1)
                continue

        raise last_error or Exception("Max retries exceeded")

    def get(self, key):
        return self.execute_with_retry('get', key)

    def set(self, key, value, **kwargs):
        return self.execute_with_retry('set', key, value, **kwargs)

# Usage
nodes = [
    {'host': '192.168.1.100', 'port': 6379},
    {'host': '192.168.1.101', 'port': 6379}
]

rc = ResilientRedisCluster(nodes)
rc.set('mykey', 'myvalue')
value = rc.get('mykey')
```

## Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Persistent MOVED errors | Non-cluster client | Use cluster-aware client |
| Frequent ASK errors | Ongoing migration | Wait for migration to complete |
| CROSSSLOT error | Keys on different nodes | Use hash tags |
| CLUSTERDOWN error | Cluster lost quorum | Check node health, fix failures |
| Stale slot mapping | Client cache outdated | Force refresh of slot mapping |
| Stuck migration | Migration interrupted | Use `CLUSTER FIX` command |

## Prevention Best Practices

1. **Use cluster-aware clients** that handle redirections automatically
2. **Design keys with hash tags** for related data that needs multi-key operations
3. **Monitor cluster health** with automated alerts
4. **Test failover scenarios** before production
5. **Keep nodes balanced** with regular rebalancing
6. **Use sufficient replicas** (at least 1 per master)
7. **Implement retry logic** in application code

## Conclusion

MOVED and ASK errors are fundamental to how Redis Cluster operates - they enable horizontal scaling while maintaining data locality. The key to handling them properly is:

1. Using cluster-aware client libraries
2. Understanding the difference between MOVED (permanent) and ASK (temporary)
3. Monitoring for stuck migrations or unhealthy nodes
4. Designing your key schema to work with slot distribution

With proper client configuration and monitoring, your application can seamlessly work with Redis Cluster's distributed architecture without being impacted by these redirections.
