# How to Debug Docker Compose Scaling Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Docker Compose, Scaling, DevOps, Troubleshooting

Description: Identify and resolve common Docker Compose scaling problems including port conflicts, resource exhaustion, health check failures, and load balancing issues.

---

Scaling services with Docker Compose seems simple: `docker compose up --scale api=5`. But when replicas fail to start, crash randomly, or cause port conflicts, debugging requires understanding how Compose orchestrates multiple instances. This guide walks through common scaling problems and their solutions.

## Understanding Compose Scaling

When you scale a service, Docker Compose creates multiple containers from the same service definition. Each replica gets a unique name and IP address within the Docker network.

```bash
# Scale the api service to 5 replicas
docker compose up -d --scale api=5

# View all replicas
docker compose ps api
```

The container names follow the pattern `project_service_index`:

```
myproject-api-1
myproject-api-2
myproject-api-3
myproject-api-4
myproject-api-5
```

## Problem 1: Port Conflicts

The most common scaling issue is port conflicts. If you bind a host port, only one replica can use it.

```yaml
# BROKEN: Cannot scale - port 8080 conflict
version: '3.8'
services:
  api:
    image: myapp:latest
    ports:
      - "8080:8080"  # Host port bound
```

Error message:
```
Error response from daemon: driver failed programming external connectivity
Bind for 0.0.0.0:8080 failed: port is already allocated
```

### Solution: Use Dynamic Port Assignment

Let Docker assign random host ports:

```yaml
# Working: Random host ports assigned
version: '3.8'
services:
  api:
    image: myapp:latest
    ports:
      - "8080"  # Container port only, host port assigned dynamically
```

```bash
# Find assigned ports
docker compose ps api
# NAME          PORTS
# api-1         0.0.0.0:32768->8080/tcp
# api-2         0.0.0.0:32769->8080/tcp
```

### Solution: Use a Load Balancer

For production, put a reverse proxy in front of scaled services:

```yaml
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api

  api:
    image: myapp:latest
    # No host ports - only accessible through nginx
    expose:
      - "8080"
```

```nginx
# nginx.conf
upstream api_servers {
    server api:8080;  # Docker DNS resolves to all replicas
}

server {
    listen 80;
    location / {
        proxy_pass http://api_servers;
    }
}
```

## Problem 2: Resource Exhaustion

Scaling creates more containers competing for resources. Symptoms include slow startup, OOM kills, or containers stuck in "starting" state.

```bash
# Check resource usage across all replicas
docker stats --no-stream $(docker compose ps -q api)

# Check for OOM kills
docker compose ps -a | grep -E "Exit|OOM"
docker inspect --format '{{.State.OOMKilled}}' myproject-api-1
```

### Solution: Set Resource Limits

Define limits in your Compose file:

```yaml
version: '3.8'
services:
  api:
    image: myapp:latest
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M
      replicas: 5
```

Check if host has enough resources before scaling:

```bash
# Calculate required resources
# 5 replicas * 256MB = 1.28GB memory needed

# Check available resources
docker system info | grep -E "Total Memory|CPUs"
```

## Problem 3: Health Check Failures

Replicas may start but fail health checks, causing restarts or never becoming healthy.

```bash
# Check health status
docker compose ps
# NAME    STATUS
# api-1   Up (healthy)
# api-2   Up (unhealthy)
# api-3   Up (health: starting)

# View health check logs
docker inspect --format '{{json .State.Health}}' myproject-api-2 | jq
```

### Solution: Adjust Health Check Timing

Scaled services may need longer startup times:

```yaml
version: '3.8'
services:
  api:
    image: myapp:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s  # Give app time to start
```

## Problem 4: Database Connection Exhaustion

Multiple replicas can overwhelm database connection pools:

```mermaid
graph TD
    A[api-1] --> D[Database]
    B[api-2] --> D
    C[api-3] --> D
    E[api-4] --> D
    F[api-5] --> D

    D --> G[Connection Pool: 100 max]

    A --> H[20 connections each]
    B --> H
    C --> H
    E --> H
    F --> H
    H --> I[Total: 100 connections]
```

