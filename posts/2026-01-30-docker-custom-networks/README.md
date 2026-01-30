# How to Create Custom Docker Networks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Networking, DevOps, Containers

Description: Master Docker networking with custom bridge networks, network isolation, DNS resolution, and multi-host networking for containerized applications.

---

Docker networking is fundamental to building containerized applications that communicate reliably. By default, Docker provides basic networking, but custom networks give you control over container communication, isolation, and service discovery. This guide walks through creating and managing custom Docker networks for production-ready deployments.

## Understanding Docker Network Drivers

Docker provides several network drivers, each designed for specific use cases. Choosing the right driver depends on your application architecture and deployment requirements.

| Driver | Use Case | Container Communication | Host Access |
|--------|----------|------------------------|-------------|
| bridge | Default, single-host | Via IP or DNS (custom bridge) | Port mapping required |
| host | Performance-critical apps | Shares host network stack | Direct, no isolation |
| none | Maximum isolation | Disabled | Disabled |
| overlay | Multi-host clustering | Across Docker Swarm nodes | Port mapping required |
| macvlan | Legacy app integration | Appears as physical device | Direct MAC address |

### Bridge Network

The bridge driver creates a private internal network on your host. Containers on the same bridge network can communicate with each other, while remaining isolated from containers on other networks.

### Host Network

The host driver removes network isolation between the container and the Docker host. The container shares the host's networking namespace, which means it uses the host's IP address directly.

### None Network

The none driver disables all networking for a container. This is useful for containers that need complete network isolation or handle their own networking.

### Overlay Network

The overlay driver enables communication between containers running on different Docker hosts. This is essential for Docker Swarm deployments and distributed applications.

### Macvlan Network

The macvlan driver assigns a MAC address to each container, making it appear as a physical device on your network. This is useful for applications that expect to be directly connected to the physical network.

## Creating Custom Bridge Networks

Custom bridge networks provide automatic DNS resolution between containers, better isolation, and more control over the network configuration.

### Basic Network Creation

Create a custom bridge network with default settings:

```bash
# Create a custom bridge network named "app-network"
docker network create app-network

# Verify the network was created
docker network ls

# Expected output:
# NETWORK ID     NAME          DRIVER    SCOPE
# a1b2c3d4e5f6   app-network   bridge    local
# 7g8h9i0j1k2l   bridge        bridge    local
# 3m4n5o6p7q8r   host          host      local
# 9s0t1u2v3w4x   none          null      local
```

### Network Creation with Custom Subnet

Specify a custom subnet and gateway for more control over IP addressing:

```bash
# Create a network with a custom subnet and gateway
docker network create \
  --driver bridge \
  --subnet 172.20.0.0/16 \
  --gateway 172.20.0.1 \
  --ip-range 172.20.240.0/20 \
  custom-subnet-network

# Inspect the network configuration
docker network inspect custom-subnet-network --format '{{json .IPAM.Config}}' | jq .

# Expected output:
# [
#   {
#     "Subnet": "172.20.0.0/16",
#     "IPRange": "172.20.240.0/20",
#     "Gateway": "172.20.0.1"
#   }
# ]
```

### Network with Custom Options

Configure additional network options for specific requirements:

```bash
# Create a network with custom MTU and ICC (inter-container communication) settings
docker network create \
  --driver bridge \
  --opt com.docker.network.bridge.name=br-custom \
  --opt com.docker.network.bridge.enable_icc=true \
  --opt com.docker.network.bridge.enable_ip_masquerade=true \
  --opt com.docker.network.driver.mtu=1450 \
  production-network

# List available network options for bridge driver
docker network create --help | grep -A 20 "driver specific"
```

## DNS and Service Discovery

One of the most powerful features of custom bridge networks is automatic DNS resolution. Containers can reach each other by name, eliminating the need to track IP addresses.

### Automatic DNS Resolution

Containers on the same custom network can resolve each other by container name:

```bash
# Create a network for DNS demonstration
docker network create dns-demo

# Start a web server container
docker run -d \
  --name webserver \
  --network dns-demo \
  nginx:alpine

# Start a client container and test DNS resolution
docker run --rm \
  --network dns-demo \
  alpine:latest \
  sh -c "apk add --no-cache curl > /dev/null 2>&1 && curl -s http://webserver"

# The client resolves "webserver" automatically to the nginx container's IP
```

