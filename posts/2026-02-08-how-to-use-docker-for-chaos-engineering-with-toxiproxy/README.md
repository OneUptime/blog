# How to Use Docker for Chaos Engineering with Toxiproxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Toxiproxy, Chaos Engineering, Network Testing, Resilience, Proxy, Shopify, Microservices

Description: Set up Toxiproxy in Docker to simulate network conditions like latency, timeouts, and connection resets between services.

---

Toxiproxy, developed by Shopify, sits between your application and its dependencies as a TCP proxy. It lets you inject network failures at the connection level: latency, dropped connections, bandwidth restrictions, and more. Unlike tools that operate at the container or system level, Toxiproxy gives you surgical control over individual connections between specific services.

This precision makes Toxiproxy ideal for testing how your application handles degraded database connections, slow API responses from third-party services, or flaky network links between microservices. This guide sets up Toxiproxy in Docker and walks through practical failure injection scenarios.

## How Toxiproxy Works

Toxiproxy runs as a daemon that creates TCP proxies. Your application connects to Toxiproxy instead of directly to its dependencies. You then add "toxics" to the proxy to simulate network conditions. When you remove the toxics, traffic flows normally again.

```mermaid
graph LR
    A[Application] -->|port 6380| B[Toxiproxy]
    B -->|port 6379| C[Redis]
    A -->|port 5433| B
    B -->|port 5432| D[PostgreSQL]
```

The application connects to Toxiproxy on different ports, and Toxiproxy forwards traffic to the actual services. This approach requires no changes to your application code beyond updating connection strings.

## Setting Up Toxiproxy with Docker Compose

Here is a complete setup with Toxiproxy sitting between an API and its database and cache.

```yaml
# docker-compose.yml - Application stack with Toxiproxy
version: "3.8"

services:
  # Toxiproxy sits between the app and its dependencies
  toxiproxy:
    image: ghcr.io/shopify/toxiproxy:latest
    container_name: toxiproxy
    ports:
      - "8474:8474"   # Toxiproxy API (for managing proxies and toxics)
      - "6380:6380"   # Proxy port for Redis
      - "5433:5433"   # Proxy port for PostgreSQL
    networks:
      - app-net

  # The actual Redis instance
  redis:
    image: redis:7-alpine
    container_name: redis
    networks:
      - app-net

  # The actual PostgreSQL instance
  postgres:
    image: postgres:16-alpine
    container_name: postgres
    environment:
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=myapp
    networks:
      - app-net

  # Application connects to Toxiproxy instead of directly to deps
  api:
    build: ./api
    container_name: api
    ports:
      - "3000:3000"
    environment:
      # Point to Toxiproxy ports instead of direct connections
      - REDIS_URL=redis://toxiproxy:6380
      - DATABASE_URL=postgres://app:secret@toxiproxy:5433/myapp
    depends_on:
      - toxiproxy
      - redis
      - postgres
    networks:
      - app-net

networks:
  app-net:
    driver: bridge
```

## Configuring Proxies

After starting the stack, create the proxy mappings. Toxiproxy has a REST API for management.

```bash
# Start the stack
docker compose up -d

# Create a proxy for Redis (listens on 6380, forwards to redis:6379)
curl -X POST http://localhost:8474/proxies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "redis",
    "listen": "0.0.0.0:6380",
    "upstream": "redis:6379",
    "enabled": true
  }'

# Create a proxy for PostgreSQL (listens on 5433, forwards to postgres:5432)
curl -X POST http://localhost:8474/proxies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "postgres",
    "listen": "0.0.0.0:5433",
    "upstream": "postgres:5432",
    "enabled": true
  }'

# List all configured proxies
curl http://localhost:8474/proxies | python3 -m json.tool
```

## Automating Proxy Setup

Use an initialization script or a sidecar container to set up proxies automatically.

```bash
#!/bin/bash
# init-toxiproxy.sh - Create proxy configurations on startup

TOXIPROXY_HOST=${TOXIPROXY_HOST:-localhost}
TOXIPROXY_API="http://${TOXIPROXY_HOST}:8474"

# Wait for Toxiproxy to be ready
echo "Waiting for Toxiproxy..."
until curl -s "$TOXIPROXY_API/version" > /dev/null 2>&1; do
    sleep 1
done
echo "Toxiproxy is ready."

# Create proxies from a configuration array
declare -A PROXIES=(
    ["redis"]="0.0.0.0:6380:redis:6379"
    ["postgres"]="0.0.0.0:5433:postgres:5432"
)

for name in "${!PROXIES[@]}"; do
    IFS=':' read -r listen_host listen_port upstream_host upstream_port <<< "${PROXIES[$name]}"
    curl -s -X POST "$TOXIPROXY_API/proxies" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"$name\",
            \"listen\": \"${listen_host}:${listen_port}\",
            \"upstream\": \"${upstream_host}:${upstream_port}\",
            \"enabled\": true
        }"
    echo "Created proxy: $name (${listen_host}:${listen_port} -> ${upstream_host}:${upstream_port})"
done
```

## Injecting Toxics: Latency

Add latency to the Redis connection to simulate a slow cache.

```bash
# Add 500ms latency to Redis responses (downstream = server to client)
curl -X POST http://localhost:8474/proxies/redis/toxics \
  -H "Content-Type: application/json" \
  -d '{
    "name": "redis-latency",
    "type": "latency",
    "stream": "downstream",
    "attributes": {
      "latency": 500,
      "jitter": 100
    }
  }'

# Test the effect on your application
time curl http://localhost:3000/api/cached-data

# Remove the latency toxic
curl -X DELETE http://localhost:8474/proxies/redis/toxics/redis-latency
```

