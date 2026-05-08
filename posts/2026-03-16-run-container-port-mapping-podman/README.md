# How to Run a Container with Port Mapping in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Port Mapping, Networking

Description: Learn how to map container ports to host ports in Podman, making containerized services accessible from your host machine and network.

---

> Port mapping connects container services to the outside world, making them accessible from your host machine and beyond.

Containers run in an isolated network by default. A web server running on port 80 inside a container is not accessible from your host unless you explicitly map that port. Port mapping (also called port publishing or port forwarding) bridges this gap. This guide covers all aspects of port mapping in Podman.

---

## Basic Port Mapping

Use the `-p` flag to map a container port to a host port:

```bash
# Map host port 8080 to container port 80

podman run -d --name web -p 8080:80 nginx

# Access the container from the host
curl http://localhost:8080
```

The format is `-p HOST_PORT:CONTAINER_PORT`.

## Understanding the Port Format

```bash
# Full format: [[host-ip:][host-port]:]container-port[/protocol]

# Map to all host interfaces (default)
podman run -d -p 8080:80 nginx

# Map to localhost only (not accessible from other machines)
podman run -d -p 127.0.0.1:8080:80 nginx

# Map to a specific host IP
podman run -d -p 192.168.1.100:8080:80 nginx

# Specify TCP protocol (default)
podman run -d -p 8080:80/tcp nginx

# Specify UDP protocol
podman run -d -p 5353:53/udp coredns

# Map both TCP and UDP
podman run -d -p 5353:53/tcp -p 5353:53/udp coredns
```

## Random Host Port Assignment

Let Podman choose an available host port:

```bash
# Podman assigns a random available host port
podman run -d --name web -p 80 nginx

# Find out which port was assigned
podman port web
# Output: 80/tcp -> 0.0.0.0:43210

# Or use ps to see ports
podman ps --format "{{.Names}}\t{{.Ports}}"
```

## Viewing Port Mappings

Check which ports are mapped for a container:

```bash
# Show all port mappings for a container
podman port web

# Show mapping for a specific container port
podman port web 80

# View ports in the container list
podman ps

# Get port info via inspect
podman inspect web --format '{{json .NetworkSettings.Ports}}' | jq
```

## Common Service Port Mappings

Standard port mappings for popular services:

```bash
# Web server (Nginx/Apache)
podman run -d --name web -p 8080:80 nginx

# HTTPS web server
podman run -d --name web-ssl -p 8443:443 nginx

# Node.js application
podman run -d --name api -p 3000:3000 node-app

# PostgreSQL database
podman run -d --name postgres -p 5432:5432 \
    -e POSTGRES_PASSWORD=secret postgres:16

# MySQL database
podman run -d --name mysql -p 3306:3306 \
    -e MYSQL_ROOT_PASSWORD=secret mysql:8

# Redis cache
podman run -d --name redis -p 6379:6379 redis:7

# MongoDB
podman run -d --name mongo -p 27017:27017 mongo:7
```

## Avoiding Port Conflicts

The same host IP, port, and protocol combination can only be used by one container at a time:

```bash
# This works
podman run -d --name web1 -p 8080:80 nginx

# This fails - port 8080 is already in use
podman run -d --name web2 -p 8080:80 nginx
# Error: port 8080 already in use

# Solution: use a different host port
podman run -d --name web2 -p 8081:80 nginx

# Check which ports are in use
podman ps --format "{{.Names}}\t{{.Ports}}"

# Check host ports in use (macOS)
lsof -i -P | grep LISTEN | grep 8080

# Check host ports in use (Linux)
ss -tlnp | grep 8080
```

## Mapping Ports to Different Numbers

The host port and container port do not need to match:

```bash
# Container listens on 80, host exposes on 9090
podman run -d --name web -p 9090:80 nginx

# Access via the host port
curl http://localhost:9090

# Multiple containers with the same internal port on different host ports
podman run -d --name web-a -p 8081:80 nginx
podman run -d --name web-b -p 8082:80 nginx
podman run -d --name web-c -p 8083:80 nginx
```

## Port Mapping with Rootless Podman

In rootless mode, ports below 1024 are restricted:

```bash
# This fails in rootless mode
podman run -d -p 80:80 nginx
# Error: binding to privileged port

# Use a port above 1024
podman run -d -p 8080:80 nginx

# Or configure the unprivileged port start on native Linux
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80

# With Podman Machine, run the sysctl inside the machine
podman machine ssh -- sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80
```

## Testing Port Connectivity

Verify that port mapping is working:

```bash
# Start a container with port mapping
podman run -d --name web -p 8080:80 nginx

# Test with curl
curl -I http://localhost:8080

# Test with netcat
nc -zv localhost 8080

# Test from inside the container
podman exec web curl -s localhost:80
```

## Quick Reference

| Command | Purpose |
|---|---|
| `-p 8080:80` | Map host 8080 to container 80 |
| `-p 127.0.0.1:8080:80` | Bind to localhost only |
| `-p 80` | Random host port to container 80 |
| `-p 8080:80/udp` | UDP port mapping |
| `podman port <name>` | Show port mappings |

## Summary

Port mapping is essential for making container services accessible. Use `-p HOST_PORT:CONTAINER_PORT` for explicit mappings, bind to `127.0.0.1` for local-only access, and use random port assignment when the exact host port does not matter. Always check for port conflicts before starting containers, and remember that rootless mode restricts ports below 1024.
