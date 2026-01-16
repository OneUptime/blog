# How to Configure Docker Container Hostname and DNS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, DNS, Networking, Configuration, DevOps

Description: Learn how to configure container hostnames, DNS servers, search domains, and /etc/hosts entries for proper name resolution in Docker environments.

---

Containers need proper hostname and DNS configuration for network communication. Docker provides several ways to customize these settings, from simple hostname assignment to complex DNS configurations for enterprise environments.

## Setting Container Hostname

### Basic Hostname

```bash
# Set hostname when running container
docker run --hostname myapp.local myimage

# Verify
docker run --hostname myapp.local alpine hostname
# Output: myapp.local
```

### Hostname in Docker Compose

```yaml
services:
  app:
    image: myapp
    hostname: myapp.local
    # Or with domain
    domainname: example.com
    # Results in FQDN: myapp.local.example.com
```

### Hostname and Container Name

```bash
# Container name is different from hostname
docker run --name my-container --hostname my-hostname alpine hostname
# Output: my-hostname

# Container name is for Docker CLI
docker exec my-container hostname
# Output: my-hostname
```

## DNS Configuration

### Custom DNS Servers

```bash
# Specify DNS servers
docker run --dns 8.8.8.8 --dns 8.8.4.4 myimage

# Check DNS configuration inside container
docker run --dns 8.8.8.8 alpine cat /etc/resolv.conf
# nameserver 8.8.8.8
```

### Docker Compose DNS

```yaml
services:
  app:
    image: myapp
    dns:
      - 8.8.8.8
      - 8.8.4.4
```

### DNS Search Domains

```bash
# Add search domains
docker run --dns-search example.com --dns-search internal.local myimage

# Now "myhost" resolves as "myhost.example.com"
```

```yaml
# Docker Compose
services:
  app:
    image: myapp
    dns_search:
      - example.com
      - internal.local
```

### DNS Options

```bash
# Add DNS options
docker run --dns-opt timeout:2 --dns-opt attempts:3 myimage
```

```yaml
# Docker Compose
services:
  app:
    image: myapp
    dns_opt:
      - timeout:2
      - attempts:3
      - ndots:2
```

## Custom /etc/hosts Entries

### Add Host Entries

```bash
# Add custom hosts
docker run --add-host mydb:192.168.1.100 myimage

# Multiple entries
docker run \
  --add-host db.local:192.168.1.100 \
  --add-host cache.local:192.168.1.101 \
  myimage

# Verify
docker run --add-host mydb:192.168.1.100 alpine cat /etc/hosts
```

### Docker Compose Extra Hosts

```yaml
services:
  app:
    image: myapp
    extra_hosts:
      - "db.local:192.168.1.100"
      - "cache.local:192.168.1.101"
      # Special: access host machine
      - "host.docker.internal:host-gateway"
```

### Access Host from Container

```yaml
# Modern Docker (20.10+)
services:
  app:
    extra_hosts:
      - "host.docker.internal:host-gateway"

# Inside container, host.docker.internal resolves to host machine
```

## Docker's Internal DNS

### How Docker DNS Works

On custom networks, Docker provides automatic DNS resolution for container names.

```yaml
services:
  web:
    image: nginx
    networks:
      - mynet

  api:
    image: myapi
    networks:
      - mynet
    # Can reach 'web' by name

networks:
  mynet:
```

```bash
# From api container
ping web  # Works! Resolves to web container's IP
```

### DNS on Default Bridge

The default bridge network doesn't provide DNS by name. Use custom networks or `--link` (deprecated).

```bash
# Create custom network for DNS
docker network create mynet

# Containers on mynet can resolve each other
docker run -d --name db --network mynet postgres
docker run --rm --network mynet alpine ping db  # Works
```

## Daemon-Level DNS Configuration

### Configure Docker Daemon

```json
// /etc/docker/daemon.json
{
  "dns": ["8.8.8.8", "8.8.4.4"],
  "dns-opts": ["timeout:2", "attempts:3"],
  "dns-search": ["example.com"]
}
```

```bash
# Restart Docker
sudo systemctl restart docker

# All containers use these defaults
docker run alpine cat /etc/resolv.conf
```

