# How to Set Up Portainer Behind Traefik on Docker Standalone

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Traefik, Reverse Proxy, HTTPS

Description: Configure Traefik as a reverse proxy for Portainer on a Docker standalone host, with automatic HTTPS using Let's Encrypt.

## Introduction

Traefik is a popular cloud-native reverse proxy that integrates natively with Docker. By reading container labels, Traefik automatically discovers services and routes traffic without manual config files. This guide deploys Portainer behind Traefik on a single Docker host.

## Prerequisites

- Docker and Docker Compose installed
- A domain pointing to your server
- Port 80 and 443 open

## Step 1: Create the Traefik Configuration

Create `traefik/traefik.yml`:

```yaml
# Traefik static configuration

api:
  dashboard: true
  insecure: false  # Disable insecure dashboard

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
      storage: /acme.json
      tlsChallenge: {}

providers:
  docker:
    exposedByDefault: false  # Only expose containers with traefik.enable=true
    network: proxy
```

## Step 2: Create the Docker Compose File

```yaml
version: "3.8"

services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik/traefik.yml:/etc/traefik/traefik.yml:ro
      - ./traefik/acme.json:/acme.json
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      # Traefik dashboard route (optional, protect in production)
      - "traefik.http.routers.dashboard.rule=Host(`traefik.example.com`)"
      - "traefik.http.routers.dashboard.entrypoints=websecure"
      - "traefik.http.routers.dashboard.tls=true"
      - "traefik.http.routers.dashboard.tls.certresolver=letsencrypt"
      - "traefik.http.routers.dashboard.service=api@internal"

  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      # Router: match requests to portainer.example.com
      - "traefik.http.routers.portainer.rule=Host(`portainer.example.com`)"
      - "traefik.http.routers.portainer.entrypoints=websecure"
      - "traefik.http.routers.portainer.tls=true"
      - "traefik.http.routers.portainer.tls.certresolver=letsencrypt"
      # Service: tell Traefik which internal Portainer HTTP port to use
      - "traefik.http.services.portainer.loadbalancer.server.port=9000"
      - "traefik.http.services.portainer.loadbalancer.server.scheme=http"
    command:
      - "--http-enabled"
      - "--trusted-origins=portainer.example.com"

networks:
  proxy:
    external: true

volumes:
  portainer_data:
```

## Step 3: Create the External Network and Deploy

```bash
# Create the shared proxy network first
docker network create proxy

# Create the letsencrypt directory and acme.json with correct permissions
mkdir -p traefik
touch traefik/acme.json
chmod 600 traefik/acme.json

# Start the stack
docker compose up -d

# Monitor Traefik logs for certificate issuance
docker logs traefik -f
```

## Step 4: Verify Routes

```bash
# Check Traefik detects both routers
curl -s https://traefik.example.com/api/http/routers | grep -E 'dashboard@docker|portainer@docker'

# Verify Portainer responds over HTTPS
curl -I https://portainer.example.com

# Inspect the certificate Traefik is presenting
openssl s_client -connect portainer.example.com:443 -servername portainer.example.com </dev/null 2>/dev/null | openssl x509 -noout -issuer -subject -dates
```

## Handling Portainer's Internal HTTPS

Portainer listens on HTTPS by default (port 9443). This guide enables Portainer's internal HTTP listener with `--http-enabled`, so Traefik can proxy to port 9000 without needing to trust Portainer's self-signed certificate:

```yaml
    command:
      - "--http-enabled"
      - "--trusted-origins=portainer.example.com"
    labels:
      - "traefik.http.services.portainer.loadbalancer.server.port=9000"
      - "traefik.http.services.portainer.loadbalancer.server.scheme=http"
```

If you want Traefik to proxy to Portainer's default HTTPS listener on `9443` instead, `server.scheme=https` alone is not enough. Because Portainer uses a self-signed certificate by default, Traefik must either trust that certificate or use a `ServersTransport` resource with `insecureSkipVerify: true`. That requires enabling Traefik's file provider and defining the transport in a dynamic configuration file. `passHostHeader` does not disable certificate verification.

```yaml
# Define this in a dynamic configuration file loaded by Traefik's file provider
http:
  serversTransports:
    portainer-insecure:
      insecureSkipVerify: true
```

```yaml
# Add these labels to the portainer service
- "traefik.http.services.portainer.loadbalancer.server.port=9443"
- "traefik.http.services.portainer.loadbalancer.server.scheme=https"
- "traefik.http.services.portainer.loadbalancer.serverstransport=portainer-insecure@file"
```

## Conclusion

Traefik's label-based configuration makes it trivial to add new services. With this setup, Portainer is served over HTTPS with automatic Let's Encrypt certificates, and adding more services is as simple as adding labels to their containers. For Swarm deployments, see the companion guide on setting up Portainer behind Traefik on Docker Swarm.
