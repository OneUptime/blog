# How to Connect to Services Running in Docker from Host Machine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, DevOps, Troubleshooting, Development

Description: Learn how to connect to services running inside Docker containers from your host machine using port mapping, host networking, and other techniques with practical examples.

---

When you spin up a database, web server, or API inside a Docker container, you often need to access it from your host machine. Maybe you want to connect your IDE to a containerized database, or test an API endpoint from your browser. This guide covers all the ways to make that connection work reliably.

## Understanding the Network Boundary

Docker creates an isolated network for containers. By default, services running inside containers listen on ports that are only accessible within that network. Your host machine sits outside this network boundary, so you need to explicitly bridge the gap.

```mermaid
graph LR
    subgraph Host Machine
        A[Browser/Client]
        B[Host Port 8080]
    end
    subgraph Docker Network
        C[Container Port 3000]
        D[Your Application]
    end
    A --> B
    B --> C
    C --> D
```

## Method 1: Port Mapping with -p Flag

The most common approach is port mapping. You tell Docker to forward traffic from a port on your host to a port inside the container.

```bash
# Map host port 8080 to container port 3000
# Syntax: -p <host_port>:<container_port>
docker run -d -p 8080:3000 my-node-app

# Now access the app at http://localhost:8080
curl http://localhost:8080
```

You can map to a specific interface if you only want local access:

```bash
# Only accept connections from localhost (127.0.0.1)
# This prevents external machines from reaching the service
docker run -d -p 127.0.0.1:8080:3000 my-node-app

# Map to all interfaces (same as default)
docker run -d -p 0.0.0.0:8080:3000 my-node-app
```

### Port Mapping in Docker Compose

For multi-container setups, define ports in your compose file:

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    image: nginx:alpine
    ports:
      # Map host port 80 to container port 80
      - "80:80"
      # Map host port 443 to container port 443
      - "443:443"

  api:
    build: ./api
    ports:
      # Only expose on localhost for security
      - "127.0.0.1:3000:3000"

  postgres:
    image: postgres:15
    ports:
      # Connect from host with psql -h localhost -p 5432
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: devpassword
```

## Method 2: Host Network Mode

When you need the container to share the host's network stack directly, use host networking. The container sees the same network interfaces as your host machine.

```bash
# Container uses host's network directly
# No port mapping needed - service is on host's ports
docker run -d --network host my-node-app

# If app listens on port 3000, access it directly
curl http://localhost:3000
```

This approach eliminates the network translation overhead but has tradeoffs:

- No port isolation between containers
- Port conflicts with host services
- Not available on Docker Desktop for Mac/Windows (only Linux)

```yaml
# docker-compose.yml with host network
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    network_mode: host
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
```

## Method 3: Using Docker's DNS

When services need to talk to each other and you need to connect from the host, use a combination approach:

```yaml
# docker-compose.yml
version: '3.8'

services:
  redis:
    image: redis:7
    # Expose to host for debugging and local development
    ports:
      - "6379:6379"

  worker:
    build: ./worker
    # Worker connects using service name as hostname
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
```

From your host, connect to `localhost:6379`. From within containers on the same network, connect to `redis:6379`.

## Connecting to Common Services

### PostgreSQL

```bash
# Run PostgreSQL with port mapping
docker run -d \
  --name postgres \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=myapp \
  -p 5432:5432 \
  postgres:15

# Connect from host using psql
psql -h localhost -p 5432 -U admin -d myapp

# Or using a connection string in your application
# postgresql://admin:secret@localhost:5432/myapp
```

### MySQL

```bash
# Run MySQL with port mapping
docker run -d \
  --name mysql \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=myapp \
  -p 3306:3306 \
  mysql:8

# Connect from host
mysql -h 127.0.0.1 -P 3306 -u root -p
```

### Redis

```bash
# Run Redis with port mapping
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7

# Connect using redis-cli from host
redis-cli -h localhost -p 6379

# Test the connection
redis-cli ping
# Should return: PONG
```

### MongoDB

```bash
# Run MongoDB with authentication
docker run -d \
  --name mongo \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=secret \
  -p 27017:27017 \
  mongo:6

# Connect from host using mongosh
mongosh "mongodb://admin:secret@localhost:27017"
```

## Troubleshooting Connection Issues

### Check if the Port is Mapped

```bash
# List containers with their port mappings
docker ps --format "table {{.Names}}\t{{.Ports}}"

# Example output:
# NAMES     PORTS
# postgres  0.0.0.0:5432->5432/tcp
# redis     0.0.0.0:6379->6379/tcp
```

### Verify the Service is Listening Inside the Container

```bash
# Check what ports are open inside the container
docker exec postgres netstat -tlnp

# Or using ss (on newer images)
docker exec postgres ss -tlnp
```

### Check for Port Conflicts

```bash
# See what's using a port on your host (macOS/Linux)
lsof -i :5432

# On Linux, you can also use
netstat -tlnp | grep 5432
```

### Test Connectivity

```bash
# Basic connectivity test
nc -zv localhost 5432

# Or using curl for HTTP services
curl -v http://localhost:8080/health
```

### Service Binding to Wrong Interface

A common issue is when the service inside the container binds to 127.0.0.1 instead of 0.0.0.0. This means it only accepts connections from inside the container.

```bash
# Wrong: Service binds to localhost only
# This will NOT accept connections from the host
node server.js --host 127.0.0.1

# Correct: Service binds to all interfaces
node server.js --host 0.0.0.0
```

For example, with a Node.js Express app:

```javascript
// server.js
const express = require('express');
const app = express();

// Listen on all interfaces (0.0.0.0), not just localhost
// This is required for the container to accept external connections
app.listen(3000, '0.0.0.0', () => {
  console.log('Server listening on port 3000');
});
```

## Security Considerations

When exposing services to your host, keep these points in mind:

1. **Bind to localhost in development**: Use `127.0.0.1:port:port` to prevent other machines on your network from accessing the service.

2. **Use strong passwords**: Even for development databases, use proper credentials. They have a way of ending up in version control.

3. **Don't expose databases in production**: In production, databases should only be accessible from within the container network.

```yaml
# Production compose file - no host ports for database
version: '3.8'

services:
  api:
    build: ./api
    ports:
      - "80:3000"
    environment:
      DATABASE_URL: postgres://user:pass@postgres:5432/app

  postgres:
    image: postgres:15
    # No ports section - only accessible within docker network
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
```

## Summary

Connecting to Docker services from your host machine comes down to three main approaches: port mapping with `-p` for most cases, host networking when you need direct access, and proper service configuration to bind to all interfaces. Most connection problems trace back to either missing port mappings, port conflicts on the host, or services binding to the wrong interface inside the container. Use `docker ps` to verify your mappings and test connectivity with basic tools like `curl` or `nc` before diving into more complex debugging.