### Solution: Configure Connection Pools

Set per-replica connection limits:

```yaml
version: '3.8'
services:
  api:
    image: myapp:latest
    environment:
      # Each replica gets fewer connections
      - DB_POOL_SIZE=10  # 10 * 5 replicas = 50 total
    deploy:
      replicas: 5

  database:
    image: postgres:15
    environment:
      - POSTGRES_MAX_CONNECTIONS=100
```

Or use a connection pooler like PgBouncer:

```yaml
services:
  pgbouncer:
    image: edoburu/pgbouncer
    environment:
      - DATABASE_URL=postgres://user:pass@database:5432/app
      - POOL_MODE=transaction
      - MAX_CLIENT_CONN=200
    depends_on:
      - database

  api:
    image: myapp:latest
    environment:
      # Connect through pooler
      - DATABASE_URL=postgres://user:pass@pgbouncer:5432/app
```

## Problem 5: Shared Volume Conflicts

Multiple replicas writing to the same volume can cause data corruption:

```yaml
# DANGEROUS: Multiple writers to same path
services:
  api:
    image: myapp:latest
    volumes:
      - ./data:/app/data
```

### Solution: Use Replica-Specific Paths or External Storage

```yaml
version: '3.8'
services:
  api:
    image: myapp:latest
    volumes:
      # Read-only shared config
      - ./config:/app/config:ro
      # Use external storage for writes (S3, NFS, etc.)
    environment:
      - STORAGE_BACKEND=s3
      - S3_BUCKET=myapp-uploads
```

## Problem 6: Service Discovery Issues

Replicas may not be discoverable by other services:

```bash
# Test DNS resolution
docker compose exec nginx nslookup api

# Should return multiple IPs for scaled service
# Server:    127.0.0.11
# Address 1: 127.0.0.11
# Name:      api
# Address 1: 172.18.0.3 myproject-api-1.myproject_default
# Address 2: 172.18.0.4 myproject-api-2.myproject_default
```

### Solution: Verify Network Configuration

```yaml
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    networks:
      - frontend
      - backend
    depends_on:
      api:
        condition: service_healthy

  api:
    image: myapp:latest
    networks:
      - backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 10s
      timeout: 5s
      retries: 3

networks:
  frontend:
  backend:
```

## Problem 7: Uneven Load Distribution

Docker DNS returns IPs in round-robin order, but long-lived connections may cause uneven distribution:

```bash
# Check which replica is handling traffic
docker compose logs -f api | grep "request handled"

# Monitor connections per replica
docker stats --no-stream $(docker compose ps -q api)
```

### Solution: Configure Nginx for Better Balancing

```nginx
upstream api_servers {
    least_conn;  # Send to least busy server
    server api:8080;
}

# Or with health checks
upstream api_servers {
    server api:8080 max_fails=3 fail_timeout=30s;
}
```

## Debugging Commands Reference

```bash
# View all replica logs interleaved
docker compose logs -f api

# View specific replica logs
docker compose logs -f api-3

# Execute command on all replicas
for i in $(docker compose ps -q api); do
  docker exec $i cat /app/version.txt
done

# Check replica network connectivity
docker compose exec api-1 ping -c 2 api-2

# Monitor scaling events
docker compose events --filter service=api

# Inspect replica differences
diff <(docker inspect myproject-api-1) <(docker inspect myproject-api-2)
```

## Scaling with Deploy Configuration

For more control, use the deploy key (requires Compose v3+):

```yaml
version: '3.8'
services:
  api:
    image: myapp:latest
    deploy:
      replicas: 5
      update_config:
        parallelism: 2      # Update 2 at a time
        delay: 10s          # Wait 10s between batches
        failure_action: rollback
      rollback_config:
        parallelism: 1
        delay: 5s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
```

Note: `deploy` configuration is fully supported only in Swarm mode. For standalone Compose, use `--scale` flag and service-level settings.

---

Scaling Docker Compose services exposes configuration issues that single containers hide. Port bindings, resource limits, connection pools, and health checks all need adjustment for multi-replica deployments. Start with two replicas to catch issues early, then scale up once the configuration is solid.
