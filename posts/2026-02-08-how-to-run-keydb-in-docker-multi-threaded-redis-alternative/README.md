# How to Run KeyDB in Docker (Multi-Threaded Redis Alternative)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, KeyDB, Redis, Caching, Databases, DevOps

Description: Deploy KeyDB in Docker as a multi-threaded drop-in Redis replacement with higher throughput and active replication

---

KeyDB is a multi-threaded fork of Redis that maintains full compatibility with the Redis protocol. It uses multiple CPU cores for request processing, which gives it significantly higher throughput than single-threaded Redis on modern hardware. Since it speaks the same protocol, every Redis client library, tool, and command works with KeyDB without modification. Docker is the quickest way to try it.

## Why KeyDB Over Redis?

Redis processes commands on a single thread. On a server with 16 or 32 cores, most of that CPU capacity sits idle. KeyDB removes this limitation by handling connections and processing commands across multiple threads.

Benchmarks show KeyDB achieving 2-5x higher throughput than Redis on the same hardware, depending on the workload. It also adds features that Redis lacks, including active-active replication (called "Active Rep") and sub-key expires.

The best part: you do not need to change your application code. Any Redis client works with KeyDB.

## Quick Start

Run KeyDB with a single command.

```bash
# Start KeyDB (drop-in Redis replacement on port 6379)
docker run -d \
  --name keydb \
  -p 6379:6379 \
  -v keydb_data:/data \
  eqalpha/keydb:latest \
  keydb-server /etc/keydb/keydb.conf \
    --server-threads 4 \
    --requirepass mysecretpassword
```

Test with any Redis client.

```bash
# Use redis-cli to connect (KeyDB speaks Redis protocol)
docker exec -it keydb keydb-cli -a mysecretpassword

# Run standard Redis commands
SET greeting "Hello from KeyDB"
GET greeting
INFO server
```

## Docker Compose Configuration

A complete setup with persistence, tuning, and health checks.

```yaml
# docker-compose.yml
version: "3.8"

services:
  keydb:
    image: eqalpha/keydb:latest
    container_name: keydb
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: >
      keydb-server /etc/keydb/keydb.conf
        --server-threads 4
        --requirepass strongpassword123
        --appendonly yes
        --appendfsync everysec
        --save 900 1
        --save 300 10
        --save 60 10000
        --maxmemory 1gb
        --maxmemory-policy allkeys-lru
    volumes:
      - keydb_data:/data
    healthcheck:
      test: ["CMD", "keydb-cli", "-a", "strongpassword123", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 1536M
          cpus: "4.0"

volumes:
  keydb_data:
    driver: local
```

```bash
docker compose up -d
```

## Multi-Threading Configuration

The `--server-threads` flag controls how many threads KeyDB uses for network I/O and command processing. This is KeyDB's primary advantage over Redis.

```bash
# Check available CPU cores on your system
nproc

# General guideline: set server-threads to (CPU cores - 2)
# On an 8-core machine, use 6 threads
docker run -d \
  --name keydb \
  -p 6379:6379 \
  --cpus="8.0" \
  eqalpha/keydb:latest \
  keydb-server --server-threads 6
```

Verify the thread configuration from inside the container.

```bash
# Check thread count and other server info
docker exec keydb keydb-cli INFO server | grep -E "server_threads|redis_version|tcp_port"
```

## Active Replication

KeyDB supports active-active replication where both nodes accept writes. This is a step beyond Redis's master-replica model where replicas are read-only.

```yaml
# docker-compose-replication.yml
version: "3.8"

services:
  keydb-node1:
    image: eqalpha/keydb:latest
    container_name: keydb-node1
    ports:
      - "6379:6379"
    command: >
      keydb-server
        --server-threads 2
        --requirepass replicapass
        --masterauth replicapass
        --active-replica yes
        --multi-master yes
        --replicaof keydb-node2 6379
    volumes:
      - keydb_node1:/data
    networks:
      - keydb-net

  keydb-node2:
    image: eqalpha/keydb:latest
    container_name: keydb-node2
    ports:
      - "6380:6379"
    command: >
      keydb-server
        --server-threads 2
        --requirepass replicapass
        --masterauth replicapass
        --active-replica yes
        --multi-master yes
        --replicaof keydb-node1 6379
    volumes:
      - keydb_node2:/data
    networks:
      - keydb-net

networks:
  keydb-net:
    driver: bridge

volumes:
  keydb_node1:
  keydb_node2:
```

