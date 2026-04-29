# How to Set Up a Microservices Gateway with Portainer and Traefik (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Traefik, API Gateway, Microservice, Reverse Proxy

Description: Configure Traefik as a microservices API gateway with routing, rate limiting, authentication middleware, and load balancing managed via Portainer.

## Introduction

An API gateway is the single entry point for all client requests to a microservice architecture. It handles routing, authentication, rate limiting, SSL termination, and load balancing. Traefik excels as a gateway because it auto-discovers Docker services and requires minimal configuration. This guide covers setting up Traefik as a full-featured API gateway via Portainer.

## Step 1: Deploy Traefik with Full Configuration

```yaml
# docker-compose.yml - Traefik API Gateway

networks:
  gateway:
    external: true  # All services connect to this

volumes:
  traefik_certs:
  traefik_logs:

services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"  # Dashboard (restrict in production)
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /opt/traefik/traefik.yml:/etc/traefik/traefik.yml:ro
      - /opt/traefik/dynamic:/etc/traefik/dynamic:ro
      - traefik_certs:/letsencrypt
      - traefik_logs:/logs
    networks:
      - gateway
```

## Step 2: Traefik Static Configuration

```yaml
# /opt/traefik/traefik.yml - Static configuration
api:
  dashboard: true
  insecure: false  # Secure dashboard in production

log:
  level: INFO
  filePath: /logs/traefik.log

accessLog:
  filePath: /logs/access.log
  fields:
    defaultMode: keep
    headers:
      defaultMode: drop
      names:
        Authorization: drop  # Don't log auth tokens
        X-Api-Key: drop

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"
    http:
      middlewares:
        - global-ratelimit@file
      tls:
        certResolver: letsencrypt
  traefik:
    address: ":8080"

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@yourdomain.com
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web

providers:
  docker:
    watch: true
    network: gateway
    exposedByDefault: false
  file:
    directory: /etc/traefik/dynamic
    watch: true

metrics:
  prometheus:
    manualRouting: true
```

## Step 3: Dynamic Middleware Configuration

```yaml
# /opt/traefik/dynamic/middlewares.yml - Reusable middlewares
http:
  routers:
    dashboard:
      rule: "PathPrefix(`/api`) || PathPrefix(`/dashboard`)"
      entryPoints:
        - traefik
      service: api@internal
      middlewares:
        - dashboard-auth

    metrics:
      rule: "Path(`/metrics`)"
      entryPoints:
        - traefik
      service: prometheus@internal
      middlewares:
        - dashboard-auth

  middlewares:
    # Protect the Traefik dashboard, API, and metrics
    dashboard-auth:
      basicAuth:
        users:
          - "admin:$apr1$MthlZm2K$7MIZ7VW4cBiEGizKNnVJL0"

    # Shared gateway headers
    gateway-headers:
      headers:
        customRequestHeaders:
          X-Verified: "true"
        customResponseHeaders:
          X-Gateway: "traefik"

    # Global rate limiting
    global-ratelimit:
      rateLimit:
        average: 100
        burst: 50

    # JWT authentication via ForwardAuth
    jwt-auth:
      forwardAuth:
        address: "http://auth_service:8001/validate"
        trustForwardHeader: true
        authResponseHeaders:
          - "X-User-ID"
          - "X-User-Email"
          - "X-User-Roles"

    # Rate limiting per IP
    rate-limit:
      rateLimit:
        average: 10
        burst: 20
        sourceCriterion:
          ipStrategy:
            depth: 1

    # CORS headers
    cors:
      headers:
        accessControlAllowOriginList:
          - "https://app.yourdomain.com"
        accessControlAllowMethods:
          - GET
          - POST
          - PUT
          - DELETE
          - OPTIONS
        accessControlAllowHeaders:
          - Authorization
          - Content-Type
          - X-Request-ID
        accessControlMaxAge: 86400
        addVaryHeader: true

    # Security headers
    security-headers:
      headers:
        browserXssFilter: true
        contentTypeNosniff: true
        forceSTSHeader: true
        stsIncludeSubdomains: true
        stsPreload: true
        stsSeconds: 31536000
        customFrameOptionsValue: SAMEORIGIN

    # Request size limit
    request-limit:
      buffering:
        maxRequestBodyBytes: 10000000  # 10MB

    # Retry on 5xx
    retry:
      retry:
        attempts: 3
        initialInterval: 100ms
```

