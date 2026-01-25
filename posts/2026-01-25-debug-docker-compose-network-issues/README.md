# How to Debug Docker Compose Network Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Docker Compose, Networking, Troubleshooting, DevOps

Description: Diagnose and fix Docker Compose networking problems including DNS resolution failures, connectivity issues between services, and network configuration conflicts.

---

Docker Compose creates a default network for your services where containers can reach each other by service name. When networking breaks, services cannot communicate, DNS fails, or containers get wrong IP addresses. This guide covers systematic debugging of Compose network issues.

## Understanding Compose Networking

By default, Compose creates a bridge network named `<project>_default`:

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    image: myapp:latest
  database:
    image: postgres:15
```

```bash
# Compose creates network automatically
docker compose up -d
docker network ls | grep default
# myproject_default   bridge   local
```

Services connect using their service names as hostnames:

```bash
# From api container, reach database
docker compose exec api ping database
docker compose exec api curl http://database:5432
```

## Problem 1: Service Name Resolution Fails

Symptoms:
```bash
docker compose exec api ping database
# ping: database: Name does not resolve
```

### Debug DNS Resolution

```bash
# Check DNS configuration in container
docker compose exec api cat /etc/resolv.conf
# Should show Docker's internal DNS: nameserver 127.0.0.11

# Test DNS directly
docker compose exec api nslookup database
# Should return the container IP

# Check if service is running
docker compose ps database
```

### Common Causes

**Wrong network configuration:**

```yaml
# BROKEN: Services on different networks
services:
  api:
    networks:
      - frontend
  database:
    networks:
      - backend
# api cannot reach database - different networks!

networks:
  frontend:
  backend:

# FIXED: Shared network
services:
  api:
    networks:
      - frontend
      - backend
  database:
    networks:
      - backend

networks:
  frontend:
  backend:
```

**Service not started:**

```bash
# Check if database container is running
docker compose ps

# Start missing service
docker compose up -d database
```

**Hostname override:**

```yaml
# CAREFUL: hostname overrides service name for DNS
services:
  database:
    image: postgres:15
    hostname: pg-primary  # Container's hostname
    # Other services still use "database" to connect!
```

## Problem 2: Connection Refused

Service resolves but connections fail:

```bash
docker compose exec api curl http://database:5432
# curl: (7) Failed to connect to database port 5432: Connection refused
```

### Debug Connection Issues

```bash
# Check if service is listening on expected port
docker compose exec database netstat -tlnp
# Or
docker compose exec database ss -tlnp

# Check exposed ports
docker compose exec database cat /proc/net/tcp

# Test from another container on same network
docker compose exec api nc -zv database 5432
```

### Common Causes

**Service not ready:**

```yaml
# Add health check to wait for readiness
services:
  api:
    depends_on:
      database:
        condition: service_healthy

  database:
    image: postgres:15
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 5s
      timeout: 5s
      retries: 5
```

**Wrong port:**

```yaml
# Check what port the service exposes
services:
  database:
    image: postgres:15
    # PostgreSQL listens on 5432 internally
    # The "ports" section exposes to HOST, not other containers
    ports:
      - "5433:5432"  # Host port 5433, container port 5432

  api:
    image: myapp:latest
    environment:
      # Connect to container port, not host port!
      - DATABASE_URL=postgres://user:pass@database:5432/app
```

**Binding to localhost only:**

```bash
# Application might bind to 127.0.0.1 instead of 0.0.0.0
docker compose exec database netstat -tlnp | grep 5432
# 127.0.0.1:5432  <- Only accessible within container!
# 0.0.0.0:5432    <- Accessible from other containers
```

Fix in application configuration or Dockerfile.

## Problem 3: Network Conflicts

IP address or subnet conflicts with existing networks:

```bash
docker compose up
# Error: failed to create network myproject_default:
# Error response from daemon: Pool overlaps with other one on this address space
```

### Resolve Network Conflicts

```bash
# List all Docker networks
docker network ls

# Inspect network for subnet
docker network inspect bridge | jq '.[0].IPAM.Config'

# Find conflicting networks
docker network ls -q | xargs -I {} docker network inspect {} --format '{{.Name}}: {{range .IPAM.Config}}{{.Subnet}}{{end}}'
```

### Specify Custom Subnet

```yaml
version: '3.8'
services:
  api:
    image: myapp:latest
    networks:
      - app_network

networks:
  app_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
          gateway: 172.28.0.1
