# How to Deploy Redis Sentinel via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Redis, Sentinel, High Availability, Cache, Failover

Description: Learn how to deploy Redis with Sentinel for automatic failover and high availability using Portainer stacks.

---

Redis Sentinel monitors your Redis primary, detects failures, and automatically promotes a replica. This guide deploys one primary, two replicas, and three Sentinel instances as a Portainer stack.

## Stack Definition

```yaml
version: "3.8"

services:
  redis-primary:
    image: redis:7.2-alpine
    command: redis-server --requirepass redispassword --masterauth redispassword
    volumes:
      - redis_primary_data:/data
    networks:
      - redis_net
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "redispassword", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis-replica1:
    image: redis:7.2-alpine
    command: >
      redis-server
      --requirepass redispassword
      --masterauth redispassword
      --replicaof redis-primary 6379
    volumes:
      - redis_replica1_data:/data
    networks:
      - redis_net
    depends_on:
      redis-primary:
        condition: service_healthy

  redis-replica2:
    image: redis:7.2-alpine
    command: >
      redis-server
      --requirepass redispassword
      --masterauth redispassword
      --replicaof redis-primary 6379
    volumes:
      - redis_replica2_data:/data
    networks:
      - redis_net
    depends_on:
      redis-primary:
        condition: service_healthy

  sentinel1:
    image: redis:7.2-alpine
    command: >
      redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - /data/redis-sentinel/sentinel1:/etc/redis
    networks:
      - redis_net
    depends_on:
      - redis-primary
      - redis-replica1
      - redis-replica2

  sentinel2:
    image: redis:7.2-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - /data/redis-sentinel/sentinel2:/etc/redis
    networks:
      - redis_net
    depends_on:
      - redis-primary

  sentinel3:
    image: redis:7.2-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - /data/redis-sentinel/sentinel3:/etc/redis
    networks:
      - redis_net
    depends_on:
      - redis-primary

volumes:
  redis_primary_data:
  redis_replica1_data:
  redis_replica2_data:

networks:
  redis_net:
    driver: bridge
```

## Sentinel Configuration Files

Create `/data/redis-sentinel/sentinel1/sentinel.conf`, `/data/redis-sentinel/sentinel2/sentinel.conf`, and `/data/redis-sentinel/sentinel3/sentinel.conf` on the Docker host before deploying. Each file should have the same contents, and the mounted directories must be writable by the `redis` user in the container:

```conf
sentinel resolve-hostnames yes
sentinel monitor mymaster redis-primary 6379 2
sentinel auth-pass mymaster redispassword
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 10000
sentinel parallel-syncs mymaster 1
```

The quorum value `2` means at least two Sentinels must agree that the primary is down before it is marked objectively down; the failover itself still requires authorization from a Sentinel majority.

## Verifying the Setup

Check Sentinel state from any sentinel container:

```bash
docker exec -it $(docker ps -qf name=sentinel1) \
  redis-cli -p 26379 sentinel masters

# Check replication state on the primary

docker exec -it $(docker ps -qf name=redis-primary) \
  redis-cli -a redispassword info replication
```

Expected replication info shows `role:master` with `connected_slaves:2`.

## Connecting Your Application

Use a Sentinel-aware Redis client that automatically follows primary promotions:

```python
# Python with redis-py
from redis.sentinel import Sentinel

sentinel = Sentinel(
    [('sentinel1', 26379), ('sentinel2', 26379), ('sentinel3', 26379)],
    socket_timeout=0.1,
    password='redispassword'
)

master = sentinel.master_for('mymaster', socket_timeout=0.1)
slave  = sentinel.slave_for('mymaster',  socket_timeout=0.1)

master.set('key', 'value')
value = master.get('key')
slave.ping()
```

## Testing Failover

Simulate a primary failure and observe Sentinel promoting a replica:

```bash
# Stop the primary
docker stop $(docker ps -qf name=redis-primary)

# Watch Sentinel logs for failover event
docker logs -f $(docker ps -qf name=sentinel1) 2>&1 | grep "switch-master"

# After failover completes, query which node is now primary
docker exec -it $(docker ps -qf name=sentinel1) \
  redis-cli -p 26379 sentinel get-master-addr-by-name mymaster
```