### Network Aliases

Assign multiple DNS names to a single container for flexible service discovery:

```bash
# Run a container with network aliases
docker run -d \
  --name primary-db \
  --network dns-demo \
  --network-alias database \
  --network-alias postgres \
  --network-alias db.local \
  postgres:15-alpine

# Any of these names will resolve to the same container:
# - primary-db (container name)
# - database (alias)
# - postgres (alias)
# - db.local (alias)

# Test alias resolution from another container
docker run --rm \
  --network dns-demo \
  alpine:latest \
  sh -c "nslookup database"
```

### Custom DNS Configuration

Configure custom DNS servers for containers that need to resolve external hostnames:

```bash
# Create a network with custom DNS settings
docker network create \
  --driver bridge \
  --opt com.docker.network.bridge.name=br-custom-dns \
  custom-dns-network

# Run a container with custom DNS servers
docker run -d \
  --name app-with-dns \
  --network custom-dns-network \
  --dns 8.8.8.8 \
  --dns 8.8.4.4 \
  --dns-search example.com \
  nginx:alpine

# Verify DNS configuration inside the container
docker exec app-with-dns cat /etc/resolv.conf
```

## Network Isolation

Network isolation is critical for security and separating application components.

### Isolating Application Tiers

Create separate networks for different application tiers:

```bash
# Create isolated networks for each tier
docker network create frontend-tier
docker network create backend-tier
docker network create database-tier

# Frontend can only talk to backend
# Backend can talk to frontend and database
# Database is completely isolated from frontend

# Start database container (only on database tier)
docker run -d \
  --name postgres \
  --network database-tier \
  -e POSTGRES_PASSWORD=secretpassword \
  postgres:15-alpine

# Start backend container (connected to backend and database tiers)
docker run -d \
  --name api-server \
  --network backend-tier \
  -e DATABASE_HOST=postgres \
  node:20-alpine \
  sleep infinity

# Connect backend to database tier
docker network connect database-tier api-server

# Start frontend container (only on frontend and backend tiers)
docker run -d \
  --name web-app \
  --network frontend-tier \
  -p 80:80 \
  nginx:alpine

# Connect frontend to backend tier
docker network connect backend-tier web-app
```

### Internal Networks

Create networks that have no external connectivity:

```bash
# Create an internal-only network (no internet access)
docker network create \
  --driver bridge \
  --internal \
  isolated-internal

# Containers on this network cannot reach the internet
docker run --rm \
  --network isolated-internal \
  alpine:latest \
  sh -c "ping -c 2 google.com"

# Expected output: ping: bad address 'google.com'
# or network unreachable error
```

### Network Policies with iptables

For advanced isolation, configure iptables rules on the Docker host:

```bash
# View Docker-managed iptables rules
sudo iptables -L DOCKER-USER -n -v

# Add a rule to block traffic between specific networks
# (Run on the Docker host, not inside a container)
sudo iptables -I DOCKER-USER -i br-frontend -o br-database -j DROP
sudo iptables -I DOCKER-USER -i br-database -o br-frontend -j DROP

# These rules prevent direct communication between frontend and database networks
```

## Connecting Containers to Multiple Networks

Containers often need to communicate with services on different networks. Docker allows connecting a single container to multiple networks.

### Multi-Network Container Setup

Connect a container to multiple networks for cross-network communication:

```bash
# Create two separate networks
docker network create network-alpha
docker network create network-beta

# Start a container on network-alpha
docker run -d \
  --name multi-net-container \
  --network network-alpha \
  nginx:alpine

# Connect the same container to network-beta
docker network connect network-beta multi-net-container

# Verify the container has interfaces on both networks
docker exec multi-net-container ip addr show

# Expected output shows two network interfaces (eth0 and eth1)
# each with an IP from their respective network subnets

# Inspect container to see all network connections
docker inspect multi-net-container --format '{{json .NetworkSettings.Networks}}' | jq .
```

### Specifying IP Address When Connecting

Assign a specific IP address when connecting to a network:

