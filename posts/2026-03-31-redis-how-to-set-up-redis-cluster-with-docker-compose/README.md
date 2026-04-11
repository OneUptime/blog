# How to Set Up Redis Cluster with Docker Compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Docker Compose, Redis Cluster, Container, Development

Description: Learn how to set up a Redis Cluster with Docker Compose for local development and testing, including initialization, configuration, and client connection setup.

---

## What Is Redis Cluster

Redis Cluster distributes data across multiple nodes, each owning a subset of the 16384 hash slots. A minimal cluster needs 3 primary nodes and optionally 3 replicas for high availability. Docker Compose makes it easy to run this locally for development and integration testing.

## Docker Compose Configuration

Create a docker-compose.yml with 6 Redis nodes (3 primaries, 3 replicas):

```yaml
version: '3.8'

networks:
  redis-cluster-net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

services:
  redis-node-1:
    image: redis:7-alpine
    container_name: redis-node-1
    command: >
      redis-server
      --port 7001
      --cluster-enabled yes
      --cluster-config-file nodes.conf
      --cluster-node-timeout 5000
      --appendonly yes
      --save ""
    ports:
      - "7001:7001"
    networks:
      redis-cluster-net:
        ipv4_address: 172.20.0.11
    volumes:
      - redis-node-1:/data

  redis-node-2:
    image: redis:7-alpine
    container_name: redis-node-2
    command: >
      redis-server
      --port 7002
      --cluster-enabled yes
      --cluster-config-file nodes.conf
      --cluster-node-timeout 5000
      --appendonly yes
      --save ""
    ports:
      - "7002:7002"
    networks:
      redis-cluster-net:
        ipv4_address: 172.20.0.12
    volumes:
      - redis-node-2:/data

  redis-node-3:
    image: redis:7-alpine
    container_name: redis-node-3
    command: >
      redis-server
      --port 7003
      --cluster-enabled yes
      --cluster-config-file nodes.conf
      --cluster-node-timeout 5000
      --appendonly yes
      --save ""
    ports:
      - "7003:7003"
    networks:
      redis-cluster-net:
        ipv4_address: 172.20.0.13
    volumes:
      - redis-node-3:/data

  redis-node-4:
    image: redis:7-alpine
    container_name: redis-node-4
    command: >
      redis-server
      --port 7004
      --cluster-enabled yes
      --cluster-config-file nodes.conf
      --cluster-node-timeout 5000
      --appendonly yes
      --save ""
    ports:
      - "7004:7004"
    networks:
      redis-cluster-net:
        ipv4_address: 172.20.0.14
    volumes:
      - redis-node-4:/data

  redis-node-5:
    image: redis:7-alpine
    container_name: redis-node-5
    command: >
      redis-server
      --port 7005
      --cluster-enabled yes
      --cluster-config-file nodes.conf
      --cluster-node-timeout 5000
      --appendonly yes
      --save ""
    ports:
      - "7005:7005"
    networks:
      redis-cluster-net:
        ipv4_address: 172.20.0.15
    volumes:
      - redis-node-5:/data

  redis-node-6:
    image: redis:7-alpine
    container_name: redis-node-6
    command: >
      redis-server
      --port 7006
      --cluster-enabled yes
      --cluster-config-file nodes.conf
      --cluster-node-timeout 5000
      --appendonly yes
      --save ""
    ports:
      - "7006:7006"
    networks:
      redis-cluster-net:
        ipv4_address: 172.20.0.16
    volumes:
      - redis-node-6:/data

  redis-cluster-init:
    image: redis:7-alpine
    container_name: redis-cluster-init
    command: >
      redis-cli
      --cluster create
      172.20.0.11:7001 172.20.0.12:7002 172.20.0.13:7003
      172.20.0.14:7004 172.20.0.15:7005 172.20.0.16:7006
      --cluster-replicas 1
      --cluster-yes
    networks:
      - redis-cluster-net
    depends_on:
      - redis-node-1
      - redis-node-2
      - redis-node-3
      - redis-node-4
      - redis-node-5
      - redis-node-6

volumes:
  redis-node-1:
  redis-node-2:
  redis-node-3:
  redis-node-4:
  redis-node-5:
  redis-node-6:
```

