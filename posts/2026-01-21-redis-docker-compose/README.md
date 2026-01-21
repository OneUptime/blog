# How to Run Redis in Docker and Docker Compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Docker, Docker Compose, Containers, DevOps, Caching, Persistence

Description: A comprehensive guide to running Redis in Docker containers, covering single-node setups, Docker Compose configurations, data persistence, networking, and production-ready deployments.

---

Docker provides an excellent way to run Redis in isolated, reproducible environments. Whether you are developing locally or deploying to production, containerized Redis offers consistency, easy scaling, and simplified management.

In this guide, we will explore various ways to run Redis in Docker, from simple single-container setups to production-ready Docker Compose configurations with persistence, security, and networking.

## Prerequisites

Before starting, ensure you have:

- Docker Engine installed (version 20.10 or later)
- Docker Compose installed (version 2.0 or later)
- Basic understanding of Docker concepts
- At least 512 MB of available memory

## Quick Start with Docker

### Running Redis with a Single Command

The simplest way to run Redis in Docker:

```bash
# Run Redis with default settings
docker run --name my-redis -d redis:7

# Verify it is running
docker ps

# Connect to Redis CLI
docker exec -it my-redis redis-cli

# Test the connection
127.0.0.1:6379> ping
PONG

127.0.0.1:6379> set hello world
OK

127.0.0.1:6379> get hello
"world"

127.0.0.1:6379> exit
```

### Exposing Redis Port

To connect from your host machine or other containers:

```bash
# Expose Redis port to host
docker run --name my-redis -d -p 6379:6379 redis:7

# Now connect from host
redis-cli -h localhost -p 6379 ping
```

### Running with Password Authentication

```bash
# Run Redis with password
docker run --name my-redis -d -p 6379:6379 redis:7 redis-server --requirepass your_secure_password

# Connect with password
docker exec -it my-redis redis-cli -a your_secure_password
```

## Docker Compose Basics

Docker Compose makes it easier to manage Redis configurations. Create a `docker-compose.yml` file:

### Basic Docker Compose Setup

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: redis
    ports:
      - "6379:6379"
    restart: unless-stopped
```

Run with:

```bash
docker compose up -d
docker compose logs redis
```

### Docker Compose with Persistence

Data persistence ensures your data survives container restarts:

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

volumes:
  redis-data:
    driver: local
```

### Docker Compose with Custom Configuration

Create a custom Redis configuration file `redis.conf`:

```conf
# Network
bind 0.0.0.0
port 6379
protected-mode yes

# Security
requirepass your_secure_password_here

# Memory Management
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence - AOF
appendonly yes
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Persistence - RDB
save 900 1
save 300 10
save 60 10000

# Logging
loglevel notice

# Performance
tcp-keepalive 300
```

Docker Compose configuration:

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf:ro
    command: redis-server /usr/local/etc/redis/redis.conf
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "your_secure_password_here", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  redis-data:
    driver: local
```

## Production-Ready Docker Compose

Here is a comprehensive production setup:

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: redis-production
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf:ro
    command: redis-server /usr/local/etc/redis/redis.conf
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "$${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD:-defaultpassword}
    networks:
      - backend
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    sysctls:
      - net.core.somaxconn=65535

volumes:
  redis-data:
    driver: local

networks:
  backend:
    driver: bridge
```

Create a `.env` file:

```bash
REDIS_PASSWORD=your_very_secure_password_here
```

And a production `redis.conf`:

```conf
# Network
bind 0.0.0.0
port 6379
protected-mode yes
tcp-backlog 511

# Security
requirepass your_very_secure_password_here

# Memory
maxmemory 450mb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# Persistence
appendonly yes
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

save 900 1
save 300 10
save 60 10000

# Performance
tcp-keepalive 300
timeout 0

# Lazy freeing
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
lazyfree-lazy-server-del yes

# Logging
loglevel notice
logfile ""
```

## Multi-Service Setup with Application

### Python Flask Application with Redis

Create a project structure:

```
project/
  docker-compose.yml
  redis.conf
  app/
    Dockerfile
    requirements.txt
    app.py
```

`app/requirements.txt`:

```
flask==3.0.0
redis==5.0.1
gunicorn==21.2.0
```

`app/app.py`:

```python
import os
from flask import Flask, jsonify
import redis

app = Flask(__name__)

# Connect to Redis
redis_client = redis.Redis(
    host=os.getenv('REDIS_HOST', 'redis'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    password=os.getenv('REDIS_PASSWORD', ''),
    decode_responses=True
)

@app.route('/')
def index():
    return jsonify({'status': 'ok', 'message': 'Flask + Redis'})

@app.route('/counter')
def counter():
    count = redis_client.incr('page_views')
    return jsonify({'page_views': count})

@app.route('/health')
def health():
    try:
        redis_client.ping()
        return jsonify({'status': 'healthy', 'redis': 'connected'})
    except redis.ConnectionError:
        return jsonify({'status': 'unhealthy', 'redis': 'disconnected'}), 503

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

`app/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "app:app"]
```

`docker-compose.yml`:

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: redis
    volumes:
      - redis-data:/data
    command: redis-server --requirepass ${REDIS_PASSWORD:-secret} --appendonly yes
    restart: unless-stopped
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD:-secret}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: ./app
    container_name: flask-app
    ports:
      - "5000:5000"
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD:-secret}
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - app-network

volumes:
  redis-data:

networks:
  app-network:
    driver: bridge
```

