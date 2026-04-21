# How to Assign Static IPs to Containers in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Networking, Static IP, Container Configuration

Description: Assign fixed IP addresses to Docker containers using custom networks and docker-compose configurations managed through Portainer.

## Introduction

By default, Docker assigns container IPs dynamically from a subnet pool. For services like databases, DNS servers, and reverse proxies that other services depend on, a static IP ensures consistent connectivity regardless of restart order. This guide covers how to assign static IPs using Docker's `ipv4_address` configuration in Portainer.

## Step 1: Create a Custom Network with a Defined Subnet

Docker only allows static IP assignment on user-defined networks, not the default bridge:

```bash
# Create network with explicit subnet (required for static IPs)

docker network create \
  --driver bridge \
  --subnet=172.20.0.0/24 \
  --gateway=172.20.0.1 \
  static_net

# Verify
docker network inspect static_net
```

In Portainer: **Networks** > **Add network**
- Name: `static_net`
- Driver: `bridge`
- Subnet: `172.20.0.0/24`
- Gateway: `172.20.0.1`

## Step 2: Assign Static IPs in Docker Compose

```yaml
# docker-compose.yml - Static IP assignments
networks:
  static_net:
    external: true  # Reference the pre-created network

services:
  # Database with fixed IP - other services always know where to find it
  postgres:
    image: postgres:15-alpine
    container_name: postgres
    restart: unless-stopped
    networks:
      static_net:
        ipv4_address: 172.20.0.10  # Fixed IP for database
    environment:
      - POSTGRES_DB=appdb
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD=secure_pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # Redis cache with fixed IP
  redis:
    image: redis:7-alpine
    container_name: redis
    restart: unless-stopped
    networks:
      static_net:
        ipv4_address: 172.20.0.11  # Fixed IP for cache
    command: redis-server --requirepass redis_pass

  # Application using hardcoded IPs (works even if DNS fails)
  api:
    image: myapp/api:latest
    container_name: api
    restart: unless-stopped
    networks:
      static_net:
        ipv4_address: 172.20.0.20  # Fixed IP for API
    environment:
      # Both DNS names and IPs work here
      - DB_HOST=172.20.0.10
      - REDIS_HOST=172.20.0.11

volumes:
  postgres_data:
```

## Step 3: Define the Network Inline

If you prefer to define the network in the same compose file:

```yaml
# docker-compose.yml - Network defined inline
networks:
  app_static:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.21.0.0/24
          gateway: 172.21.0.1
          # Reserve .1-.9 for infrastructure
          # .10-.50 for databases
          # .51-.100 for services
          # .101-.200 for applications

services:
  nginx:
    image: nginx:alpine
    networks:
      app_static:
        ipv4_address: 172.21.0.2  # Reverse proxy always at .2

  database:
    image: postgres:15-alpine
    networks:
      app_static:
        ipv4_address: 172.21.0.10  # DB always at .10

  api:
    image: myapp/api:latest
    networks:
      app_static:
        ipv4_address: 172.21.0.51  # API always at .51
```

## Step 4: Containers on Multiple Networks with Static IPs

```yaml
networks:
  frontend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.22.0.0/24
  backend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.23.0.0/24

services:
  # API bridges both networks with static IPs on each
  api:
    image: myapp/api:latest
    networks:
      frontend:
        ipv4_address: 172.22.0.10  # Frontend-facing IP
      backend:
        ipv4_address: 172.23.0.10  # Backend-facing IP

  # Database only on backend network
  postgres:
    image: postgres:15-alpine
    networks:
      backend:
        ipv4_address: 172.23.0.20  # Isolated backend IP
```

## Step 5: Verify Static IP Assignment

```bash
# Confirm container has the expected IP
docker inspect postgres | grep -A 10 "Networks"

# Quick IP check
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' postgres
# Returns: 172.20.0.10

# Test connectivity between containers
docker exec api ping -c 3 172.20.0.10
docker exec api ping -c 3 postgres  # DNS also works

# Verify IP persists after restart
docker restart postgres
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' postgres
# Still returns: 172.20.0.10
```

## Step 6: IP Conflict Prevention

```bash
# Check existing networks and their subnets before creating new ones
docker network ls --format "{{.Name}}"
docker network inspect bridge --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'

# List all subnets in use
docker network ls -q | xargs docker network inspect \
  --format '{{.Name}}: {{range .IPAM.Config}}{{.Subnet}}{{end}}'
```

## Conclusion

Static IPs in Docker provide predictable addressing for services that act as infrastructure - databases, caches, and DNS servers benefit most from fixed addresses. Always use user-defined networks with explicit subnets when assigning static IPs, and plan your IP ranges before deployment to avoid conflicts. Portainer's network management UI shows you all networks and their subnets at a glance, making it easy to identify available IP ranges for new services.