## Injecting Toxics: Connection Reset

Simulate the database dropping connections mid-query.

```bash
# Reset 30% of PostgreSQL connections
curl -X POST http://localhost:8474/proxies/postgres/toxics \
  -H "Content-Type: application/json" \
  -d '{
    "name": "pg-reset",
    "type": "reset_peer",
    "stream": "downstream",
    "toxicity": 0.3,
    "attributes": {
      "timeout": 500
    }
  }'
```

The `toxicity` field controls the probability that the toxic applies to any given connection. A value of 0.3 means 30% of connections will be reset.

## Injecting Toxics: Bandwidth Limiting

Simulate a constrained network link.

```bash
# Limit Redis bandwidth to 10 KB/s
curl -X POST http://localhost:8474/proxies/redis/toxics \
  -H "Content-Type: application/json" \
  -d '{
    "name": "redis-bandwidth",
    "type": "bandwidth",
    "stream": "downstream",
    "attributes": {
      "rate": 10
    }
  }'
```

## Injecting Toxics: Timeout

Simulate a connection that hangs without responding.

```bash
# Make PostgreSQL connections hang for 10 seconds before closing
curl -X POST http://localhost:8474/proxies/postgres/toxics \
  -H "Content-Type: application/json" \
  -d '{
    "name": "pg-timeout",
    "type": "timeout",
    "stream": "downstream",
    "attributes": {
      "timeout": 10000
    }
  }'
```

## Injecting Toxics: Slicer (Slow Responses)

The slicer toxic breaks data into small chunks with delays between them. This simulates extremely slow responses.

```bash
# Slice Redis responses into tiny pieces with delays
curl -X POST http://localhost:8474/proxies/redis/toxics \
  -H "Content-Type: application/json" \
  -d '{
    "name": "redis-slicer",
    "type": "slicer",
    "stream": "downstream",
    "attributes": {
      "average_size": 10,
      "size_variation": 5,
      "delay": 100
    }
  }'
```

## Disabling a Proxy Entirely

Simulate a complete outage by disabling the proxy.

```bash
# Disable the Redis proxy (simulates Redis being completely down)
curl -X POST http://localhost:8474/proxies/redis \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# Re-enable it
curl -X POST http://localhost:8474/proxies/redis \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

## Integration Testing with Toxiproxy Client

Use the Toxiproxy client library in your test code for precise control during integration tests.

```python
# test_resilience.py - Integration tests with Toxiproxy
import requests
import pytest
import time

TOXIPROXY_API = "http://localhost:8474"
APP_API = "http://localhost:3000"

class ToxiproxyClient:
    """Simple Toxiproxy client for test setup and teardown."""

    def __init__(self, api_url):
        self.api_url = api_url

    def add_toxic(self, proxy_name, toxic_name, toxic_type, stream="downstream", toxicity=1.0, **attributes):
        resp = requests.post(
            f"{self.api_url}/proxies/{proxy_name}/toxics",
            json={
                "name": toxic_name,
                "type": toxic_type,
                "stream": stream,
                "toxicity": toxicity,
                "attributes": attributes
            }
        )
        resp.raise_for_status()

    def remove_toxic(self, proxy_name, toxic_name):
        requests.delete(f"{self.api_url}/proxies/{proxy_name}/toxics/{toxic_name}")

    def disable_proxy(self, proxy_name):
        requests.post(f"{self.api_url}/proxies/{proxy_name}", json={"enabled": False})

    def enable_proxy(self, proxy_name):
        requests.post(f"{self.api_url}/proxies/{proxy_name}", json={"enabled": True})

@pytest.fixture
def toxiproxy():
    client = ToxiproxyClient(TOXIPROXY_API)
    yield client

def test_api_handles_slow_redis(toxiproxy):
    """Verify the API responds within 2s even when Redis has 1s latency."""
    toxiproxy.add_toxic("redis", "slow-redis", "latency", latency=1000)

    try:
        start = time.time()
        resp = requests.get(f"{APP_API}/api/data", timeout=5)
        elapsed = time.time() - start

        assert resp.status_code == 200
        assert elapsed < 2.0, f"Response took {elapsed:.1f}s, expected under 2s"
    finally:
        toxiproxy.remove_toxic("redis", "slow-redis")

def test_api_handles_database_outage(toxiproxy):
    """Verify the API returns a proper error when the database is down."""
    toxiproxy.disable_proxy("postgres")

    try:
        resp = requests.get(f"{APP_API}/api/users", timeout=5)
        assert resp.status_code in [503, 500]
        data = resp.json()
        assert "error" in data
    finally:
        toxiproxy.enable_proxy("postgres")
```

```bash
# Run the resilience tests
pip install requests pytest
python -m pytest test_resilience.py -v
```

## Wrapping Up

Toxiproxy gives you the finest-grained control over network chaos available in Docker. By sitting as a proxy between services, it lets you target specific connections with specific failure modes. The REST API makes it easy to automate from test code, CI scripts, or monitoring dashboards. Start by adding Toxiproxy to your Docker Compose stack, configuring proxies for each dependency, and writing integration tests that verify your timeout, retry, and fallback logic actually works under degraded conditions.