### Node.js Application with Redis

`app/package.json`:

```json
{
  "name": "nodejs-redis-app",
  "version": "1.0.0",
  "main": "app.js",
  "dependencies": {
    "express": "^4.18.2",
    "ioredis": "^5.3.2"
  }
}
```

`app/app.js`:

```javascript
const express = require('express');
const Redis = require('ioredis');

const app = express();
const port = process.env.PORT || 3000;

// Connect to Redis
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || '',
});

redis.on('connect', () => console.log('Connected to Redis'));
redis.on('error', (err) => console.error('Redis error:', err));

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Node.js + Redis' });
});

app.get('/counter', async (req, res) => {
  try {
    const count = await redis.incr('page_views');
    res.json({ page_views: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', async (req, res) => {
  try {
    await redis.ping();
    res.json({ status: 'healthy', redis: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', redis: 'disconnected' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

`app/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "app.js"]
```

## Redis Replication with Docker Compose

Set up a Redis master with replicas:

```yaml
version: '3.8'

services:
  redis-master:
    image: redis:7-alpine
    container_name: redis-master
    command: redis-server --requirepass masterpassword
    volumes:
      - redis-master-data:/data
    networks:
      - redis-network
    ports:
      - "6379:6379"

  redis-replica-1:
    image: redis:7-alpine
    container_name: redis-replica-1
    command: >
      redis-server
      --replicaof redis-master 6379
      --masterauth masterpassword
      --requirepass replicapassword
    volumes:
      - redis-replica-1-data:/data
    networks:
      - redis-network
    ports:
      - "6380:6379"
    depends_on:
      - redis-master

  redis-replica-2:
    image: redis:7-alpine
    container_name: redis-replica-2
    command: >
      redis-server
      --replicaof redis-master 6379
      --masterauth masterpassword
      --requirepass replicapassword
    volumes:
      - redis-replica-2-data:/data
    networks:
      - redis-network
    ports:
      - "6381:6379"
    depends_on:
      - redis-master

volumes:
  redis-master-data:
  redis-replica-1-data:
  redis-replica-2-data:

networks:
  redis-network:
    driver: bridge
```

Test replication:

```bash
# Start all containers
docker compose up -d

# Write to master
docker exec -it redis-master redis-cli -a masterpassword SET mykey "hello"

# Read from replica
docker exec -it redis-replica-1 redis-cli -a replicapassword GET mykey

# Check replication status
docker exec -it redis-master redis-cli -a masterpassword INFO replication
```

## Redis Sentinel with Docker Compose

High availability setup with Sentinel:

```yaml
version: '3.8'

services:
  redis-master:
    image: redis:7-alpine
    container_name: redis-master
    command: redis-server --requirepass redispassword
    volumes:
      - redis-master-data:/data
    networks:
      redis-net:
        ipv4_address: 172.20.0.10
    ports:
      - "6379:6379"

  redis-replica:
    image: redis:7-alpine
    container_name: redis-replica
    command: >
      redis-server
      --replicaof redis-master 6379
      --masterauth redispassword
      --requirepass redispassword
    volumes:
      - redis-replica-data:/data
    networks:
      redis-net:
        ipv4_address: 172.20.0.11
    depends_on:
      - redis-master

  sentinel-1:
    image: redis:7-alpine
    container_name: sentinel-1
    command: >
      sh -c "echo 'sentinel monitor mymaster 172.20.0.10 6379 2' > /etc/sentinel.conf &&
             echo 'sentinel auth-pass mymaster redispassword' >> /etc/sentinel.conf &&
             echo 'sentinel down-after-milliseconds mymaster 5000' >> /etc/sentinel.conf &&
             echo 'sentinel failover-timeout mymaster 60000' >> /etc/sentinel.conf &&
             echo 'sentinel parallel-syncs mymaster 1' >> /etc/sentinel.conf &&
             redis-sentinel /etc/sentinel.conf"
    networks:
      redis-net:
        ipv4_address: 172.20.0.20
    ports:
      - "26379:26379"
    depends_on:
      - redis-master
      - redis-replica

  sentinel-2:
    image: redis:7-alpine
    container_name: sentinel-2
    command: >
      sh -c "echo 'sentinel monitor mymaster 172.20.0.10 6379 2' > /etc/sentinel.conf &&
             echo 'sentinel auth-pass mymaster redispassword' >> /etc/sentinel.conf &&
             echo 'sentinel down-after-milliseconds mymaster 5000' >> /etc/sentinel.conf &&
             echo 'sentinel failover-timeout mymaster 60000' >> /etc/sentinel.conf &&
             echo 'sentinel parallel-syncs mymaster 1' >> /etc/sentinel.conf &&
             redis-sentinel /etc/sentinel.conf"
    networks:
      redis-net:
        ipv4_address: 172.20.0.21
    ports:
      - "26380:26379"
    depends_on:
      - redis-master
      - redis-replica

  sentinel-3:
    image: redis:7-alpine
    container_name: sentinel-3
    command: >
      sh -c "echo 'sentinel monitor mymaster 172.20.0.10 6379 2' > /etc/sentinel.conf &&
             echo 'sentinel auth-pass mymaster redispassword' >> /etc/sentinel.conf &&
             echo 'sentinel down-after-milliseconds mymaster 5000' >> /etc/sentinel.conf &&
             echo 'sentinel failover-timeout mymaster 60000' >> /etc/sentinel.conf &&
             echo 'sentinel parallel-syncs mymaster 1' >> /etc/sentinel.conf &&
             redis-sentinel /etc/sentinel.conf"
    networks:
      redis-net:
        ipv4_address: 172.20.0.22
    ports:
      - "26381:26379"
    depends_on:
      - redis-master
      - redis-replica

