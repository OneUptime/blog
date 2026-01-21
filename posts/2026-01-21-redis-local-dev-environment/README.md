# How to Set Up a Local Redis Development Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Development, Docker, Redis Stack, RedisInsight, Local Development

Description: A comprehensive guide to setting up a local Redis development environment, covering Docker configurations, GUI tools, debugging setups, and best practices for development workflows.

---

A well-configured local Redis development environment accelerates development, enables thorough testing, and helps catch issues before production. This guide covers everything you need to set up a productive Redis development environment.

## Quick Start with Docker

The fastest way to get started is with Docker:

```bash
# Basic Redis
docker run -d --name redis -p 6379:6379 redis:7

# Redis Stack (includes Search, JSON, TimeSeries, Graph, Bloom)
docker run -d --name redis-stack \
  -p 6379:6379 \
  -p 8001:8001 \
  redis/redis-stack:latest

# Access RedisInsight GUI at http://localhost:8001
```

## Docker Compose Setup

For a complete development environment, use Docker Compose:

### Basic Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: redis-dev
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  redis-data:
```

### Development Configuration

Create a `redis.conf` for development:

```bash
# redis.conf - Development configuration

# Network
bind 0.0.0.0
port 6379
protected-mode no

# Memory
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence (optional for dev)
save 900 1
save 300 10
appendonly no

# Logging
loglevel debug
logfile ""

# Development conveniences
notify-keyspace-events KEA
slowlog-log-slower-than 10000
slowlog-max-len 128

# Allow debugging commands
enable-debug-command yes
```

### Full Stack Setup

```yaml
# docker-compose.full.yml
version: '3.8'

services:
  redis-stack:
    image: redis/redis-stack:latest
    container_name: redis-stack-dev
    ports:
      - "6379:6379"
      - "8001:8001"
    volumes:
      - redis-stack-data:/data
    environment:
      - REDIS_ARGS=--save 60 1 --loglevel debug
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis-commander:
    image: rediscommander/redis-commander:latest
    container_name: redis-commander
    ports:
      - "8081:8081"
    environment:
      - REDIS_HOSTS=local:redis-stack:6379
    depends_on:
      - redis-stack

  redis-exporter:
    image: oliver006/redis_exporter:latest
    container_name: redis-exporter
    ports:
      - "9121:9121"
    environment:
      - REDIS_ADDR=redis-stack:6379
    depends_on:
      - redis-stack

volumes:
  redis-stack-data:
```

Start the environment:

```bash
docker-compose -f docker-compose.full.yml up -d
```

## Redis Cluster for Development

For testing cluster behavior locally:

```yaml
# docker-compose.cluster.yml
version: '3.8'

services:
  redis-node-1:
    image: redis:7-alpine
    container_name: redis-node-1
    ports:
      - "7001:6379"
      - "17001:16379"
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    volumes:
      - redis-cluster-1:/data

  redis-node-2:
    image: redis:7-alpine
    container_name: redis-node-2
    ports:
      - "7002:6379"
      - "17002:16379"
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    volumes:
      - redis-cluster-2:/data

  redis-node-3:
    image: redis:7-alpine
    container_name: redis-node-3
    ports:
      - "7003:6379"
      - "17003:16379"
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    volumes:
      - redis-cluster-3:/data

  redis-node-4:
    image: redis:7-alpine
    container_name: redis-node-4
    ports:
      - "7004:6379"
      - "17004:16379"
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    volumes:
      - redis-cluster-4:/data

  redis-node-5:
    image: redis:7-alpine
    container_name: redis-node-5
    ports:
      - "7005:6379"
      - "17005:16379"
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    volumes:
      - redis-cluster-5:/data

  redis-node-6:
    image: redis:7-alpine
    container_name: redis-node-6
    ports:
      - "7006:6379"
      - "17006:16379"
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    volumes:
      - redis-cluster-6:/data

  redis-cluster-init:
    image: redis:7-alpine
    container_name: redis-cluster-init
    depends_on:
      - redis-node-1
      - redis-node-2
      - redis-node-3
      - redis-node-4
      - redis-node-5
      - redis-node-6
    command: >
      sh -c "sleep 5 &&
             redis-cli --cluster create
             redis-node-1:6379
             redis-node-2:6379
             redis-node-3:6379
             redis-node-4:6379
             redis-node-5:6379
             redis-node-6:6379
             --cluster-replicas 1 --cluster-yes"

volumes:
  redis-cluster-1:
  redis-cluster-2:
  redis-cluster-3:
  redis-cluster-4:
  redis-cluster-5:
  redis-cluster-6:
```

## GUI Tools

### RedisInsight (Recommended)

RedisInsight is the official Redis GUI:

```bash
# Included with Redis Stack
docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 redis/redis-stack:latest

# Or standalone
docker run -d --name redisinsight -p 8001:8001 redislabs/redisinsight:latest
```

Features:
- Visual key browser
- CLI with command autocomplete
- Slow log analysis
- Memory analysis
- Pub/Sub monitoring
- Workbench for RediSearch, RedisGraph, etc.

### Redis Commander

Web-based Redis management tool:

```bash
docker run -d --name redis-commander \
  -p 8081:8081 \
  -e REDIS_HOSTS=local:localhost:6379 \
  rediscommander/redis-commander:latest
