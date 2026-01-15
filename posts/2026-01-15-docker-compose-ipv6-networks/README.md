# How to Set Up Docker Compose with IPv6 Networks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: IPv6, Docker, Docker Compose, Containers, Networking, DevOps

Description: A comprehensive guide to configuring IPv6 networking in Docker Compose, covering daemon configuration, network modes, subnet allocation, and production-ready deployment patterns.

---

IPv6 adoption continues to accelerate as IPv4 address exhaustion becomes a real constraint for growing infrastructure. Whether you are deploying containers to cloud providers with native IPv6 support, running dual-stack services, or preparing for an IPv6-only future, Docker Compose makes it straightforward to configure IPv6 networking for your containerized workloads.

This guide walks through every aspect of Docker Compose IPv6 configuration - from enabling IPv6 at the daemon level to designing production-grade dual-stack networks with proper subnet allocation.

## Why IPv6 Matters for Container Deployments

Before diving into configuration, let us understand why IPv6 support in Docker matters:

1. **Address Space**: IPv4 offers roughly 4.3 billion addresses. IPv6 provides 340 undecillion addresses - enough for every grain of sand on Earth to have its own IP.

2. **NAT Elimination**: IPv6 enables true end-to-end connectivity without NAT, simplifying service discovery and peer-to-peer communication between containers.

3. **Cloud Provider Support**: Major cloud providers now offer native IPv6 support. AWS, Google Cloud, and Azure all provide dual-stack VPCs where containers can leverage both protocols.

4. **Performance**: IPv6 eliminates NAT traversal overhead and enables more efficient routing in many scenarios.

5. **Future-Proofing**: As IPv4 addresses become scarcer and more expensive, IPv6-ready infrastructure becomes a competitive advantage.

## Prerequisites

Before configuring IPv6 in Docker Compose, ensure your environment meets these requirements:

- Docker Engine 20.10 or later (IPv6 support improved significantly in recent versions)
- Docker Compose V2 (the `docker compose` plugin, not standalone `docker-compose`)
- Host system with IPv6 enabled at the kernel level
- Understanding of IPv6 addressing and CIDR notation

Verify your host supports IPv6:

```bash
# Check if IPv6 is enabled on the host
cat /proc/sys/net/ipv6/conf/all/disable_ipv6
# Output should be 0 (IPv6 enabled) not 1 (disabled)

# Verify IPv6 connectivity
ping6 -c 4 ipv6.google.com
```

If IPv6 is disabled, enable it:

```bash
# Enable IPv6 temporarily
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=0
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=0

# Make it persistent across reboots
echo "net.ipv6.conf.all.disable_ipv6 = 0" | sudo tee -a /etc/sysctl.conf
echo "net.ipv6.conf.default.disable_ipv6 = 0" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Step 1: Enable IPv6 in the Docker Daemon

Docker does not enable IPv6 by default. You must explicitly configure the daemon to support IPv6 networking.

### Basic Daemon Configuration

Edit or create the Docker daemon configuration file:

```bash
sudo nano /etc/docker/daemon.json
```

Add the following configuration:

```json
{
  "ipv6": true,
  "fixed-cidr-v6": "fd00::/80"
}
```

Let us break down these settings:

- `"ipv6": true` - Enables IPv6 support in the Docker daemon
- `"fixed-cidr-v6": "fd00::/80"` - Assigns a subnet for the default bridge network

The `fd00::/80` range uses Unique Local Addresses (ULA), which are the IPv6 equivalent of private IPv4 ranges like `10.0.0.0/8`. The `/80` prefix provides 48 bits for container addresses - more than enough for any deployment.

### Advanced Daemon Configuration

For production environments, consider this more complete configuration:

```json
{
  "ipv6": true,
  "fixed-cidr-v6": "fd00::/80",
  "ip6tables": true,
  "experimental": false,
  "default-address-pools": [
    {
      "base": "172.17.0.0/16",
      "size": 24
    },
    {
      "base": "fd00:dead:beef::/48",
      "size": 64
    }
  ]
}
```

Additional options explained:

- `"ip6tables": true` - Enables ip6tables rules for container networking (similar to iptables for IPv4)
- `"default-address-pools"` - Defines address pools for automatic subnet allocation when creating networks

### Restart Docker to Apply Changes

```bash
# Restart the Docker daemon
sudo systemctl restart docker