volumes:
  redis-master-data:
  redis-replica-data:

networks:
  redis-net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## Connecting from Applications

### Python with Docker Network

```python
import redis
import os

# When running in the same Docker network
client = redis.Redis(
    host=os.getenv('REDIS_HOST', 'redis'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    password=os.getenv('REDIS_PASSWORD', ''),
    decode_responses=True,
    socket_timeout=5,
    socket_connect_timeout=5,
    retry_on_timeout=True
)

# With connection pool
pool = redis.ConnectionPool(
    host='redis',
    port=6379,
    password='your_password',
    max_connections=10,
    decode_responses=True
)
client = redis.Redis(connection_pool=pool)
```

### Node.js with Docker Network

```javascript
const Redis = require('ioredis');

// Simple connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || '',
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
});

// With Sentinel
const redisSentinel = new Redis({
  sentinels: [
    { host: 'sentinel-1', port: 26379 },
    { host: 'sentinel-2', port: 26379 },
    { host: 'sentinel-3', port: 26379 },
  ],
  name: 'mymaster',
  password: 'redispassword',
  sentinelPassword: 'redispassword',
});
```

### Go with Docker Network

```go
package main

import (
    "context"
    "os"
    "time"

    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()

    // Simple connection
    client := redis.NewClient(&redis.Options{
        Addr:         os.Getenv("REDIS_HOST") + ":" + os.Getenv("REDIS_PORT"),
        Password:     os.Getenv("REDIS_PASSWORD"),
        DB:           0,
        DialTimeout:  5 * time.Second,
        ReadTimeout:  3 * time.Second,
        WriteTimeout: 3 * time.Second,
        PoolSize:     10,
    })
    defer client.Close()

    // With Sentinel
    sentinelClient := redis.NewFailoverClient(&redis.FailoverOptions{
        MasterName: "mymaster",
        SentinelAddrs: []string{
            "sentinel-1:26379",
            "sentinel-2:26379",
            "sentinel-3:26379",
        },
        Password:         "redispassword",
        SentinelPassword: "redispassword",
    })
    defer sentinelClient.Close()
}
```

## Useful Docker Commands

```bash
# View Redis logs
docker logs redis -f

# Execute Redis CLI
docker exec -it redis redis-cli

# Check Redis memory usage
docker exec -it redis redis-cli INFO memory

# Monitor Redis commands in real-time
docker exec -it redis redis-cli MONITOR

# Get container resource usage
docker stats redis

# Backup Redis data
docker exec redis redis-cli BGSAVE
docker cp redis:/data/dump.rdb ./backup/

# Inspect network
docker network inspect app-network

# View container details
docker inspect redis
```

## Troubleshooting

### Container Keeps Restarting

Check logs and configuration:

```bash
docker logs redis
docker inspect redis --format='{{.State.ExitCode}}'
```

### Connection Refused

Verify network and port binding:

```bash
# Check if Redis is listening
docker exec redis redis-cli ping

# Check port mapping
docker port redis

# Test from another container
docker run --rm --network app-network redis:7-alpine redis-cli -h redis ping
```

### Data Not Persisting

Ensure volumes are configured correctly:

```bash
# Check volume
docker volume inspect redis-data

# Verify mount
docker inspect redis --format='{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'
```

### Memory Issues

Monitor and limit memory:

```bash
# Check memory usage
docker exec redis redis-cli INFO memory

# Set memory limit in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 512M
```

## Conclusion

Running Redis in Docker provides flexibility, consistency, and ease of management across development and production environments. Key takeaways:

- Use named volumes for data persistence
- Always configure password authentication
- Implement health checks for reliable service orchestration
- Use Docker networks for secure container-to-container communication
- Consider replication and Sentinel for high availability
- Monitor resource usage and set appropriate limits

With Docker Compose, you can easily manage complex Redis setups including replication and Sentinel configurations, making it ideal for both local development and production deployments.
