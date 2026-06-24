# How to Implement Container Network Segmentation with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Networking, Security, Network Segmentation, Container

Description: Learn how to implement network segmentation with Podman using custom networks, internal networks, firewall rules, and isolation strategies to protect container communication.

---

> Network segmentation limits the blast radius of security incidents by ensuring containers can only communicate with the services they genuinely need to reach.

By default, containers on the same network can communicate freely with each other. In a production environment, this means a compromised web server could directly access your database. Network segmentation addresses this by placing containers on separate networks and controlling which networks can talk to each other.

This guide covers implementing network segmentation with Podman using custom networks and internal networks.

---

## Default Networking Behavior

When you create rootful containers without specifying a network, Podman places them on the default bridge network where containers can reach each other by IP address:

```bash
# Both containers can communicate

podman run -d --name web nginx
podman run -d --name db -e POSTGRES_PASSWORD=secret postgres:16

# web can reach db and vice versa by IP address - this may not be desirable
```

## Creating Segmented Networks

Separate containers into purpose-specific networks:

```bash
# Frontend network: exposed to the internet
podman network create frontend

# Backend network: internal services only
podman network create --internal backend

# Database network: data stores only
podman network create --internal database

# List networks
podman network ls
```

## Basic Segmentation Pattern

Place containers on appropriate networks based on their role:

```bash
# Database: only on the database network
podman run -d \
  --name db \
  --network database \
  -v pgdata:/var/lib/postgresql/data:Z \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=app \
  postgres:16

# API: bridges backend and database networks
podman run -d \
  --name api \
  --network backend \
  --network database \
  -e DATABASE_URL=postgresql://postgres:secret@db:5432/app \
  my-api:latest

# Web server: bridges frontend and backend networks
podman run -d \
  --name web \
  --network frontend \
  --network backend \
  -p 80:80 \
  nginx:stable

# Redis cache: only on backend network
podman run -d \
  --name cache \
  --network backend \
  redis:7-alpine
```

In this configuration:
- The web server can reach the API but not the database directly
- The API can reach both the database and cache
- The database is isolated from the frontend
- External traffic only reaches the web server

## Internal Networks

Create networks that cannot reach the internet:

```bash
# Internal network: no external access
podman network create --internal db-internal
podman network create app-external

# Containers on internal networks can talk to each other
# but cannot access the internet
podman run -d \
  --name db \
  --network db-internal \
  -e POSTGRES_PASSWORD=secret \
  postgres:16

podman run -d \
  --name api \
  --network db-internal \
  --network app-external \
  my-api:latest
```

Verify isolation:

```bash
# This should fail (external names are not resolved on internal networks)
podman exec db getent hosts example.com

# This should succeed (internal communication)
podman run --rm --network db-internal -e PGPASSWORD=secret postgres:16 \
  psql -h db -U postgres -c 'SELECT 1'
```

## Network Architecture Examples

### Three-Tier Application

```bash
podman network create --internal tier-db
podman network create --internal tier-app
podman network create tier-web

# Tier 1: Database (most isolated)
podman run -d --name postgres \
  --network tier-db \
  -e POSTGRES_PASSWORD=secret \
  postgres:16

# Tier 2: Application (bridges db and web tiers)
podman run -d --name api \
  --network tier-db \
  --network tier-app \
  my-api

# Tier 3: Web (public facing)
podman run -d --name nginx \
  --network tier-app \
  --network tier-web \
  -p 443:443 \
  nginx
```

### Microservices with Shared Services

```bash
# Shared infrastructure network
podman network create --internal infra
podman network create gateway-public

# Service-specific networks
podman network create --internal svc-orders
podman network create --internal svc-users
podman network create --internal svc-payments

# Shared database
podman run -d --name shared-db \
  --network infra \
  -e POSTGRES_PASSWORD=secret \
  postgres:16

# Each service gets its own network plus infra access
podman run -d --name orders-api \
  --network svc-orders \
  --network infra \
  orders-service

podman run -d --name users-api \
  --network svc-users \
  --network infra \
  users-service

podman run -d --name payments-api \
  --network svc-payments \
  --network infra \
  payments-service

# API gateway bridges all service networks
podman run -d --name gateway \
  --network svc-orders \
  --network svc-users \
  --network svc-payments \
  --network gateway-public \
  -p 8080:8080 \
  api-gateway
```

## Network Configuration Options

Configure networks with specific subnets and options:

```bash
# Custom subnet
podman network create \
  --subnet 10.10.1.0/24 \
  --gateway 10.10.1.1 \
  custom-net

# IPv6 enabled
podman network create \
  --ipv6 \
  --subnet fd00::/64 \
  ipv6-net

# Disable DNS
podman network create \
  --disable-dns \
  no-dns-net

# Inspect network configuration
podman network inspect custom-net
```

