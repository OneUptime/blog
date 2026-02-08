# How to Run Dragonfly in Docker (Redis-Compatible Cache)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Dragonfly, Redis, Caching, In-Memory, DevOps

Description: Deploy Dragonfly in Docker as a modern Redis replacement with better memory efficiency and multi-threaded performance

---

Dragonfly is a modern in-memory data store built from the ground up to be Redis-compatible but significantly faster and more memory-efficient. Unlike KeyDB, which is a fork of Redis, Dragonfly is a complete rewrite using a shared-nothing architecture. It uses all available CPU cores by default, supports the Redis and Memcached protocols, and typically uses 25-30% less memory than Redis for the same dataset. Docker is the simplest way to run it.

## What Makes Dragonfly Different

Redis was designed in 2009 for single-threaded execution. Dragonfly was designed in 2022 for modern multi-core hardware. Instead of adding threads to the Redis codebase (like KeyDB does), Dragonfly starts fresh with a shared-nothing architecture where each thread manages its own portion of the keyspace independently.

This design eliminates lock contention and delivers linear scalability with CPU cores. On a 64-core machine, Dragonfly can process millions of operations per second with a single instance, something that would require a Redis cluster with dozens of shards.

Memory efficiency is the other headline feature. Dragonfly uses a novel data structure called "dashtable" instead of Redis's hash tables, reducing per-key overhead significantly.

## Quick Start

```bash
# Start Dragonfly (exposes Redis-compatible port 6379)
docker run -d \
  --name dragonfly \
  -p 6379:6379 \
  -v dragonfly_data:/data \
  --ulimit memlock=-1 \
  docker.dragonflydb.io/dragonflydb/dragonfly:latest \
  --requirepass mysecretpass
```

The `--ulimit memlock=-1` flag is important. Dragonfly uses memory-locked pages for performance, and this setting allows it to lock memory without limits.

Test with any Redis client.

```bash
# Connect using redis-cli (Dragonfly speaks Redis protocol)
docker exec -it dragonfly redis-cli -a mysecretpass

# Standard Redis commands work
SET hello "world"
GET hello
PING
INFO server
```

## Docker Compose Configuration

A production-ready setup with tuning options.

```yaml
# docker-compose.yml
version: "3.8"

services:
  dragonfly:
    image: docker.dragonflydb.io/dragonflydb/dragonfly:latest
    container_name: dragonfly
    restart: unless-stopped
    ports:
      - "6379:6379"
    ulimits:
      memlock: -1
    command: >
      dragonfly
        --requirepass strongpassword123
        --maxmemory 2gb
        --dbfilename dump
        --dir /data
        --proactor_threads 4
        --cache_mode
    volumes:
      - dragonfly_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "strongpassword123", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 3G
          cpus: "4.0"

volumes:
  dragonfly_data:
    driver: local
```

```bash
docker compose up -d
```

Key flags explained:
- `--proactor_threads 4`: Number of I/O threads (defaults to number of CPU cores)
- `--cache_mode`: Enables cache-optimized eviction (evicts keys proactively when approaching memory limit)
- `--maxmemory 2gb`: Hard memory limit
- `--dbfilename dump`: Name for the snapshot file

## Cache Mode vs Database Mode

Dragonfly can operate in two modes.

**Database mode** (default): Behaves like Redis. When memory is full, it rejects writes with an OOM error unless you configure an eviction policy.

**Cache mode** (`--cache_mode`): Optimized for caching. Proactively evicts less-recently-used keys before hitting the memory limit. This prevents sudden OOM failures and is ideal when you use Dragonfly purely as a cache layer.

```bash
# Run in cache mode
docker run -d \
  --name dragonfly-cache \
  -p 6379:6379 \
  --ulimit memlock=-1 \
  docker.dragonflydb.io/dragonflydb/dragonfly:latest \
  --cache_mode --maxmemory 1gb
```

## Using Dragonfly with Your Application

Since Dragonfly is Redis-compatible, use your existing Redis client library.

```python
# pip install redis
import redis
import json
import time

# Connect to Dragonfly using the standard Redis client
r = redis.Redis(
    host="localhost",
    port=6379,
    password="strongpassword123",
    decode_responses=True
)

# String operations
r.set("user:1001:name", "Alice Johnson")
r.set("user:1001:email", "alice@example.com", ex=3600)  # TTL: 1 hour

# Hash operations
r.hset("product:5001", mapping={
    "name": "Wireless Headphones",
    "price": "79.99",
    "stock": "150",
    "category": "electronics"
})

# List operations (message queue pattern)
r.lpush("task_queue", json.dumps({"task": "send_email", "to": "alice@example.com"}))
r.lpush("task_queue", json.dumps({"task": "resize_image", "file": "photo.jpg"}))

# Pop from the queue
task = r.rpop("task_queue")
print(f"Processing: {json.loads(task)}")

# Sorted set for leaderboard
r.zadd("leaderboard", {"player_a": 2500, "player_b": 3100, "player_c": 1800})
top_players = r.zrevrange("leaderboard", 0, 2, withscores=True)
for player, score in top_players:
    print(f"{player}: {score}")
```

