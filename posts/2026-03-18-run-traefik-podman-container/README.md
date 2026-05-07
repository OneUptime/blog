# How to Run Traefik in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Traefik, Reverse Proxy, Load Balancer, Ingress

Description: Learn how to run Traefik reverse proxy in a Podman container with automatic service discovery, TLS, and dashboard access.

---

> Traefik in Podman gives you a modern, cloud-native reverse proxy with automatic service discovery running in a rootless container.

Traefik is a modern HTTP reverse proxy and load balancer designed for microservices. It integrates with container orchestrators and can automatically discover services and configure routing. Running Traefik in a Podman container provides a lightweight entry point for your applications with built-in TLS, middleware support, and a web dashboard. This guide covers setup, static and dynamic configuration, and routing to backend services.

---

## Pulling the Traefik Image

Download the official Traefik image.

```bash
# Pull the Traefik v3.0 image

podman pull docker.io/library/traefik:v3.0

# Verify the image
podman images | grep traefik
```

## Running a Basic Traefik Container

Start Traefik with the dashboard enabled. The examples publish Traefik's HTTP and HTTPS entry points to high host ports so they work with rootless Podman without changing privileged port settings.

```bash
# Run Traefik with the API dashboard enabled
podman run -d \
  --name my-traefik \
  -p 8081:80 \
  -p 8080:8080 \
  docker.io/library/traefik:v3.0 \
  --api.dashboard=true \
  --api.insecure=true \
  --entrypoints.web.address=:80

# Check the container is running
podman ps

# Access the Traefik dashboard
echo "Open http://localhost:8080/dashboard/ in your browser"

# Verify Traefik API
curl -s http://localhost:8080/api/overview | python3 -m json.tool
```

## Static Configuration with a File

Use a YAML configuration file for Traefik's static settings.

```bash
# Create a config directory
mkdir -p ~/traefik-config

# Write a static configuration file
cat > ~/traefik-config/traefik.yml <<'EOF'
# API and Dashboard
api:
  dashboard: true
  insecure: true

# Entry points
entryPoints:
  web:
    address: ":80"
  websecure:
    address: ":443"

# Providers
providers:
  file:
    directory: /etc/traefik/dynamic
    watch: true

# Logging
log:
  level: INFO

# Access logs
accessLog: {}
EOF

# Create a dynamic config directory
mkdir -p ~/traefik-config/dynamic

# Run Traefik with the static config
podman run -d \
  --name traefik-static \
  -p 8081:80 \
  -p 8443:443 \
  -p 8080:8080 \
  -v ~/traefik-config/traefik.yml:/etc/traefik/traefik.yml:Z \
  -v ~/traefik-config/dynamic:/etc/traefik/dynamic:Z \
  docker.io/library/traefik:v3.0
```

## Dynamic Configuration for Routing

Define routers, services, and middleware in dynamic configuration files.

```bash
# Create a dynamic routing configuration
cat > ~/traefik-config/dynamic/routes.yml <<'EOF'
http:
  routers:
    # Route traffic for app.localhost to a backend service
    app-router:
      rule: "Host(`app.localhost`)"
      service: app-service
      entryPoints:
        - web

    # Route HTTPS traffic for app.localhost to a backend service
    app-secure-router:
      rule: "Host(`app.localhost`)"
      service: app-service
      entryPoints:
        - websecure
      tls: {}

    # Route traffic for api.localhost to an API backend
    api-router:
      rule: "Host(`api.localhost`) && PathPrefix(`/api`)"
      service: api-service
      entryPoints:
        - web
      middlewares:
        - rate-limit

  services:
    # Backend application service
    app-service:
      loadBalancer:
        servers:
          - url: "http://host.containers.internal:3000"

    # Backend API service
    api-service:
      loadBalancer:
        servers:
          - url: "http://host.containers.internal:4000"

  middlewares:
    # Rate limiting middleware
    rate-limit:
      rateLimit:
        average: 100
        burst: 50

    # Add security headers
    security-headers:
      headers:
        frameDeny: true
        contentTypeNosniff: true
        browserXssFilter: true
EOF

# Test the routing (add entries to /etc/hosts or use the Host header)
curl -H "Host: app.localhost" http://localhost:8081
```

## Setting Up TLS with Self-Signed Certificates

Configure HTTPS with TLS certificates.

```bash
# Generate a self-signed certificate for testing
mkdir -p ~/traefik-certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ~/traefik-certs/key.pem \
  -out ~/traefik-certs/cert.pem \
  -subj "/CN=localhost"

# Create a TLS dynamic configuration
cat > ~/traefik-config/dynamic/tls.yml <<'EOF'
tls:
  certificates:
    - certFile: /etc/traefik/certs/cert.pem
      keyFile: /etc/traefik/certs/key.pem
EOF

# Run Traefik with TLS certificates mounted
podman run -d \
  --name traefik-tls \
  -p 8081:80 \
  -p 8443:443 \
  -p 8080:8080 \
  -v ~/traefik-config/traefik.yml:/etc/traefik/traefik.yml:Z \
  -v ~/traefik-config/dynamic:/etc/traefik/dynamic:Z \
  -v ~/traefik-certs:/etc/traefik/certs:Z \
  docker.io/library/traefik:v3.0

# Test HTTPS
curl -k -H "Host: app.localhost" https://localhost:8443
```

## Managing the Container

Common management operations.

```bash
# View Traefik logs
podman logs my-traefik

# Check Traefik routers via API
curl -s http://localhost:8080/api/http/routers | python3 -m json.tool

# Check Traefik services via API
curl -s http://localhost:8080/api/http/services | python3 -m json.tool

# Stop and start
podman stop my-traefik
podman start my-traefik

# Remove containers
podman rm -f my-traefik traefik-static traefik-tls
```

## Summary

Running Traefik in a Podman container provides a modern, cloud-native reverse proxy with file-based service discovery and dynamic configuration reloading. The dashboard gives you visibility into routers, services, and middleware. Dynamic configuration files let you define routing rules, load balancing, rate limiting, and security headers without restarting Traefik. TLS support with mounted certificates enables HTTPS termination. Podman's rootless mode adds security isolation, making Traefik a solid choice for routing traffic to your containerized and host-based applications.