# Verify IPv6 is enabled
docker info | grep -i ipv6
# Should show: IPv6 Enabled: true
```

## Step 2: Understanding IPv6 Address Types

Before creating networks, understand the IPv6 address types you will encounter:

### Unique Local Addresses (ULA) - fd00::/8

Similar to RFC 1918 private addresses in IPv4. Use these for internal container communication that does not need internet routable addresses.

```
fd00::/8     - Unique Local Address range
fd00::/80    - Common Docker subnet allocation
fdxx:xxxx::  - Locally generated addresses
```

### Global Unicast Addresses (GUA) - 2000::/3

Internet-routable addresses. Use these when containers need direct IPv6 internet connectivity.

```
2001:db8::/32  - Documentation range (examples only)
2600::/12      - Example ISP allocation
```

### Link-Local Addresses - fe80::/10

Automatically assigned to every interface. Used for local network segment communication. Docker assigns these automatically.

```
fe80::1       - Typical link-local address
```

## Step 3: Creating IPv6-Enabled Networks in Docker Compose

Now let us create Docker Compose configurations with IPv6 support.

### Basic IPv6 Network

The simplest IPv6-enabled network configuration:

```yaml
# docker-compose.yml
version: "3.8"

services:
  web:
    image: nginx:alpine
    networks:
      - app_net
    ports:
      - "80:80"
      - "[::]:80:80"  # Explicit IPv6 port binding

  api:
    image: node:20-alpine
    networks:
      - app_net
    command: node server.js

networks:
  app_net:
    enable_ipv6: true
    ipam:
      config:
        - subnet: "172.28.0.0/16"
        - subnet: "fd00:0:0:1::/64"
```

Key configuration elements:

- `enable_ipv6: true` - Explicitly enables IPv6 on this network
- `ipam.config` - Defines both IPv4 and IPv6 subnets for dual-stack operation
- `subnet: "fd00:0:0:1::/64"` - The IPv6 subnet for container addresses

### Dual-Stack Network with Gateway Configuration

For more control over network addressing:

```yaml
version: "3.8"

services:
  web:
    image: nginx:alpine
    networks:
      app_net:
        ipv4_address: 172.28.0.10
        ipv6_address: fd00:0:0:1::10
    ports:
      - "80:80"

  database:
    image: postgres:16
    networks:
      app_net:
        ipv4_address: 172.28.0.20
        ipv6_address: fd00:0:0:1::20
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  cache:
    image: redis:7-alpine
    networks:
      app_net:
        ipv4_address: 172.28.0.30
        ipv6_address: fd00:0:0:1::30

networks:
  app_net:
    driver: bridge
    enable_ipv6: true
    ipam:
      driver: default
      config:
        - subnet: "172.28.0.0/16"
          gateway: "172.28.0.1"
        - subnet: "fd00:0:0:1::/64"
          gateway: "fd00:0:0:1::1"
```

This configuration:

- Assigns static IPv4 and IPv6 addresses to each service
- Defines explicit gateways for both address families
- Enables predictable addressing for firewall rules and service discovery

### IPv6-Only Network

For environments that do not need IPv4 at all:

```yaml
version: "3.8"

services:
  web:
    image: nginx:alpine
    networks:
      ipv6_only:
        ipv6_address: fd00:cafe::10
    ports:
      - "[::]:8080:80"

  api:
    image: python:3.12-slim
    networks:
      ipv6_only:
        ipv6_address: fd00:cafe::20
    command: python -m http.server 8000

networks:
  ipv6_only:
    enable_ipv6: true
    ipam:
      config:
        - subnet: "fd00:cafe::/64"
```

Note: IPv6-only networks can be challenging for services that assume IPv4. Test thoroughly.

## Step 4: Multiple Networks with IPv6

Real applications often need multiple networks for isolation. Here is how to configure multiple IPv6-enabled networks:

```yaml
version: "3.8"

