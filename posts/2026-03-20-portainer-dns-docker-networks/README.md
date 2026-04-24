# How to Configure DNS for Docker Networks in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Networking, DNS, DevOps

Description: Learn how to configure custom DNS servers and options for Docker networks and containers in Portainer for reliable service discovery.

## Introduction

Docker provides built-in DNS resolution on custom networks, allowing containers to discover each other by name without hardcoded IP addresses. However, the default DNS configuration may not be sufficient for all environments: you may need custom DNS servers (corporate DNS, Pi-hole, CoreDNS), specific search domains, or per-container DNS overrides. Portainer and Docker provide multiple ways to configure DNS behavior.

## Prerequisites

- Portainer installed with a connected Docker environment
- Understanding of how Docker's embedded DNS works on custom networks

## How Docker DNS Works

On custom bridge networks, Docker runs an embedded DNS server at `127.0.0.11`. This server:
- Resolves container names and service names to container IPs
- Forwards external DNS queries to the host's configured DNS resolvers
- Supports aliases (container reachable by multiple names)

The default bridge network does NOT provide this DNS service - only custom networks do.

## Step 1: Configure DNS at Container Creation (CLI)

```bash
# Set custom DNS server for a container:

docker run -d \
  --name my-app \
  --dns 1.1.1.1 \
  --dns 8.8.8.8 \
  --dns-search example.com \
  --dns-opt ndots:5 \
  nginx:alpine

# Verify DNS configuration inside the container:
docker exec my-app cat /etc/resolv.conf
# nameserver 1.1.1.1
# nameserver 8.8.8.8
# search example.com
# options ndots:5
```

## Step 2: Configure DNS via Portainer UI

1. Navigate to **Containers** → **Add container**.
2. Scroll to **Advanced container settings**.
3. In the **Network** section, set the **Primary DNS Server** and **Secondary DNS Server**.
4. Click **Deploy the container**.

## Step 3: Set Default DNS in Docker Daemon

Configure daemon-level DNS that applies to all containers:

```bash
# /etc/docker/daemon.json
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "dns": ["192.168.1.53", "1.1.1.1"],
  "dns-search": ["corp.example.com", "example.com"],
  "dns-opts": ["ndots:3", "timeout:2", "attempts:3"]
}
EOF

sudo systemctl restart docker
```

## Step 4: Use Docker's Internal DNS for Service Discovery

On custom bridge networks, use container names directly:

```bash
# Create a network:
docker network create app-network

# Start a database:
docker run -d \
  --name postgres \
  --network app-network \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=pass \
  -e POSTGRES_DB=mydb \
  postgres:15-alpine

# Start an app that connects by name - Docker DNS resolves "postgres":
docker run -d \
  --name api \
  --network app-network \
  --env DATABASE_URL=postgresql://user:pass@postgres:5432/mydb \
  myorg/api:latest

# Test DNS resolution from a debugging container on the same network:
docker run --rm --network app-network nicolaka/netshoot dig postgres
# ;; SERVER: 127.0.0.11#53(127.0.0.11)
# ;; ANSWER SECTION:
# postgres.      600     IN      A       172.20.0.2
```

## Step 5: Container DNS Aliases

Aliases allow a container to be reachable by multiple names on a network:

```yaml
# docker-compose.yml - DNS aliases
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: secret
    networks:
      backend:
        aliases:
          - db           # Reachable as "postgres" or "db"
          - database     # Also reachable as "database"

  redis:
    image: redis:7-alpine
    networks:
      backend:
        aliases:
          - cache        # Reachable as "redis" or "cache"

networks:
  backend:
    driver: bridge
```

## Step 6: Use a Custom DNS Server (Pi-hole or CoreDNS)

For a self-hosted DNS resolver:

```yaml
# docker-compose.yml - Pi-hole as network DNS
services:
  pihole:
    image: pihole/pihole:latest
    restart: unless-stopped
    networks:
      dns-net:
        ipv4_address: 172.30.0.10   # Fixed IP for DNS reference
    ports:
      - "53:53/tcp"
      - "53:53/udp"
      - "8080:80"
    environment:
      - FTLCONF_webserver_api_password=${PIHOLE_PASSWORD}
    volumes:
      - pihole_data:/etc/pihole

  # Other containers use Pi-hole as DNS:
  web:
    image: nginx:alpine
    dns:
      - 172.30.0.10    # Use Pi-hole for DNS
      - 1.1.1.1        # Fallback
    networks:
      - dns-net

networks:
  dns-net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.30.0.0/24

volumes:
  pihole_data:
```

## Step 7: Troubleshoot DNS Issues

```bash
# Check what DNS a container is using:
docker exec my-container cat /etc/resolv.conf

# Test DNS resolution from the same network using a debugging container:
docker run --rm --network my-network nicolaka/netshoot dig google.com

# Check if Docker's internal DNS is responding:
docker run --rm --network my-network nicolaka/netshoot dig @127.0.0.11 postgres

# DNS not resolving service names:
# → Ensure both containers are on the same custom network (not default bridge)
# → Check both containers are running:
docker network inspect my-network --format '{{range $id, $c := .Containers}}{{printf "%s\n" $c.Name}}{{end}}'
```

## Conclusion

Docker's embedded DNS on custom networks provides automatic service discovery by container name - the foundation of container-to-container communication in Compose and Swarm. For external DNS, configure servers at the daemon level (daemon.json) for global defaults, at the container level (`--dns`) for per-container overrides, or in Compose via the `dns` key. DNS aliases let a single container be reachable by multiple names, which is useful for zero-downtime migrations where the DNS name must remain stable across container replacements.
