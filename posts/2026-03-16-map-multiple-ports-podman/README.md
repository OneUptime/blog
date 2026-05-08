# How to Map Multiple Ports in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Port Mapping, Networking

Description: Learn how to map multiple ports in a single Podman container for services that expose HTTP, HTTPS, admin interfaces, and other endpoints simultaneously.

---

> Many services expose multiple ports for different purposes - HTTP, HTTPS, admin panels, metrics, and debugging endpoints all need their own port mappings.

Real-world applications frequently expose more than one port. A web server needs both HTTP and HTTPS. An application server might expose a service port and a metrics port. A database might have a data port and a management port. This guide covers mapping multiple ports to a single container.

---

## Basic Multiple Port Mapping

Add multiple `-p` flags to map several ports:

```bash
# Map both HTTP and HTTPS ports

podman run -d --name web \
    -p 8080:80 \
    -p 8443:443 \
    nginx

# Verify all port mappings
podman port web
# Output:
# 80/tcp -> 0.0.0.0:8080
# 443/tcp -> 0.0.0.0:8443
```

## Port Ranges

Map a range of consecutive ports with a single flag:

```bash
# Map ports 3000-3005 from host to container
podman run -d --name multi-service \
    -p 3000-3005:3000-3005 \
    myapp:latest

# Verify the range
podman port multi-service

# The range must be the same size on both sides
# This maps host 5000-5004 to container 3000-3004
podman run -d -p 5000-5004:3000-3004 myapp:latest
```

## Common Multi-Port Service Configurations

### Web Server with HTTP and HTTPS

```bash
# Nginx with both protocols
podman run -d --name nginx \
    -p 80:80 \
    -p 443:443 \
    -v ./certs:/etc/nginx/certs:ro \
    -v ./nginx.conf:/etc/nginx/nginx.conf:ro \
    nginx
```

### Application with Service and Debug Ports

```bash
# Node.js app with application port and debug port
podman run -d --name api \
    -p 3000:3000 \
    -p 9229:9229 \
    -e NODE_OPTIONS="--inspect=0.0.0.0:9229" \
    node-app:latest

# Connect a debugger to localhost:9229
```

### Database with Data and Admin Ports

```bash
# PostgreSQL with data port and pgAdmin
podman run -d --name postgres \
    -p 5432:5432 \
    -e POSTGRES_PASSWORD=secret \
    postgres:16

podman run -d --name pgadmin \
    -p 5050:80 \
    -e PGADMIN_DEFAULT_EMAIL=admin@example.com \
    -e PGADMIN_DEFAULT_PASSWORD=admin \
    dpage/pgadmin4
```

### Service with Metrics Endpoint

```bash
# Application with main port and Prometheus metrics
podman run -d --name app \
    -p 8080:8080 \
    -p 9090:9090 \
    -e METRICS_PORT=9090 \
    myapp:latest

# Scrape metrics
curl http://localhost:9090/metrics
```

## Mixed Protocol Port Mapping

Map TCP and UDP ports for the same container:

```bash
# DNS server needing both TCP and UDP on port 53
podman run -d --name dns \
    -p 5353:53/tcp \
    -p 5353:53/udp \
    coredns/coredns

# Game server with TCP control and UDP data
podman run -d --name game-server \
    -p 7777:7777/tcp \
    -p 7778:7778/udp \
    game-server:latest
```

## Binding Different Ports to Different Interfaces

```bash
# Public service on all interfaces, admin on localhost only
podman run -d --name app \
    -p 0.0.0.0:8080:8080 \
    -p 127.0.0.1:9090:9090 \
    myapp:latest

# Port 8080 is accessible from any network interface
# Port 9090 is only accessible from localhost
curl http://localhost:8080    # Works locally; remote clients use the host IP
curl http://localhost:9090    # Only works locally
```

## Multi-Container Stack with Multiple Ports

```bash
# Create a network
podman network create mystack

# Frontend: HTTP and HTTPS
podman run -d --name frontend \
    --network mystack \
    -p 80:80 \
    -p 443:443 \
    nginx

# Backend API: application and metrics
podman run -d --name backend \
    --network mystack \
    -p 3000:3000 \
    -p 9090:9090 \
    api:latest

# Database: data port only (no external exposure for admin)
podman run -d --name database \
    --network mystack \
    -p 127.0.0.1:5432:5432 \
    -e POSTGRES_PASSWORD=secret \
    postgres:16

# Cache: internal only (no host port mapping needed)
podman run -d --name cache \
    --network mystack \
    redis:7
```

## Viewing All Port Mappings

```bash
# Show ports for all running containers
podman ps --format "table {{.Names}}\t{{.Ports}}"

# Detailed port info for a specific container
podman port frontend

# JSON output for scripting
podman inspect frontend --format '{{json .NetworkSettings.Ports}}' | jq

# Find which container uses a specific port
podman ps --format "{{.Names}}\t{{.Ports}}" | grep 8080
```

## Checking for Port Conflicts

Before mapping multiple ports, verify availability:

```bash
#!/bin/bash
# Check if ports are available before starting a container

ports=(8080 8443 9090 3000)
conflicts=0

for port in "${ports[@]}"; do
    if lsof -i ":$port" > /dev/null 2>&1; then
        echo "Port $port is already in use:"
        lsof -i ":$port" | head -2
        conflicts=$((conflicts + 1))
    else
        echo "Port $port is available"
    fi
done

if [ "$conflicts" -gt 0 ]; then
    echo ""
    echo "Error: $conflicts port conflict(s) found"
    exit 1
fi
```

## Quick Reference

| Command | Purpose |
|---|---|
| `-p 8080:80 -p 8443:443` | Map multiple specific ports |
| `-p 3000-3005:3000-3005` | Map a port range |
| `-p 5353:53/tcp -p 5353:53/udp` | Map TCP and UDP |
| `-p 0.0.0.0:80:80 -p 127.0.0.1:9090:9090` | Different interfaces |
| `podman port <name>` | Show all mappings |

## Summary

Mapping multiple ports is straightforward - add a `-p` flag for each port or use ranges for consecutive ports. Use different host interfaces to control access (all interfaces for public services, localhost for admin tools). Mix TCP and UDP as needed, and always check for port conflicts before deploying. This approach lets you expose all the endpoints your service needs while maintaining control over access patterns.
