# How to Implement Service Discovery in Docker Compose

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Service Discovery, Docker Compose, Networking, DNS

Description: Learn how to implement service discovery in Docker Compose using built-in DNS, network aliases, and advanced patterns for microservices communication.

---

Docker Compose provides built-in service discovery through DNS resolution. Services can find each other by name without manual configuration, enabling microservices communication in containerized environments.

## How Docker DNS Works

```
Docker Compose Service Discovery
┌─────────────────────────────────────────────────────────────┐
│                  Docker Network (bridge)                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               Embedded DNS Server                    │   │
│  │                   (127.0.0.11)                       │   │
│  └─────────────────────────────────────────────────────┘   │
│         ▲              ▲              ▲                     │
│         │              │              │                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │   api    │  │   web    │  │    db    │                 │
│  │ 172.x.x.2│  │ 172.x.x.3│  │ 172.x.x.4│                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
│                                                             │
│  api → web: DNS lookup "web" → 172.x.x.3                   │
│  web → db:  DNS lookup "db"  → 172.x.x.4                   │
└─────────────────────────────────────────────────────────────┘
```

## Basic Service Discovery

### Simple Example

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    image: myapi:latest
    environment:
      # Reference other services by name
      - DATABASE_URL=postgresql://postgres:secret@db:5432/myapp
      - REDIS_URL=redis://cache:6379

  web:
    image: nginx:alpine
    depends_on:
      - api

  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: secret

  cache:
    image: redis:7
```

Services can now connect using service names:
- `api` connects to `db` at `db:5432`
- `api` connects to `cache` at `cache:6379`
- `web` connects to `api` at `api:3000`

## Network Aliases

### Multiple Names for Services

```yaml
services:
  database:
    image: postgres:15
    networks:
      default:
        aliases:
          - db
          - postgres
          - primary-db

  api:
    image: myapi:latest
    environment:
      # Can use any alias
      - DATABASE_HOST=db
      # Or
      - DATABASE_HOST=postgres
      # Or
      - DATABASE_HOST=primary-db
```

### Environment-Specific Aliases

```yaml
services:
  database:
    image: postgres:15
    networks:
      backend:
        aliases:
          - db
          - ${DB_ALIAS:-database}

networks:
  backend:
```

## Multiple Networks

### Isolated Service Groups

```yaml
version: '3.8'

services:
  # Public-facing services
  nginx:
    image: nginx:alpine
    networks:
      - frontend
    ports:
      - "80:80"

  api:
    image: myapi:latest
    networks:
      - frontend
      - backend

  # Internal services (not accessible from nginx)
  db:
    image: postgres:15
    networks:
      - backend

  cache:
    image: redis:7
    networks:
      - backend

networks:
  frontend:
  backend:
    internal: true  # No external access
```

### Cross-Network Communication

```yaml
services:
  api:
    networks:
      - frontend
      - backend
    # Can reach both frontend and backend services

  worker:
    networks:
      - backend
      - queue
    # Can reach backend and queue services, but not frontend
```

## Service Replicas

### Scaling Services

```yaml
services:
  api:
    image: myapi:latest
    deploy:
      replicas: 3
```

```bash
# Scale with docker-compose
docker-compose up -d --scale api=3
```

### DNS Round-Robin

When a service has multiple replicas, Docker's DNS returns all IPs in round-robin fashion:

```yaml
services:
  web:
    image: nginx:alpine

  api:
    image: myapi:latest
    deploy:
      replicas: 3

# web connects to api:3000
# DNS returns different IP each time (round-robin)
```

## Health-Based Discovery

### Using Health Checks

```yaml
services:
  api:
    image: myapi:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s

  web:
    image: nginx:alpine
    depends_on:
      api:
        condition: service_healthy
```

### Custom Health Check Script

```yaml
services:
  db:
    image: postgres:15
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    image: myapi:latest
    depends_on:
      db:
        condition: service_healthy
    environment:
      - DATABASE_HOST=db
```

## Advanced Patterns

### Sidecar Pattern

```yaml
services:
  app:
    image: myapp:latest
    network_mode: "service:envoy"
    depends_on:
      - envoy

  envoy:
    image: envoyproxy/envoy:v1.28.0
    ports:
      - "8080:8080"
    volumes:
      - ./envoy.yaml:/etc/envoy/envoy.yaml
