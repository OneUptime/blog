# How to Use Redis in GitHub Actions Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, GitHub Action, CI/CD, Service Container, Testing

Description: Learn how to run Redis as a service container in GitHub Actions workflows for integration testing, caching, and session storage during CI pipelines.

---

GitHub Actions supports service containers - Docker containers that run alongside your workflow job and provide services like databases and caches. This is the standard way to use Redis in CI pipelines without managing infrastructure.

## Basic Redis Service Container

Add Redis to your workflow using the `services` block:

```yaml
name: Test with Redis

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      redis:
        image: redis:7.2-alpine
        ports:
        - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v4

    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'

    - name: Install dependencies
      run: npm ci

    - name: Run tests
      run: npm test
      env:
        REDIS_URL: redis://localhost:6379
```

## Redis with Password Authentication

To run Redis with a password in CI, use the `bitnami/redis` image which supports password configuration through environment variables:

```yaml
services:
  redis:
    image: bitnami/redis:7.2
    ports:
    - 6379:6379
    options: >-
      --health-cmd "redis-cli -a testpassword ping"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    env:
      REDIS_PASSWORD: testpassword

steps:
- name: Run tests
  run: pytest tests/
  env:
    REDIS_URL: redis://:testpassword@localhost:6379
```

## Python Integration Test Example

Testing a Python application that uses Redis:

```yaml
- name: Set up Python
  uses: actions/setup-python@v5
  with:
    python-version: '3.12'

- name: Install dependencies
  run: |
    pip install -r requirements.txt
    pip install pytest

- name: Run integration tests
  run: pytest tests/integration/ -v
  env:
    REDIS_HOST: localhost
    REDIS_PORT: 6379
```

Your test file:

```python
import redis
import os
import pytest

@pytest.fixture
def redis_client():
    return redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        decode_responses=True
    )

def test_redis_set_get(redis_client):
    redis_client.set("test_key", "test_value", ex=60)
    assert redis_client.get("test_key") == "test_value"
```

## Redis Cluster Simulation

For testing cluster-specific behavior, use Docker commands in a setup step:

```yaml
- name: Start Redis Cluster
  run: |
    docker network create redis-cluster-net
    for port in 7001 7002 7003; do
      docker run -d --name redis-$port \
        --network redis-cluster-net \
        -p $port:6379 \
        redis:7.2-alpine \
        redis-server --cluster-enabled yes \
          --cluster-config-file nodes.conf \
          --cluster-node-timeout 5000
    done
    sleep 3
    docker exec redis-7001 redis-cli --cluster create \
      redis-7001:6379 redis-7002:6379 redis-7003:6379 \
      --cluster-replicas 0 --cluster-yes
```

## Caching Build Artifacts with Redis

You can also use Redis to cache build metadata across workflow runs using `actions/cache` for files, but for runtime data caching within a job, use the service container directly:

```yaml
- name: Install Redis CLI
  run: sudo apt-get update && sudo apt-get install -y redis-tools

- name: Seed Redis test data
  run: |
    redis-cli -h localhost set app:config '{"version":"1.0"}' EX 3600
    redis-cli -h localhost set app:feature_flags '{"new_ui":true}' EX 3600
```

## Summary

Redis service containers in GitHub Actions are simple to configure via the `services` block with health checks to ensure Redis is ready before tests run. Use environment variables to pass the Redis URL to your application. For password-protected Redis, set the password in the service `env` and reference it in your test configuration. This pattern works for any language or framework.
