# How to Use Traefik Labels for Portainer Service Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Traefik, Service Discovery, Docker Labels, Routing

Description: Learn how Traefik uses Docker labels for automatic service discovery with Portainer, enabling zero-configuration routing for containers deployed through the Portainer interface.

## Introduction

Traefik reads Docker container labels in standalone mode, and service labels in Swarm mode, to automatically discover services and configure routing rules without any manual configuration files. When services are deployed through Portainer, adding the right labels means Traefik can route them automatically - no restart, no config reload required. This guide covers the complete Traefik label reference for Portainer-managed services.

## Prerequisites

- Traefik deployed and running (see the Traefik standalone deployment guide)
- Portainer running on the same Docker host
- Traefik and the services you want to expose connected to the same Docker network (e.g., `proxy`)

## Step 1: Core Label Reference

These are the core labels you'll use most often. In standalone Docker, Traefik can infer the first exposed port, but explicitly setting the backend port is clearer and is mandatory in Swarm:

```yaml
labels:
  # Enable Traefik for this container (required when exposedByDefault: false)
  - "traefik.enable=true"

  # Router: define the matching rule
  - "traefik.http.routers.myapp.rule=Host(`myapp.example.com`)"

  # Router: specify the entrypoint
  - "traefik.http.routers.myapp.entrypoints=websecure"

  # Service: define the backend port
  - "traefik.http.services.myapp.loadbalancer.server.port=8080"
```

The name `myapp` is a user-defined identifier - it must be unique per service.

## Step 2: Routing Rule Patterns

Traefik supports rich routing expressions:

```yaml
labels:
  # Match by hostname
  - "traefik.http.routers.app.rule=Host(`app.example.com`)"

  # Match by hostname and path prefix
  - "traefik.http.routers.app.rule=Host(`example.com`) && PathPrefix(`/app`)"

  # Match multiple hostnames
  - "traefik.http.routers.app.rule=Host(`app.example.com`) || Host(`www.app.example.com`)"

  # Match by header
  - "traefik.http.routers.app.rule=Host(`example.com`) && Header(`X-App-Version`, `v2`)"

  # Match subdomains (wildcard - use carefully)
  - "traefik.http.routers.app.rule=HostRegexp(`^.+\\.example\\.com$`)"
```

## Step 3: TLS Labels

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.myapp.rule=Host(`myapp.example.com`)"
  - "traefik.http.routers.myapp.entrypoints=websecure"

  # Enable TLS
  - "traefik.http.routers.myapp.tls=true"

  # Use ACME resolver for automatic certificate
  - "traefik.http.routers.myapp.tls.certresolver=letsencrypt"

  # Or reference TLS options defined by the file provider
  - "traefik.http.routers.myapp.tls.options=myTLSOptions@file"
```

User-defined certificates themselves are configured through the file provider in `tls.certificates`, not via router labels.

## Step 4: Network Labels (Multi-Network Containers)

In standalone Docker, when a container is connected to multiple networks, specify which one Traefik should use:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.docker.network=proxy"    # Tell Traefik which network to use
  - "traefik.http.routers.myapp.rule=Host(`myapp.example.com`)"
  - "traefik.http.services.myapp.loadbalancer.server.port=8080"
```

```yaml
# docker-compose.yml: Connect to both the proxy network and a private database network

services:
  myapp:
    image: myapp:latest
    networks:
      - proxy      # Traefik-accessible network
      - backend    # Internal database network
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=proxy"    # Required when using multiple networks
      - "traefik.http.routers.myapp.rule=Host(`myapp.example.com`)"
      - "traefik.http.services.myapp.loadbalancer.server.port=3000"

networks:
  proxy:
    external: true
  backend:
    driver: bridge
```

In Swarm, use `traefik.swarm.network` instead of `traefik.docker.network`.

## Step 5: Multiple Services from One Container

Some containers expose multiple ports. Route each to its own subdomain:

```yaml
services:
  myapp:
    image: myapp:latest
    networks:
      - proxy
    labels:
      - "traefik.enable=true"

      # Route 1: Web UI on port 8080
      - "traefik.http.routers.myapp-ui.rule=Host(`ui.example.com`)"
      - "traefik.http.routers.myapp-ui.service=myapp-ui"
      - "traefik.http.services.myapp-ui.loadbalancer.server.port=8080"

      # Route 2: API on port 3000
      - "traefik.http.routers.myapp-api.rule=Host(`api.example.com`)"
      - "traefik.http.routers.myapp-api.service=myapp-api"
      - "traefik.http.services.myapp-api.loadbalancer.server.port=3000"
```

## Step 6: Deploying with Labels Through Portainer

When creating a stack in Portainer, include labels in the `deploy` section (Swarm) or container `labels` section (standalone):

```yaml
# Portainer stack editor - Standalone compose
version: "3.8"

services:
  webapp:
    image: nginx:alpine
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.webapp.rule=Host(`webapp.example.com`)"
      - "traefik.http.routers.webapp.entrypoints=websecure"
      - "traefik.http.routers.webapp.tls=true"
      - "traefik.http.routers.webapp.tls.certresolver=letsencrypt"
      - "traefik.http.services.webapp.loadbalancer.server.port=80"

networks:
  proxy:
    external: true    # Must exist before deploying
```

After deploying through Portainer, Traefik automatically detects the new container and starts routing within seconds.

## Step 7: Verify Service Discovery

```bash
# If the Traefik API/dashboard is enabled locally, check that Traefik picked up the service
curl -s http://localhost:8080/api/http/routers | jq '.[] | select(.name | contains("webapp"))'

# Check Traefik dashboard (if exposed)
# Open: https://traefik.example.com - your service should appear under HTTP Routers

# Test the routing
curl -I https://webapp.example.com
```

## Conclusion

Traefik's Docker label-based service discovery makes Portainer deployments self-configuring for routing. By attaching labels at deploy time, each new container or service automatically registers itself with Traefik - eliminating manual proxy configuration updates. The key patterns to remember are: use `traefik.enable=true` to opt in, specify the correct network when containers have multiple attachments, and define the router rule and service port explicitly when Traefik cannot infer them automatically.