## Network Aliases

### Multiple DNS Names for Container

```yaml
services:
  database:
    image: postgres:15
    networks:
      mynet:
        aliases:
          - db
          - postgres
          - primary-db

  app:
    networks:
      - mynet
    # Can reach database as: database, db, postgres, or primary-db

networks:
  mynet:
```

### Runtime Network Aliases

```bash
# Add alias when connecting to network
docker network connect --alias db mynet mycontainer
```

## Complete DNS Example

```yaml
version: '3.8'

services:
  app:
    image: myapp
    hostname: app
    domainname: mycompany.local
    dns:
      - 10.0.0.2  # Internal DNS
      - 8.8.8.8   # Fallback
    dns_search:
      - mycompany.local
      - svc.cluster.local
    dns_opt:
      - timeout:2
      - attempts:3
    extra_hosts:
      - "legacy-db:192.168.1.50"
      - "host.docker.internal:host-gateway"
    networks:
      frontend:
        aliases:
          - web-app
      backend:
        aliases:
          - api-client

  database:
    image: postgres:15
    hostname: postgres
    networks:
      backend:
        aliases:
          - db
          - primary

networks:
  frontend:
  backend:
```

## DNS Troubleshooting

### Check DNS Configuration

```bash
# View resolv.conf
docker exec mycontainer cat /etc/resolv.conf

# Check hosts file
docker exec mycontainer cat /etc/hosts

# Test DNS resolution
docker exec mycontainer nslookup google.com
docker exec mycontainer nslookup db
```

### Debug DNS Issues

```bash
# Use a debug container with tools
docker run --rm -it --network mynet nicolaka/netshoot

# Inside netshoot
nslookup myservice
dig myservice
host myservice
```

### Common Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| DNS resolution fails | No DNS server | Add `--dns 8.8.8.8` |
| Cannot resolve container names | Default bridge network | Use custom network |
| Slow DNS | DNS timeout | Add dns_opt timeout |
| Wrong domain | Missing search domain | Add dns_search |

## Corporate Environment Setup

### Internal DNS with Fallback

```yaml
services:
  app:
    dns:
      - 10.0.0.2      # Internal corporate DNS
      - 10.0.0.3      # Secondary internal
      - 8.8.8.8       # External fallback
    dns_search:
      - corp.internal
      - dev.corp.internal
```

### Split DNS Configuration

```yaml
# For different environments
services:
  app:
    dns:
      - ${DNS_PRIMARY:-8.8.8.8}
      - ${DNS_SECONDARY:-8.8.4.4}
    dns_search:
      - ${DNS_SEARCH_DOMAIN:-}
```

```bash
# .env file for corporate environment
DNS_PRIMARY=10.0.0.2
DNS_SECONDARY=10.0.0.3
DNS_SEARCH_DOMAIN=corp.internal
```

## Kubernetes-Style DNS

Mimic Kubernetes DNS patterns in Docker Compose:

```yaml
services:
  web:
    hostname: web
    domainname: default.svc.cluster.local
    networks:
      cluster:
        aliases:
          - web.default.svc.cluster.local

  api:
    hostname: api
    domainname: default.svc.cluster.local
    dns_search:
      - default.svc.cluster.local
      - svc.cluster.local
      - cluster.local
    networks:
      cluster:
        aliases:
          - api.default.svc.cluster.local

networks:
  cluster:
```

## Summary

| Configuration | Docker Run | Compose |
|--------------|------------|---------|
| Hostname | `--hostname name` | `hostname: name` |
| Domain | - | `domainname: domain` |
| DNS servers | `--dns IP` | `dns: [IP]` |
| DNS search | `--dns-search domain` | `dns_search: [domain]` |
| DNS options | `--dns-opt option` | `dns_opt: [option]` |
| Host entries | `--add-host name:IP` | `extra_hosts: ["name:IP"]` |
| Network alias | `--network-alias name` | `networks: {net: {aliases: []}}` |

Proper DNS and hostname configuration ensures containers can communicate reliably. Use custom networks for automatic service discovery, configure appropriate DNS servers for your environment, and use extra_hosts for special cases like accessing the host machine.

