# How to Deploy a Redis Sentinel Setup via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Redis, Sentinel, High Availability, Caching

Description: Deploy a Redis Sentinel high-availability setup with automatic failover using Docker and Portainer for resilient caching.

## Introduction

Redis Sentinel provides automatic failover for Redis. It monitors Redis instances, detects failures, and automatically promotes a replica to primary when needed. This guide deploys a 1 primary + 2 replica Redis setup with 3 Sentinel processes, all managed through Portainer.

## Step 1: Deploy Redis Sentinel Stack

```yaml
# docker-compose.yml - Redis with Sentinel

version: "3.8"

networks:
  redis_net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.31.0.0/24

volumes:
  redis_master_data:
  redis_replica1_data:
  redis_replica2_data:
  redis_sentinel1_data:
  redis_sentinel2_data:
  redis_sentinel3_data:

services:
  # Redis Master
  redis_master:
    image: redis:7-alpine
    container_name: redis_master
    restart: unless-stopped
    hostname: redis_master
    networks:
      redis_net:
        ipv4_address: 172.31.0.10
    ports:
      - "6379:6379"
    command: >
      redis-server
      --requirepass redis_master_password
      --masterauth redis_master_password
      --appendonly yes
      --appendfsync everysec
    volumes:
      - redis_master_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "redis_master_password", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  # Redis Replica 1
  redis_replica1:
    image: redis:7-alpine
    container_name: redis_replica1
    restart: unless-stopped
    hostname: redis_replica1
    networks:
      redis_net:
        ipv4_address: 172.31.0.11
    ports:
      - "6380:6379"
    command: >
      redis-server
      --requirepass redis_master_password
      --masterauth redis_master_password
      --replicaof redis_master 6379
      --appendonly yes
    volumes:
      - redis_replica1_data:/data
    depends_on:
      redis_master:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "redis_master_password", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  # Redis Replica 2
  redis_replica2:
    image: redis:7-alpine
    container_name: redis_replica2
    restart: unless-stopped
    hostname: redis_replica2
    networks:
      redis_net:
        ipv4_address: 172.31.0.12
    ports:
      - "6381:6379"
    command: >
      redis-server
      --requirepass redis_master_password
      --masterauth redis_master_password
      --replicaof redis_master 6379
      --appendonly yes
    volumes:
      - redis_replica2_data:/data
    depends_on:
      redis_master:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "redis_master_password", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  # Sentinel 1
  redis_sentinel1:
    image: redis:7-alpine
    container_name: redis_sentinel1
    restart: unless-stopped
    hostname: redis_sentinel1
    networks:
      redis_net:
        ipv4_address: 172.31.0.20
    ports:
      - "26379:26379"
    volumes:
      - redis_sentinel1_data:/data
    command: >
      sh -c "
        if [ ! -f /data/sentinel.conf ]; then
          echo 'port 26379' > /data/sentinel.conf &&
          echo 'requirepass redis_master_password' >> /data/sentinel.conf &&
          echo 'sentinel monitor mymaster 172.31.0.10 6379 2' >> /data/sentinel.conf &&
          echo 'sentinel auth-pass mymaster redis_master_password' >> /data/sentinel.conf &&
          echo 'sentinel down-after-milliseconds mymaster 5000' >> /data/sentinel.conf &&
          echo 'sentinel failover-timeout mymaster 60000' >> /data/sentinel.conf &&
          echo 'sentinel parallel-syncs mymaster 1' >> /data/sentinel.conf;
        fi &&
        redis-sentinel /data/sentinel.conf
      "
    depends_on:
      - redis_master
      - redis_replica1
      - redis_replica2

  # Sentinel 2
  redis_sentinel2:
    image: redis:7-alpine
    container_name: redis_sentinel2
    restart: unless-stopped
    hostname: redis_sentinel2
    networks:
      redis_net:
        ipv4_address: 172.31.0.21
    ports:
      - "26380:26379"
    volumes:
      - redis_sentinel2_data:/data
    command: >
      sh -c "
        if [ ! -f /data/sentinel.conf ]; then
          echo 'port 26379' > /data/sentinel.conf &&
          echo 'requirepass redis_master_password' >> /data/sentinel.conf &&
          echo 'sentinel monitor mymaster 172.31.0.10 6379 2' >> /data/sentinel.conf &&
          echo 'sentinel auth-pass mymaster redis_master_password' >> /data/sentinel.conf &&
          echo 'sentinel down-after-milliseconds mymaster 5000' >> /data/sentinel.conf &&
          echo 'sentinel failover-timeout mymaster 60000' >> /data/sentinel.conf &&
          echo 'sentinel parallel-syncs mymaster 1' >> /data/sentinel.conf;
        fi &&
        redis-sentinel /data/sentinel.conf
      "
    depends_on:
      - redis_master

  # Sentinel 3
  redis_sentinel3:
    image: redis:7-alpine
    container_name: redis_sentinel3
    restart: unless-stopped
    hostname: redis_sentinel3
    networks:
      redis_net:
        ipv4_address: 172.31.0.22
    ports:
      - "26381:26379"
    volumes:
      - redis_sentinel3_data:/data
    command: >
      sh -c "
        if [ ! -f /data/sentinel.conf ]; then
          echo 'port 26379' > /data/sentinel.conf &&
          echo 'requirepass redis_master_password' >> /data/sentinel.conf &&
          echo 'sentinel monitor mymaster 172.31.0.10 6379 2' >> /data/sentinel.conf &&
          echo 'sentinel auth-pass mymaster redis_master_password' >> /data/sentinel.conf &&
          echo 'sentinel down-after-milliseconds mymaster 5000' >> /data/sentinel.conf &&
          echo 'sentinel failover-timeout mymaster 60000' >> /data/sentinel.conf &&
          echo 'sentinel parallel-syncs mymaster 1' >> /data/sentinel.conf;
        fi &&
        redis-sentinel /data/sentinel.conf
      "
    depends_on:
      - redis_master

  # Redis Insight - UI for Redis
  redis_insight:
    image: redis/redisinsight:latest
    container_name: redis_insight
    restart: unless-stopped
    ports:
      - "5540:5540"
    networks:
      - redis_net
```