## Step 4: Register Microservices with Gateway Labels

```yaml
# Services register themselves via Docker labels
services:
  user_service:
    image: user-service:latest
    networks:
      - gateway
    labels:
      - "traefik.enable=true"

      # HTTP router
      - "traefik.http.routers.users.rule=Host(`api.yourdomain.com`) && PathPrefix(`/api/v1/users`)"
      - "traefik.http.routers.users.entrypoints=websecure"
      - "traefik.http.routers.users.tls=true"

      # Apply middlewares
      - "traefik.http.routers.users.middlewares=jwt-auth@file,rate-limit@file,security-headers@file,cors@file"

      # Load balancer configuration
      - "traefik.http.services.users.loadbalancer.server.port=8002"
      - "traefik.http.services.users.loadbalancer.sticky.cookie.name=srv_id"

      # Health check
      - "traefik.http.services.users.loadbalancer.healthcheck.path=/health"
      - "traefik.http.services.users.loadbalancer.healthcheck.interval=10s"
      - "traefik.http.services.users.loadbalancer.healthcheck.timeout=3s"

  order_service:
    image: order-service:latest
    networks:
      - gateway
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.orders.rule=Host(`api.yourdomain.com`) && PathPrefix(`/api/v1/orders`)"
      - "traefik.http.routers.orders.entrypoints=websecure"
      - "traefik.http.routers.orders.tls=true"
      - "traefik.http.routers.orders.middlewares=jwt-auth@file,rate-limit@file,request-limit@file"
      - "traefik.http.services.orders.loadbalancer.server.port=8003"
```

## Step 5: API Versioning with Traefik

```yaml
# Route different API versions to different services
labels:
  # Version 1
  - "traefik.http.routers.users-v1.rule=Host(`api.yourdomain.com`) && PathPrefix(`/api/v1/users`)"
  - "traefik.http.routers.users-v1.entrypoints=websecure"
  - "traefik.http.routers.users-v1.tls=true"
  - "traefik.http.routers.users-v1.service=users-v1"
  - "traefik.http.services.users-v1.loadbalancer.server.port=8002"

  # Version 2 (different container)
  - "traefik.http.routers.users-v2.rule=Host(`api.yourdomain.com`) && PathPrefix(`/api/v2/users`)"
  - "traefik.http.routers.users-v2.entrypoints=websecure"
  - "traefik.http.routers.users-v2.tls=true"
  - "traefik.http.routers.users-v2.service=users-v2"
  - "traefik.http.services.users-v2.loadbalancer.server.port=8012"
```

## Step 6: Monitor Gateway in Portainer

```bash
# View Traefik logs in Portainer
# Containers > traefik > Logs

# View metrics
curl -u admin:change-me http://localhost:8080/metrics

# Check router status via Traefik API
curl -u admin:change-me http://localhost:8080/api/http/routers | jq '.[].name'

# Check service health
curl -u admin:change-me http://localhost:8080/api/rawdata | jq '.services'
```

## Conclusion

Traefik is an excellent API gateway for microservice architectures managed with Portainer. Its Docker-native service discovery means you only need to add labels to new services - no gateway reconfiguration required. JWT authentication via ForwardAuth, rate limiting, CORS, and security headers are all configured as reusable middlewares. Portainer makes it easy to update the gateway configuration, view routing logs, and monitor service health across your entire microservice fleet.
