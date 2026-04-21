# How to Configure Traefik as a Reverse Proxy for IPv4 Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Traefik, Reverse Proxy, IPv4, Docker, Routing, TLS

Description: Configure Traefik v3 as a reverse proxy for IPv4 HTTP services using Docker labels or static/dynamic configuration files, with TLS termination and middleware support.

## Introduction

Traefik is a cloud-native reverse proxy that auto-discovers services from Docker, Kubernetes, and other orchestrators. It uses EntryPoints (listeners), Routers (routing rules), Middlewares (transformations), and Services (backends). Traefik can auto-provision Let's Encrypt TLS certificates.

## Option 1: Docker Compose with Labels

The most common Traefik deployment: Traefik discovers services from Docker labels.

```yaml
# docker-compose.yml

services:
  traefik:
    image: traefik:v3.6
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"  # Dashboard
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - letsencrypt:/letsencrypt

  webapp:
    image: nginx:alpine
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.webapp.rule=Host(`app.example.com`)"
      - "traefik.http.routers.webapp.entrypoints=websecure"
      - "traefik.http.routers.webapp.tls.certresolver=letsencrypt"
      - "traefik.http.services.webapp.loadbalancer.server.port=80"

  api:
    image: my-api:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.example.com`) && PathPrefix(`/v1`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      - "traefik.http.services.api.loadbalancer.server.port=8080"

volumes:
  letsencrypt:
```

## Option 2: Static File Configuration

For non-Docker deployments:

```yaml
# /etc/traefik/traefik.yml (static config)

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

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@example.com
      storage: /etc/traefik/acme.json
      httpChallenge:
        entryPoint: web

providers:
  file:
    filename: /etc/traefik/dynamic.yml
    watch: true

api:
  dashboard: true
  insecure: false
```

```yaml
# /etc/traefik/dynamic.yml (dynamic config)

http:
  routers:
    webapp:
      rule: "Host(`app.example.com`)"
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
      service: webapp-svc

  services:
    webapp-svc:
      loadBalancer:
        servers:
          - url: "http://10.0.1.10:80"
          - url: "http://10.0.1.11:80"
```

## Adding Middleware

Rate limiting and authentication middleware:

```yaml
# In dynamic.yml

http:
  routers:
    api:
      rule: "Host(`api.example.com`)"
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
      middlewares:
        - ratelimit
        - auth
        - headers
      service: api-svc

  services:
    api-svc:
      loadBalancer:
        servers:
          - url: "http://10.0.1.20:8080"

  middlewares:
    ratelimit:
      rateLimit:
        average: 100
        burst: 50

    auth:
      basicAuth:
        users:
          - "admin:$apr1$H6uskkkW$IgXLP6ewTrSuBkTrqE8wj/"  # htpasswd format

    headers:
      headers:
        customRequestHeaders:
          X-Real-IP: ""
        customResponseHeaders:
          X-Powered-By: ""
```

## Binding to a Specific IPv4 Address

```yaml
entryPoints:
  web:
    address: "10.0.1.5:80"    # Bind to specific IP, not 0.0.0.0
  websecure:
    address: "10.0.1.5:443"
```

## Checking the Dashboard

```bash
# Access the API used by the dashboard (if enabled with insecure=true)
curl http://localhost:8080/api/http/routers | python3 -m json.tool
```

## Viewing Logs

```bash
# Docker Compose
docker compose logs -f traefik

# Check access log if accessLog.filePath is set to /var/log/traefik/access.log
sudo tail -f /var/log/traefik/access.log
```

## Conclusion

Traefik auto-discovers Docker services via labels on containers. Define `traefik.enable=true` and `traefik.http.routers.<name>.rule` with host or path matching rules. For static services, use the file provider with `dynamic.yml`. Traefik auto-provisions Let's Encrypt certificates when `certresolver` is specified. Use middleware for rate limiting, authentication, and header manipulation.