services:
  # Frontend services - accessible from internet
  nginx:
    image: nginx:alpine
    networks:
      frontend:
        ipv4_address: 172.20.0.10
        ipv6_address: fd00:1::10
      backend:
        ipv4_address: 172.21.0.10
        ipv6_address: fd00:2::10
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro

  # Application tier - internal only
  api:
    image: node:20-alpine
    networks:
      backend:
        ipv4_address: 172.21.0.20
        ipv6_address: fd00:2::20
      database:
        ipv4_address: 172.22.0.20
        ipv6_address: fd00:3::20
    environment:
      DATABASE_URL: "postgresql://app:secret@fd00:3::30:5432/myapp"

  worker:
    image: python:3.12-slim
    networks:
      backend:
        ipv4_address: 172.21.0.30
        ipv6_address: fd00:2::30
      database:
        ipv4_address: 172.22.0.30
        ipv6_address: fd00:3::30
    command: celery -A tasks worker

  # Database tier - most restricted
  postgres:
    image: postgres:16
    networks:
      database:
        ipv4_address: 172.22.0.40
        ipv6_address: fd00:3::40
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}

  redis:
    image: redis:7-alpine
    networks:
      backend:
        ipv4_address: 172.21.0.50
        ipv6_address: fd00:2::50

networks:
  # Public-facing network
  frontend:
    driver: bridge
    enable_ipv6: true
    ipam:
      config:
        - subnet: "172.20.0.0/16"
        - subnet: "fd00:1::/64"

  # Application network
  backend:
    driver: bridge
    enable_ipv6: true
    internal: false
    ipam:
      config:
        - subnet: "172.21.0.0/16"
        - subnet: "fd00:2::/64"

  # Database network - internal only
  database:
    driver: bridge
    enable_ipv6: true
    internal: true  # No external access
    ipam:
      config:
        - subnet: "172.22.0.0/16"
        - subnet: "fd00:3::/64"

volumes:
  pgdata:
```

This configuration implements network segmentation:

- **frontend**: Public-facing services
- **backend**: Application tier communication
- **database**: Isolated database network with `internal: true`

## Step 5: Using External IPv6 Networks

When you need containers to connect to pre-existing networks or share networks across multiple Compose projects:

### Creating an External Network

First, create the network manually:

```bash
# Create a dual-stack external network
docker network create \
  --driver bridge \
  --ipv6 \
  --subnet 172.30.0.0/16 \
  --subnet fd00:shared::/64 \
  --gateway 172.30.0.1 \
  --gateway fd00:shared::1 \
  shared_network
```

### Using the External Network in Compose

```yaml
version: "3.8"

services:
  service_a:
    image: nginx:alpine
    networks:
      - shared

  service_b:
    image: redis:7-alpine
    networks:
      - shared

networks:
  shared:
    external: true
    name: shared_network
```

### Multiple Compose Projects Sharing a Network

Project A (`project-a/docker-compose.yml`):

```yaml
version: "3.8"

services:
  api:
    image: myapi:latest
    networks:
      - shared_net
    environment:
      REDIS_HOST: "fd00:shared::redis"

networks:
  shared_net:
    external: true
    name: shared_network
```

Project B (`project-b/docker-compose.yml`):

```yaml
version: "3.8"

services:
  redis:
    image: redis:7-alpine
    hostname: redis
    networks:
      shared_net:
        ipv6_address: fd00:shared::redis

networks:
  shared_net:
    external: true
    name: shared_network
```

## Step 6: IPv6 and Docker Network Drivers

Different network drivers have varying IPv6 support:

### Bridge Driver (Default)

The most common choice for single-host deployments:

```yaml
networks:
  my_bridge:
    driver: bridge
    enable_ipv6: true
    driver_opts:
      com.docker.network.bridge.enable_ip_masquerade: "true"
      com.docker.network.bridge.enable_icc: "true"
    ipam:
      config:
        - subnet: "172.25.0.0/16"
        - subnet: "fd00:bridge::/64"
```

Driver options explained:

- `enable_ip_masquerade` - Enables NAT for outbound traffic (less relevant for IPv6 but good for dual-stack)
- `enable_icc` - Inter-container communication

### Macvlan Driver with IPv6

Macvlan gives containers their own MAC addresses, appearing as physical devices on your network:

```yaml
version: "3.8"

services:
  web:
    image: nginx:alpine
    networks:
      macvlan_net:
        ipv4_address: 192.168.1.100
        ipv6_address: 2001:db8:1::100

networks:
  macvlan_net:
    driver: macvlan
    enable_ipv6: true
    driver_opts:
      parent: eth0  # Your host's physical interface
    ipam:
      config:
        - subnet: "192.168.1.0/24"
          gateway: "192.168.1.1"
        - subnet: "2001:db8:1::/64"
          gateway: "2001:db8:1::1"
