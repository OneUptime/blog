# How to Set Up Docker with Traefik as Reverse Proxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Traefik, Reverse Proxy, Load Balancing, SSL

Description: Learn how to set up Traefik as a reverse proxy for Docker containers with automatic service discovery, SSL certificates via Let's Encrypt, and load balancing.

---

Traefik is a modern reverse proxy and load balancer designed for containerized environments. It automatically discovers services and configures routing through Docker labels, eliminating manual configuration.

## How Traefik Works

```
Traffic Flow with Traefik
┌─────────────────────────────────────────────────────────────┐
│                        Internet                              │
│                            │                                 │
│                            ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                     Traefik                          │   │
│  │  - SSL Termination                                   │   │
│  │  - Automatic Discovery                               │   │
│  │  - Load Balancing                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│            │                │                │              │
│            ▼                ▼                ▼              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Service A  │  │   Service B  │  │   Service C  │     │
│  │  api.example │  │  web.example │  │  admin.example│    │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Basic Setup

### Traefik Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  traefik:
    image: traefik:v3.0
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(`traefik.localhost`)"
      - "traefik.http.routers.dashboard.service=api@internal"
```

### Adding Services

```yaml
services:
  traefik:
    # ... traefik config above

  whoami:
    image: traefik/whoami
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.whoami.rule=Host(`whoami.localhost`)"
      - "traefik.http.routers.whoami.entrypoints=web"
```

## SSL with Let's Encrypt

### Production SSL Configuration

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v3.0
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      # Let's Encrypt
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      # Redirect HTTP to HTTPS
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--entrypoints.web.http.redirections.entrypoint.scheme=https"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - letsencrypt:/letsencrypt

  app:
    image: myapp:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(`app.example.com`)"
      - "traefik.http.routers.app.entrypoints=websecure"
      - "traefik.http.routers.app.tls.certresolver=letsencrypt"

volumes:
  letsencrypt:
```

### Wildcard Certificates (DNS Challenge)

```yaml
services:
  traefik:
    image: traefik:v3.0
    command:
      - "--certificatesresolvers.letsencrypt.acme.dnschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.dnschallenge.provider=cloudflare"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    environment:
      - CF_API_EMAIL=your@email.com
      - CF_API_KEY=your-api-key

  app:
    labels:
      - "traefik.http.routers.app.tls.domains[0].main=example.com"
      - "traefik.http.routers.app.tls.domains[0].sans=*.example.com"
```

## Load Balancing

### Multiple Replicas

```yaml
services:
  traefik:
    # ... traefik config

  api:
    image: myapi:latest
    deploy:
      replicas: 3
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.example.com`)"
      - "traefik.http.services.api.loadbalancer.server.port=3000"
```

### Weighted Load Balancing

```yaml
services:
  api-v1:
    image: myapi:v1
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.example.com`)"
      - "traefik.http.services.api-v1.loadbalancer.server.port=3000"

  api-v2:
    image: myapi:v2
    labels:
      - "traefik.enable=true"
      - "traefik.http.services.api-v2.loadbalancer.server.port=3000"

  # Weighted routing (90% v1, 10% v2)
  traefik:
    labels:
      - "traefik.http.services.api-weighted.weighted.services[0].name=api-v1"
      - "traefik.http.services.api-weighted.weighted.services[0].weight=90"
      - "traefik.http.services.api-weighted.weighted.services[1].name=api-v2"
      - "traefik.http.services.api-weighted.weighted.services[1].weight=10"
```

### Health Checks

```yaml
services:
  api:
    labels:
      - "traefik.enable=true"
      - "traefik.http.services.api.loadbalancer.healthcheck.path=/health"
      - "traefik.http.services.api.loadbalancer.healthcheck.interval=10s"
      - "traefik.http.services.api.loadbalancer.healthcheck.timeout=3s"
```

## Middleware

### Basic Authentication

```yaml
services:
  api:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.example.com`)"
      - "traefik.http.routers.api.middlewares=auth"
      # Generate: htpasswd -nb user password | sed -e s/\\$/\\$\\$/g
      - "traefik.http.middlewares.auth.basicauth.users=user:$$apr1$$xyz..."
```

### Rate Limiting

```yaml
services:
  api:
    labels:
      - "traefik.http.routers.api.middlewares=ratelimit"
      - "traefik.http.middlewares.ratelimit.ratelimit.average=100"
      - "traefik.http.middlewares.ratelimit.ratelimit.burst=50"
```

### Headers