```bash
# Create a network with a defined subnet
docker network create \
  --subnet 192.168.100.0/24 \
  static-ip-network

# Connect container with a specific IP
docker network connect \
  --ip 192.168.100.50 \
  static-ip-network \
  multi-net-container

# Verify the IP assignment
docker inspect multi-net-container \
  --format '{{.NetworkSettings.Networks.static-ip-network.IPAddress}}'

# Expected output: 192.168.100.50
```

## Docker Compose Networking

Docker Compose simplifies network management by automatically creating networks and connecting services.

### Basic Compose Networking

By default, Compose creates a network for your project:

```yaml
# docker-compose.yml
# Services are automatically connected to the default network
# and can reach each other by service name

version: "3.9"

services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    depends_on:
      - api

  api:
    image: node:20-alpine
    command: node server.js
    environment:
      - DATABASE_URL=postgres://db:5432/app
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secretpassword
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:

# All three services (web, api, db) are on the same default network
# web can reach api at http://api:port
# api can reach db at postgres://db:5432
```

### Custom Networks in Compose

Define custom networks with specific configurations:

```yaml
# docker-compose.yml
# Multi-tier application with network isolation

version: "3.9"

services:
  # Frontend service - public facing
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    networks:
      - frontend
      - backend
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api

  # API service - internal only
  api:
    build: ./api
    networks:
      - backend
      - database
    environment:
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis

  # Cache service
  redis:
    image: redis:7-alpine
    networks:
      - database
    volumes:
      - redis_data:/data

  # Database service - most restricted
  postgres:
    image: postgres:15-alpine
    networks:
      - database
    environment:
      POSTGRES_DB: application
      POSTGRES_USER: app_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

networks:
  frontend:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.name: br-frontend

  backend:
    driver: bridge
    internal: false
    driver_opts:
      com.docker.network.bridge.name: br-backend

  database:
    driver: bridge
    internal: true  # No external access
    driver_opts:
      com.docker.network.bridge.name: br-database

volumes:
  postgres_data:
  redis_data:
```

### External Networks in Compose

Connect to networks created outside of Compose:

```yaml
# docker-compose.yml
# Connect to pre-existing external networks

version: "3.9"

services:
  monitoring:
    image: prom/prometheus:latest
    networks:
      - monitoring
      - app_backend  # External network from another compose project

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    networks:
      - monitoring

networks:
  monitoring:
    driver: bridge

  app_backend:
    external: true  # This network must already exist
    name: myapp_backend  # Actual network name (if different from key)
```

### Network Aliases in Compose

Assign service aliases for flexible naming:

```yaml
# docker-compose.yml
# Service with multiple network aliases

version: "3.9"

services:
  database:
    image: postgres:15-alpine
    networks:
      backend:
        aliases:
          - postgres
          - db
          - database.local
    environment:
      POSTGRES_PASSWORD: password

  legacy-app:
    image: myapp:legacy
    networks:
      - backend
    environment:
      # Legacy app expects "database.local" hostname
      DB_HOST: database.local

  modern-app:
    image: myapp:modern
    networks:
      - backend
    environment:
      # Modern app uses "postgres" hostname
      DB_HOST: postgres

networks:
  backend:
    driver: bridge
```

## Overlay Networks for Multi-Host Communication

Overlay networks enable container communication across multiple Docker hosts in a Swarm cluster.

### Initialize Docker Swarm

Set up a Swarm cluster before creating overlay networks:

```bash
# Initialize Swarm on the manager node
docker swarm init --advertise-addr 192.168.1.100

# Output includes a join token for worker nodes
# docker swarm join --token SWMTKN-1-xxx 192.168.1.100:2377

# On worker nodes, run the join command
docker swarm join --token SWMTKN-1-xxx 192.168.1.100:2377

# Verify cluster status
docker node ls
```

### Create Overlay Network

Create an overlay network for cross-host communication:

```bash
# Create an overlay network (only works in Swarm mode)
docker network create \
  --driver overlay \
  --subnet 10.10.0.0/16 \
  --gateway 10.10.0.1 \
  --attachable \
  swarm-overlay

# The --attachable flag allows standalone containers to connect
# Without it, only Swarm services can use the network

# Verify overlay network creation
docker network ls --filter driver=overlay
```