## Dragonfly with Node.js

```javascript
// npm install ioredis
const Redis = require('ioredis');

const dragonfly = new Redis({
  host: 'localhost',
  port: 6379,
  password: 'strongpassword123',
});

async function cacheExample() {
  // Cache API responses
  const cacheKey = 'api:users:list';
  let cached = await dragonfly.get(cacheKey);

  if (cached) {
    console.log('Cache hit:', JSON.parse(cached));
    return JSON.parse(cached);
  }

  // Simulate API call
  const data = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ];

  // Cache with 5-minute TTL
  await dragonfly.setex(cacheKey, 300, JSON.stringify(data));
  console.log('Cache miss, stored result');
  return data;
}

cacheExample().then(() => dragonfly.quit());
```

## Benchmarking Dragonfly

Compare Dragonfly's performance against Redis.

```bash
# Benchmark Dragonfly using redis-benchmark (ships with Redis)
docker run --rm --network host redis:7 \
  redis-benchmark \
    -h localhost \
    -p 6379 \
    -a strongpassword123 \
    -t set,get,lpush,lpop,sadd \
    -n 1000000 \
    -c 100 \
    -d 256 \
    --threads 4 \
    -q

# Memory efficiency test: load 1 million keys and compare memory usage
docker exec dragonfly redis-cli -a strongpassword123 \
  DEBUG POPULATE 1000000 testkey 256

# Check memory usage
docker exec dragonfly redis-cli -a strongpassword123 INFO memory
```

## Dragonfly Snapshots

Dragonfly uses its own snapshot format that is more efficient than Redis RDB files. It can also load Redis RDB files for migration.

```bash
# Trigger a manual snapshot
docker exec dragonfly redis-cli -a strongpassword123 BGSAVE

# Check the last save time
docker exec dragonfly redis-cli -a strongpassword123 LASTSAVE

# List snapshot files
docker exec dragonfly ls -la /data/

# Dragonfly can load Redis RDB files
# Copy an existing Redis dump into the Dragonfly data volume
docker cp redis_dump.rdb dragonfly:/data/dump.rdb
```

## Replication

Dragonfly supports Redis-compatible replication where it can act as a replica of a Redis or Dragonfly primary.

```yaml
# docker-compose-replication.yml
version: "3.8"

services:
  dragonfly-primary:
    image: docker.dragonflydb.io/dragonflydb/dragonfly:latest
    container_name: dragonfly-primary
    ports:
      - "6379:6379"
    ulimits:
      memlock: -1
    command: dragonfly --requirepass replicapass --maxmemory 1gb
    volumes:
      - df_primary:/data
    networks:
      - df-net

  dragonfly-replica:
    image: docker.dragonflydb.io/dragonflydb/dragonfly:latest
    container_name: dragonfly-replica
    ports:
      - "6380:6379"
    ulimits:
      memlock: -1
    command: dragonfly --requirepass replicapass --masterauth replicapass --maxmemory 1gb
    volumes:
      - df_replica:/data
    depends_on:
      - dragonfly-primary
    networks:
      - df-net

networks:
  df-net:
    driver: bridge

volumes:
  df_primary:
  df_replica:
```

```bash
docker compose -f docker-compose-replication.yml up -d

# Configure replication after containers start
docker exec dragonfly-replica redis-cli -a replicapass \
  REPLICAOF dragonfly-primary 6379

# Verify replication status
docker exec dragonfly-primary redis-cli -a replicapass INFO replication
```

## Monitoring

```bash
# Server info and statistics
docker exec dragonfly redis-cli -a strongpassword123 INFO

# Memory breakdown
docker exec dragonfly redis-cli -a strongpassword123 INFO memory

# Connected clients
docker exec dragonfly redis-cli -a strongpassword123 INFO clients

# Command statistics
docker exec dragonfly redis-cli -a strongpassword123 INFO commandstats

# Container-level metrics
docker stats dragonfly --no-stream
```

## Migrating from Redis to Dragonfly

Since Dragonfly loads Redis RDB files, migration is straightforward.

```bash
# Step 1: Create an RDB dump from your existing Redis
docker exec redis-container redis-cli BGSAVE
docker cp redis-container:/data/dump.rdb ./dump.rdb

# Step 2: Copy the dump into Dragonfly's data directory
docker cp ./dump.rdb dragonfly:/data/dump.rdb

# Step 3: Restart Dragonfly to load the dump
docker restart dragonfly

# Step 4: Verify data was loaded
docker exec dragonfly redis-cli -a strongpassword123 DBSIZE
```

## Summary

Dragonfly in Docker provides a modern, high-performance replacement for Redis. Its shared-nothing multi-threaded architecture delivers higher throughput with lower memory usage. Every Redis client, command, and tool works unchanged. Use cache mode for pure caching workloads, database mode for persistent data. The migration path from Redis is simple since Dragonfly reads RDB files directly. For most applications, switching to Dragonfly means changing only the Docker image and enjoying better performance on the same hardware.
