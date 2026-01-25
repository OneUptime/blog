# How to Connect Docker Containers Across Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, Multi-Container, DevOps, Microservices

Description: Learn to connect Docker containers across different networks using multiple network attachments, network aliases, and gateway configurations for complex microservice architectures.

---

As applications grow into microservices, containers often need to communicate across network boundaries. Whether you are connecting services from different Compose projects, isolating sensitive databases, or building multi-tier architectures, understanding Docker network connectivity helps you design secure and efficient systems.

## Docker Network Basics

Docker creates isolated networks where containers can communicate using container names as hostnames. By default, each Docker Compose project gets its own network:

```bash
# List existing networks
docker network ls

# Inspect a network to see connected containers
docker network inspect myproject_default
```

Containers on different networks cannot communicate directly. You must explicitly connect them.

## Method 1: Connect Container to Multiple Networks

A single container can attach to multiple networks simultaneously:

```bash
# Create two separate networks
docker network create frontend
docker network create backend

# Run container attached to one network
docker run -d --name api --network frontend myapi:latest

# Connect same container to second network
docker network connect backend api

# Now 'api' can reach containers on both networks
```

Verify connectivity:

```bash
# Check which networks the container is on
docker inspect api --format '{{json .NetworkSettings.Networks}}' | jq
```

## Method 2: External Networks in Docker Compose

When you have multiple Compose projects that need to communicate, use external networks:

### Project A: Database Services

```yaml
# database/docker-compose.yml
version: '3.8'

networks:
  database-net:
    name: shared-database-network

services:
  postgres:
    image: postgres:16-alpine
    networks:
      - database-net
    environment:
      POSTGRES_PASSWORD: dbpassword
```

### Project B: Application Services

```yaml
# application/docker-compose.yml
version: '3.8'

networks:
  database-net:
    external: true
    name: shared-database-network
  app-internal:
    # Internal network for app services only

services:
  api:
    image: myapi:latest
    networks:
      - database-net     # Can reach postgres
      - app-internal     # Can reach other app services
    environment:
      DATABASE_URL: postgresql://postgres:dbpassword@postgres:5432/mydb

  worker:
    image: myworker:latest
    networks:
      - app-internal     # Only internal network
    # Cannot reach postgres directly - must go through api
```

Start them in order:

```bash
# Start database project first (creates the network)
cd database && docker compose up -d

# Start application project (uses existing network)
cd ../application && docker compose up -d
```

## Method 3: Network Aliases

Give containers multiple names on different networks:

```yaml
version: '3.8'

networks:
  frontend:
  backend:

services:
  api:
    image: myapi:latest
    networks:
      frontend:
        aliases:
          - api-gateway
      backend:
        aliases:
          - api-internal
          - main-api
```

Now other containers can reach the API using different names:

- Frontend containers use `api-gateway`
- Backend containers use `api-internal` or `main-api`

## Method 4: Bridge Network with Custom Subnet

Create networks with specific IP ranges for predictable addressing:

```yaml
version: '3.8'

networks:
  app-network:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.28.0.0/16
          gateway: 172.28.0.1

services:
  db:
    image: postgres:16
    networks:
      app-network:
        ipv4_address: 172.28.0.10

  api:
    image: myapi:latest
    networks:
      app-network:
        ipv4_address: 172.28.0.20
    environment:
      # Can use IP directly if needed
      DATABASE_HOST: 172.28.0.10
```

## Network Security Patterns

### Pattern 1: DMZ Architecture

Separate public-facing services from internal services:

```yaml
version: '3.8'

networks:
  dmz:           # Public-facing network
  internal:      # Protected internal network

services:
  nginx:
    image: nginx:alpine
    networks:
      - dmz                # Only DMZ access
    ports:
      - "80:80"

  api:
    image: myapi:latest
    networks:
      - dmz                # Receives requests from nginx
      - internal           # Connects to database

  database:
    image: postgres:16
    networks:
      - internal           # Only internal access
    # No port mapping - completely isolated
```

```mermaid
graph LR
    Internet -->|Port 80| Nginx
    subgraph DMZ Network
        Nginx
        API
    end
    subgraph Internal Network
        API
        Database
    end
    Nginx -->|Proxy| API
    API -->|Query| Database
```

### Pattern 2: Service Mesh Simulation

Control which services can communicate:

```yaml
version: '3.8'

networks:
  user-services:
  order-services:
  shared-services:

services:
  user-api:
    networks:
      - user-services
      - shared-services

  order-api:
    networks:
      - order-services
      - shared-services

  auth-service:
    networks:
      - shared-services    # Both APIs can reach auth

  user-db:
    networks:
      - user-services      # Only user-api can reach

  order-db:
    networks:
      - order-services     # Only order-api can reach
```

## Troubleshooting Cross-Network Connectivity

### Check Network Attachments

```bash
# List containers on a network
docker network inspect mynetwork --format '{{range .Containers}}{{.Name}} {{end}}'

# Check which networks a container uses
docker inspect mycontainer --format '{{range $net, $config := .NetworkSettings.Networks}}{{$net}}: {{$config.IPAddress}}{{"\n"}}{{end}}'
```

### Test Connectivity

```bash
# Ping from one container to another
docker exec api ping -c 3 database

# Test TCP connection
docker exec api nc -zv database 5432

# DNS resolution check
docker exec api nslookup database
```

### Debug with a Utility Container

```bash
# Run a debug container on the same network
docker run --rm -it \
  --network mynetwork \
  nicolaka/netshoot \
  bash

# Inside the container, use network tools
nslookup api
curl http://api:3000/health
tcpdump -i eth0
```

### Common Issues

**Issue: "Could not resolve host"**

```bash
# Container not on the same network
docker network connect target-network source-container
```

**Issue: Connection refused**

```bash
# Service might be listening on localhost only
# In the container's application, bind to 0.0.0.0
```

**Issue: Network already exists**

```bash
# When external network creation conflicts
docker network create mynetwork --driver bridge
# Then reference as external in compose
```

## Advanced: Connecting Across Docker Hosts

For containers on different hosts, consider:

### Overlay Networks (Swarm Mode)

```bash
# Initialize swarm
docker swarm init

# Create overlay network
docker network create -d overlay multi-host-net

# Deploy service
docker service create --network multi-host-net --name api myapi:latest
```

### Manual Routing

For non-swarm setups, configure routing between Docker hosts:

```bash
# On Host A (172.16.1.1), containers use 172.18.0.0/16
# On Host B (172.16.1.2), containers use 172.19.0.0/16

# On Host A, route to Host B's containers
sudo ip route add 172.19.0.0/16 via 172.16.1.2

# On Host B, route to Host A's containers
sudo ip route add 172.18.0.0/16 via 172.16.1.1
```

---

Connecting containers across networks requires understanding Docker's network model. Use multiple network attachments for containers that bridge network boundaries, external networks for cross-project communication, and network aliases for flexible service discovery. Design your network topology with security in mind, isolating sensitive services while enabling necessary communication paths.
