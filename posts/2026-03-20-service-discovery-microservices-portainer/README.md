# How to Configure Service Discovery for Microservices in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Microservice, Service Discovery, Consul, DNS

Description: Configure automatic service discovery for microservices using Docker's built-in DNS, Consul, or Traefik as a service registry with Portainer.

## Introduction

Service discovery lets microservices find each other dynamically without hardcoded IP addresses. Docker provides built-in DNS-based service discovery within user-defined networks. For more advanced use cases, tools like Consul provide health-aware service registries. This guide covers multiple service discovery approaches managed through Portainer.

## Method 1: Docker Built-in DNS (Recommended for Most Cases)

Docker's user-defined bridge networks and Swarm overlay networks include automatic DNS resolution. In a Compose app, containers on the same network can reach each other by service name.

```yaml
# compose.yaml - Docker DNS service discovery

networks:
  app_network:
    driver: bridge

services:
  # Service A can reach service B at http://service_b:8080
  service_a:
    image: service-a:latest
    networks:
      - app_network
    environment:
      # Use service names directly
      - USER_SERVICE_URL=http://user_service:8002
      - ORDER_SERVICE_URL=http://order_service:8003

  user_service:
    image: user-service:latest
    networks:
      - app_network
    # No need to expose port - internal only
    expose:
      - "8002"

  order_service:
    image: order-service:latest
    networks:
      - app_network
    expose:
      - "8003"
```

### DNS Responses for Scaled Services

Docker Compose can create multiple containers for a service. Docker DNS can return more than one IP for the service name, but client behavior determines how those addresses are used:

```bash
# Scale a service to 3 replicas
docker compose up -d --scale user_service=3

# Docker DNS can return multiple IPs for "user_service"
docker compose exec service_a nslookup user_service
```

## Method 2: Consul Service Registry

For microservices that need health checks and dynamic discovery:

```yaml
# compose.yaml - Consul service registry

networks:
  consul_net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.25.0.0/24

services:
  # Consul server
  consul:
    image: hashicorp/consul:latest
    container_name: consul
    restart: unless-stopped
    cap_add:
      - NET_BIND_SERVICE
    ports:
      - "8500:8500"   # HTTP API + UI
      - "8600:53/tcp"  # DNS (host port 8600 -> Consul DNS)
      - "8600:53/udp"
    command: >
      agent
      -server
      -bootstrap-expect=1
      -ui
      -client=0.0.0.0
      -bind=172.25.0.10
      -dns-port=53
      -recursor=8.8.8.8
    networks:
      consul_net:
        ipv4_address: 172.25.0.10

  # Registrator - auto-registers Docker containers in Consul
  registrator:
    image: gliderlabs/registrator:latest
    container_name: registrator
    restart: unless-stopped
    command: >
      -internal
      consul://consul:8500
    volumes:
      - /var/run/docker.sock:/tmp/docker.sock
    depends_on:
      - consul
    networks:
      - consul_net

  # Example microservice that auto-registers
  user_service:
    image: user-service:latest
    container_name: user_service
    restart: unless-stopped
    expose:
      - "8002"
    environment:
      # These environment variables are read by Registrator
      - SERVICE_NAME=user-service
      - SERVICE_TAGS=v1,production,urlprefix-/users
      - SERVICE_CHECK_HTTP=/health
      - SERVICE_CHECK_INTERVAL=10s
      - SERVICE_CHECK_TIMEOUT=3s
      - CONSUL_URL=http://consul:8500
    networks:
      - consul_net

  # Fabio - Consul-aware load balancer
  fabio:
    image: fabiolb/fabio:latest
    container_name: fabio
    restart: unless-stopped
    ports:
      - "9999:9999"   # Traffic proxy
      - "9998:9998"   # Admin UI
    command:
      - "-registry.consul.addr=consul:8500"
    depends_on:
      - consul
    networks:
      - consul_net
```

### Register Services in Consul

```bash
# Manually register a service in Consul
curl -X PUT http://localhost:8500/v1/agent/service/register \
  -H "Content-Type: application/json" \
  -d '{
    "ID": "user-service-1",
    "Name": "user-service",
    "Tags": ["v1", "production"],
    "Address": "user_service",
    "Port": 8002,
    "Check": {
      "HTTP": "http://user_service:8002/health",
      "Interval": "10s",
      "Timeout": "3s"
    }
  }'

# Discover service via Consul DNS
# Services are available at <service-name>.service.consul
dig @127.0.0.1 -p 8600 user-service.service.consul

# Query via HTTP API
curl http://localhost:8500/v1/catalog/service/user-service | jq .
```

## Method 3: Traefik for HTTP Routing

Traefik automatically discovers Docker services and builds HTTP routers from labels:

```yaml
# compose.yaml - Traefik service discovery

networks:
  traefik_net:
    name: traefik_net
    driver: bridge

services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.network=traefik_net"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
    networks:
      - traefik_net

  # Services expose routes via labels
  api_gateway:
    image: api-gateway:latest
    networks:
      - traefik_net
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=PathPrefix(`/api`)"
      - "traefik.http.services.api.loadbalancer.server.port=8000"
      # Active load-balancer health check
      - "traefik.http.services.api.loadbalancer.healthcheck.path=/health"
      - "traefik.http.services.api.loadbalancer.healthcheck.interval=10s"

  user_service:
    image: user-service:latest
    networks:
      - traefik_net
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.users.rule=PathPrefix(`/api/users`)"
      - "traefik.http.services.users.loadbalancer.server.port=8002"
      # Sticky sessions
      - "traefik.http.services.users.loadbalancer.sticky.cookie.name=user_sticky"
```

## Step 4: DNS Configuration for Service Discovery

```yaml
# Configure services to use Consul DNS for resolution
# This assumes Consul DNS is listening on port 53 inside consul_net.
# In compose.yaml:

services:
  my_service:
    dns:
      - 172.25.0.10   # Consul DNS IP on consul_net
    dns_search:
      - service.consul  # Search domain
    environment:
      # Now can use service-name.service.consul in code
      - USER_SERVICE_URL=http://user-service.service.consul:8002
```

## Service Discovery Health Checks

```bash
# Check Consul service health
curl http://localhost:8500/v1/health/service/user-service | jq '.[].Checks'

# List all healthy service instances
curl http://localhost:8500/v1/health/service/user-service?passing=true | \
  jq '.[].Service.Address'

# Deregister unhealthy service
curl -X PUT http://localhost:8500/v1/agent/service/deregister/user-service-1
```

## Monitoring Discovery in Portainer

Portainer helps you see network connectivity issues:
1. Navigate to **Networks** > select your bridge or overlay network
2. See which containers are connected
3. Use **Exec** to test DNS resolution: `nslookup service_b`

## Conclusion

Docker's built-in DNS handles most service discovery needs for simple microservice architectures. Consul adds health-aware discovery and multi-datacenter support for complex deployments. Traefik integrates seamlessly with Docker labels for HTTP routing and load balancing. Portainer gives you visibility into all services, their network connections, and makes it easy to scale or restart services that fail health checks.
