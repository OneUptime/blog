# How to Configure Traefik HTTP to HTTPS Redirect for Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Traefik, HTTPS, Redirect, Security

Description: Learn how to configure Traefik to automatically redirect all HTTP traffic to HTTPS for Portainer and other services, ensuring users always connect securely.

## Introduction

Forcing HTTPS by redirecting HTTP requests is a fundamental security practice. Traefik supports this at the entrypoint level (global redirect for all services) or at the router level (per-service redirect). This guide covers both approaches for Portainer deployments, including handling edge cases like health checks and mixed HTTP/HTTPS services.

## Prerequisites

- Traefik deployed and running
- HTTPS configured with valid TLS certificates
- Portainer accessible on the proxy network

## Step 1: Global HTTP to HTTPS Redirect (Recommended)

Configure the redirect at the entrypoint level to apply to all services automatically:

```yaml
# traefik.yml - Global redirect via entrypoint

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure          # Name of the HTTPS entrypoint
          scheme: https          # Force HTTPS scheme
          permanent: true        # Use 301 (permanent) redirect
  websecure:
    address: ":443"
```

With this configuration, every service that uses the `web` entrypoint automatically gets redirected to HTTPS. No additional labels are needed per service.

## Step 2: Per-Service HTTP to HTTPS Redirect (Selective)

For fine-grained control, create a redirect middleware and apply it to the HTTP router:

```yaml
# traefik-dynamic.yml - Reusable redirect middleware
http:
  middlewares:
    https-redirect:
      redirectScheme:
        scheme: https
        permanent: true    # 301 redirect

  routers:
    portainer-http:
      rule: "Host(`portainer.example.com`)"
      entryPoints:
        - web
      middlewares:
        - https-redirect
      service: portainer

    portainer-https:
      rule: "Host(`portainer.example.com`)"
      entryPoints:
        - websecure
      tls: {}
      service: portainer

  services:
    portainer:
      loadBalancer:
        servers:
          - url: "http://portainer:9000"
```

## Step 3: Container Labels for Per-Service Redirect

When using Docker labels, create an HTTP router that only redirects:

```yaml
services:
  portainer:
    image: portainer/portainer-ce:latest
    labels:
      - "traefik.enable=true"

      # HTTPS router - handles actual traffic
      - "traefik.http.routers.portainer-secure.rule=Host(`portainer.example.com`)"
      - "traefik.http.routers.portainer-secure.entrypoints=websecure"
      - "traefik.http.routers.portainer-secure.tls=true"
      - "traefik.http.routers.portainer-secure.tls.certresolver=letsencrypt"
      - "traefik.http.routers.portainer-secure.service=portainer"
      - "traefik.http.services.portainer.loadbalancer.server.port=9000"

      # HTTP router - only redirects to HTTPS
      - "traefik.http.routers.portainer-http.rule=Host(`portainer.example.com`)"
      - "traefik.http.routers.portainer-http.entrypoints=web"
      - "traefik.http.routers.portainer-http.middlewares=https-redirect"

      # Define the redirect middleware
      - "traefik.http.middlewares.https-redirect.redirectscheme.scheme=https"
      - "traefik.http.middlewares.https-redirect.redirectscheme.permanent=true"
```

## Step 4: Verify the Redirect

```bash
# Test that HTTP returns a redirect (not a direct response)
curl -I http://portainer.example.com

# Expected output:
# HTTP/1.1 301 Moved Permanently
# Location: https://portainer.example.com/
# ...

# Test that HTTPS works after redirect
curl -IL http://portainer.example.com    # -L follows redirects

# Expected final response:
# HTTP/2 200
```

## Step 5: Handle Special Cases

Some services need HTTP access (e.g., health check endpoints, internal services). This pattern only works when you are using router-level redirects for that host. If you enable a global entrypoint redirect on `web`, Traefik will redirect `/health` before the router is evaluated:

```yaml
services:
  internal-health:
    image: myapp:latest
    labels:
      - "traefik.enable=true"

      # Allow only /health on plain HTTP
      - "traefik.http.routers.health.rule=Host(`internal.example.com`) && Path(`/health`)"
      - "traefik.http.routers.health.entrypoints=web"
      - "traefik.http.routers.health.service=internal-health"

      # Redirect all other HTTP requests for this host to HTTPS
      - "traefik.http.routers.app-http.rule=Host(`internal.example.com`)"
      - "traefik.http.routers.app-http.entrypoints=web"
      - "traefik.http.routers.app-http.middlewares=https-redirect"
      - "traefik.http.routers.app-http.service=internal-health"

      # Serve the app on HTTPS
      - "traefik.http.routers.app.rule=Host(`internal.example.com`)"
      - "traefik.http.routers.app.entrypoints=websecure"
      - "traefik.http.routers.app.tls=true"
      - "traefik.http.routers.app.service=internal-health"

      # Backend service and redirect middleware
      - "traefik.http.services.internal-health.loadbalancer.server.port=8080"
      - "traefik.http.middlewares.https-redirect.redirectscheme.scheme=https"
      - "traefik.http.middlewares.https-redirect.redirectscheme.permanent=true"
```

## Step 6: Add HSTS Header After Redirect

HSTS (HTTP Strict Transport Security) tells browsers to use HTTPS on subsequent visits after they receive the header over HTTPS. The `preload` directive only takes effect if the domain is accepted into browser preload lists:

```yaml
# Add HSTS via middleware
services:
  portainer:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.portainer.rule=Host(`portainer.example.com`)"
      - "traefik.http.routers.portainer.entrypoints=websecure"
      - "traefik.http.routers.portainer.tls=true"
      - "traefik.http.routers.portainer.tls.certresolver=letsencrypt"
      - "traefik.http.routers.portainer.middlewares=hsts-header"

      # HSTS: force HTTPS for 1 year
      - "traefik.http.middlewares.hsts-header.headers.stsSeconds=31536000"
      - "traefik.http.middlewares.hsts-header.headers.stsIncludeSubdomains=true"
      - "traefik.http.middlewares.hsts-header.headers.stsPreload=true"
```

## Conclusion

Configuring HTTP to HTTPS redirect in Traefik is most cleanly handled at the entrypoint level in `traefik.yml`, applying globally to all services. For cases where you need mixed HTTP/HTTPS services, use the per-service router approach with a `redirectScheme` middleware. Adding HSTS headers alongside the redirect ensures that browsers remember to use HTTPS for future visits, providing an additional layer of transport security for your Portainer installation.
