# How to Fix Docker Compose Services Not Finding Each Other by Name

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, docker-compose, service discovery, DNS, networking, troubleshooting, containers

Description: Fix Docker Compose services that cannot resolve each other by service name, covering network configuration, DNS, and common connectivity mistakes.

---

You set up two services in Docker Compose. Your API service tries to connect to `db:5432` for the database. But the connection fails with "could not resolve host: db" or "connection refused." The whole point of Docker Compose is that services should find each other by name automatically. When that breaks, it defeats one of the core reasons for using Compose in the first place.

Let's figure out why service discovery fails and how to fix it.

## How Docker Compose Service Discovery Works

When you run `docker compose up`, Compose creates a default network for your project. Every service defined in the Compose file joins this network. Docker's built-in DNS server (running at 127.0.0.11) maps each service name to its container's IP address. So if you have a service called `db`, any other service on the same network can reach it by the hostname `db`.

Verify the network exists and containers are connected:

```bash
# List networks created by Compose
docker network ls | grep $(basename $(pwd))

# Inspect the network to see connected containers
docker network inspect $(basename $(pwd))_default
```

## Cause 1: Services on Different Networks

If you define custom networks and forget to put both services on the same network, they cannot see each other.

```yaml
# Broken: webapp and db are on different networks
services:
  webapp:
    image: myapp:latest
    networks:
      - frontend

  db:
    image: postgres:15
    networks:
      - backend

networks:
  frontend:
  backend:
```

The webapp cannot resolve `db` because they share no common network.

Fix by putting communicating services on the same network:

```yaml
# Fixed: both services share the backend network
services:
  webapp:
    image: myapp:latest
    networks:
      - frontend
      - backend  # Added: webapp can now reach db

  db:
    image: postgres:15
    networks:
      - backend

networks:
  frontend:
  backend:
```

Or simply do not define custom networks at all. The default network works fine for most projects:

```yaml
# Simplest approach: use the default network (all services are connected)
services:
  webapp:
    image: myapp:latest
    ports:
      - "8080:80"

  db:
    image: postgres:15
```

## Cause 2: Using the Default Bridge Network

If you explicitly set `network_mode: bridge` or connect to Docker's default bridge network (docker0), the built-in DNS server is not available. DNS-based service discovery only works on user-defined networks.

```yaml
# Broken: default bridge network has no DNS service discovery
services:
  webapp:
    image: myapp:latest
    network_mode: bridge  # This disables Compose DNS

  db:
    image: postgres:15
    network_mode: bridge
```

Fix by removing the `network_mode` and letting Compose use its default user-defined network:

```yaml
# Fixed: Compose creates a user-defined network automatically
services:
  webapp:
    image: myapp:latest

  db:
    image: postgres:15
```

## Cause 3: Using network_mode: host

When a service uses `network_mode: host`, it bypasses Docker networking entirely. It cannot use Docker DNS to find other services, and other services cannot find it by name.

```yaml
# Broken: host network mode disables service discovery
services:
  webapp:
    image: myapp:latest
    network_mode: host

  db:
    image: postgres:15
```

If you must use host networking for one service, the other services need to connect to it using `host.docker.internal` (on Docker Desktop) or the host's actual IP address:

```yaml
# Workaround for host network mode
services:
  webapp:
    image: myapp:latest
    network_mode: host

  db:
    image: postgres:15
    ports:
      - "5432:5432"  # Expose on host so the webapp can reach it
```

In the webapp, connect to `localhost:5432` or the host IP instead of `db:5432`.

## Cause 4: Service Not Ready Yet

The service name resolves correctly, but the container has not started its application yet. Docker Compose starts containers in dependency order, but it does not wait for the application inside to be ready.

```yaml
# The db service might not be accepting connections yet when webapp starts
services:
  webapp:
    image: myapp:latest
    depends_on:
      - db  # Only waits for the container to start, not for the app

  db:
    image: postgres:15
```

Fix with health checks and conditional depends_on:

