# How to Set Up Communication Between Docker Compose Projects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Docker Compose, Networking, Microservices, DevOps

Description: Learn how to connect services across separate Docker Compose projects using external networks, enabling microservices communication while maintaining project isolation.

---

You have two Docker Compose projects that need to talk to each other. Maybe a frontend project needs to reach an API in another project, or a shared database serves multiple applications. By default, each Compose project creates its own isolated network, so containers cannot see each other. This guide shows you how to bridge that gap.

## Understanding Docker Compose Networks

Each Docker Compose project creates a default network named `<project>_default`. Containers within the same network can communicate using service names as hostnames.

```mermaid
graph TB
    subgraph Project A Network
        A1[frontend]
        A2[api]
    end
    subgraph Project B Network
        B1[backend]
        B2[database]
    end
    A2 -.->|Cannot reach| B1
```

To enable cross-project communication, you need to either share a network or expose services through the host.

## Method 1: External Networks

Create a network that exists outside any single Compose project, then connect both projects to it.

### Step 1: Create the External Network

```bash
# Create a network manually (outside of any Compose project)
docker network create shared-network

# Verify it was created
docker network ls | grep shared-network
```

### Step 2: Connect Project A

```yaml
# project-a/docker-compose.yml
version: '3.8'

services:
  api:
    build: ./api
    networks:
      - shared-network
      - default  # Keep default network for internal services
    environment:
      DB_HOST: database  # Service name from Project B

  worker:
    build: ./worker
    networks:
      - default  # Only needs internal access

networks:
  shared-network:
    external: true  # Use existing network, don't create new one
```

### Step 3: Connect Project B

```yaml
# project-b/docker-compose.yml
version: '3.8'

services:
  database:
    image: postgres:15
    networks:
      - shared-network
      - default
    environment:
      POSTGRES_PASSWORD: secret

  backend:
    build: ./backend
    networks:
      - shared-network
      - default

networks:
  shared-network:
    external: true
```

Now `api` from Project A can connect to `database` in Project B using the hostname `database`.

```mermaid
graph TB
    subgraph Shared Network
        direction LR
        A[api - Project A]
        B[database - Project B]
        C[backend - Project B]
    end
    A -->|database:5432| B
    A -->|backend:8080| C
```

## Method 2: Join Existing Compose Network

Instead of creating a new network, one project can join the network created by another project.

### Project A Creates the Network

```yaml
# project-a/docker-compose.yml
version: '3.8'

services:
  api:
    build: ./api
    ports:
      - "3000:3000"

  database:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: secret

# Default network will be named "project-a_default"
```

### Project B Joins Project A's Network

```yaml
# project-b/docker-compose.yml
version: '3.8'

services:
  worker:
    build: ./worker
    networks:
      - project-a-network
    environment:
      # Connect to services in Project A
      API_URL: http://api:3000
      DB_HOST: database

networks:
  project-a-network:
    external: true
    name: project-a_default  # The actual network name
```

**Important**: Project A must be running before Project B starts, otherwise the network does not exist.

## Method 3: Using Host Networking

For simpler setups, expose services on host ports and connect via `host.docker.internal` (Docker Desktop) or the host IP.

```yaml
# project-a/docker-compose.yml - Database project
version: '3.8'

services:
  database:
    image: postgres:15
    ports:
      - "5432:5432"  # Expose on host
    environment:
      POSTGRES_PASSWORD: secret
```

```yaml
# project-b/docker-compose.yml - Application project
version: '3.8'

services:
  api:
    build: ./api
    environment:
      # On Docker Desktop (Mac/Windows)
      DB_HOST: host.docker.internal
      DB_PORT: 5432
    extra_hosts:
      # On Linux, add this mapping
      - "host.docker.internal:host-gateway"
```

This approach is simpler but has drawbacks:
- Services are exposed on the host (security concern)
- Port conflicts between projects
- Less isolation

## Method 4: Network Aliases

Give services meaningful names that work across networks:

```yaml
# project-a/docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    networks:
      shared-network:
        # Alias makes this service discoverable as 'shared-db'
        aliases:
          - shared-db
          - main-database
      default:
        aliases:
          - db

networks:
  shared-network:
    external: true
```

