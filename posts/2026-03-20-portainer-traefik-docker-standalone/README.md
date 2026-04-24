# How to Deploy Portainer and Traefik Together on Docker Standalone

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Traefik, Docker, Reverse Proxy, HTTPS

Description: Learn how to deploy Portainer alongside Traefik as a reverse proxy on Docker standalone, with automatic HTTPS using Let's Encrypt and clean domain-based routing.

## Introduction

Running Portainer behind Traefik provides automatic HTTPS certificate management, clean URL routing, and a single entry point for all your containerized services. This guide covers deploying both Portainer and Traefik on Docker standalone with Let's Encrypt TLS.

## Prerequisites

- Docker and Docker Compose installed
- A domain name pointing to your server
- Port 80 and 443 accessible from the internet (for Let's Encrypt)

## Step 1: Create the Directory Structure

```bash
mkdir -p /opt/traefik/{data,config}
mkdir -p /opt/portainer/data

# Create Let's Encrypt certificate storage

touch /opt/traefik/data/acme.json
chmod 600 /opt/traefik/data/acme.json

# Create the Traefik dynamic config directory
mkdir -p /opt/traefik/config
```

## Step 2: Create the Traefik Static Configuration

```yaml
# /opt/traefik/traefik.yml - Static configuration
api:
  dashboard: true    # Enable Traefik dashboard

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https  # Auto-redirect HTTP to HTTPS
  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@example.com
      storage: /data/acme.json
      httpChallenge:
        entryPoint: web

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false  # Require explicit enabling per container
    network: "proxy"
  file:
    directory: /config
    watch: true

log:
  level: INFO

accessLog: {}
```

## Step 3: Create the Docker Compose File

```yaml
# /opt/traefik/docker-compose.yml
services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    networks:
      - proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/localtime:/etc/localtime:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /opt/traefik/traefik.yml:/traefik.yml:ro
      - /opt/traefik/config:/config:ro
      - /opt/traefik/data:/data
    labels:
      - "traefik.enable=true"
      # Traefik Dashboard
      - "traefik.http.routers.traefik.rule=Host(`traefik.example.com`)"
      - "traefik.http.routers.traefik.entrypoints=websecure"
      - "traefik.http.routers.traefik.tls=true"
      - "traefik.http.routers.traefik.tls.certresolver=letsencrypt"
      - "traefik.http.routers.traefik.service=api@internal"
      # Basic auth for dashboard
      - "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$HASHHERE"
      - "traefik.http.routers.traefik.middlewares=auth"

  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    networks:
      - proxy
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - portainer_data:/data
    labels:
      - "traefik.enable=true"
      # Portainer HTTPS routing
      - "traefik.http.routers.portainer.rule=Host(`portainer.example.com`)"
      - "traefik.http.routers.portainer.entrypoints=websecure"
      - "traefik.http.routers.portainer.tls=true"
      - "traefik.http.routers.portainer.tls.certresolver=letsencrypt"
      - "traefik.http.routers.portainer.service=portainer"
      - "traefik.http.services.portainer.loadbalancer.server.port=9000"

networks:
  proxy:
    name: proxy
    external: false

volumes:
  portainer_data:
```

## Step 4: Deploy the Stack

```bash
cd /opt/traefik

# Start Traefik and Portainer
docker compose up -d

# Check both containers are running
docker compose ps

# View Traefik logs (watch for certificate issuance)
docker logs traefik --follow
```

## Step 5: Configure DNS

Point your domain records to your server's IP:

```text
portainer.example.com  A  YOUR_SERVER_IP
traefik.example.com    A  YOUR_SERVER_IP
```

Wait for DNS propagation (usually 5-15 minutes), then verify:

```bash
# Test HTTPS is working
curl -I https://portainer.example.com

# Verify certificate is from Let's Encrypt
curl -v https://portainer.example.com 2>&1 | grep -i "Let's Encrypt"
```

## Step 6: Verify the Setup

1. Open `https://portainer.example.com` - should show Portainer setup page
2. Open `https://traefik.example.com/dashboard/` - should show Traefik dashboard (with auth)
3. HTTP should redirect to HTTPS automatically

```bash
# Test HTTP to HTTPS redirect
curl -I http://portainer.example.com
# Expected: HTTP/1.1 301 Moved Permanently

# Verify Let's Encrypt certificate
echo | openssl s_client -servername portainer.example.com \
  -connect portainer.example.com:443 2>/dev/null | \
  openssl x509 -noout -dates -issuer
```

## Step 7: Add Your First Application

Add another service with Traefik labels:

```yaml
# In any other docker-compose.yml on the same host
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

networks:
  proxy:
    external: true  # Use the existing proxy network
```

Deploy via Portainer; Traefik will auto-detect the labels and route traffic.

## Conclusion

Deploying Portainer and Traefik together on Docker standalone gives you automatic HTTPS certificate management, clean subdomain routing, and a central proxy for all your containers. The label-based configuration means any container deployed through Portainer can be exposed with proper HTTPS routing just by adding the appropriate Traefik labels to its Docker Compose definition.