```yaml
# Fixed: webapp waits for db to be healthy
services:
  webapp:
    image: myapp:latest
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:15
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s
```

For services without built-in health checks, use a generic TCP check:

```yaml
# Health check using a TCP connection test
services:
  redis:
    image: redis:7
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
```

## Cause 5: Wrong Hostname in Application Configuration

The hostname must match the service name exactly as defined in `docker-compose.yml`. A common mistake is using `localhost` instead of the service name.

```yaml
services:
  webapp:
    image: myapp:latest
    environment:
      # Wrong: localhost refers to the webapp container itself
      # - DATABASE_URL=postgresql://user:pass@localhost:5432/mydb

      # Right: use the service name as the hostname
      - DATABASE_URL=postgresql://user:pass@db:5432/mydb

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=mydb
```

Another mistake is using the container name instead of the service name:

```yaml
services:
  webapp:
    image: myapp:latest
    environment:
      # Wrong: using the container name
      # - REDIS_HOST=myproject-cache-1

      # Right: use the service name
      - REDIS_HOST=cache

  cache:
    image: redis:7
    container_name: myproject-cache-1  # Container name != service name for DNS
```

## Cause 6: DNS Caching Issues

If a container was resolved once and the target container restarts with a new IP, the cached DNS entry might be stale.

```bash
# Check the current IP of a service
docker compose exec db hostname -i

# Check what IP the webapp sees for 'db'
docker compose exec webapp nslookup db
```

Docker's internal DNS has a short TTL, but some applications cache DNS results for longer. Fix this at the application level:

```yaml
# For Java applications, disable DNS caching
services:
  webapp:
    image: myapp:latest
    environment:
      - JAVA_OPTS=-Dnetworkaddress.cache.ttl=0 -Dnetworkaddress.cache.negative.ttl=0
```

## Cause 7: Container Name Conflicts

If you manually set `container_name` and have a naming conflict with another project, networking can break.

```yaml
# Risky: hardcoded container names can conflict across projects
services:
  db:
    image: postgres:15
    container_name: postgres  # If another project uses this name, it fails
```

Let Compose manage container names automatically, or use unique names:

```yaml
# Better: let Compose generate the name or use a project-specific prefix
services:
  db:
    image: postgres:15
    container_name: myproject-postgres
```

## Debugging Service Discovery

Run through this diagnostic sequence:

```bash
# Step 1: Verify both containers are running
docker compose ps

# Step 2: Check they are on the same network
docker network inspect $(docker compose config --format json | python3 -c "
import sys, json
config = json.load(sys.stdin)
networks = config.get('networks', {})
for name in networks:
    print(name)
") 2>/dev/null || docker network ls | grep $(basename $(pwd))

# Step 3: Test DNS resolution from one service to another
docker compose exec webapp nslookup db

# Step 4: Test actual connectivity
docker compose exec webapp ping -c 2 db

# Step 5: Test the application port
docker compose exec webapp nc -zv db 5432
```

A simpler approach using just the essential commands:

```bash
# Quick DNS check
docker compose exec webapp getent hosts db

# Quick port check
docker compose exec webapp sh -c "echo > /dev/tcp/db/5432" 2>&1 && echo "Port open" || echo "Port closed"
```

## Using Service Aliases

If your application expects a specific hostname that does not match the service name, use network aliases:

```yaml
# Service with network aliases
services:
  db:
    image: postgres:15
    networks:
      default:
        aliases:
          - postgres
          - database
          - primary-db
```

Now the database is reachable by `db`, `postgres`, `database`, or `primary-db` from any other service.

## Summary

Docker Compose service discovery works automatically when services are on the same user-defined network. The most common failures are: services placed on different custom networks, explicit use of the default bridge or host network mode, applications connecting to `localhost` instead of the service name, and services trying to connect before the target is ready. Start debugging with `nslookup` or `getent hosts` from inside the container that cannot connect. If DNS resolves but the connection fails, the target application is not ready yet, so add health checks and conditional `depends_on`. Keep things simple by using the default Compose network unless you have a specific reason to create custom networks.
