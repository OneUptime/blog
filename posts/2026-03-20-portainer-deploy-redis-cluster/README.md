# How to Deploy Redis Cluster via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Redis, Redis Cluster, High Availability, Self-Hosted

Description: Deploy a Redis Cluster with 6 nodes (3 primaries and 3 replicas) via Portainer for horizontally scaled, highly available Redis deployments.

## Introduction

Redis Cluster provides horizontal scaling and automatic failover across multiple Redis nodes. For deployment, Redis strongly recommends a 6-node cluster: 3 primaries handling different key slots, and 3 replicas for failover. This guide deploys a complete Redis Cluster using Portainer stacks.

## Prerequisites

- Docker host with Portainer installed
- Ports 6379-6384 and 16379-16384 available

## Deploy the Redis Cluster Stack

In Portainer, create a stack named `redis-cluster`:

```yaml
version: "3.8"

services:
  # Primary nodes
  redis-1:
    image: redis:7.2-alpine
    container_name: redis-1
    command: >
      redis-server
      --cluster-enabled yes
      --cluster-config-file /data/nodes.conf
      --cluster-node-timeout 5000
      --appendonly yes
      --requirepass cluster_password
      --masterauth cluster_password
      --bind 0.0.0.0
    ports:
      - "6379:6379"
      - "16379:16379"
    volumes:
      - redis1_data:/data
    networks:
      - redis-cluster-network
    restart: unless-stopped

  redis-2:
    image: redis:7.2-alpine
    container_name: redis-2
    command: >
      redis-server
      --cluster-enabled yes
      --cluster-config-file /data/nodes.conf
      --cluster-node-timeout 5000
      --appendonly yes
      --requirepass cluster_password
      --masterauth cluster_password
      --bind 0.0.0.0
    ports:
      - "6380:6379"
      - "16380:16379"
    volumes:
      - redis2_data:/data
    networks:
      - redis-cluster-network
    restart: unless-stopped

  redis-3:
    image: redis:7.2-alpine
    container_name: redis-3
    command: >
      redis-server
      --cluster-enabled yes
      --cluster-config-file /data/nodes.conf
      --cluster-node-timeout 5000
      --appendonly yes
      --requirepass cluster_password
      --masterauth cluster_password
      --bind 0.0.0.0
    ports:
      - "6381:6379"
      - "16381:16379"
    volumes:
      - redis3_data:/data
    networks:
      - redis-cluster-network
    restart: unless-stopped

  redis-4:
    image: redis:7.2-alpine
    container_name: redis-4
    command: >
      redis-server
      --cluster-enabled yes
      --cluster-config-file /data/nodes.conf
      --cluster-node-timeout 5000
      --appendonly yes
      --requirepass cluster_password
      --masterauth cluster_password
      --bind 0.0.0.0
    ports:
      - "6382:6379"
      - "16382:16379"
    volumes:
      - redis4_data:/data
    networks:
      - redis-cluster-network
    restart: unless-stopped

  redis-5:
    image: redis:7.2-alpine
    container_name: redis-5
    command: >
      redis-server
      --cluster-enabled yes
      --cluster-config-file /data/nodes.conf
      --cluster-node-timeout 5000
      --appendonly yes
      --requirepass cluster_password
      --masterauth cluster_password
      --bind 0.0.0.0
    ports:
      - "6383:6379"
      - "16383:16379"
    volumes:
      - redis5_data:/data
    networks:
      - redis-cluster-network
    restart: unless-stopped

  redis-6:
    image: redis:7.2-alpine
    container_name: redis-6
    command: >
      redis-server
      --cluster-enabled yes
      --cluster-config-file /data/nodes.conf
      --cluster-node-timeout 5000
      --appendonly yes
      --requirepass cluster_password
      --masterauth cluster_password
      --bind 0.0.0.0
    ports:
      - "6384:6379"
      - "16384:16379"
    volumes:
      - redis6_data:/data
    networks:
      - redis-cluster-network
    restart: unless-stopped

  # Cluster initialization container
  cluster-init:
    image: redis:7.2-alpine
    container_name: cluster-init
    depends_on:
      - redis-1
      - redis-2
      - redis-3
      - redis-4
      - redis-5
      - redis-6
    command: >
      sh -c "
        for node in redis-1 redis-2 redis-3 redis-4 redis-5 redis-6; do
          until redis-cli -h $$node -p 6379 -a cluster_password ping >/dev/null 2>&1; do
            sleep 1;
          done;
        done &&
        redis-cli -a cluster_password --cluster create
        redis-1:6379 redis-2:6379 redis-3:6379
        redis-4:6379 redis-5:6379 redis-6:6379
        --cluster-replicas 1
        --cluster-yes
      "
    networks:
      - redis-cluster-network

networks:
  redis-cluster-network:
    driver: bridge

volumes:
  redis1_data:
  redis2_data:
  redis3_data:
  redis4_data:
  redis5_data:
  redis6_data:
```

## Initialize the Cluster

After deploying the stack, the `cluster-init` container automatically runs the cluster creation command. Monitor its logs in Portainer to confirm successful initialization.

```bash
# Verify cluster status

docker exec redis-1 redis-cli -a cluster_password CLUSTER INFO

# View cluster nodes
docker exec redis-1 redis-cli -a cluster_password CLUSTER NODES
```

Expected output:
```text
cluster_enabled:1
cluster_state:ok
cluster_slots_assigned:16384
cluster_known_nodes:6
cluster_size:3
```

## Connecting Applications to Redis Cluster

If your application runs on the same Docker network, use the Redis service names on port `6379` with a Redis Cluster-aware client:

```javascript
// Node.js with ioredis
const Redis = require('ioredis');

const cluster = new Redis.Cluster([
  { host: 'redis-1', port: 6379 },
  { host: 'redis-2', port: 6379 },
  { host: 'redis-3', port: 6379 },
], {
  redisOptions: {
    password: 'cluster_password'
  }
});
```

```python
# Python with redis-py
from redis.cluster import RedisCluster

rc = RedisCluster(
    host="redis-1",
    port=6379,
    password="cluster_password"
)
```

## Testing Failover

```bash
# Get cluster status
docker exec redis-1 redis-cli -a cluster_password CLUSTER INFO

# Simulate a primary failure
docker stop redis-1

# Wait for failover (should complete within 5-10 seconds)
docker exec redis-2 redis-cli -a cluster_password CLUSTER INFO

# Restart the node (it will rejoin as a replica)
docker start redis-1
```

## Conclusion

Redis Cluster deployed via Portainer provides horizontal scaling and automatic failover for high-traffic applications. The 6-node configuration allows the cluster to remain available after the loss of a single node, and if a primary fails its replica can be promoted automatically. Portainer's stack management makes it easy to update all cluster nodes simultaneously during maintenance windows.