### Deploy Services on Overlay Network

Deploy Swarm services that communicate across hosts:

```bash
# Create a Redis service on the overlay network
docker service create \
  --name redis \
  --network swarm-overlay \
  --replicas 1 \
  redis:7-alpine

# Create a web service that connects to Redis
docker service create \
  --name web \
  --network swarm-overlay \
  --replicas 3 \
  --publish published=8080,target=80 \
  -e REDIS_HOST=redis \
  my-web-app:latest

# Services can reach each other by name across any node in the cluster
# Docker handles the routing automatically

# Scale services as needed
docker service scale web=5
```

### Overlay Network with Encryption

Enable encryption for sensitive data traversing the overlay network:

```bash
# Create an encrypted overlay network
docker network create \
  --driver overlay \
  --opt encrypted \
  --attachable \
  secure-overlay

# Traffic between nodes on this network is encrypted using IPsec
# There is some performance overhead, so use only when needed
```

## Troubleshooting Docker Networks

When containers cannot communicate, systematic debugging helps identify the issue.

### Inspecting Network Configuration

Examine network details and connected containers:

```bash
# List all networks
docker network ls

# Detailed network information
docker network inspect app-network

# Format output for specific information
docker network inspect app-network \
  --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{"\n"}}{{end}}'

# Check which networks a container is connected to
docker inspect my-container \
  --format '{{range $net, $config := .NetworkSettings.Networks}}{{$net}}: {{$config.IPAddress}}{{"\n"}}{{end}}'
```

### Testing Container Connectivity

Verify containers can reach each other:

```bash
# Start a debug container on the same network
docker run -it --rm \
  --network app-network \
  nicolaka/netshoot \
  bash

# Inside the debug container, run these commands:

# Test DNS resolution
nslookup webserver
dig webserver

# Test TCP connectivity
nc -zv webserver 80
telnet webserver 80

# Test HTTP connectivity
curl -v http://webserver

# Trace network path
traceroute webserver

# Check open ports on target container
nmap -sT webserver
```

### Debugging DNS Issues

Troubleshoot DNS resolution problems:

```bash
# Check DNS configuration inside a container
docker exec my-container cat /etc/resolv.conf

# Test DNS resolution
docker exec my-container nslookup other-container

# Check if the embedded DNS server is responding
docker exec my-container nslookup other-container 127.0.0.11

# Debug DNS with verbose output
docker run --rm \
  --network app-network \
  alpine:latest \
  sh -c "apk add --no-cache bind-tools > /dev/null && dig @127.0.0.11 webserver"
```

### Common Network Issues and Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| Cannot resolve container name | "Name not found" errors | Ensure both containers are on the same custom network (not default bridge) |
| Connection refused | Can ping but cannot connect to service | Check if the service is listening on 0.0.0.0, not just localhost |
| Network unreachable | Cannot ping external IPs | Check if the network is internal-only or if IP masquerade is disabled |
| Port already in use | Bind error on port mapping | Find and stop the conflicting process or use a different host port |
| Slow DNS resolution | Multi-second delays | Add explicit DNS servers or check for IPv6 lookup issues |

### Cleaning Up Networks

Remove unused networks to free resources:

```bash
# Remove a specific network (must have no connected containers)
docker network rm app-network

# Remove all unused networks
docker network prune

# Force remove with confirmation
docker network prune -f

# Remove networks matching a pattern
docker network ls --filter "name=test-" -q | xargs docker network rm
```

## Best Practices for Docker Networking

Following these guidelines helps build reliable, secure, and maintainable container networks.

### Security Best Practices

1. **Use custom bridge networks** - Avoid the default bridge network, which does not provide DNS resolution and has weaker isolation.

2. **Implement network segmentation** - Create separate networks for different application tiers (frontend, backend, database).

3. **Use internal networks for sensitive services** - Databases and caches should be on internal networks with no external access.

4. **Avoid host networking in production** - The host driver removes network isolation and should only be used when absolutely necessary.

5. **Enable encryption for overlay networks** - Use the `--opt encrypted` flag when sensitive data traverses the network.

### Performance Best Practices

1. **Keep containers on the same network** - Cross-network communication adds latency.