## Step 2: Verify Replication Status

```bash
# Check replication status on master
docker exec redis_master redis-cli -a redis_master_password INFO replication

# Output should show:
# role:master
# connected_slaves:2
# slave0:ip=172.31.0.11,...

# Check replica status
docker exec redis_replica1 redis-cli -a redis_master_password INFO replication
# role:slave
# master_host:redis_master

# Check sentinel status
docker exec redis_sentinel1 redis-cli -p 26379 -a redis_master_password INFO sentinel
```

## Step 3: Connect Applications via Sentinel

```python
# Python with redis-py Sentinel support from another container on redis_net
from redis.sentinel import Sentinel

# Connect to Sentinel (NOT directly to Redis master)
sentinel = Sentinel(
    [
        ('redis_sentinel1', 26379),
        ('redis_sentinel2', 26379),
        ('redis_sentinel3', 26379),
    ],
    socket_timeout=0.1,
    password='redis_master_password',
    sentinel_kwargs={'password': 'redis_master_password', 'socket_timeout': 0.1},
)

# Get master connection (for writes)
master = sentinel.master_for('mymaster', socket_timeout=0.1)

# Get replica connection (for reads)
replica = sentinel.slave_for('mymaster', socket_timeout=0.1)

# Use as normal Redis connections
master.set('key', 'value')
# Replica reads are eventually consistent, so this may lag briefly behind the write
value = replica.get('key')
print(value)
```

```javascript
// Node.js with ioredis Sentinel support from another container on redis_net
const Redis = require('ioredis');

const redis = new Redis({
  sentinels: [
    { host: 'redis_sentinel1', port: 26379 },
    { host: 'redis_sentinel2', port: 26379 },
    { host: 'redis_sentinel3', port: 26379 },
  ],
  name: 'mymaster',
  password: 'redis_master_password',
  sentinelPassword: 'redis_master_password',
  role: 'master',
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

await redis.set('key', 'value');
```

## Step 4: Test Failover

```bash
# Simulate master failure
docker pause redis_master

# Watch sentinel logs (in another terminal)
docker logs -f redis_sentinel1

# After the failure is detected, Sentinel promotes one of the replicas
# Check which node Sentinel now considers the master
docker exec redis_sentinel1 redis-cli -p 26379 -a redis_master_password SENTINEL get-master-addr-by-name mymaster
# Output should be 172.31.0.11 or 172.31.0.12

# Restore original master (rejoins as replica)
docker unpause redis_master

# Verify cluster is healthy
docker exec redis_sentinel1 redis-cli -p 26379 -a redis_master_password SENTINEL masters
```

## Step 5: Monitor in Portainer

Use Portainer to monitor your Redis Sentinel cluster:
- View all 7 containers (3 Redis, 3 Sentinel, and Redis Insight) in Containers view
- Check container health indicators
- View logs to see failover events

```bash
# Check sentinel for failover events
docker logs redis_sentinel1 | grep "odown\|sdown\|failover"
```

## Conclusion

Your Redis Sentinel setup provides automatic failover with a brief period of write unavailability while a replica is promoted. With three Sentinel instances and a quorum of 2, failover only proceeds once enough Sentinels mark the master down and a majority can authorize the failover. Applications using the Sentinel-aware Redis clients automatically discover the new master. Portainer makes it easy to monitor all seven containers and observe failover events in the logs.
