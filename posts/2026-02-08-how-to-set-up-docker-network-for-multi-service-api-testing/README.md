# How to Set Up Docker Network for Multi-Service API Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, docker network, api testing, microservices, docker compose, networking

Description: Learn how to configure Docker networks so multiple services can communicate during API integration testing.

---

Testing APIs across multiple services gets tricky fast. You spin up a REST API, a database, maybe a cache layer, and suddenly nothing can talk to anything else. Docker networks solve this problem by giving your containers a shared communication layer where services discover each other by name.

This guide walks through setting up Docker networks specifically for multi-service API testing scenarios. You will build a practical test environment with multiple services, configure networking between them, and run integration tests that verify cross-service communication.

## Why Docker Networks Matter for API Testing

When you run containers without specifying a network, Docker places them on the default bridge network. Containers on the default bridge can only reach each other by IP address, not by name. That falls apart quickly in testing because container IPs change every time you restart them.

Custom Docker networks provide automatic DNS resolution. If you name a container `api-server`, other containers on the same network can reach it at `http://api-server:3000`. This makes your test configurations stable and repeatable.

## Creating a Custom Docker Network

Start by creating a dedicated network for your test environment.

This command creates a bridge network with a descriptive name for your testing setup:

```bash
# Create a custom bridge network for API testing
docker network create --driver bridge api-test-network
```

Verify the network exists:

```bash
# List all Docker networks and filter for our test network
docker network ls --filter name=api-test
```

You should see output like:

```
NETWORK ID     NAME               DRIVER    SCOPE
a1b2c3d4e5f6   api-test-network   bridge    local
```

## Setting Up a Multi-Service Test Environment

Let's build a realistic scenario. You have a REST API that talks to a PostgreSQL database and a Redis cache. Your integration tests need all three services running and connected.

### Step 1: Start the Database

Launch PostgreSQL on your test network:

```bash
# Start PostgreSQL on the custom network with a fixed container name
docker run -d \
  --name test-postgres \
  --network api-test-network \
  -e POSTGRES_USER=testuser \
  -e POSTGRES_PASSWORD=testpass \
  -e POSTGRES_DB=testdb \
  postgres:16-alpine
```

### Step 2: Start the Cache

Launch Redis on the same network:

```bash
# Start Redis on the same network so the API can reach it
docker run -d \
  --name test-redis \
  --network api-test-network \
  redis:7-alpine
```

### Step 3: Start the API Service

Now start your API service, which connects to both backing services by container name:

```bash
# Start the API server, referencing other services by their container names
docker run -d \
  --name test-api \
  --network api-test-network \
  -e DATABASE_URL=postgresql://testuser:testpass@test-postgres:5432/testdb \
  -e REDIS_URL=redis://test-redis:6379 \
  -p 8080:8080 \
  your-api-image:latest
```

Notice how `DATABASE_URL` uses `test-postgres` as the hostname and `REDIS_URL` uses `test-redis`. Docker's built-in DNS resolves these names to the correct container IPs automatically.

## Using Docker Compose for Cleaner Setup

Managing multiple `docker run` commands gets tedious. Docker Compose handles all of this in a single file.

This Compose file defines the same three-service setup with proper networking:

```yaml
# docker-compose.test.yml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: testuser
      POSTGRES_PASSWORD: testpass
      POSTGRES_DB: testdb
    # Health check ensures the database is ready before the API starts
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U testuser -d testdb"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - api-test

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - api-test

  api:
    build: .
    environment:
      DATABASE_URL: postgresql://testuser:testpass@postgres:5432/testdb
      REDIS_URL: redis://redis:6379
    ports:
      - "8080:8080"
    # Wait for dependencies to be healthy before starting
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - api-test

  # Dedicated test runner container
  test-runner:
    build:
      context: .
      dockerfile: Dockerfile.test
    environment:
      API_BASE_URL: http://api:8080
    depends_on:
      - api
    networks:
      - api-test

networks:
  api-test:
    driver: bridge
```