2. **Use appropriate MTU settings** - Match the MTU to your infrastructure, especially in cloud environments.

3. **Consider macvlan for high-throughput** - When network isolation is not critical and performance is paramount.

4. **Limit network aliases** - Each alias adds DNS entries and lookup overhead.

### Operational Best Practices

1. **Name networks descriptively** - Use names that indicate purpose: `prod-database`, `staging-backend`.

2. **Document network architecture** - Maintain diagrams showing which services connect to which networks.

3. **Use Compose for complex setups** - Compose files serve as documentation and enable reproducible deployments.

4. **Test network isolation** - Regularly verify that network boundaries work as expected.

5. **Clean up unused networks** - Run `docker network prune` periodically to remove orphaned networks.

## Complete Example: Microservices Application

Here is a complete example demonstrating a production-like microservices setup:

```yaml
# docker-compose.yml
# Production microservices architecture with proper network isolation

version: "3.9"

services:
  # Public-facing load balancer
  traefik:
    image: traefik:v2.10
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
    ports:
      - "80:80"
      - "443:443"
    networks:
      - public
      - services
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik:/etc/traefik

  # User-facing web application
  frontend:
    build: ./frontend
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`app.example.com`)"
    networks:
      - services
    environment:
      - API_URL=http://api:3000
    depends_on:
      - api

  # REST API service
  api:
    build: ./api
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.example.com`)"
    networks:
      - services
      - data
    environment:
      - DATABASE_URL=postgres://app:${DB_PASSWORD}@postgres:5432/app
      - REDIS_URL=redis://redis:6379
      - RABBITMQ_URL=amqp://rabbitmq:5672
    depends_on:
      - postgres
      - redis
      - rabbitmq

  # Background worker service
  worker:
    build: ./worker
    networks:
      - data
    environment:
      - DATABASE_URL=postgres://app:${DB_PASSWORD}@postgres:5432/app
      - REDIS_URL=redis://redis:6379
      - RABBITMQ_URL=amqp://rabbitmq:5672
    depends_on:
      - postgres
      - redis
      - rabbitmq
    deploy:
      replicas: 2

  # PostgreSQL database
  postgres:
    image: postgres:15-alpine
    networks:
      - data
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis cache
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    networks:
      - data
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # RabbitMQ message broker
  rabbitmq:
    image: rabbitmq:3.12-management-alpine
    networks:
      - data
      - monitoring
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_running"]
      interval: 30s
      timeout: 10s
      retries: 5

  # Prometheus monitoring
  prometheus:
    image: prom/prometheus:latest
    networks:
      - monitoring
      - services
    volumes:
      - ./prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'

  # Grafana dashboards
  grafana:
    image: grafana/grafana:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.grafana.rule=Host(`grafana.example.com`)"
    networks:
      - monitoring
      - services
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}

networks:
  # Public network - exposed to internet via load balancer
  public:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.name: br-public

  # Services network - internal service communication
  services:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.name: br-services

  # Data network - databases and caches (no external access)
  data:
    driver: bridge
    internal: true
    driver_opts:
      com.docker.network.bridge.name: br-data

  # Monitoring network - metrics collection
  monitoring:
    driver: bridge
    internal: true
    driver_opts:
      com.docker.network.bridge.name: br-monitoring

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
  prometheus_data:
  grafana_data:
```

This configuration demonstrates:

- **Network isolation**: The data network is internal, preventing direct access from the public internet
- **Tiered architecture**: Services are separated into public, services, data, and monitoring networks
- **Minimal connectivity**: Each service only connects to the networks it needs
- **Health checks**: All data services include health checks for reliability
- **Volume persistence**: Stateful services use named volumes for data persistence

## Summary

Docker custom networks provide the foundation for building secure, scalable containerized applications. Key takeaways:

- Use custom bridge networks instead of the default bridge for DNS resolution and better isolation
- Implement network segmentation to limit the blast radius of security incidents
- Leverage overlay networks for multi-host deployments in Docker Swarm
- Use Docker Compose to define and manage complex network topologies
- Regularly test network isolation and clean up unused networks

Start with simple bridge networks for development, then add isolation and overlay networks as your application grows. The commands and examples in this guide provide a foundation for building production-ready Docker networking configurations.
