# How to Fix Docker DNS Resolution Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, DNS, Networking, Troubleshooting, DevOps

Description: Diagnose and resolve Docker DNS resolution problems including container name resolution failures, external DNS issues, and custom DNS configurations for complex network environments.

---

DNS resolution issues in Docker cause cryptic errors like "could not resolve host," "name or service not known," or connections that simply hang. Understanding how Docker handles DNS helps you quickly identify whether the problem is internal container resolution, external DNS, or network configuration.

## How Docker DNS Works

Docker provides an embedded DNS server at 127.0.0.11 for user-defined networks. This server handles:

- Container name resolution (service discovery)
- Network alias resolution
- Forwarding external queries to host DNS

```bash
# Check DNS configuration inside a container
docker run --rm alpine cat /etc/resolv.conf

# Output on user-defined network:
nameserver 127.0.0.11
options ndots:0
```

The default bridge network does not use the embedded DNS. Containers there cannot resolve each other by name.

## Problem 1: Containers Cannot Resolve Each Other

### Symptom

```bash
docker exec app ping database
# ping: bad address 'database'
```

### Cause

Containers are on the default bridge network, which lacks DNS resolution.

### Solution

Create and use a user-defined network:

```bash
# Create a custom network
docker network create mynetwork

# Run containers on the same network
docker run -d --name database --network mynetwork postgres:16
docker run -d --name app --network mynetwork myapp:latest

# Now name resolution works
docker exec app ping database
# PING database (172.18.0.2): 56 data bytes
```

In Docker Compose, this happens automatically:

```yaml
version: '3.8'

services:
  app:
    image: myapp:latest
    # Compose creates a default network and adds all services

  database:
    image: postgres:16
    # 'database' resolves to this container from 'app'
```

## Problem 2: External DNS Resolution Fails

### Symptom

```bash
docker exec app curl https://api.example.com
# curl: (6) Could not resolve host: api.example.com
```

### Diagnosis

Check if the container can reach external DNS:

```bash
# Test DNS resolution
docker exec app nslookup api.example.com

# Check what DNS servers are configured
docker exec app cat /etc/resolv.conf

# Test direct DNS query
docker exec app nslookup api.example.com 8.8.8.8
```

### Solution 1: Configure DNS in Daemon

Set default DNS servers for all containers:

```json
// /etc/docker/daemon.json
{
  "dns": ["8.8.8.8", "8.8.4.4"],
  "dns-search": ["example.com"],
  "dns-opts": ["ndots:1"]
}
```

Restart Docker:

```bash
sudo systemctl restart docker
```

### Solution 2: Configure DNS Per Container

```bash
docker run --dns 8.8.8.8 --dns 8.8.4.4 myapp:latest
```

In Compose:

```yaml
services:
  app:
    image: myapp:latest
    dns:
      - 8.8.8.8
      - 8.8.4.4
    dns_search:
      - example.com
```

### Solution 3: Fix Host DNS Configuration

Docker inherits DNS settings from the host. Fix the host first:

```bash
# Check host DNS
cat /etc/resolv.conf

# If using systemd-resolved, check actual servers
resolvectl status

# Ensure Docker can read /etc/resolv.conf
ls -la /etc/resolv.conf
```

On systems with systemd-resolved, Docker might see a localhost DNS that does not work inside containers:

```bash
# If /etc/resolv.conf points to 127.0.0.53
# Configure Docker to use different DNS
```

## Problem 3: DNS Resolution Is Slow

### Symptom

Requests eventually succeed but take 5-15 seconds to start.

### Cause

DNS timeouts to unreachable servers before falling back to working ones.

### Diagnosis

```bash
# Time a DNS lookup
docker exec app time nslookup example.com

# Check for multiple nameservers with issues
docker exec app cat /etc/resolv.conf
```

### Solution

Configure only reachable DNS servers:

```yaml
services:
  app:
    dns:
      - 8.8.8.8  # Only list servers that respond quickly
```

