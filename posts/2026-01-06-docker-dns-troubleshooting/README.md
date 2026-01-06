# How to Debug Docker DNS and Container Name Resolution Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, DevOps, Troubleshooting, DNS

Description: Master Docker's embedded DNS, configure custom resolvers, use --dns flags effectively, and troubleshoot name resolution issues with nslookup and dig.

"Connection refused" and "Name or service not known" are the most common Docker networking errors. They usually stem from DNS misconfiguration. Understanding how Docker's embedded DNS works and knowing the right debugging tools saves hours of frustration.

---

## How Docker DNS Works

Docker runs an embedded DNS server at `127.0.0.11` inside every container on user-defined networks. This server:

1. Resolves container names to their IP addresses
2. Resolves service names (in Swarm) to virtual IPs
3. Forwards external queries to upstream DNS servers

### Default Bridge vs User-Defined Networks

```bash
# Default bridge network - NO built-in DNS
docker run --rm alpine ping other-container
# FAILS: "bad address 'other-container'"

# User-defined network - DNS resolution works
docker network create mynet
docker run -d --network mynet --name db postgres:16
docker run --rm --network mynet alpine ping db
# SUCCESS: resolves db to container IP
```

**Key insight:** Container name resolution only works on user-defined networks, not the default bridge.

---

## Common DNS Problems and Solutions

### Problem 1: "Name does not resolve"

```bash
docker run --rm --network mynet alpine ping api
# ping: bad address 'api'
```

**Diagnose:**
```bash
# Check if container exists and is on the same network
docker network inspect mynet | grep -A5 "Containers"

# Verify the target container is running
docker ps --filter "name=api"
```