Bring everything up and run tests with a single command:

```bash
# Start all services and run the test container
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit
```

The `--abort-on-container-exit` flag shuts down all services once the test runner finishes.

## Verifying Network Connectivity

Before running your full test suite, verify that containers can reach each other.

Use `docker exec` to test DNS resolution from inside a container:

```bash
# Check if the API container can resolve the postgres hostname
docker exec test-api ping -c 2 test-postgres

# Verify Redis is reachable from the API container
docker exec test-api ping -c 2 test-redis
```

For a deeper look at which containers are on the network:

```bash
# Inspect the network to see all connected containers and their IPs
docker network inspect api-test-network --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{"\n"}}{{end}}'
```

## Network Isolation for Parallel Test Runs

Running multiple test suites in parallel requires isolated networks so tests do not interfere with each other.

Create unique networks per test run using a prefix or timestamp:

```bash
# Generate a unique network name for this test run
TEST_ID=$(date +%s)
NETWORK_NAME="api-test-${TEST_ID}"

# Create the isolated network
docker network create --driver bridge "$NETWORK_NAME"

# Run services on this unique network
docker run -d --name "postgres-${TEST_ID}" --network "$NETWORK_NAME" \
  -e POSTGRES_USER=testuser -e POSTGRES_PASSWORD=testpass \
  postgres:16-alpine
```

Clean up after each test run:

```bash
# Stop and remove all containers on the test network
docker network disconnect "$NETWORK_NAME" "postgres-${TEST_ID}" 2>/dev/null
docker rm -f "postgres-${TEST_ID}" 2>/dev/null

# Remove the network itself
docker network rm "$NETWORK_NAME"
```

## Debugging Network Issues

When containers cannot reach each other, start with these commands.

Check that all containers are on the same network:

```bash
# List networks a specific container belongs to
docker inspect test-api --format '{{range $key, $value := .NetworkSettings.Networks}}{{$key}}{{"\n"}}{{end}}'
```

If a container was started on the wrong network, attach it without restarting:

```bash
# Connect a running container to an additional network
docker network connect api-test-network test-api
```

Test TCP connectivity on specific ports:

```bash
# Install and use netcat inside the container to test port connectivity
docker exec test-api sh -c "apk add --no-cache netcat-openbsd && nc -zv test-postgres 5432"
```

## Subnet Configuration for Advanced Scenarios

Sometimes you need predictable IP ranges, especially when testing firewall rules or IP-based access controls.

Create a network with a specific subnet:

```bash
# Create a network with a fixed subnet range
docker network create \
  --driver bridge \
  --subnet 172.28.0.0/16 \
  --gateway 172.28.0.1 \
  api-test-fixed
```

Assign static IPs to containers:

```bash
# Start a container with a fixed IP address on the custom subnet
docker run -d \
  --name test-postgres \
  --network api-test-fixed \
  --ip 172.28.0.10 \
  -e POSTGRES_USER=testuser \
  -e POSTGRES_PASSWORD=testpass \
  postgres:16-alpine
```

## Cleaning Up After Tests

Always tear down test infrastructure when you are done. Leftover networks and containers consume resources and can cause port conflicts on subsequent runs.

Remove everything related to a Compose-based test setup:

```bash
# Stop containers, remove them, remove networks and volumes created by Compose
docker compose -f docker-compose.test.yml down -v --remove-orphans
```

For manual cleanup of stale test networks:

```bash
# Remove all unused networks (networks not connected to any container)
docker network prune -f
```

## Summary

Docker networks give you reliable, DNS-based service discovery for multi-service API testing. Custom bridge networks let containers find each other by name, which eliminates the fragility of hard-coded IP addresses. Docker Compose simplifies orchestration further by declaring networks, health checks, and dependencies in a single file. For parallel test runs, create isolated networks per test session and clean them up afterward. With this setup, your integration tests run the same way locally as they do in CI.