```

### TablePlus (macOS/Windows/Linux)

Download from [tableplus.com](https://tableplus.com/) - native application with Redis support.

## IDE Integration

### VS Code Extensions

Install these extensions for Redis development:

1. **Redis** by cweijan - Database client
2. **Redis Explorer** - Key browser

Configuration in `.vscode/settings.json`:

```json
{
  "redis.connections": [
    {
      "name": "Local Redis",
      "host": "localhost",
      "port": 6379,
      "auth": "",
      "database": 0
    }
  ]
}
```

### PyCharm/IntelliJ

Use the Database tool window:
1. Add New Data Source > Redis
2. Host: localhost, Port: 6379
3. Test Connection

## Python Development Setup

### Project Structure

```
my-redis-project/
├── app/
│   ├── __init__.py
│   ├── redis_client.py
│   └── cache.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   └── test_cache.py
├── docker-compose.yml
├── redis.conf
├── requirements.txt
└── pytest.ini
```

### Redis Client Configuration

```python
# app/redis_client.py
import os
import redis
from functools import lru_cache

@lru_cache()
def get_redis_client():
    """Get a Redis client instance (singleton)."""
    return redis.Redis(
        host=os.getenv('REDIS_HOST', 'localhost'),
        port=int(os.getenv('REDIS_PORT', 6379)),
        db=int(os.getenv('REDIS_DB', 0)),
        password=os.getenv('REDIS_PASSWORD', None),
        decode_responses=True,
        socket_timeout=5,
        socket_connect_timeout=5,
        retry_on_timeout=True,
    )

def get_redis_pool():
    """Get a Redis connection pool."""
    pool = redis.ConnectionPool(
        host=os.getenv('REDIS_HOST', 'localhost'),
        port=int(os.getenv('REDIS_PORT', 6379)),
        db=int(os.getenv('REDIS_DB', 0)),
        password=os.getenv('REDIS_PASSWORD', None),
        decode_responses=True,
        max_connections=10,
    )
    return redis.Redis(connection_pool=pool)

# For development - with verbose logging
def get_debug_client():
    """Get a Redis client with debug logging."""
    import logging

    logging.basicConfig(level=logging.DEBUG)
    logger = logging.getLogger('redis')
    logger.setLevel(logging.DEBUG)

    class DebugRedis(redis.Redis):
        def execute_command(self, *args, **kwargs):
            logger.debug(f"Redis command: {' '.join(str(a) for a in args)}")
            result = super().execute_command(*args, **kwargs)
            logger.debug(f"Redis result: {result}")
            return result

    return DebugRedis(
        host='localhost',
        port=6379,
        decode_responses=True
    )
```

### Environment Variables

Create a `.env` file:

```bash
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
```

Load with python-dotenv:

```python
from dotenv import load_dotenv
load_dotenv()
```

## Node.js Development Setup

### Project Structure

```
my-redis-project/
├── src/
│   ├── redis.js
│   └── cache.js
├── tests/
│   ├── setup.js
│   └── cache.test.js
├── docker-compose.yml
├── package.json
└── jest.config.js
```

### Redis Client Configuration

```javascript
// src/redis.js
const Redis = require('ioredis');

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  db: parseInt(process.env.REDIS_DB || '0', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
};

// Singleton client
let client = null;

function getClient() {
  if (!client) {
    client = new Redis(redisConfig);

    client.on('error', (err) => {
      console.error('Redis error:', err);
    });

    client.on('connect', () => {
      console.log('Redis connected');
    });
  }
  return client;
}

// For testing - create isolated client
function createTestClient() {
  const testConfig = {
    ...redisConfig,
    db: 15, // Use different DB for tests
  };
  return new Redis(testConfig);
}

module.exports = { getClient, createTestClient };
```

## Debugging Tools

### Redis MONITOR

Watch all commands in real-time:

```bash
# In terminal
redis-cli MONITOR

# Filter output
redis-cli MONITOR | grep "SET\|GET"
```

### SLOWLOG

Track slow commands:

```bash
# Get last 10 slow commands
redis-cli SLOWLOG GET 10

# Get slow log length
redis-cli SLOWLOG LEN

# Reset slow log
redis-cli SLOWLOG RESET
```

### Memory Analysis

```bash
# Overall memory stats
redis-cli INFO memory

# Memory usage for a key
redis-cli MEMORY USAGE mykey

# Find big keys
redis-cli --bigkeys

# Memory doctor (diagnostics)
redis-cli MEMORY DOCTOR
```

### Debug Script

```python
# debug_redis.py
import redis