```

Important: Macvlan requires careful IP planning to avoid conflicts with your physical network.

### IPvlan L2 Mode with IPv6

Similar to macvlan but shares the parent interface's MAC address:

```yaml
version: "3.8"

services:
  app:
    image: myapp:latest
    networks:
      ipvlan_net:
        ipv4_address: 192.168.1.150
        ipv6_address: 2001:db8:1::150

networks:
  ipvlan_net:
    driver: ipvlan
    enable_ipv6: true
    driver_opts:
      parent: eth0
      ipvlan_mode: l2
    ipam:
      config:
        - subnet: "192.168.1.0/24"
          gateway: "192.168.1.1"
        - subnet: "2001:db8:1::/64"
          gateway: "2001:db8:1::1"
```

## Step 7: Port Binding with IPv6

Binding ports correctly for IPv6 requires attention to syntax:

### Binding to All Interfaces (IPv4 and IPv6)

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      # Binds to all IPv4 and IPv6 interfaces
      - "80:80"
      - "443:443"
```

By default, Docker binds to `0.0.0.0` (all IPv4) and `::` (all IPv6) when the daemon has IPv6 enabled.

### Explicit IPv6 Binding

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      # Explicit IPv4 binding
      - "0.0.0.0:80:80"
      # Explicit IPv6 binding
      - "[::]:8080:80"
      # Specific IPv6 address binding
      - "[fd00::1]:9090:80"
```

### Long-Form Port Syntax

For clarity and additional options:

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - target: 80
        published: 80
        protocol: tcp
        mode: host
      - target: 80
        published: "8080"
        host_ip: "::"  # All IPv6 interfaces
        protocol: tcp
```

## Step 8: DNS and Service Discovery with IPv6

Docker's internal DNS automatically handles both IPv4 and IPv6 addresses:

### Basic Service Discovery

```yaml
version: "3.8"

services:
  web:
    image: nginx:alpine
    networks:
      - app_net
    depends_on:
      - api

  api:
    image: myapi:latest
    networks:
      - app_net
    environment:
      # Docker DNS resolves 'db' to both IPv4 and IPv6 addresses
      DATABASE_HOST: db

  db:
    image: postgres:16
    networks:
      - app_net

networks:
  app_net:
    enable_ipv6: true
    ipam:
      config:
        - subnet: "172.28.0.0/16"
        - subnet: "fd00:dns::/64"
```

### Custom DNS Configuration

```yaml
services:
  web:
    image: nginx:alpine
    dns:
      - 2001:4860:4860::8888  # Google Public DNS IPv6
      - 2606:4700:4700::1111  # Cloudflare DNS IPv6
      - 8.8.8.8               # Google Public DNS IPv4
    dns_search:
      - example.com
    networks:
      - app_net
```

### Aliases for IPv6 Service Discovery

```yaml
services:
  primary_db:
    image: postgres:16
    networks:
      app_net:
        ipv6_address: fd00:db::1
        aliases:
          - database
          - postgres
          - db-primary

  replica_db:
    image: postgres:16
    networks:
      app_net:
        ipv6_address: fd00:db::2
        aliases:
          - db-replica
          - postgres-ro

networks:
  app_net:
    enable_ipv6: true
    ipam:
      config:
        - subnet: "fd00:db::/64"
```

## Step 9: Health Checks with IPv6

Configure health checks that work correctly with IPv6:

```yaml
services:
  api:
    image: myapi:latest
    networks:
      app_net:
        ipv6_address: fd00:app::10
    healthcheck:
      # Use IPv6 loopback for internal health checks
      test: ["CMD", "curl", "-f", "http://[::1]:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    networks:
      app_net:
        ipv6_address: fd00:app::20
    healthcheck:
      # wget works well for Alpine-based images
      test: ["CMD", "wget", "--spider", "-q", "http://[::1]:80/"]
      interval: 15s
      timeout: 5s
      retries: 3

  postgres:
    image: postgres:16
    networks:
      app_net:
        ipv6_address: fd00:app::30
    healthcheck:
      # PostgreSQL health check using pg_isready
      test: ["CMD-SHELL", "pg_isready -h ::1 -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  app_net:
    enable_ipv6: true
    ipam:
      config:
        - subnet: "fd00:app::/64"
```

## Step 10: Production-Ready IPv6 Configuration

Here is a complete production-grade Docker Compose configuration with IPv6:

