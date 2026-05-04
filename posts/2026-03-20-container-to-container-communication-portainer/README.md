# How to Set Up Container-to-Container Communication in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Networking, Container Communication, Service Discovery, DNS

Description: Configure reliable container-to-container communication using Docker networks, service aliases, and cross-stack networking in Portainer.

## Introduction

Containers communicate through Docker networks using service names as hostnames. This guide covers all communication patterns: same-stack services, cross-stack communication, external network bridges, and service aliases - all managed through Portainer.

## Step 1: Same-Stack Communication

Containers in the same docker-compose stack communicate automatically via their service name:

```yaml
# docker-compose.yml - Same stack communication

version: "3.8"

networks:
  app_net:
    driver: bridge

services:
  api:
    image: myapp/api:latest
    networks:
      - app_net
    environment:
      # 'database' is the service name = hostname
      - DB_HOST=database
      - CACHE_HOST=cache

  database:
    image: postgres:15-alpine
    networks:
      - app_net

  cache:
    image: redis:7-alpine
    networks:
      - app_net
```

```bash
# Verify: api can resolve database hostname
docker exec myapp-api-1 nslookup database
# Returns: 172.x.x.x (database container IP)
```

## Step 2: Cross-Stack Communication with External Networks

```yaml
# Stack 1: infrastructure-stack.yml - Creates the shared network
version: "3.8"

networks:
  shared_network:
    name: shared_network  # Give it a predictable name
    driver: bridge

services:
  traefik:
    image: traefik:v3.0
    networks:
      - shared_network

  redis:
    image: redis:7-alpine
    networks:
      - shared_network
```

```yaml
# Stack 2: application-stack.yml - Joins the existing network
version: "3.8"

networks:
  shared_network:
    external: true  # References network created by Stack 1

services:
  api:
    image: myapp/api:latest
    networks:
      - shared_network
    environment:
      # Can reach containers from Stack 1 by service name
      - REDIS_HOST=redis
      # Or use the project-service-index naming convention
      - REDIS_HOST=infrastructure-stack-redis-1
```

## Step 3: Service Aliases

Service aliases allow containers to be reachable by multiple names:

```yaml
# docker-compose.yml - Service aliases
version: "3.8"

networks:
  app_net:
    driver: bridge

services:
  database:
    image: postgres:15-alpine
    networks:
      app_net:
        aliases:
          # The 'database' service is also reachable as:
          - db
          - postgres
          - primary-db

  # Redis used as both cache and message queue
  redis:
    image: redis:7-alpine
    networks:
      app_net:
        aliases:
          - cache
          - queue

  api:
    image: myapp/api:latest
    networks:
      - app_net
    environment:
      # Can use any of the aliases
      - DB_HOST=db           # Uses alias
      - CACHE_HOST=cache     # Uses alias
      - QUEUE_HOST=queue     # Same container, different alias
```

## Step 4: Multi-Network Container Configuration

```yaml
# docker-compose.yml - Container on multiple networks
version: "3.8"

networks:
  public:    # Internet-facing
    driver: bridge
  private:   # Internal only
    driver: bridge

services:
  # API gateway bridges public and private
  api_gateway:
    image: kong:latest
    networks:
      public:
        aliases:
          - gateway
      private:
        aliases:
          - internal-gateway

  # Backend services on private network only
  user_service:
    image: myapp/users:latest
    networks:
      - private   # NOT on public network

  # Database on private network only
  postgres:
    image: postgres:15
    networks:
      - private   # Completely isolated from public
```

## Step 5: Inter-Container Communication with Links (Legacy)

Modern approach uses networks, but if you see `links` in older configs:

```yaml
# Legacy links (avoid in new deployments)
services:
  api:
    links:
      - "database:db"  # Creates /etc/hosts entry

# Modern equivalent (use this instead)
services:
  api:
    networks:
      - app_net
  database:
    networks:
      app_net:
        aliases:
          - db
```

## Step 6: Debugging Container Communication in Portainer

```bash
# From Portainer: Containers > container_name > Exec
# Or via CLI:

# Test if api can reach database
docker exec api_container bash -c "
  echo 'Testing DNS...'
  nslookup database

  echo 'Testing TCP connection...'
  nc -zv database 5432 && echo 'Port open' || echo 'Port closed'

  echo 'Testing HTTP...'
  curl -v http://user_service:8001/health
"

# View container's network configuration
docker exec api_container ip addr
docker exec api_container ip route
docker exec api_container cat /etc/resolv.conf

# Check all networks this container uses
docker inspect api_container | jq '.[].NetworkSettings.Networks | to_entries[] | {network: .key, ip: .value.IPAddress}'
```

## Step 7: Container Communication Security

```yaml
# docker-compose.yml - Secure network isolation
networks:
  # Internet-accessible
  dmz:
    driver: bridge

  # Restricted to app tier
  app_tier:
    driver: bridge
    internal: false  # Has internet access via NAT

  # No internet access
  db_tier:
    driver: bridge
    internal: true   # No external access!

services:
  nginx:
    networks:
      - dmz

  api:
    networks:
      - dmz       # Receive traffic from nginx
      - app_tier  # Send requests to other services
      - db_tier   # Access databases

  database:
    networks:
      - db_tier   # ONLY accessible from services on db_tier
    # The 'internal: true' on db_tier means
    # database cannot make outbound internet connections
```

## Conclusion

Container-to-container communication in Docker relies on shared networks and DNS resolution. Custom bridge networks provide automatic DNS for service names, while network segmentation adds security by isolating tiers. Portainer's network management interface makes it easy to see which containers are connected to which networks, create new networks, and diagnose connectivity issues. Always prefer custom named networks over the default bridge for new deployments, and use `internal: true` networks for database tiers that should never have internet access.