```

### Ambassador Pattern

```yaml
services:
  api:
    image: myapi:latest
    networks:
      - internal

  ambassador:
    image: nginx:alpine
    networks:
      - internal
      - external
    volumes:
      - ./nginx-ambassador.conf:/etc/nginx/nginx.conf
    ports:
      - "80:80"

networks:
  internal:
    internal: true
  external:
```

### Service Mesh (Simplified)

```yaml
services:
  api:
    image: myapi:latest
    labels:
      - "service.name=api"
      - "service.version=1.0.0"
    networks:
      - mesh

  worker:
    image: myworker:latest
    labels:
      - "service.name=worker"
      - "service.version=1.0.0"
    networks:
      - mesh

  consul:
    image: consul:latest
    ports:
      - "8500:8500"
    networks:
      - mesh
    command: agent -server -bootstrap -ui -client=0.0.0.0

networks:
  mesh:
```

## Environment Variables for Discovery

### Using Environment Files

```bash
# .env
API_HOST=api
API_PORT=3000
DB_HOST=db
DB_PORT=5432
REDIS_HOST=cache
REDIS_PORT=6379
```

```yaml
services:
  web:
    image: myweb:latest
    environment:
      - API_URL=http://${API_HOST}:${API_PORT}
      - DB_URL=postgresql://postgres:secret@${DB_HOST}:${DB_PORT}/myapp
```

### Template Configuration

```yaml
services:
  api:
    image: myapi:latest
    environment:
      - SERVICE_DISCOVERY=dns
      - DB_SERVICE_NAME=db
      - CACHE_SERVICE_NAME=cache
```

```javascript
// Application code discovers services
const dbHost = process.env.DB_SERVICE_NAME || 'localhost';
const cacheHost = process.env.CACHE_SERVICE_NAME || 'localhost';
```

## Wait for Dependencies

### Using Scripts

```dockerfile
# Dockerfile
COPY wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh
CMD ["/wait-for-it.sh", "db:5432", "--", "node", "server.js"]
```

```yaml
services:
  api:
    build: .
    depends_on:
      - db

  db:
    image: postgres:15
```

### Using dockerize

```dockerfile
FROM myapi:latest
RUN apt-get update && apt-get install -y wget
RUN wget https://github.com/jwilder/dockerize/releases/download/v0.7.0/dockerize-linux-amd64-v0.7.0.tar.gz \
    && tar -C /usr/local/bin -xzvf dockerize-linux-amd64-v0.7.0.tar.gz
CMD ["dockerize", "-wait", "tcp://db:5432", "-timeout", "60s", "node", "server.js"]
```

## Complete Example

```yaml
version: '3.8'

services:
  # Reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    networks:
      - frontend
    depends_on:
      api:
        condition: service_healthy

  # API service (multiple instances)
  api:
    image: myapi:latest
    deploy:
      replicas: 3
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/myapp
      - REDIS_URL=redis://cache:6379
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - frontend
      - backend
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started

  # Worker service
  worker:
    image: myworker:latest
    environment:
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/myapp
      - REDIS_URL=redis://cache:6379
    networks:
      - backend
    depends_on:
      db:
        condition: service_healthy

  # Database
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      backend:
        aliases:
          - database
          - postgres

  # Cache
  cache:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      backend:
        aliases:
          - redis

networks:
  frontend:
  backend:
    internal: true

volumes:
  postgres_data:
  redis_data:
```

## Summary

| Feature | How to Use |
|---------|------------|
| Basic Discovery | Service names as hostnames |
| Aliases | networks.aliases configuration |
| Isolation | Multiple networks |
| Load Balancing | replicas + DNS round-robin |
| Health-Based | healthcheck + depends_on |
| Wait for Ready | wait-for-it.sh or dockerize |

Docker Compose provides automatic service discovery through DNS. Use network aliases for flexibility, health checks for reliability, and multiple networks for security isolation. For external service discovery, consider using tools like Consul or integrating with Traefik as described in our post on [Docker with Traefik](https://oneuptime.com/blog/post/2026-01-16-docker-traefik-reverse-proxy/view).