```yaml
version: "3.8"

# Production Docker Compose with IPv6 Support
# Usage: docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

x-logging: &default-logging
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"

x-healthcheck-defaults: &healthcheck-defaults
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s

services:
  # Reverse Proxy / Load Balancer
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    logging: *default-logging
    security_opt:
      - no-new-privileges:true
    networks:
      frontend:
        ipv4_address: 172.20.0.2
        ipv6_address: fd00:fe::2
    ports:
      - "80:80"
      - "443:443"
      - "[::]:80:80"
      - "[::]:443:443"
    volumes:
      - /var/run/docker.sock:ro
      - ./traefik/traefik.yml:/etc/traefik/traefik.yml:ro
      - ./traefik/certs:/certs:ro
      - traefik_acme:/acme
    environment:
      - TZ=UTC
    healthcheck:
      <<: *healthcheck-defaults
      test: ["CMD", "traefik", "healthcheck"]

  # Application Server
  api:
    image: ${REGISTRY}/api:${VERSION:-latest}
    container_name: api
    restart: unless-stopped
    logging: *default-logging
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      frontend:
        ipv4_address: 172.20.0.10
        ipv6_address: fd00:fe::10
      backend:
        ipv4_address: 172.21.0.10
        ipv6_address: fd00:be::10
      database:
        ipv4_address: 172.22.0.10
        ipv6_address: fd00:db::10
    environment:
      NODE_ENV: production
      DATABASE_URL: "postgresql://app:${DB_PASSWORD}@[fd00:db::20]:5432/myapp"
      REDIS_URL: "redis://[fd00:be::30]:6379"
      LOG_LEVEL: info
    healthcheck:
      <<: *healthcheck-defaults
      test: ["CMD", "curl", "-f", "http://[::1]:3000/health"]
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

  # Background Worker
  worker:
    image: ${REGISTRY}/worker:${VERSION:-latest}
    container_name: worker
    restart: unless-stopped
    logging: *default-logging
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      backend:
        ipv4_address: 172.21.0.20
        ipv6_address: fd00:be::20
      database:
        ipv4_address: 172.22.0.20
        ipv6_address: fd00:db::20
    environment:
      NODE_ENV: production
      DATABASE_URL: "postgresql://app:${DB_PASSWORD}@[fd00:db::20]:5432/myapp"
      REDIS_URL: "redis://[fd00:be::30]:6379"
      WORKER_CONCURRENCY: 4
    healthcheck:
      <<: *healthcheck-defaults
      test: ["CMD", "curl", "-f", "http://[::1]:3001/health"]

  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    container_name: postgres
    restart: unless-stopped
    logging: *default-logging
    networks:
      database:
        ipv4_address: 172.22.0.30
        ipv6_address: fd00:db::30
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: myapp
      PGDATA: /var/lib/postgresql/data/pgdata
    healthcheck:
      <<: *healthcheck-defaults
      test: ["CMD-SHELL", "pg_isready -U app -d myapp"]
      interval: 10s
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: redis
    restart: unless-stopped
    logging: *default-logging
    networks:
      backend:
        ipv4_address: 172.21.0.30
        ipv6_address: fd00:be::30
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 1gb --maxmemory-policy allkeys-lru
    healthcheck:
      <<: *healthcheck-defaults
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s

  # Monitoring - Prometheus
  prometheus:
    image: prom/prometheus:v2.50.0
    container_name: prometheus
    restart: unless-stopped
    logging: *default-logging
    networks:
      monitoring:
        ipv4_address: 172.23.0.10
        ipv6_address: fd00:mon::10
      backend:
        ipv4_address: 172.21.0.40
        ipv6_address: fd00:be::40
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
      - '--web.enable-lifecycle'
    healthcheck:
      <<: *healthcheck-defaults
      test: ["CMD", "wget", "-q", "--spider", "http://[::1]:9090/-/healthy"]

  # Monitoring - Grafana
  grafana:
    image: grafana/grafana:10.3.0
    container_name: grafana
    restart: unless-stopped
    logging: *default-logging
    depends_on:
      - prometheus
    networks:
      monitoring:
        ipv4_address: 172.23.0.20
        ipv6_address: fd00:mon::20
      frontend:
        ipv4_address: 172.20.0.20
        ipv6_address: fd00:fe::20
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
      GF_SERVER_ROOT_URL: https://grafana.example.com
      GF_INSTALL_PLUGINS: grafana-clock-panel,grafana-simple-json-datasource
    healthcheck:
      <<: *healthcheck-defaults
      test: ["CMD", "wget", "-q", "--spider", "http://[::1]:3000/api/health"]

networks:
  # Public-facing network for reverse proxy
  frontend:
    driver: bridge
    enable_ipv6: true
    ipam:
      driver: default
      config:
        - subnet: "172.20.0.0/16"
          gateway: "172.20.0.1"
        - subnet: "fd00:fe::/64"
          gateway: "fd00:fe::1"

  # Internal application network
  backend:
    driver: bridge
    enable_ipv6: true
    ipam:
      config:
        - subnet: "172.21.0.0/16"
          gateway: "172.21.0.1"
        - subnet: "fd00:be::/64"
          gateway: "fd00:be::1"

  # Isolated database network
  database:
    driver: bridge
    enable_ipv6: true
    internal: true  # No external connectivity
    ipam:
      config:
        - subnet: "172.22.0.0/16"
          gateway: "172.22.0.1"
        - subnet: "fd00:db::/64"
          gateway: "fd00:db::1"

  # Monitoring network
  monitoring:
    driver: bridge
    enable_ipv6: true
    ipam:
      config:
        - subnet: "172.23.0.0/16"
          gateway: "172.23.0.1"
        - subnet: "fd00:mon::/64"
          gateway: "fd00:mon::1"

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  prometheus_data:
    driver: local
  grafana_data:
    driver: local
  traefik_acme:
    driver: local
```