## Starting the Cluster

```bash
# Start all nodes
docker-compose up -d

# Wait a few seconds for nodes to start
sleep 5

# Run cluster initialization
docker-compose run --rm redis-cluster-init

# Check cluster status
redis-cli -p 7001 CLUSTER INFO
redis-cli -p 7001 CLUSTER NODES
```

Expected cluster info output:

```text
cluster_enabled:1
cluster_state:ok
cluster_slots_assigned:16384
cluster_slots_ok:16384
cluster_known_nodes:6
cluster_size:3
```

## Connecting from Applications

Use a cluster-aware client:

```python
from redis.cluster import RedisCluster, ClusterNode

startup_nodes = [
    ClusterNode("localhost", 7001),
    ClusterNode("localhost", 7002),
    ClusterNode("localhost", 7003),
]

cluster = RedisCluster(
    startup_nodes=startup_nodes,
    decode_responses=True,
    skip_full_coverage_check=False
)

# Test operations
cluster.set("foo", "bar")
print(cluster.get("foo"))  # bar

# Multi-key operations must use hash tags to ensure same slot
cluster.set("{user:1}:name", "Alice")
cluster.set("{user:1}:email", "alice@example.com")
# Both keys hash to the same slot due to {user:1} hash tag
```

Node.js cluster client:

```javascript
const Redis = require('ioredis');

const cluster = new Redis.Cluster([
  { host: 'localhost', port: 7001 },
  { host: 'localhost', port: 7002 },
  { host: 'localhost', port: 7003 },
], {
  redisOptions: {
    enableReadyCheck: true,
  },
  clusterRetryStrategy: (times) => Math.min(100 * times, 2000),
});

cluster.set('foo', 'bar').then(() => {
  return cluster.get('foo');
}).then((result) => {
  console.log(result); // bar
  cluster.disconnect();
});
```

## Verifying Slot Distribution

```bash
# Check slot distribution across nodes
redis-cli --cluster info 127.0.0.1:7001

# Check which slot a key maps to
redis-cli -p 7001 CLUSTER KEYSLOT mykey
redis-cli -p 7001 CLUSTER KEYSLOT "user:123"
```

## Adding Data and Testing Distribution

```bash
# Load some data to verify distribution
for i in $(seq 1 100); do
  redis-cli -p 7001 -c SET "key:$i" "value:$i"
done

# Check key count per node
redis-cli --cluster info 127.0.0.1:7001
```

The `-c` flag enables cluster mode in redis-cli, allowing it to follow MOVED redirects automatically.

## Cleanup and Reset

```bash
# Stop and remove all containers
docker-compose down

# Remove volumes (deletes all data)
docker-compose down -v

# Restart fresh
docker-compose up -d
```

## Health Check Script

```bash
#!/bin/bash
echo "=== Redis Cluster Health Check ==="
for port in 7001 7002 7003 7004 7005 7006; do
  echo -n "Node $port: "
  redis-cli -p $port PING 2>/dev/null || echo "UNREACHABLE"
done

echo ""
echo "=== Cluster Info ==="
redis-cli -p 7001 CLUSTER INFO | grep -E "cluster_state|cluster_slots|cluster_size"

echo ""
echo "=== Slot Distribution ==="
redis-cli --cluster info 127.0.0.1:7001
```

## Summary

Setting up a Redis Cluster with Docker Compose requires defining 6 containers (3 primaries, 3 replicas) in a shared network with fixed IP addresses, then running redis-cli --cluster create to initialize slot assignments and replica relationships. Always use cluster-aware clients that handle MOVED redirects automatically, and use hash tags (curly braces) to co-locate related keys on the same slot for multi-key operations. The docker-compose setup is ideal for local development and integration testing with no infrastructure dependencies.