**Solutions:**
- Container must be on the same user-defined network
- Container must be running (stopped containers don't resolve)
- Use the exact container name (case-sensitive)

### Problem 2: External DNS Fails

```bash
docker run --rm alpine ping google.com
# ping: bad address 'google.com'
```

**Diagnose:**
```bash
# Check what DNS servers the container uses
docker run --rm alpine cat /etc/resolv.conf

# Test direct DNS lookup
docker run --rm alpine nslookup google.com
```

**Solutions:**
```bash
# Specify DNS servers explicitly
docker run --dns 8.8.8.8 --dns 8.8.4.4 alpine ping google.com

# Or configure daemon-wide
# /etc/docker/daemon.json
{
  "dns": ["8.8.8.8", "8.8.4.4"]
}
```

### Problem 3: DNS Works, But Connection Fails

```bash
docker run --rm --network mynet alpine ping db
# PING db (172.18.0.2): 56 data bytes
# 64 bytes from 172.18.0.2: seq=0 ttl=64 time=0.123 ms

docker run --rm --network mynet alpine nc -zv db 5432
# nc: connect to db (172.18.0.2) port 5432 (tcp) failed: Connection refused
```

**Diagnose:**
```bash
# Check if the port is actually exposed inside the container
docker exec db netstat -tlnp
# or
docker exec db ss -tlnp

# Check container logs
docker logs db
```

**Solutions:**
- Service might not be listening yet (startup timing)
- Service might be bound to localhost instead of 0.0.0.0
- Port number might be wrong

### Problem 4: Stale DNS Cache

After recreating a container, old IPs might be cached.

```bash
# Recreate container
docker rm -f api
docker run -d --name api --network mynet myapp

# Old IP might still be cached in other containers
```

**Solution:**
Docker's embedded DNS has a very short TTL, but if you see stale entries:

```bash
# Restart the container experiencing issues
docker restart client-container

# Or use explicit IP (debugging only)
docker inspect api --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'
```

---

## Debugging Tools

### Using nslookup

```bash
# Basic lookup
docker run --rm --network mynet alpine nslookup db

# Query specific DNS server
docker run --rm alpine nslookup google.com 8.8.8.8

# Inside a running container
docker exec mycontainer nslookup api
```

### Using dig (More Detailed)

```bash
# Install dig in alpine
docker run --rm --network mynet alpine sh -c "apk add bind-tools && dig db"

# Short answer only
docker run --rm alpine sh -c "apk add bind-tools && dig +short google.com"

# Query Docker's embedded DNS
docker run --rm --network mynet alpine sh -c "apk add bind-tools && dig @127.0.0.11 db"
```

### Using getent (System Resolver)

```bash
# Test what the container's resolver returns
docker run --rm --network mynet alpine getent hosts db
# 172.18.0.2      db
```

### Network Debugging Container

Create a debugging container with all tools pre-installed:

```dockerfile
# Dockerfile.netdebug
FROM alpine:3.19
RUN apk add --no-cache \
    bind-tools \
    curl \
    netcat-openbsd \
    tcpdump \
    iputils \
    busybox-extras
CMD ["sleep", "infinity"]
```

```bash
docker build -t netdebug -f Dockerfile.netdebug .
docker run -d --name debug --network mynet netdebug
docker exec -it debug sh
```

---

## DNS Configuration Options

### Container-Level DNS

```bash
# Override DNS servers
docker run --dns 8.8.8.8 --dns 1.1.1.1 myapp

# Override search domains
docker run --dns-search example.com myapp

# Override DNS options
docker run --dns-opt timeout:2 --dns-opt attempts:3 myapp

# Override hostname
docker run --hostname api.local myapp
```

### Compose DNS Configuration

```yaml
services:
  api:
    image: myapp
    dns:
      - 8.8.8.8
      - 8.8.4.4
    dns_search:
      - example.com
      - internal.example.com
    dns_opt:
      - timeout:2
      - attempts:3
```

### Daemon-Level DNS

```json
// /etc/docker/daemon.json
{
  "dns": ["8.8.8.8", "8.8.4.4"],
  "dns-search": ["example.com"],
  "dns-opts": ["timeout:2", "attempts:3"]
}
```

```bash
# Restart Docker to apply
sudo systemctl restart docker
```

---

## Service Discovery Patterns

### Pattern 1: Environment Variables (Simple)

```yaml
services:
  api:
    environment:
      DATABASE_HOST: db
      REDIS_HOST: cache

  db:
    image: postgres:16

  cache:
    image: redis:7
```

### Pattern 2: Docker Compose Links (Legacy)

```yaml
services:
  api:
    links:
      - "db:database"  # Creates alias 'database' for 'db'
```

### Pattern 3: Network Aliases

```yaml
services:
  db:
    image: postgres:16
    networks:
      backend:
        aliases:
          - database
          - postgres
          - primary-db

networks:
  backend:
```

Now `api` can reach the database via `db`, `database`, `postgres`, or `primary-db`.

### Pattern 4: External Service Discovery

For production, use proper service discovery:

```yaml
services:
  consul:
    image: hashicorp/consul:latest
    command: agent -server -bootstrap -ui

  api:
    image: myapp
    environment:
      CONSUL_HTTP_ADDR: consul:8500
    depends_on:
      - consul
```

---

## Troubleshooting Flowchart

```
DNS Resolution Fails
        │
        ▼
┌─────────────────────────┐
│ Is container on user-   │
│ defined network?        │
└───────────┬─────────────┘
            │
     No ────┴──── Yes
     │             │
     ▼             ▼
┌─────────┐   ┌─────────────────────┐
│ Use     │   │ Is target container │
│ --net   │   │ running?            │
└─────────┘   └──────────┬──────────┘
                         │
              No ────────┴───── Yes
              │                  │
              ▼                  ▼
         ┌─────────┐   ┌─────────────────┐
         │ Start   │   │ Same network?   │
         │ target  │   └────────┬────────┘
         └─────────┘            │
                     No ────────┴───── Yes
                     │                  │
                     ▼                  ▼
                ┌─────────┐   ┌────────────────┐
                │ Connect │   │ Check spelling │
                │ to same │   │ Use exact name │
                │ network │   └────────────────┘
                └─────────┘
```

---

## Real-World Debugging Session

```bash
# 1. Verify network exists
docker network ls | grep mynet

# 2. Check both containers are on it
docker network inspect mynet --format '{{range .Containers}}{{.Name}} {{end}}'

# 3. Get container IP manually
docker inspect db --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'
# Output: 172.18.0.2

# 4. Test connectivity by IP
docker exec api ping -c 2 172.18.0.2

# 5. Test DNS resolution
docker exec api nslookup db

# 6. Test port connectivity
docker exec api nc -zv db 5432

# 7. Check what's listening in target
docker exec db ss -tlnp

# 8. Check for firewall rules (host level)
sudo iptables -L -n | grep 172.18

# 9. Check Docker's embedded DNS
docker exec api cat /etc/resolv.conf
# Should show: nameserver 127.0.0.11
```

---

## Quick Reference

```bash
# Check container's DNS config
docker exec mycontainer cat /etc/resolv.conf

# Test internal DNS
docker exec mycontainer nslookup other-container

# Test external DNS
docker exec mycontainer nslookup google.com

# Run with custom DNS
docker run --dns 8.8.8.8 myapp

# List containers on network
docker network inspect mynet

# Add running container to network
docker network connect mynet existing-container

# Create network with custom DNS
docker network create --driver bridge --opt "com.docker.network.bridge.host_binding_ipv4"="0.0.0.0" mynet
```

---

## Summary

- Container name resolution only works on user-defined networks
- Docker's embedded DNS runs at 127.0.0.11 inside containers
- Use `nslookup`, `dig`, and `getent` to debug DNS issues
- External DNS can be configured at container, compose, or daemon level
- Network aliases provide multiple DNS names for a single container
- Most "connection refused" errors are DNS-adjacent but actually port/service issues

When DNS fails, work through the checklist: right network, container running, correct name spelling, then check the actual service.