## Step 11: Debugging IPv6 Networks

When things go wrong, use these debugging techniques:

### Inspect Network Configuration

```bash
# View detailed network information including IPv6 subnets
docker network inspect app_net

# List all networks with their drivers
docker network ls

# Check container's IP addresses
docker inspect -f '{{range .NetworkSettings.Networks}}IPv4: {{.IPAddress}} IPv6: {{.GlobalIPv6Address}}{{end}}' container_name
```

### Test Connectivity

```bash
# Run a temporary container to test IPv6 connectivity
docker run --rm -it --network app_net nicolaka/netshoot

# Inside the container, test IPv6
ping6 fd00:app::10
curl -6 http://[fd00:app::10]:8080/

# Test DNS resolution
dig AAAA api
nslookup api
```

### View ip6tables Rules

```bash
# List IPv6 firewall rules created by Docker
sudo ip6tables -L -n -v

# Check NAT rules
sudo ip6tables -t nat -L -n -v
```

### Common Issues and Solutions

**Issue: Containers cannot reach IPv6 internet**

```bash
# Enable IPv6 forwarding on the host
sudo sysctl -w net.ipv6.conf.all.forwarding=1
echo "net.ipv6.conf.all.forwarding = 1" | sudo tee -a /etc/sysctl.conf
```

**Issue: IPv6 addresses not assigned**

```yaml
# Ensure enable_ipv6 is set to true
networks:
  my_net:
    enable_ipv6: true  # This is required!
    ipam:
      config:
        - subnet: "fd00::/64"  # IPv6 subnet must be defined
```

**Issue: Port binding fails for IPv6**

```bash
# Check if another service is using the port
sudo ss -tulpn | grep -E ':(80|443)'

# Ensure proper bracket syntax for IPv6
# Correct: "[::]:80:80"
# Incorrect: ":::80:80"
```

## Step 12: Security Best Practices for IPv6

IPv6 introduces unique security considerations:

### Network Isolation

```yaml
networks:
  # Use internal: true for networks that should not reach the internet
  database:
    driver: bridge
    enable_ipv6: true
    internal: true
    ipam:
      config:
        - subnet: "fd00:secure::/64"
```

### Firewall Configuration

Create a script to manage ip6tables rules:

```bash
#!/bin/bash
# ipv6-firewall.sh - Basic IPv6 firewall for Docker hosts

# Allow established connections
ip6tables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow loopback
ip6tables -A INPUT -i lo -j ACCEPT

# Allow ICMPv6 (required for IPv6 to function properly)
ip6tables -A INPUT -p ipv6-icmp -j ACCEPT

# Allow SSH
ip6tables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow HTTP/HTTPS
ip6tables -A INPUT -p tcp --dport 80 -j ACCEPT
ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow Docker networks (adjust prefix as needed)
ip6tables -A INPUT -s fd00::/8 -j ACCEPT

# Drop everything else
ip6tables -A INPUT -j DROP

# Save rules
ip6tables-save > /etc/ip6tables.rules
```

