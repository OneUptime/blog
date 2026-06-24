# How to Deploy an API Gateway with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, API Gateway, Kong, Traefik, Microservice, Security

Description: Deploy Kong or Traefik as a production-ready API gateway with rate limiting, authentication plugins, and analytics using Portainer.

## Introduction

An API gateway manages all incoming API traffic, enforcing security policies, rate limits, and routing rules in a single place. This guide covers deploying Kong Gateway alongside Portainer for management and visibility.

## Step 1: Deploy Kong Gateway with PostgreSQL

```yaml
# docker-compose.yml - Kong API Gateway

networks:
  kong_net:
    driver: bridge

volumes:
  kong_db:

services:
  # Kong database
  kong_db:
    image: postgres:15-alpine
    container_name: kong_db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=kong
      - POSTGRES_USER=kong
      - POSTGRES_PASSWORD=kong_password
    volumes:
      - kong_db:/var/lib/postgresql/data
    networks:
      - kong_net
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "kong", "-d", "kong"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Kong database migrations
  kong_migrations:
    image: kong:3.9.1
    command: kong migrations bootstrap
    environment:
      - KONG_DATABASE=postgres
      - KONG_PG_HOST=kong_db
      - KONG_PG_USER=kong
      - KONG_PG_PASSWORD=kong_password
      - KONG_PG_DATABASE=kong
    networks:
      - kong_net
    depends_on:
      kong_db:
        condition: service_healthy
    restart: "no"

  # Kong gateway
  kong:
    image: kong:3.9.1
    container_name: kong
    restart: unless-stopped
    depends_on:
      kong_db:
        condition: service_healthy
      kong_migrations:
        condition: service_completed_successfully
    ports:
      - "8000:8000"   # HTTP proxy
      - "8443:8443"   # HTTPS proxy
      - "127.0.0.1:8001:8001"   # Admin API HTTP
      - "127.0.0.1:8444:8444"   # Admin API HTTPS
    environment:
      - KONG_DATABASE=postgres
      - KONG_PG_HOST=kong_db
      - KONG_PG_USER=kong
      - KONG_PG_PASSWORD=kong_password
      - KONG_PG_DATABASE=kong
      - KONG_PROXY_ACCESS_LOG=/dev/stdout
      - KONG_ADMIN_ACCESS_LOG=/dev/stdout
      - KONG_PROXY_ERROR_LOG=/dev/stderr
      - KONG_ADMIN_ERROR_LOG=/dev/stderr
      - KONG_ADMIN_LISTEN=0.0.0.0:8001, 0.0.0.0:8444 ssl
    networks:
      - kong_net
```

## Step 2: Configure Kong Routes and Services

```bash
# Create a service (upstream API)
curl -X POST http://localhost:8001/services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "user-service",
    "url": "http://user_service:8002"
  }'

# Create a route for the service
curl -X POST http://localhost:8001/services/user-service/routes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "user-route",
    "paths": ["/api/v1/users"],
    "strip_path": false,
    "protocols": ["http", "https"]
  }'

# Add another service
curl -X POST http://localhost:8001/services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "order-service",
    "url": "http://order_service:8003"
  }'

# Route for order service
curl -X POST http://localhost:8001/services/order-service/routes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "order-route",
    "paths": ["/api/v1/orders"],
    "strip_path": false,
    "protocols": ["http", "https"]
  }'
```

## Step 3: Add Rate Limiting Plugin

```bash
# Global rate limiting (applies to all routes on this Kong node)
curl -X POST http://localhost:8001/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "name": "rate-limiting",
    "config": {
      "minute": 100,
      "hour": 1000,
      "policy": "local"
    }
  }'

# Rate limiting on specific route
curl -X POST http://localhost:8001/routes/user-route/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "name": "rate-limiting",
    "config": {
      "minute": 20,
      "limit_by": "consumer",
      "policy": "local"
    }
  }'
```

## Step 4: Add JWT Authentication

```bash
# Enable JWT plugin on route
curl -X POST http://localhost:8001/routes/user-route/plugins \
  -d "name=jwt"

# Create a consumer
curl -X POST http://localhost:8001/consumers \
  -d "username=my-application"

# Create JWT credentials for consumer
curl -X POST http://localhost:8001/consumers/my-application/jwt \
  -d "algorithm=HS256" \
  -d "secret=my-secret-key"

# Get the credential key
curl http://localhost:8001/consumers/my-application/jwt | jq '.data[0].key'
```

## Step 5: Add Request/Response Transformation

```bash
# Add headers to all requests
curl -X POST http://localhost:8001/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "name": "request-transformer",
    "config": {
      "add": {
        "headers": ["X-Gateway:Kong"]
      }
    }
  }'

# Remove sensitive response headers
curl -X POST http://localhost:8001/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "name": "response-transformer",
    "config": {
      "remove": {
        "headers": ["Server", "X-Powered-By"]
      }
    }
  }'
```

## Step 6: Add Prometheus Monitoring

```bash
# Enable Prometheus metrics export
curl -X POST http://localhost:8001/plugins \
  -d "name=prometheus"

# Metrics available at:
# GET http://localhost:8001/metrics
```

```yaml
# Add to prometheus.yml scrape configs
scrape_configs:
  - job_name: 'kong'
    static_configs:
      - targets: ['kong:8001']
    metrics_path: '/metrics'
```

## Monitoring in Portainer

View Kong logs in Portainer:
1. Navigate to **Containers** > **kong** > **Logs**
2. Filter for error entries:

```bash
# Filter Kong error logs
docker logs kong 2>&1 | grep -i error

# Watch access logs
docker logs -f kong 2>&1 | grep "HTTP/1"
```

## Conclusion

Kong Gateway provides enterprise-grade API management for your microservices. With Portainer managing the containers, you get both powerful API governance (rate limiting, authentication, transformation) and operational visibility. Portainer handles container lifecycle management, log viewing, and health monitoring. For production deployments, consider Kong's declarative configuration (decK) to version-control your gateway configuration.