```

## Problem 4: External Network Access

Container cannot reach the internet:

```bash
docker compose exec api ping google.com
# ping: google.com: Name does not resolve
```

### Debug External Connectivity

```bash
# Test DNS resolution
docker compose exec api nslookup google.com

# Test direct IP access
docker compose exec api ping 8.8.8.8

# Check iptables rules on host
sudo iptables -L -n | grep DOCKER
```

### Common Causes

**DNS issues:**

```yaml
services:
  api:
    image: myapp:latest
    dns:
      - 8.8.8.8
      - 8.8.4.4
```

**Network mode issues:**

```yaml
services:
  api:
    image: myapp:latest
    network_mode: bridge  # Use default bridge for internet access
```

## Problem 5: Service-to-Service Latency

Connections work but are slow:

```bash
docker compose exec api time curl http://database:5432
# real 0m5.003s  <- 5 second delay!
```

### Debug Latency

```bash
# Check DNS resolution time
docker compose exec api time nslookup database

# Check network interface statistics
docker compose exec api cat /proc/net/dev

# Check for packet loss
docker compose exec api ping -c 10 database
```

### Common Causes

**IPv6 fallback delays:**

```yaml
services:
  api:
    sysctls:
      - net.ipv6.conf.all.disable_ipv6=1
```

**DNS timeout before fallback:**

```yaml
services:
  api:
    dns_opt:
      - timeout:1
      - attempts:1
```

## Network Debugging Toolkit

Create a debug container with networking tools:

```yaml
version: '3.8'
services:
  # ... your services ...

  debug:
    image: nicolaka/netshoot
    profiles:
      - debug
    networks:
      - default
    command: sleep infinity
```

```bash
# Start debug container
docker compose --profile debug up -d debug

# Use networking tools
docker compose exec debug ping database
docker compose exec debug dig database
docker compose exec debug tcpdump -i eth0 port 5432
docker compose exec debug nmap -sT database
```

## Inspecting Network Configuration

```bash
# List networks
docker network ls

# Inspect specific network
docker network inspect myproject_default

# Find which containers are on a network
docker network inspect myproject_default --format '{{range .Containers}}{{.Name}} {{.IPv4Address}}{{"\n"}}{{end}}'

# Check container network settings
docker inspect myproject-api-1 --format '{{json .NetworkSettings.Networks}}' | jq
```

## Complete Network Debugging Script

```bash
#!/bin/bash
# debug-network.sh - Diagnose Compose network issues

SERVICE=${1:-api}
TARGET=${2:-database}

echo "=== Network Configuration ==="
docker compose exec $SERVICE cat /etc/resolv.conf

echo -e "\n=== DNS Resolution ==="
docker compose exec $SERVICE nslookup $TARGET || echo "DNS resolution failed"

echo -e "\n=== Ping Test ==="
docker compose exec $SERVICE ping -c 3 $TARGET || echo "Ping failed"

echo -e "\n=== Port Scan ==="
docker compose exec $SERVICE nc -zv $TARGET 5432 2>&1 || echo "Port check failed"

echo -e "\n=== Network Interfaces ==="
docker compose exec $SERVICE ip addr

echo -e "\n=== Routing Table ==="
docker compose exec $SERVICE ip route

echo -e "\n=== Container Network Info ==="
docker inspect $(docker compose ps -q $SERVICE) --format '{{json .NetworkSettings.Networks}}' | jq

echo -e "\n=== All Services on Network ==="
NETWORK=$(docker compose ps -q $SERVICE | xargs docker inspect --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}')
docker network inspect $NETWORK --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{"\n"}}{{end}}'
```

## Network Configuration Best Practices

```yaml
version: '3.8'

services:
  frontend:
    image: nginx:alpine
    networks:
      - frontend
    ports:
      - "80:80"

  api:
    image: myapp-api:latest
    networks:
      - frontend
      - backend
    expose:
      - "8080"

  database:
    image: postgres:15
    networks:
      - backend
    # No ports - only accessible from backend network

  cache:
    image: redis:7-alpine
    networks:
      - backend

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # No external access
```

---

Docker Compose networking issues usually come down to services being on different networks, DNS not resolving because containers are not running, or applications binding to localhost instead of all interfaces. Use the debugging toolkit to inspect DNS, connectivity, and network configuration systematically. When in doubt, start with `docker compose exec <service> nslookup <target>` to verify basic name resolution.