## Restricting Container Ports

Bind ports to specific interfaces for additional security:

```bash
# Only accessible from localhost
podman run -d -p 127.0.0.1:8080:80 --name admin-panel admin-app

# Only accessible from a specific interface
podman run -d -p 10.0.0.1:8080:80 --name internal-api my-api

# Accessible from all interfaces (default, less secure)
podman run -d -p 0.0.0.0:80:80 --name public-web nginx
```

## Pod-Level Network Segmentation

Use pods for tightly coupled services that share a network:

```bash
# Database pod on internal network
podman pod create --name db-pod --network tier-db

podman run -d --pod db-pod --name postgres -e POSTGRES_PASSWORD=secret postgres:16
podman run -d --pod db-pod --name pgbouncer pgbouncer

# Application pod bridging networks
podman pod create --name app-pod \
  --network tier-db \
  --network tier-app \
  -p 3000:3000

podman run -d --pod app-pod --name api my-api
podman run -d --pod app-pod --name worker my-worker
```

## Quadlet Network Segmentation

Define segmented networks in Quadlet files:

```ini
# ~/.config/containers/systemd/db-internal.network
[Network]
NetworkName=db-internal
Internal=true
Subnet=10.10.1.0/24

# ~/.config/containers/systemd/app-internal.network
[Network]
NetworkName=app-internal
Internal=true
Subnet=10.10.2.0/24

# ~/.config/containers/systemd/web-external.network
[Network]
NetworkName=web-external
Subnet=10.10.3.0/24
```

```ini
# ~/.config/containers/systemd/db.container
[Container]
Image=docker.io/library/postgres:16
Environment=POSTGRES_PASSWORD=secret
Network=db-internal.network
# Only accessible from db-internal network

# ~/.config/containers/systemd/api.container
[Container]
Image=my-api:latest
Network=db-internal.network
Network=app-internal.network
# Bridges database and application tiers

# ~/.config/containers/systemd/web.container
[Container]
Image=docker.io/library/nginx:stable
Network=app-internal.network
Network=web-external.network
PublishPort=443:443
# Bridges application tier and external access
```

## Network Monitoring

Monitor network traffic between segments:

```bash
#!/bin/bash
# monitor-networks.sh

echo "=== Network Segmentation Status ==="
echo ""

# List all networks and their containers
for net in $(podman network ls --format '{{.Name}}'); do
  echo "Network: $net"

  # Get network info
  INTERNAL=$(podman network inspect "$net" --format '{{.Internal}}')
  SUBNET=$(podman network inspect "$net" --format '{{range .Subnets}}{{.Subnet}}{{end}}')
  echo "  Internal: $INTERNAL"
  echo "  Subnet: $SUBNET"

  # List connected containers
  CONTAINERS=$(podman ps --filter network="$net" --format '{{.Names}}')
  if [ -n "$CONTAINERS" ]; then
    echo "  Containers: $CONTAINERS"
  else
    echo "  Containers: none"
  fi
  echo ""
done
```

## Verifying Segmentation

Test that network segmentation works as expected:

```bash
#!/bin/bash
# verify-segmentation.sh

echo "=== Network Segmentation Verification ==="

# Test: a client with web-tier networks should reach api
echo -n "web -> api: "
podman run --rm --network frontend --network backend curlimages/curl:8.7.1 \
  -sf http://api:3000/health > /dev/null 2>&1 && \
  echo "CONNECTED (expected)" || echo "BLOCKED"

# Test: a client with web-tier networks should NOT reach db
echo -n "web -> db: "
podman run --rm --network frontend --network backend postgres:16 \
  pg_isready -h db > /dev/null 2>&1 && \
  echo "CONNECTED (VIOLATION!)" || echo "BLOCKED (expected)"

# Test: a client with api-tier networks should reach db
echo -n "api -> db: "
podman run --rm --network backend --network database postgres:16 \
  pg_isready -h db > /dev/null 2>&1 && \
  echo "CONNECTED (expected)" || echo "BLOCKED"

# Test: a client with db-tier network should NOT reach internet
echo -n "db -> internet: "
podman run --rm --network database alpine:3.20 \
  wget -qO- --timeout=3 http://example.com > /dev/null 2>&1 && \
  echo "CONNECTED (VIOLATION!)" || echo "BLOCKED (expected)"
```

## Conclusion

Network segmentation with Podman uses custom networks and internal networks to control which containers can communicate with each other. The key principle is to give each container access only to the networks it needs. Use internal networks for services that should never reach the internet, place databases on isolated networks, and bridge tiers through multi-network containers. Regular verification ensures your segmentation rules remain effective as your container environment evolves.
