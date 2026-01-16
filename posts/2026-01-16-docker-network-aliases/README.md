# How to Use Docker Network Aliases for Service Discovery

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Network Aliases, Service Discovery, DNS, DevOps

Description: Learn how to use Docker network aliases for flexible service discovery, allowing containers to be reached by multiple names.

---

Network aliases provide multiple DNS names for containers, enabling flexible service discovery and seamless container replacement. This guide covers using network aliases for service discovery patterns.

## Understanding Network Aliases

```
Network Aliases
┌─────────────────────────────────────────────────────────────┐
│  Container: api-v2                                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Primary name: api-v2                                  │  │
│  │  Aliases: api, backend, service                        │  │
│  │                                                         │  │
│  │  DNS resolution:                                        │  │
│  │  api-v2 → 172.17.0.5                                   │  │
│  │  api → 172.17.0.5                                      │  │
│  │  backend → 172.17.0.5                                  │  │
│  │  service → 172.17.0.5                                  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Basic Alias Usage

```bash
# Create network
docker network create mynet

# Run container with aliases
docker run -d \
  --name api-v2 \
  --network mynet \
  --network-alias api \
  --network-alias backend \
  nginx

# Test resolution
docker run --rm --network mynet alpine nslookup api
docker run --rm --network mynet alpine nslookup backend
docker run --rm --network mynet alpine nslookup api-v2
```

## Docker Compose Aliases

```yaml
version: '3.8'

services:
  api:
    image: myapi:v2
    container_name: api-v2
    networks:
      backend:
        aliases:
          - api
          - backend-service
          - myapi

  web:
    image: nginx:alpine
    networks:
      - backend
    depends_on:
      - api

networks:
  backend:
```

## Blue-Green Deployment

Network aliases enable zero-downtime deployments by switching which container responds to a shared alias.

```yaml
version: '3.8'

services:
  # Blue deployment (current)
  app-blue:
    image: myapp:v1
    networks:
      frontend:
        aliases:
          - app  # Active deployment gets the 'app' alias
    deploy:
      replicas: 2

  # Green deployment (new version)
  app-green:
    image: myapp:v2
    networks:
      frontend:
        # No 'app' alias - not receiving traffic yet

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    networks:
      - frontend
    # nginx config uses 'app' as upstream

networks:
  frontend:
```

### Switching Deployments

```bash
# After testing green, update compose to give 'app' alias to green
# Then restart to apply changes
docker-compose up -d

# Or use docker network connect/disconnect
docker network disconnect frontend app-blue
docker network connect --alias app frontend app-green
```

## Multiple Containers Same Alias

When multiple containers share an alias, Docker provides round-robin DNS.

```yaml
version: '3.8'

services:
  api-1:
    image: myapi:latest
    networks:
      backend:
        aliases:
          - api

  api-2:
    image: myapi:latest
    networks:
      backend:
        aliases:
          - api

  api-3:
    image: myapi:latest
    networks:
      backend:
        aliases:
          - api

  web:
    image: nginx:alpine
    networks:
      - backend
    # Requests to 'api' will round-robin between api-1, api-2, api-3

networks:
  backend:
```

```bash
# Test round-robin resolution
docker run --rm --network backend alpine sh -c "for i in 1 2 3 4 5; do nslookup api; done"
```

## Environment-Based Aliases

```yaml
version: '3.8'

services:
  database:
    image: postgres:15
    networks:
      backend:
        aliases:
          - db
          - postgres
          - ${DB_ALIAS:-database}  # Configurable alias
    environment:
      POSTGRES_PASSWORD: secret

  redis:
    image: redis:7-alpine
    networks:
      backend:
        aliases:
          - cache
          - redis
          - ${CACHE_ALIAS:-cache}

networks:
  backend:
```

## Service Migration Pattern

```yaml
version: '3.8'

services:
  # Legacy service (being deprecated)
  legacy-api:
    image: legacy-api:latest
    networks:
      backend:
        aliases:
          - api  # Both respond to 'api'

  # New service (taking over)
  new-api:
    image: new-api:latest
    networks:
      backend:
        aliases:
          - api  # Both respond to 'api'
          - api-v2

  # Clients use 'api' - traffic distributed between both
  # Gradually scale down legacy, scale up new
  client:
    image: myclient:latest
    networks:
      - backend
    environment:
      API_HOST: api  # Unchanged during migration

networks:
  backend:
```

## Per-Network Aliases

Containers can have different aliases on different networks.

```yaml
version: '3.8'

services:
  database:
    image: postgres:15
    networks:
      app-network:
        aliases:
          - db
          - postgres
      admin-network:
        aliases:
          - admin-db
          - postgres-admin
    environment:
      POSTGRES_PASSWORD: secret

  app:
    image: myapp:latest
    networks:
      - app-network
    environment:
      DATABASE_HOST: db  # Uses app-network alias

  admin-panel:
    image: admin:latest
    networks:
      - admin-network
    environment:
      DATABASE_HOST: admin-db  # Uses admin-network alias

networks:
  app-network:
  admin-network:
```

## Dynamic Alias Assignment

```bash
#!/bin/bash
# deploy-with-alias.sh

VERSION=$1
ALIAS=${2:-api}

# Create container with dynamic alias
docker run -d \
  --name "api-${VERSION}" \
  --network backend \
  --network-alias "${ALIAS}" \
  --network-alias "api-${VERSION}" \
  "myapi:${VERSION}"
```

## Complete Service Discovery Setup

```yaml
version: '3.8'

services:
  # Load balancer
  traefik:
    image: traefik:v2.10
    command:
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
    ports:
      - "80:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - frontend
      - backend

  # Frontend service
  web:
    image: nginx:alpine
    networks:
      frontend:
        aliases:
          - frontend
          - web-service
      backend:
        aliases:
          - web  # Different alias on backend network
    labels:
      - "traefik.http.routers.web.rule=Host(`example.com`)"

  # API service (multiple instances)
  api:
    image: myapi:latest
    deploy:
      replicas: 3
    networks:
      backend:
        aliases:
          - api
          - backend-api
          - service

  # Database
  postgres:
    image: postgres:15
    networks:
      backend:
        aliases:
          - db
          - postgres
          - database
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data

  # Cache
  redis:
    image: redis:7-alpine
    networks:
      backend:
        aliases:
          - cache
          - redis
          - session-store

networks:
  frontend:
  backend:

volumes:
  pgdata:
```

## Testing and Debugging

```bash
# List container aliases
docker inspect --format '{{range $net, $conf := .NetworkSettings.Networks}}{{$net}}: {{$conf.Aliases}}{{"\n"}}{{end}}' container-name

# Test DNS resolution
docker run --rm --network backend alpine nslookup api

# Test connectivity
docker run --rm --network backend alpine wget -qO- http://api:8080/health

# View all DNS entries
docker run --rm --network backend nicolaka/netshoot dig api

# Multiple resolution test
docker run --rm --network backend alpine sh -c "for i in \$(seq 1 10); do nslookup api | grep Address; done"
```

## Summary

| Pattern | Use Case |
|---------|----------|
| Single alias | Stable service name |
| Multiple aliases | Backward compatibility |
| Shared aliases | Load balancing |
| Per-network aliases | Network isolation |
| Blue-green | Zero-downtime deploys |

Network aliases provide flexible service discovery without changing client configurations. Use them for versioned deployments, gradual migrations, and multi-environment setups. For more advanced networking, see our post on [Docker Compose Service Discovery](https://oneuptime.com/blog/post/2026-01-16-docker-compose-service-discovery/view).