```bash
docker compose -f docker-compose-replication.yml up -d
```

Test that writes on one node appear on the other.

```bash
# Write to node 1
docker exec keydb-node1 keydb-cli -a replicapass SET mykey "written-to-node1"

# Read from node 2
docker exec keydb-node2 keydb-cli -a replicapass GET mykey

# Write to node 2
docker exec keydb-node2 keydb-cli -a replicapass SET otherkey "written-to-node2"

# Read from node 1
docker exec keydb-node1 keydb-cli -a replicapass GET otherkey
```

Both nodes accept writes and synchronize with each other. This is true multi-master replication.

## Using KeyDB as a Session Store

Since KeyDB is Redis-compatible, it works as a session store with any framework that supports Redis sessions.

```python
# pip install redis flask
from flask import Flask, session
from redis import Redis

app = Flask(__name__)
app.secret_key = "flask-secret-key"

# Connect to KeyDB using the standard Redis client
keydb = Redis(
    host="localhost",
    port=6379,
    password="strongpassword123",
    decode_responses=True
)

@app.route("/login/<username>")
def login(username):
    # Store session data in KeyDB
    session_id = f"session:{username}"
    keydb.hset(session_id, mapping={
        "username": username,
        "login_time": "2025-03-01T10:00:00Z",
        "role": "user"
    })
    # Set expiration (1 hour)
    keydb.expire(session_id, 3600)
    return f"Logged in as {username}"

@app.route("/profile/<username>")
def profile(username):
    session_id = f"session:{username}"
    data = keydb.hgetall(session_id)
    if not data:
        return "Session expired", 401
    return data
```

## Benchmarking KeyDB vs Redis

Run a benchmark to see the throughput difference.

```bash
# Benchmark KeyDB (adjust -c for concurrent connections)
docker exec keydb keydb-benchmark \
  -a strongpassword123 \
  -t set,get \
  -n 100000 \
  -c 50 \
  -d 256 \
  --threads 4

# For comparison, run the same benchmark against a Redis container
docker run -d --name redis-test -p 6380:6379 redis:7
docker exec redis-test redis-benchmark \
  -t set,get \
  -n 100000 \
  -c 50 \
  -d 256
```

On a multi-core machine, you should see KeyDB handle significantly more operations per second.

## KeyDB-Specific Features

KeyDB adds several features beyond standard Redis.

Sub-key expires let you set TTL on individual hash fields.

```bash
# Set expiration on a specific hash field (not available in Redis)
docker exec keydb keydb-cli -a strongpassword123 \
  EXPIREMEMBER myhash field1 3600
```

MVCC (Multi-Version Concurrency Control) enables snapshot-based reads that do not block writes.

```bash
# Check KeyDB-specific configuration
docker exec keydb keydb-cli -a strongpassword123 CONFIG GET server-threads
docker exec keydb keydb-cli -a strongpassword123 CONFIG GET active-replica
```

## Monitoring

```bash
# Real-time monitoring of commands
docker exec keydb keydb-cli -a strongpassword123 MONITOR

# Memory usage analysis
docker exec keydb keydb-cli -a strongpassword123 INFO memory

# Client connections
docker exec keydb keydb-cli -a strongpassword123 INFO clients

# Check replication status (for active-rep setups)
docker exec keydb-node1 keydb-cli -a replicapass INFO replication

# Container resource usage
docker stats keydb --no-stream
```

## Persistence Configuration

KeyDB supports the same persistence options as Redis.

```bash
# Check current persistence settings
docker exec keydb keydb-cli -a strongpassword123 CONFIG GET save
docker exec keydb keydb-cli -a strongpassword123 CONFIG GET appendonly

# Trigger a manual RDB snapshot
docker exec keydb keydb-cli -a strongpassword123 BGSAVE

# Trigger an AOF rewrite
docker exec keydb keydb-cli -a strongpassword123 BGREWRITEAOF
```

## Summary

KeyDB in Docker gives you a multi-threaded Redis alternative that uses the same protocol, the same commands, and the same client libraries. Set `--server-threads` to match your available CPU cores for higher throughput. The active replication feature allows true multi-master setups where both nodes accept writes. For most workloads, switching from Redis to KeyDB means changing only the Docker image name. Your application code, client libraries, and operational tools all continue to work unchanged.