### Disable IPv6 on Sensitive Networks

If a network should not use IPv6:

```yaml
networks:
  legacy_net:
    driver: bridge
    enable_ipv6: false  # Explicitly disable IPv6
    ipam:
      config:
        - subnet: "172.30.0.0/16"
```

## IPv6 Configuration Quick Reference

Here is a summary table of all key IPv6 configuration options:

| Configuration | Location | Purpose | Example |
|--------------|----------|---------|---------|
| `ipv6: true` | daemon.json | Enable IPv6 in Docker daemon | `"ipv6": true` |
| `fixed-cidr-v6` | daemon.json | Default bridge IPv6 subnet | `"fixed-cidr-v6": "fd00::/80"` |
| `ip6tables` | daemon.json | Enable ip6tables rules | `"ip6tables": true` |
| `enable_ipv6` | docker-compose.yml | Enable IPv6 per network | `enable_ipv6: true` |
| `subnet` (IPv6) | docker-compose.yml | IPv6 subnet for network | `subnet: "fd00::/64"` |
| `gateway` (IPv6) | docker-compose.yml | IPv6 gateway address | `gateway: "fd00::1"` |
| `ipv6_address` | docker-compose.yml | Static IPv6 for service | `ipv6_address: fd00::10` |
| `[::]:port:port` | docker-compose.yml | IPv6 port binding | `"[::]:80:80"` |
| `internal: true` | docker-compose.yml | Disable external access | `internal: true` |

## Common IPv6 Subnet Recommendations

| Use Case | Recommended Subnet | Notes |
|----------|-------------------|-------|
| Internal services | `fd00::/64` | ULA range, not routable |
| Multiple networks | `fd00:1::/64`, `fd00:2::/64` | Increment third group |
| Large deployments | `fd00::/48` with `/64` subnets | Provides 65,536 /64 networks |
| Public services | ISP-allocated GUA | Requires coordination with network team |
| Documentation | `2001:db8::/32` | Reserved for examples only |

## Troubleshooting Checklist

When IPv6 is not working as expected:

1. **Daemon Configuration**
   - [ ] IPv6 enabled in `/etc/docker/daemon.json`
   - [ ] Docker daemon restarted after configuration changes
   - [ ] `docker info` shows `IPv6 Enabled: true`

2. **Host Configuration**
   - [ ] IPv6 not disabled in kernel (`/proc/sys/net/ipv6/conf/all/disable_ipv6` = 0)
   - [ ] IPv6 forwarding enabled for routing
   - [ ] No conflicting ip6tables rules

3. **Network Configuration**
   - [ ] `enable_ipv6: true` set on the network
   - [ ] Valid IPv6 subnet defined in IPAM config
   - [ ] Gateway address within the subnet

4. **Service Configuration**
   - [ ] Static IPv6 addresses within defined subnet
   - [ ] Port bindings use correct bracket syntax
   - [ ] Applications configured to listen on IPv6 (`::` or `0.0.0.0`)

5. **Connectivity**
   - [ ] Containers can ping each other via IPv6
   - [ ] DNS resolves to IPv6 addresses (AAAA records)
   - [ ] Firewalls allow IPv6 traffic

## Conclusion

IPv6 support in Docker Compose is mature and production-ready. By following this guide, you can:

- Enable IPv6 at the daemon level with proper subnet allocation
- Create dual-stack networks that support both IPv4 and IPv6
- Assign static IPv6 addresses for predictable service discovery
- Implement network segmentation with isolated IPv6 subnets
- Debug and troubleshoot IPv6 connectivity issues
- Apply security best practices for IPv6 container networks

The transition to IPv6 is not just about address space - it represents a fundamental shift toward simpler, more scalable network architectures. Containers with native IPv6 addresses eliminate NAT complexity, enable direct end-to-end communication, and prepare your infrastructure for the next decade of internet growth.

Start by enabling IPv6 in your development environment, test thoroughly with dual-stack configurations, and gradually roll out to production. The investment in understanding IPv6 networking pays dividends as more services and cloud providers adopt IPv6-first architectures.

For monitoring your IPv6-enabled container deployments, consider using OneUptime to track service availability, network latency, and infrastructure health across both address families.