Or adjust timeout options:

```json
// /etc/docker/daemon.json
{
  "dns-opts": ["timeout:1", "attempts:1"]
}
```

## Problem 4: Corporate Proxy/DNS Issues

### Symptom

DNS works for public domains but not internal company domains.

### Solution

Use internal DNS servers that know about private zones:

```yaml
services:
  app:
    dns:
      - 10.0.0.1       # Internal DNS (resolves company domains)
      - 8.8.8.8        # Fallback for public domains
    dns_search:
      - corp.example.com
```

Or configure split DNS:

```json
// /etc/docker/daemon.json
{
  "dns": ["10.0.0.1", "8.8.8.8"]
}
```

## Problem 5: Docker Compose Service Names Not Resolving

### Symptom

```bash
docker exec project_app_1 ping project_database_1
# Works with full container name

docker exec project_app_1 ping database
# Fails
```

### Cause

Using the wrong service name or container is on multiple networks.

### Solution

Use the service name defined in docker-compose.yml:

```yaml
services:
  app:
    image: myapp:latest
    environment:
      # Use service name, not container name
      DATABASE_HOST: database

  database:  # This is the resolvable name
    image: postgres:16
```

For multi-network setups, ensure both services are on the same network:

```yaml
networks:
  frontend:
  backend:

services:
  app:
    networks:
      - frontend
      - backend  # Must be on backend to reach database

  database:
    networks:
      - backend  # Only on backend network
```

## Debugging DNS Issues

### Comprehensive DNS Debug

```bash
# Run a debug container with DNS tools
docker run --rm -it --network mynetwork nicolaka/netshoot

# Inside the container:
# Check DNS configuration
cat /etc/resolv.conf

# Test internal resolution
nslookup database
dig database

# Test external resolution
nslookup google.com
dig google.com @8.8.8.8

# Trace DNS resolution
dig +trace example.com

# Check network connectivity to DNS
nc -zv 8.8.8.8 53
```

### Check Docker's Embedded DNS

```bash
# Query Docker's internal DNS directly
docker exec app nslookup database 127.0.0.11

# Check DNS logs (if available)
docker logs $(docker ps -q --filter name=dns)
```

### Verify Network Configuration

```bash
# List networks
docker network ls

# Inspect network DNS settings
docker network inspect mynetwork | jq '.[0].IPAM.Config'

# Check container's network settings
docker inspect app --format '{{json .NetworkSettings.Networks}}' | jq
```

## Custom DNS Server in Container

For complex requirements, run your own DNS:

```yaml
version: '3.8'

services:
  dns:
    image: coredns/coredns:latest
    volumes:
      - ./Corefile:/Corefile
    networks:
      mynetwork:
        ipv4_address: 172.28.0.2

  app:
    image: myapp:latest
    dns: 172.28.0.2
    networks:
      - mynetwork

networks:
  mynetwork:
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

```
# Corefile
.:53 {
    forward . 8.8.8.8 8.8.4.4
    cache 30
    log
    errors
}

internal.example.com:53 {
    file /etc/coredns/internal.db
}
```

## Best Practices

1. **Always use user-defined networks** for service discovery
2. **Configure reliable DNS servers** in daemon.json for consistency
3. **Test DNS from inside containers**, not from the host
4. **Use service names**, not container names, in application configuration
5. **Add DNS health checks** to catch resolution issues early

```yaml
services:
  app:
    healthcheck:
      test: ["CMD-SHELL", "nslookup database && curl -f http://localhost:3000/health"]
      interval: 30s
```

---

Docker DNS issues usually stem from network misconfiguration or incorrect DNS server settings. Use user-defined networks for container-to-container communication, configure reliable external DNS servers in the Docker daemon, and debug with tools like nslookup and dig from inside containers. Most DNS problems become obvious once you understand Docker's embedded DNS server and how it forwards queries.
