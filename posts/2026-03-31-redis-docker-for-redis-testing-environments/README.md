# How to Use Docker for Redis Testing Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Docker, Testing, Integration Test, Docker Compose, DevOps

Description: Set up isolated Redis testing environments using Docker and Docker Compose to run integration tests with ephemeral Redis instances that start and stop with your test suite.

---

## Why Docker for Redis Testing

Running tests against a shared Redis instance causes test pollution - one test's data leaks into another's. Docker provides throwaway, isolated Redis containers that start fresh for each test run, guaranteeing test independence without requiring a dedicated Redis server.

## Quick Start - Single Redis Container

Run a Redis container for a one-off test session:

```bash
docker run -d --name redis-test -p 6380:6379 redis:7-alpine
```

Connect and verify:

```bash
redis-cli -p 6380 PING
# PONG
```

Stop and remove after tests:

```bash
docker stop redis-test && docker rm redis-test
```

## Docker Compose for Test Environments

Create a `docker-compose.test.yml` for your project:

```yaml
version: "3.9"
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    command: redis-server --save "" --appendonly no --loglevel warning
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
```

Start for tests:

```bash
docker compose -f docker-compose.test.yml up -d
```

Stop and clean up:

```bash
docker compose -f docker-compose.test.yml down -v
```

## Scripted Test Lifecycle

Wrap your test runner with Redis setup/teardown:

```bash
#!/bin/bash
set -e

echo "Starting Redis test container..."
docker compose -f docker-compose.test.yml up -d

echo "Waiting for Redis to be ready..."
until docker compose -f docker-compose.test.yml exec redis redis-cli ping | grep -q PONG; do
  sleep 1
done

echo "Running tests..."
set +e
pytest tests/ -v
EXIT_CODE=$?
set -e

echo "Stopping Redis..."
docker compose -f docker-compose.test.yml down -v

exit $EXIT_CODE
```

## Python Integration Test Example

```python
import subprocess
import pytest
import redis
import time

@pytest.fixture(scope="session", autouse=True)
def redis_container():
    subprocess.run(
        ["docker", "run", "-d", "--name", "redis-pytest", "-p", "6381:6379", "redis:7-alpine"],
        check=True
    )
    # Wait for Redis to be ready
    r = redis.Redis(port=6381)
    for _ in range(30):
        try:
            r.ping()
            break
        except redis.ConnectionError:
            time.sleep(0.5)
    yield r
    subprocess.run(["docker", "stop", "redis-pytest"])
    subprocess.run(["docker", "rm", "redis-pytest"])

@pytest.fixture(autouse=True)
def flush_redis(redis_container):
    redis_container.flushall()
    yield

def test_set_and_get(redis_container):
    redis_container.set("key1", "value1")
    assert redis_container.get("key1") == b"value1"

def test_list_operations(redis_container):
    redis_container.rpush("mylist", "a", "b", "c")
    assert redis_container.llen("mylist") == 3

def test_ttl_expiry(redis_container):
    redis_container.set("temp", "data", ex=1)
    assert redis_container.get("temp") == b"data"
    time.sleep(1.5)
    assert redis_container.get("temp") is None
```

## Node.js Example with Jest

```javascript
const { execSync } = require("child_process");
const redis = require("redis");

let client;

beforeAll(async () => {
  execSync("docker run -d --name redis-jest -p 6382:6379 redis:7-alpine");
  await new Promise((r) => setTimeout(r, 1000));
  client = redis.createClient({ url: "redis://localhost:6382" });
  await client.connect();
});

afterAll(async () => {
  await client.quit();
  execSync("docker stop redis-jest && docker rm redis-jest");
});

beforeEach(async () => {
  await client.flushAll();
});

test("set and get value", async () => {
  await client.set("foo", "bar");
  const val = await client.get("foo");
  expect(val).toBe("bar");
});
```

## Redis with Custom Config for Tests

Use a custom redis.conf to tune Redis for faster tests:

```text
save ""
appendonly no
loglevel warning
maxmemory 128mb
maxmemory-policy allkeys-lru
```

Mount it in Docker Compose:

```yaml
services:
  redis:
    image: redis:7-alpine
    volumes:
      - ./test-redis.conf:/etc/redis/redis.conf
    command: redis-server /etc/redis/redis.conf
    ports:
      - "6380:6379"
```

## Using Multiple Redis Databases

Isolate tests using Redis databases (0-15) instead of separate containers:

```python
@pytest.fixture
def cache_redis():
    return redis.Redis(db=1)

@pytest.fixture
def session_redis():
    return redis.Redis(db=2)
```

Flush only specific databases:

```bash
redis-cli -n 1 FLUSHDB
```

## Summary

Docker enables fully isolated Redis testing environments with deterministic startup and teardown. A Docker Compose file with a health check ensures Redis is ready before tests run. Combining FLUSHALL between tests with session-scoped containers gives fast, isolated integration tests without any shared state contamination.