```yaml
services:
  app:
    labels:
      - "traefik.http.routers.app.middlewares=security-headers"
      - "traefik.http.middlewares.security-headers.headers.stsSeconds=31536000"
      - "traefik.http.middlewares.security-headers.headers.stsIncludeSubdomains=true"
      - "traefik.http.middlewares.security-headers.headers.contentTypeNosniff=true"
      - "traefik.http.middlewares.security-headers.headers.browserXssFilter=true"
```

### IP Whitelist

```yaml
services:
  admin:
    labels:
      - "traefik.http.routers.admin.middlewares=whitelist"
      - "traefik.http.middlewares.whitelist.ipwhitelist.sourcerange=192.168.1.0/24,10.0.0.0/8"
```

### Compression

```yaml
services:
  app:
    labels:
      - "traefik.http.routers.app.middlewares=compress"
      - "traefik.http.middlewares.compress.compress=true"
```

## Path-Based Routing

```yaml
services:
  api:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`example.com`) && PathPrefix(`/api`)"
      - "traefik.http.routers.api.middlewares=strip-api"
      - "traefik.http.middlewares.strip-api.stripprefix.prefixes=/api"

  web:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=Host(`example.com`) && PathPrefix(`/`)"
```

## Complete Production Example

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v3.0
    command:
      # API and Dashboard
      - "--api.dashboard=true"
      - "--api.insecure=false"
      # Providers
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--providers.docker.network=traefik-public"
      # Entrypoints
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      # HTTP to HTTPS redirect
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--entrypoints.web.http.redirections.entrypoint.scheme=https"
      # Let's Encrypt
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      # Logging
      - "--accesslog=true"
      - "--log.level=INFO"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - letsencrypt:/letsencrypt
    networks:
      - traefik-public
    labels:
      # Dashboard
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(`traefik.example.com`)"
      - "traefik.http.routers.dashboard.service=api@internal"
      - "traefik.http.routers.dashboard.entrypoints=websecure"
      - "traefik.http.routers.dashboard.tls.certresolver=letsencrypt"
      - "traefik.http.routers.dashboard.middlewares=auth"
      - "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$..."
    deploy:
      placement:
        constraints:
          - node.role == manager

  api:
    image: myapi:latest
    networks:
      - traefik-public
      - internal
    deploy:
      replicas: 3
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.example.com`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      - "traefik.http.routers.api.middlewares=ratelimit,security-headers"
      - "traefik.http.services.api.loadbalancer.server.port=3000"
      - "traefik.http.services.api.loadbalancer.healthcheck.path=/health"
      # Middlewares
      - "traefik.http.middlewares.ratelimit.ratelimit.average=100"
      - "traefik.http.middlewares.ratelimit.ratelimit.burst=50"
      - "traefik.http.middlewares.security-headers.headers.stsSeconds=31536000"

  web:
    image: myweb:latest
    networks:
      - traefik-public
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=Host(`www.example.com`) || Host(`example.com`)"
      - "traefik.http.routers.web.entrypoints=websecure"
      - "traefik.http.routers.web.tls.certresolver=letsencrypt"
      - "traefik.http.services.web.loadbalancer.server.port=80"

  postgres:
    image: postgres:15
    networks:
      - internal
    volumes:
      - postgres_data:/var/lib/postgresql/data

networks:
  traefik-public:
    external: true
  internal:
    internal: true

volumes:
  letsencrypt:
  postgres_data:
```

## File Provider for External Services

```yaml
# traefik.yml (static config)
providers:
  docker:
    exposedByDefault: false
  file:
    filename: /etc/traefik/dynamic.yml

# dynamic.yml
http:
  routers:
    external-service:
      rule: "Host(`external.example.com`)"
      service: external-service
      tls:
        certResolver: letsencrypt

  services:
    external-service:
      loadBalancer:
        servers:
          - url: "http://192.168.1.100:8080"
          - url: "http://192.168.1.101:8080"
```

## Summary

| Feature | Configuration |
|---------|--------------|
| SSL | certresolver + acme |
| Load Balancing | replicas + healthcheck |
| Auth | basicauth middleware |
| Rate Limiting | ratelimit middleware |
| Path Routing | PathPrefix rule |
| Redirect | entrypoint redirections |

Traefik simplifies reverse proxy configuration for Docker with automatic service discovery and Let's Encrypt integration. Use labels to configure routing, middleware for security features, and the dashboard for monitoring. For alternative reverse proxy setup, see our post on [Docker with Nginx Reverse Proxy](https://oneuptime.com/blog/post/2026-01-13-docker-nginx-reverse-proxy/view).

