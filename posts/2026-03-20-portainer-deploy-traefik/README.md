# How to Deploy Traefik via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Traefik, Reverse Proxy, SSL, Let's Encrypt, Self-Hosted

Description: Deploy Traefik v3 via Portainer as an automatic reverse proxy with Let's Encrypt SSL, Docker provider integration, and the Traefik dashboard.

## Introduction

Traefik is a modern reverse proxy and load balancer that integrates directly with Docker. It automatically discovers containers and configures routing based on labels - no manual config updates needed when adding new services. This guide deploys Traefik with automatic HTTPS via Let's Encrypt.

## Deploy as a Stack

```yaml
version: "3.8"

services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    command:
      # API and dashboard
      - "--api.dashboard=true"
      - "--api.insecure=false"     # Disable insecure API
      
      # Docker provider
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--providers.docker.network=traefik-public"
      
      # Entrypoints
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      
      # Redirect HTTP to HTTPS
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--entrypoints.web.http.redirections.entrypoint.scheme=https"
      
      # Let's Encrypt ACME
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      
      # Logging
      - "--log.level=INFO"
      - "--accesslog=true"
    
    labels:
      - "traefik.enable=true"
      # Dashboard routing
      - "traefik.http.routers.traefik.rule=Host(`traefik.example.com`)"
      - "traefik.http.routers.traefik.entrypoints=websecure"
      - "traefik.http.routers.traefik.tls.certresolver=letsencrypt"
      - "traefik.http.routers.traefik.service=api@internal"
      # Dashboard authentication middleware
      - "traefik.http.routers.traefik.middlewares=auth"
      - "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$xyz$$hashedpassword"
    
    ports:
      - "80:80"
      - "443:443"
    volumes:
      # Docker socket for container discovery
      - /var/run/docker.sock:/var/run/docker.sock:ro
      # Let's Encrypt certificate storage
      - letsencrypt:/letsencrypt
    networks:
      - traefik-public
    restart: unless-stopped

networks:
  traefik-public:
    external: true

volumes:
  letsencrypt:
```

## Create the Traefik Network

Before deploying the stack, create the shared network:

```bash
docker network create traefik-public
```

## Generate Basic Auth Password

```bash
# Install htpasswd

sudo apt install -y apache2-utils

# Generate password hash (escape $ with $$ in docker-compose)
htpasswd -nb admin yourpassword | sed -e s/\\$/\\$\\$/g
```

## Adding Services to Traefik

Add Traefik labels to any container to expose it via HTTPS:

```yaml
version: "3.8"

services:
  myapp:
    image: nginx:alpine
    labels:
      - "traefik.enable=true"
      # Route for the application
      - "traefik.http.routers.myapp.rule=Host(`app.example.com`)"
      - "traefik.http.routers.myapp.entrypoints=websecure"
      - "traefik.http.routers.myapp.tls.certresolver=letsencrypt"
      # Service port
      - "traefik.http.services.myapp.loadbalancer.server.port=80"
    networks:
      - traefik-public
    restart: unless-stopped

networks:
  traefik-public:
    external: true
```

## Useful Middlewares

```yaml
labels:
  # Rate limiting
  - "traefik.http.middlewares.ratelimit.ratelimit.average=100"
  - "traefik.http.middlewares.ratelimit.ratelimit.burst=50"
  
  # Security headers
  - "traefik.http.middlewares.secureheaders.headers.frameDeny=true"
  - "traefik.http.middlewares.secureheaders.headers.contentTypeNosniff=true"
  - "traefik.http.middlewares.secureheaders.headers.browserXssFilter=true"
  
  # IP allowlist
  - "traefik.http.middlewares.allowlist.ipallowlist.sourcerange=192.168.1.0/24"
```

## Wildcard Certificate with DNS Challenge

For a wildcard certificate (`*.example.com`), configure DNS challenge and explicitly request the wildcard domain on the router:

```yaml
command:
  - "--certificatesresolvers.letsencrypt.acme.dnschallenge=true"
  - "--certificatesresolvers.letsencrypt.acme.dnschallenge.provider=cloudflare"

environment:
  - CF_API_EMAIL=admin@example.com
  - CF_API_KEY=your_cloudflare_api_key

labels:
  - "traefik.http.routers.myapp.tls.certresolver=letsencrypt"
  - "traefik.http.routers.myapp.tls.domains[0].main=example.com"
  - "traefik.http.routers.myapp.tls.domains[0].sans=*.example.com"
```

## Conclusion

Traefik deployed via Portainer eliminates the manual work of configuring reverse proxy routing for new services. Simply add labels to any container and Traefik automatically creates HTTPS routes with Let's Encrypt certificates. The dashboard provides real-time visibility into routers, services, and middlewares, making it easy to troubleshoot routing issues.