def debug_redis_connection():
    r = redis.Redis(host='localhost', port=6379)

    print("=== Redis Debug Info ===")

    # Connection test
    print(f"PING: {r.ping()}")

    # Server info
    info = r.info()
    print(f"Version: {info['redis_version']}")
    print(f"Mode: {info.get('redis_mode', 'standalone')}")
    print(f"Connected clients: {info['connected_clients']}")

    # Memory
    print(f"Used memory: {info['used_memory_human']}")
    print(f"Peak memory: {info['used_memory_peak_human']}")
    print(f"Memory fragmentation: {info.get('mem_fragmentation_ratio', 'N/A')}")

    # Keys
    print(f"Total keys: {r.dbsize()}")

    # Slow log
    slow_log = r.slowlog_get(5)
    if slow_log:
        print("\nSlow commands:")
        for entry in slow_log:
            print(f"  - {entry['command']} ({entry['duration']}us)")

    # Client list
    clients = r.client_list()
    print(f"\nConnected clients: {len(clients)}")

if __name__ == "__main__":
    debug_redis_connection()
```

## Development Workflow

### Makefile for Common Tasks

```makefile
# Makefile

.PHONY: redis-up redis-down redis-logs redis-cli redis-reset redis-test

# Start Redis
redis-up:
	docker-compose up -d

# Stop Redis
redis-down:
	docker-compose down

# View logs
redis-logs:
	docker-compose logs -f redis

# Open Redis CLI
redis-cli:
	docker exec -it redis-dev redis-cli

# Reset Redis (flush all data)
redis-reset:
	docker exec redis-dev redis-cli FLUSHALL

# Run tests with Redis
redis-test:
	docker-compose up -d
	pytest tests/
	docker-compose down

# Backup data
redis-backup:
	docker exec redis-dev redis-cli BGSAVE
	docker cp redis-dev:/data/dump.rdb ./backup/dump.rdb

# Restore data
redis-restore:
	docker cp ./backup/dump.rdb redis-dev:/data/dump.rdb
	docker restart redis-dev
```

### Git Hooks for Data Cleanup

```bash
# .git/hooks/pre-commit
#!/bin/bash

# Flush test database before commit
redis-cli -n 15 FLUSHDB

echo "Test Redis database flushed"
```

## Test Data Generation

### Python Script

```python
# scripts/seed_data.py
import redis
import json
import random
from faker import Faker

fake = Faker()

def seed_users(r, count=100):
    """Seed user data."""
    for i in range(count):
        user_id = f"user:{i}"
        user_data = {
            "name": fake.name(),
            "email": fake.email(),
            "city": fake.city(),
            "created_at": fake.date_time().isoformat()
        }
        r.hset(user_id, mapping=user_data)
    print(f"Seeded {count} users")

def seed_products(r, count=50):
    """Seed product data."""
    categories = ["electronics", "clothing", "books", "home", "sports"]

    for i in range(count):
        product_id = f"product:{i}"
        product_data = {
            "name": fake.catch_phrase(),
            "price": round(random.uniform(10, 500), 2),
            "category": random.choice(categories),
            "stock": random.randint(0, 100)
        }
        r.hset(product_id, mapping=product_data)
    print(f"Seeded {count} products")

def seed_sessions(r, count=200):
    """Seed session data."""
    for i in range(count):
        session_id = f"session:{fake.uuid4()}"
        session_data = {
            "user_id": f"user:{random.randint(0, 99)}",
            "ip": fake.ipv4(),
            "user_agent": fake.user_agent()
        }
        r.hset(session_id, mapping=session_data)
        r.expire(session_id, random.randint(1800, 7200))
    print(f"Seeded {count} sessions")

def seed_cache(r, count=500):
    """Seed cache entries."""
    for i in range(count):
        key = f"cache:query:{fake.md5()}"
        value = json.dumps({"data": fake.text(max_nb_chars=200)})
        r.setex(key, random.randint(60, 3600), value)
    print(f"Seeded {count} cache entries")

def main():
    r = redis.Redis(host='localhost', port=6379, decode_responses=True)

    print("Flushing database...")
    r.flushdb()

    print("Seeding data...")
    seed_users(r)
    seed_products(r)
    seed_sessions(r)
    seed_cache(r)

    print(f"\nTotal keys: {r.dbsize()}")
    print("Done!")

if __name__ == "__main__":
    main()
```

Run with:

```bash
pip install faker
python scripts/seed_data.py
```

## Conclusion

A well-configured local Redis development environment includes:

- **Docker Compose** for consistent, reproducible setup
- **GUI tools** like RedisInsight for visual debugging
- **IDE integration** for seamless development
- **Debug utilities** for troubleshooting
- **Test data generators** for realistic development scenarios

Key takeaways:

- Use **Docker Compose** for easy setup and teardown
- Use **separate databases** (or prefixes) for testing
- Enable **debug logging** during development
- Use **MONITOR** and **SLOWLOG** for debugging
- Create **seed scripts** for consistent test data

## Related Resources

- [Redis Documentation](https://redis.io/documentation)
- [Docker Hub - Redis](https://hub.docker.com/_/redis)
- [RedisInsight Documentation](https://redis.io/docs/ui/insight/)
- [ioredis Documentation](https://github.com/redis/ioredis)
