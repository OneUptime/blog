# How to Deploy Redis Cluster via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Redis, Cluster, High Availability, Docker

Description: Learn how to deploy a Redis Cluster with multiple nodes via Portainer for high availability, horizontal scaling, and automatic failover.

## Redis Cluster Architecture

Redis Cluster distributes data across multiple nodes using hash slots. A production deployment is typically 6 nodes: 3 primaries and 3 replicas. The minimum cluster that works as expected requires at least 3 primary nodes.

```text
Primary 1 (slots 0-5460)      ← Replica 1
Primary 2 (slots 5461-10922)  ← Replica 2
Primary 3 (slots 10923-16383) ← Replica 3
```

## Redis Cluster Stack via Portainer

**Stacks → Add Stack → redis-cluster**

```yaml
services:
  redis-1:
    image: redis:7.2-alpine
    restart: unless-stopped
    command: >
      redis-server
      --port 7001
      --cluster-enabled yes
      --cluster-config-file /data/nodes.conf
      --cluster-node-timeout 5000
      --appendonly yes
      --requirepass your-cluster-password
      --masterauth your-cluster-password
      --bind 0.0.0.0
      --protected-mode no
      --dir /data
    volumes:
      - redis1_data:/data

  redis-2:
    image: redis:7.2-alpine
    restart: unless-stopped
    command: >
      redis-server
      --port 7001
      --cluster-enabled yes
      --cluster-config-file /data/nodes.conf
      --cluster-node-timeout 5000
      --appendonly yes
      --requirepass your-cluster-password
      --masterauth your-cluster-password
      --bind 0.0.0.0
      --protected-mode no
      --dir /data
    volumes:
      - redis2_data:/data

  redis-3:
    image: redis:7.2-alpine
    restart: unless-stopped
    command: >
      redis-server
      --port 7001
      --cluster-enabled yes
      --cluster-config-file /data/nodes.conf
      --cluster-node-timeout 5000
      --appendonly yes
      --requirepass your-cluster-password
      --masterauth your-cluster-password
      --bind 0.0.0.0
      --protected-mode no
      --dir /data
    volumes:
      - redis3_data:/data

  redis-4:
    image: redis:7.2-alpine
    restart: unless-stopped
    command: >
      redis-server
      --port 7001
      --cluster-enabled yes
      --cluster-config-file /data/nodes.conf
      --cluster-node-timeout 5000
      --appendonly yes
      --requirepass your-cluster-password
      --masterauth your-cluster-password
      --bind 0.0.0.0
      --protected-mode no
      --dir /data
    volumes:
      - redis4_data:/data

  redis-5:
    image: redis:7.2-alpine
    restart: unless-stopped
    command: >
      redis-server
      --port 7001
      --cluster-enabled yes
      --cluster-config-file /data/nodes.conf
      --cluster-node-timeout 5000
      --appendonly yes
      --requirepass your-cluster-password
      --masterauth your-cluster-password
      --bind 0.0.0.0
      --protected-mode no
      --dir /data
    volumes:
      - redis5_data:/data

  redis-6:
    image: redis:7.2-alpine
    restart: unless-stopped
    command: >
      redis-server
      --port 7001
      --cluster-enabled yes
      --cluster-config-file /data/nodes.conf
      --cluster-node-timeout 5000
      --appendonly yes
      --requirepass your-cluster-password
      --masterauth your-cluster-password
      --bind 0.0.0.0
      --protected-mode no
      --dir /data
    volumes:
      - redis6_data:/data

volumes:
  redis1_data:
  redis2_data:
  redis3_data:
  redis4_data:
  redis5_data:
  redis6_data:
```

## Redis Cluster Configuration File

The stack above passes these settings inline. If you prefer a `redis-cluster.conf` file, use the equivalent configuration below:

```text
# redis-cluster.conf

port 7001
cluster-enabled yes
cluster-config-file /data/nodes.conf
cluster-node-timeout 5000
appendonly yes
requirepass your-cluster-password
masterauth your-cluster-password
bind 0.0.0.0
protected-mode no
dir /data
```

## Initialize the Cluster

After deploying the stack, initialize the cluster from one of the nodes:

```bash
# Via Portainer exec on redis-1 container
redis-cli -a your-cluster-password \
  --cluster create \
  redis-1:7001 redis-2:7001 redis-3:7001 \
  redis-4:7001 redis-5:7001 redis-6:7001 \
  --cluster-replicas 1 \
  --cluster-yes
```

## Verify Cluster Status

```bash
redis-cli -a your-cluster-password \
  -h redis-1 -p 7001 \
  cluster info

# Expected: cluster_state:ok, cluster_slots_assigned:16384
```

## Connecting Applications to Redis Cluster

```yaml
services:
  app:
    environment:
      # Most Redis clients accept a seed list of cluster nodes
      - REDIS_CLUSTER_NODES=redis-1:7001,redis-2:7001,redis-3:7001
      - REDIS_PASSWORD=your-cluster-password
```

For Node.js (ioredis):

```javascript
const Redis = require('ioredis');
const cluster = new Redis.Cluster([
  { port: 7001, host: 'redis-1' },
  { port: 7001, host: 'redis-2' },
  { port: 7001, host: 'redis-3' },
], {
  redisOptions: { password: process.env.REDIS_PASSWORD }
});
```

## Simpler Alternative: Redis Sentinel

For failover without data sharding, Redis Sentinel is simpler. You still need at least three Sentinel instances and a writable `sentinel.conf` mounted into each one:

```yaml
services:
  redis-primary:
    image: redis:7.2-alpine

  redis-replica:
    image: redis:7.2-alpine
    command: redis-server --replicaof redis-primary 6379

  sentinel-1:
    image: redis:7.2-alpine
    command: redis-server /etc/redis/sentinel.conf --sentinel
    volumes:
      - /absolute/path/on/host/sentinel-1.conf:/etc/redis/sentinel.conf

  sentinel-2:
    image: redis:7.2-alpine
    command: redis-server /etc/redis/sentinel.conf --sentinel
    volumes:
      - /absolute/path/on/host/sentinel-2.conf:/etc/redis/sentinel.conf

  sentinel-3:
    image: redis:7.2-alpine
    command: redis-server /etc/redis/sentinel.conf --sentinel
    volumes:
      - /absolute/path/on/host/sentinel-3.conf:/etc/redis/sentinel.conf
```

## Conclusion

Redis Cluster via Portainer provides horizontal scaling and high availability for production cache workloads. For most small-to-medium applications, Redis Sentinel (a primary, one or more replicas, and at least three Sentinel instances) is simpler to configure and sufficient for failover needs. Use full cluster mode when you need data partitioning across multiple nodes for capacity or performance.
