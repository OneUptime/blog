# How to Use Redis in CircleCI Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CircleCI, CI/CD, Service, Integration Test

Description: Learn how to configure Redis as a service in CircleCI workflows for integration testing, with examples using Docker executor and health checks.

---

CircleCI supports Docker-based service containers alongside your primary build container. Redis can be added as a secondary Docker image in your job configuration, making it available for integration tests during CI.

## Basic Redis Service Configuration

In `.circleci/config.yml`, add Redis as a secondary image in the `docker` executor:

```yaml
version: 2.1

jobs:
  test:
    docker:
    - image: cimg/node:20.0
    - image: redis:7.2-alpine
      name: redis
    steps:
    - checkout
    - run:
        name: Install dependencies
        command: npm ci
    - run:
        name: Install Redis CLI
        command: sudo apt-get update && sudo apt-get install -y redis-tools
    - run:
        name: Wait for Redis
        command: |
          for i in $(seq 1 20); do
            if redis-cli -h redis ping; then
              echo "Redis is ready"
              break
            fi
            echo "Waiting for Redis... ($i)"
            sleep 2
          done
    - run:
        name: Run tests
        command: npm test
        environment:
          REDIS_HOST: redis
          REDIS_PORT: "6379"

workflows:
  test-workflow:
    jobs:
    - test
```

The secondary image hostname is `redis` (matches the `name` field). Without a `name` field, secondary containers default to `localhost`.

## Redis with Password

```yaml
jobs:
  test:
    docker:
    - image: cimg/python:3.12
    - image: redis:7.2-alpine
      name: redis
      command: redis-server --requirepass testpassword
    steps:
    - checkout
    - run:
        name: Install dependencies
        command: pip install -r requirements.txt pytest
    - run:
        name: Run integration tests
        command: pytest tests/integration/ -v
        environment:
          REDIS_URL: redis://:testpassword@redis:6379
```

## Python Integration Test

```yaml
- run:
    name: Test Redis integration
    command: |
      python -m pytest tests/integration/test_cache.py -v
    environment:
      REDIS_HOST: redis
      REDIS_PORT: "6379"
```

The test:

```python
import redis
import os
import pytest

@pytest.fixture(scope="session")
def redis_client():
    r = redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        decode_responses=True
    )
    r.ping()
    return r

def test_cache_ttl(redis_client):
    redis_client.set("test:ttl", "value", ex=10)
    ttl = redis_client.ttl("test:ttl")
    assert 0 < ttl <= 10

def test_counter_increment(redis_client):
    redis_client.delete("test:counter")
    for _ in range(5):
        redis_client.incr("test:counter")
    assert int(redis_client.get("test:counter")) == 5
```

## Using CircleCI Orbs for Redis

CircleCI orbs can simplify Redis setup. Use the `circleci/redis` orb if available, or set up your own commands:

```yaml
version: 2.1

commands:
  wait-for-redis:
    parameters:
      host:
        type: string
        default: "localhost"
    steps:
    - run:
        name: Install Redis CLI
        command: sudo apt-get update && sudo apt-get install -y redis-tools
    - run:
        name: Wait for Redis to be ready
        command: |
          for i in $(seq 1 30); do
            if redis-cli -h << parameters.host >> ping 2>/dev/null; then
              echo "Redis ready after $i attempts"
              exit 0
            fi
            sleep 1
          done
          echo "Redis did not become ready"
          exit 1

jobs:
  integration-test:
    docker:
    - image: cimg/ruby:3.3
    - image: redis:7.2-alpine
      name: redis
    steps:
    - checkout
    - wait-for-redis:
        host: redis
    - run: bundle install
    - run: bundle exec rspec spec/integration/
```

## Summary

CircleCI's Docker executor runs service containers as secondary images accessible by hostname. Add Redis with `name: redis` and use that hostname in your test environment variables. Always include a readiness check loop before running tests, since the secondary container may take a moment to start. For password-protected Redis, pass `command: redis-server --requirepass <password>` in the secondary image configuration.
