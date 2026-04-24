# How to Use Traefik Middleware with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Traefik, Middleware, Security, Rate Limiting

Description: Learn how to configure and apply Traefik middleware for rate limiting, authentication, header manipulation, and request transformation to services deployed through Portainer.

## Introduction

Traefik middleware sits between the router and the backend service, transforming requests and responses. When managing services through Portainer, middleware allows you to add authentication, rate limiting, URL rewrites, and security headers without modifying the application itself. This guide covers the most useful middleware types with practical examples.

## Prerequisites

- Traefik deployed with Docker provider
- Portainer managing services on the same Docker network
- Basic understanding of Traefik routers and services

## Step 1: Basic Auth Middleware

Protect any Portainer-deployed service with HTTP basic authentication:

```bash
# Generate password hash

docker run --rm httpd:alpine htpasswd -nbB user1 secure-password
# Output: user1:$2y$05$HASH...

# Escape $ signs for Docker Compose (replace $ with $$)
```

```yaml
services:
  myapp:
    image: nginx:alpine
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.myapp.rule=Host(`myapp.example.com`)"
      - "traefik.http.routers.myapp.entrypoints=websecure"
      - "traefik.http.routers.myapp.tls=true"
      - "traefik.http.routers.myapp.tls.certresolver=letsencrypt"
      - "traefik.http.routers.myapp.middlewares=myapp-auth"

      # Basic auth with multiple users
      - "traefik.http.middlewares.myapp-auth.basicauth.users=admin:$$2y$$05$$HASH1,user1:$$2y$$05$$HASH2"
      - "traefik.http.middlewares.myapp-auth.basicauth.realm=Restricted Area"
```

## Step 2: Rate Limiting Middleware

Prevent abuse with request rate limiting:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.api.rule=Host(`api.example.com`)"
  - "traefik.http.routers.api.middlewares=api-ratelimit"

  # Rate limit: 100 requests per second average, 200 burst
  - "traefik.http.middlewares.api-ratelimit.ratelimit.average=100"
  - "traefik.http.middlewares.api-ratelimit.ratelimit.burst=200"
  - "traefik.http.middlewares.api-ratelimit.ratelimit.period=1s"
```

## Step 3: Security Headers Middleware

Add security headers to all responses:

```yaml
labels:
  - "traefik.http.middlewares.secure-headers.headers.contentTypeNosniff=true"
  - "traefik.http.middlewares.secure-headers.headers.browserXssFilter=true"
  - "traefik.http.middlewares.secure-headers.headers.frameDeny=true"
  - "traefik.http.middlewares.secure-headers.headers.forceSTSHeader=true"
  - "traefik.http.middlewares.secure-headers.headers.stsSeconds=31536000"
  - "traefik.http.middlewares.secure-headers.headers.stsIncludeSubdomains=true"
  - "traefik.http.middlewares.secure-headers.headers.referrerPolicy=strict-origin-when-cross-origin"
  - "traefik.http.middlewares.secure-headers.headers.contentSecurityPolicy=default-src 'self'"
  - "traefik.http.middlewares.secure-headers.headers.customResponseHeaders.X-Powered-By="
```

## Step 4: Path Strip Prefix Middleware

When serving an app at a path prefix but the app expects to be at `/`:

```yaml
services:
  myapp:
    image: myapp:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.myapp.rule=Host(`example.com`) && PathPrefix(`/app`)"
      - "traefik.http.routers.myapp.middlewares=strip-app-prefix"
      - "traefik.http.services.myapp.loadbalancer.server.port=8080"

      # Strip /app prefix before forwarding to backend
      - "traefik.http.middlewares.strip-app-prefix.stripprefix.prefixes=/app"
```

## Step 5: IP Allowlist Middleware

Restrict access to specific IP ranges:

```yaml
labels:
  - "traefik.http.middlewares.office-only.ipallowlist.sourcerange=192.168.1.0/24,10.0.0.0/8"

  # Apply to internal admin tools
  - "traefik.http.routers.admin.middlewares=office-only"
```

## Step 6: Retry Middleware

Automatically retry failed backend requests:

```yaml
labels:
  - "traefik.http.middlewares.retry-backend.retry.attempts=3"
  - "traefik.http.middlewares.retry-backend.retry.initialInterval=100ms"
```

## Step 7: Chaining Multiple Middlewares

Apply multiple middleware to a single router - order matters:

```yaml
services:
  portainer:
    image: portainer/portainer-ce:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.portainer.rule=Host(`portainer.example.com`)"
      - "traefik.http.routers.portainer.entrypoints=websecure"
      - "traefik.http.routers.portainer.tls=true"
      - "traefik.http.routers.portainer.tls.certresolver=letsencrypt"

      # Apply multiple middleware (comma-separated, applied left to right)
      - "traefik.http.routers.portainer.middlewares=ip-allowlist,secure-headers"

      # IP allowlist
      - "traefik.http.middlewares.ip-allowlist.ipallowlist.sourcerange=10.0.0.0/8,192.168.0.0/16"

      # Security headers
      - "traefik.http.middlewares.secure-headers.headers.frameDeny=true"
      - "traefik.http.middlewares.secure-headers.headers.contentTypeNosniff=true"
      - "traefik.http.middlewares.secure-headers.headers.forceSTSHeader=true"
      - "traefik.http.middlewares.secure-headers.headers.stsSeconds=31536000"

      - "traefik.http.services.portainer.loadbalancer.server.port=9000"
```

## Step 8: Define Reusable Middleware in Dynamic Config File

Instead of repeating middleware definitions in every container, define them once in a config file with the file provider enabled:

```yaml
# /opt/traefik/config/middlewares.yml
http:
  middlewares:
    # Reusable: apply to any service with traefik.http.routers.X.middlewares=global-security@file
    global-security:
      headers:
        frameDeny: true
        contentTypeNosniff: true
        forceSTSHeader: true
        stsSeconds: 31536000
        browserXssFilter: true

    standard-ratelimit:
      rateLimit:
        average: 50
        burst: 100
```

```yaml
# Container labels - reference the file-defined middleware
labels:
  - "traefik.http.routers.myapp.middlewares=global-security@file,standard-ratelimit@file"
  # @file suffix tells Traefik to look in the file provider
```

## Conclusion

Traefik middleware transforms your Portainer-deployed services from basic HTTP backends into secured, rate-limited, and properly-headered applications without any code changes. Define commonly used middleware in a dynamic config file using the `@file` reference pattern to avoid repeating middleware definitions across every container. Chain middleware for layered security, applying IP restrictions first so unauthorized requests are rejected before hitting auth or rate limiting.
