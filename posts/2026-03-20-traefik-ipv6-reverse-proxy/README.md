# How to Configure Traefik as an IPv6 Reverse Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Traefik, Reverse Proxy, Kubernetes, Docker, Dual-Stack

Description: Configure Traefik as an IPv6-capable reverse proxy with dual-stack entry points, IPv6 middleware for client IP, and routing to IPv6 backend services.

## Introduction

Traefik is a cloud-native reverse proxy popular in Docker and Kubernetes environments. IPv6 support requires configuring entry points with IPv6 addresses, enabling proper `X-Forwarded-For` processing for IPv6 clients, and ensuring service discovery can return IPv6 endpoints when you need IPv6 backend routing.

## Static Configuration (IPv6 Entry Points)

```yaml
# /etc/traefik/traefik.yml

entryPoints:
  web:
    address: "[::]:80"        # Listen on all IPv6; IPv4 dual-stack depends on the host socket settings
  websecure:
    address: "[::]:443"
    forwardedHeaders:
      trustedIPs:
        - "10.0.0.0/8"
        - "fd00::/8"
        - "2001:db8:100::/48"
    http:
      tls:
        certResolver: letsencrypt

  # IPv6-only entry point on a specific address and distinct port
  web-ipv6:
    address: "[2001:db8::1]:8081"

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@example.com
      storage: /var/traefik/acme.json
      httpChallenge:
        entryPoint: web
```

## Docker Provider Configuration

```yaml
# docker-compose.yml - Traefik with IPv6

services:
  traefik:
    image: traefik:v3.0
    command:
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --entrypoints.web.address=[::]:80
      - --entrypoints.websecure.address=[::]:443
      - --certificatesresolvers.letsencrypt.acme.email=admin@example.com
      - --certificatesresolvers.letsencrypt.acme.storage=/var/traefik/acme.json
      - --certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web
    ports:
      - "80:80"
      - "443:443"
    networks:
      - ipv6-net
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./traefik-data:/var/traefik

  app:
    image: my-app:latest
    networks:
      - ipv6-net
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(`app.example.com`)"
      - "traefik.http.routers.app.entrypoints=websecure"
      - "traefik.http.routers.app.tls.certresolver=letsencrypt"
      - "traefik.http.services.app.loadbalancer.server.port=8080"

networks:
  ipv6-net:
    driver: bridge
    enable_ipv6: true
    ipam:
      config:
        - subnet: "fd12:3456:789a:1::/64"
```

## Kubernetes IngressRoute with IPv6

```yaml
# traefik IngressRoute for Kubernetes
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: app-ingress
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`app.example.com`)
      kind: Rule
      services:
        - name: app-service
          port: 8080
  tls:
    certResolver: letsencrypt

---
# Dual-stack service for Traefik to discover
apiVersion: v1
kind: Service
metadata:
  name: app-service
spec:
  selector:
    app: my-app
  ipFamilyPolicy: PreferDualStack
  ipFamilies:
    - IPv6
    - IPv4
  ports:
    - port: 8080
      targetPort: 8080
```

## Middleware for IPv6 Headers and IP Allowlist

```yaml
# Traefik middleware for additional request headers
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: real-ip-middleware
spec:
  # Traefik has built-in real IP handling via entryPoint.forwardedHeaders
  # This middleware adds additional headers
  headers:
    customRequestHeaders:
      X-Forwarded-Proto: "https"
```

```yaml
# Dynamic configuration for IP allowlist (IPv6)
http:
  middlewares:
    internal-ipv6-only:
      ipAllowList:
        sourceRange:
          - "fd00::/8"       # Locally assigned ULA
          - "2001:db8::/32"  # Documentation prefix; replace with your organization range
          - "10.0.0.0/8"     # IPv4 internal (for dual-stack)
```

## Verify IPv6 Entry Points

```bash
# If the Traefik API is enabled and published on port 8080, check entry point configuration
curl -6 "http://[::1]:8080/api/entrypoints" | python3 -m json.tool

# Test IPv6 access
curl -6 -v https://app.example.com/health

# Check Traefik logs for IPv6 connections in this Compose service
docker compose logs traefik 2>&1 | grep -E '[0-9a-fA-F:]{3,39}'
```

## Conclusion

Traefik IPv6 configuration centers on the `address: "[::]:port"` format for entry points, which listens on all IPv6 interfaces and can accept IPv4 on hosts that allow IPv4-mapped IPv6 sockets. Configure `forwardedHeaders.trustedIPs` with both IPv4 and IPv6 CIDR ranges for accurate client IP extraction. In Kubernetes, Traefik discovers service endpoints - ensure the cluster and pods are dual-stack and services use `ipFamilyPolicy: PreferDualStack` to expose IPv6 endpoints for Traefik to route to. With Docker, an IPv6-enabled network gives containers IPv6 addresses, but Traefik prefers the IPv4 container IP when one is present; use an IPv6-only network or remove the IPv4 address if backend dialing must use IPv6.
