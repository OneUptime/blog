# How to Use Redis with Docker Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Docker, Networking

Description: Learn how to configure Docker networks for Redis to enable secure service-to-service communication, network isolation, and multi-container application connectivity.

---

Docker networking is key to securing Redis in containerized environments. By default, Redis should only be accessible to application containers on the same Docker network, not exposed to the host or internet.

## Default Bridge Network vs Custom Network

The default bridge network does not provide DNS resolution between containers. Always use a custom named network:

```yaml
# docker-compose.yml - with custom network
version: "3.8"
services:
  redis:
    image: redis:7-alpine
    networks:
      - app-network
    # No ports exposed to host - only accessible within network

  app:
    image: myapp:latest
    networks:
      - app-network
    environment:
      REDIS_URL: redis://redis:6379  # use service name as hostname

networks:
  app-network:
    driver: bridge
```

## Network Isolation by Tier

Separate frontend, backend, and data layers:

```yaml
version: "3.8"
services:
  nginx:
    image: nginx:alpine
    networks:
      - frontend
    ports:
      - "80:80"

  app:
    image: myapp:latest
    networks:
      - frontend
      - backend

  redis:
    image: redis:7-alpine
    networks:
      - backend  # NOT on frontend network
    command: redis-server --protected-mode no  # safe because backend network is internal

  postgres:
    image: postgres:15-alpine
    networks:
      - backend  # NOT on frontend network

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # no external internet access
```

## Exposing Redis Only to Localhost

If you need host access for administration but not external exposure:

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "127.0.0.1:6379:6379"  # bind to localhost only, not 0.0.0.0
    networks:
      - app-network
```

## Multi-Host Overlay Network (Docker Swarm)

For multi-host deployments:

```yaml
version: "3.8"
services:
  redis:
    image: redis:7-alpine
    networks:
      - redis-overlay
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.labels.redis == true

networks:
  redis-overlay:
    driver: overlay
    attachable: true
    encrypted: true  # encrypts overlay traffic
```

## Network Policies with Static IPs

Assign static IPs for predictable networking:

```yaml
version: "3.8"
services:
  redis:
    image: redis:7-alpine
    networks:
      app-network:
        ipv4_address: 172.20.0.10

  app:
    image: myapp:latest
    networks:
      app-network:
        ipv4_address: 172.20.0.11
    environment:
      REDIS_URL: redis://172.20.0.10:6379

networks:
  app-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## Verifying Network Connectivity

```bash
# Check Redis is accessible from app container
docker compose exec app redis-cli -h redis PING

# Inspect network settings
docker network ls
docker network inspect myapp_app-network

# Check what containers are on the network
docker network inspect myapp_backend | python3 -c "import sys,json; [print(v['Name']) for v in json.load(sys.stdin)[0]['Containers'].values()]"

# Test that Redis is NOT accessible outside the network
docker run --rm redis:7-alpine redis-cli -h 172.20.0.10 PING  # should fail
```

## Summary

Redis in Docker should always run on a custom named network for DNS-based service discovery. Use network isolation to ensure Redis is only accessible from application containers, not frontend services or external traffic. Mark data-tier networks as `internal: true` in production and use encrypted overlay networks for multi-host deployments. Expose Redis ports to the host only when needed for administration, and always bind to `127.0.0.1` rather than `0.0.0.0`.
