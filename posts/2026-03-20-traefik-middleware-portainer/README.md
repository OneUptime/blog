# How to Use Traefik Middleware with Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Traefik, Middleware, Security, Header

Description: Learn how to configure Traefik middlewares for containers deployed via Portainer, including rate limiting, authentication, headers, and request transformation.

## What Are Traefik Middlewares?

Middlewares intercept and transform requests between Traefik's routers and your backend services. They can add authentication, modify headers, rate limit traffic, or redirect requests.

```text
Client → Traefik Router → Middleware Chain → Backend Service
```

## Basic Auth Middleware

Protect a service with HTTP basic authentication:

```yaml
# In Portainer: Stacks > Add Stack

services:
  myapp:
    image: myapp:latest
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.myapp.rule=Host(`myapp.example.com`)"
      - "traefik.http.routers.myapp.entrypoints=websecure"
      - "traefik.http.routers.myapp.tls.certresolver=letsencrypt"
      # Define auth middleware
      - "traefik.http.middlewares.myapp-auth.basicauth.users=admin:$$apr1$$SALT$$HASH"
      # Attach middleware to router
      - "traefik.http.routers.myapp.middlewares=myapp-auth"
      - "traefik.http.services.myapp.loadbalancer.server.port=8080"

networks:
  proxy:
    external: true
```

Generate an escaped password hash for Compose labels: `htpasswd -nb admin yourpassword | sed -e 's/\$/\$\$/g'`

## Rate Limiting Middleware

Protect endpoints from abuse:

```yaml
labels:
  # Rate limit: 100 requests/second average, burst of 50
  - "traefik.http.middlewares.ratelimit.ratelimit.average=100"
  - "traefik.http.middlewares.ratelimit.ratelimit.burst=50"
  - "traefik.http.routers.myapp.middlewares=ratelimit"
```

## Security Headers Middleware

Add security-enhancing HTTP headers:

```yaml
labels:
  - "traefik.http.middlewares.security-headers.headers.stsSeconds=31536000"
  - "traefik.http.middlewares.security-headers.headers.stsIncludeSubdomains=true"
  - "traefik.http.middlewares.security-headers.headers.stsPreload=true"
  - "traefik.http.middlewares.security-headers.headers.contentTypeNosniff=true"
  - "traefik.http.middlewares.security-headers.headers.browserXssFilter=true"
  - "traefik.http.middlewares.security-headers.headers.referrerPolicy=strict-origin-when-cross-origin"
  - "traefik.http.middlewares.security-headers.headers.frameDeny=true"
  - "traefik.http.routers.myapp.middlewares=security-headers"
```

## Strip Prefix Middleware

Route `/api/v1/` traffic and strip the prefix before forwarding:

```yaml
labels:
  - "traefik.http.routers.api.rule=Host(`example.com`) && PathPrefix(`/api/v1`)"
  - "traefik.http.middlewares.strip-api.stripprefix.prefixes=/api/v1"
  - "traefik.http.routers.api.middlewares=strip-api"
  - "traefik.http.services.api.loadbalancer.server.port=8080"
```

## IP Allowlist Middleware

Restrict access to specific IP ranges:

```yaml
labels:
  # Only allow office and VPN IPs
  - "traefik.http.middlewares.office-only.ipallowlist.sourcerange=203.0.113.0/24,10.8.0.0/16"
  - "traefik.http.routers.admin.middlewares=office-only"
```

## Redirect Middleware

Redirect to another URL:

```yaml
labels:
  # Redirect old path to new path
  - "traefik.http.middlewares.legacy-redirect.redirectregex.regex=^https?://example.com/old/(.*)"
  - "traefik.http.middlewares.legacy-redirect.redirectregex.replacement=https://example.com/new/$${1}"
  - "traefik.http.middlewares.legacy-redirect.redirectregex.permanent=true"
  - "traefik.http.routers.myapp.middlewares=legacy-redirect"
```

## Chaining Multiple Middlewares

Apply multiple middlewares to a single router:

```yaml
labels:
  # Multiple middlewares, comma-separated
  - "traefik.http.routers.myapp.middlewares=myapp-auth,ratelimit,security-headers"
```

Middlewares are applied in the order listed.

## Reusable Middlewares in Dynamic Config

Define middlewares once in a file loaded by the file provider and reuse them:

```yaml
# /opt/traefik/config/middlewares.yml
http:
  middlewares:
    default-headers:
      headers:
        stsSeconds: 31536000
        contentTypeNosniff: true
        browserXssFilter: true

    default-auth:
      basicAuth:
        users:
          - "admin:$apr1$SALT$HASH"
```

Then reference by name with `@file`:

```yaml
labels:
  - "traefik.http.routers.myapp.middlewares=default-headers@file,default-auth@file"
```

## Conclusion

Traefik middlewares let you add authentication, rate limiting, security headers, and request transformation to any container deployed via Portainer. By defining reusable middleware configurations, you can maintain consistent security policies across all services without duplicating label configurations.