```yaml
# project-b/docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    networks:
      - shared-network
    environment:
      # Use the alias defined in Project A
      DATABASE_URL: postgres://user:pass@shared-db:5432/myapp

networks:
  shared-network:
    external: true
```

## Complete Microservices Example

Here is a realistic setup with three projects: shared infrastructure, backend API, and frontend.

### Shared Infrastructure Project

```yaml
# infrastructure/docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    networks:
      infra-network:
        aliases:
          - db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: app

  redis:
    image: redis:7
    networks:
      infra-network:
        aliases:
          - cache
    volumes:
      - redis_data:/data

networks:
  infra-network:
    name: shared-infra  # Explicit name for clarity

volumes:
  postgres_data:
  redis_data:
```

### Backend API Project

```yaml
# backend/docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    networks:
      - shared-infra
      - backend-internal
    environment:
      DATABASE_URL: postgres://postgres:${DB_PASSWORD}@db:5432/app
      REDIS_URL: redis://cache:6379

  worker:
    build: .
    command: celery -A tasks worker
    networks:
      - shared-infra
      - backend-internal
    environment:
      DATABASE_URL: postgres://postgres:${DB_PASSWORD}@db:5432/app
      REDIS_URL: redis://cache:6379

networks:
  shared-infra:
    external: true
  backend-internal:
    # Internal network for backend services only
```

### Frontend Project

```yaml
# frontend/docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    networks:
      - shared-infra
    environment:
      API_URL: http://api:8000

networks:
  shared-infra:
    external: true
```

### Startup Script

```bash
#!/bin/bash
# start-all.sh

# Create shared network if it doesn't exist
docker network create shared-infra 2>/dev/null || true

# Start infrastructure first
echo "Starting infrastructure..."
docker compose -f infrastructure/docker-compose.yml up -d

# Wait for database to be ready
echo "Waiting for database..."
sleep 10

# Start backend
echo "Starting backend..."
docker compose -f backend/docker-compose.yml up -d

# Start frontend
echo "Starting frontend..."
docker compose -f frontend/docker-compose.yml up -d

echo "All services started!"
docker compose -f infrastructure/docker-compose.yml ps
docker compose -f backend/docker-compose.yml ps
docker compose -f frontend/docker-compose.yml ps
```

## Debugging Cross-Project Communication

### Check Network Connectivity

```bash
# List all networks
docker network ls

# Inspect a network to see connected containers
docker network inspect shared-infra

# Test DNS resolution from a container
docker exec api ping -c 3 database

# Test TCP connectivity
docker exec api nc -zv database 5432
```

### Verify Service Names

```bash
# Get container names on a network
docker network inspect shared-infra --format='{{range .Containers}}{{.Name}} {{end}}'

# Check what networks a container is connected to
docker inspect api --format='{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'
```

### Common Issues

**Service not found:**
```bash
# Error: could not resolve host 'database'

# Check if both containers are on the same network
docker network inspect shared-network | grep -A 5 "Containers"

# Make sure service names match exactly
```

**Connection refused:**
```bash
# The service is reachable but not accepting connections

# Check if the service is listening
docker exec database netstat -tlnp

# Verify the service binds to 0.0.0.0, not 127.0.0.1
```

**Network does not exist:**
```bash
# Error: network shared-network not found

# Create it before starting Compose
docker network create shared-network

# Or ensure the project that creates it starts first
```

## Security Considerations

When connecting projects across networks:

1. **Limit exposure**: Only add services to shared networks if they need cross-project access.

2. **Use internal networks**: For services that only need to be reached by other containers, use Docker's internal network driver.

```yaml
networks:
  internal-only:
    internal: true  # No external access
```

3. **Separate concerns**: Infrastructure (databases) on one network, application services on another, with only specific services bridging them.

4. **Use secrets**: Never hardcode passwords in Compose files. Use environment variables or Docker secrets.

## Summary

Cross-project Docker Compose communication requires shared networks. Create an external network with `docker network create`, then reference it in both Compose files with `external: true`. Services on the same network can reach each other by service name. For complex setups, use network aliases to give services meaningful names across projects. Always start dependencies first and verify connectivity with basic tools like `ping` and `nc` before debugging application-level issues.
