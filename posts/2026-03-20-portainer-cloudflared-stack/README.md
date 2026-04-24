# How to Deploy Cloudflared as a Portainer Stack - Part 3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Cloudflare, Cloudflared, Stack, Docker Compose

Description: Learn how to deploy the Cloudflare Tunnel daemon (cloudflared) as a Portainer-managed stack, exposing multiple services through Cloudflare Tunnels with lifecycle management through the Portainer...

## Introduction

Running cloudflared as a Portainer stack means your Cloudflare Tunnel is managed alongside all your other infrastructure. You can start, stop, update, and view logs through the same Portainer interface. This guide covers deploying cloudflared in both config-file mode (for multiple public hostnames) and token mode, managed entirely through Portainer.

## Prerequisites

- Portainer CE or BE running
- A Cloudflare account with a domain
- Cloudflare tunnel created and configured

## Step 1: Create Tunnel Configuration File (Config Mode)

For more control over tunnel configuration, use a config file instead of just a token:

```bash
# On the host, create the cloudflared config directory

mkdir -p /opt/cloudflared

# Install cloudflared locally to authenticate (one-time setup)
# Download from: https://github.com/cloudflare/cloudflared/releases
cloudflared tunnel login
# This creates ~/.cloudflared/cert.pem

# Create a named tunnel
cloudflared tunnel create portainer-tunnel
# Note the tunnel UUID from output

# Copy credentials to config directory
cp ~/.cloudflared/*.json /opt/cloudflared/
```

```yaml
# /opt/cloudflared/config.yml
tunnel: YOUR_TUNNEL_UUID
credentials-file: /etc/cloudflared/YOUR_TUNNEL_UUID.json

ingress:
  # Route portainer.example.com to Portainer container
  - hostname: portainer.example.com
    service: http://portainer:9000

  # Route traefik.example.com to Traefik dashboard
  - hostname: traefik.example.com
    service: http://traefik:8080

  # Route a Node.js app
  - hostname: myapp.example.com
    service: http://myapp:3000
    originRequest:
      connectTimeout: 30s
      noTLSVerify: false

  # Catch-all: return 404 for unmatched hostnames
  - service: http_status:404
```

## Step 2: Create the Portainer Stack

In Portainer → **Stacks** → **Add Stack**:

Name: `cloudflared`

**Option A: Config File Mode**

```yaml
version: "3.8"

services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared
    restart: unless-stopped
    command: tunnel --no-autoupdate --config /etc/cloudflared/config.yml run
    volumes:
      - /opt/cloudflared:/etc/cloudflared:ro    # Mount config directory
    networks:
      - proxy

networks:
  proxy:
    external: true
    name: proxy
```

**Option B: Token Mode (Simpler)**

```yaml
version: "3.8"

services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      TUNNEL_TOKEN: "${CLOUDFLARE_TUNNEL_TOKEN}"    # Set in Portainer env vars
    networks:
      - proxy

networks:
  proxy:
    external: true
    name: proxy
```

Set the environment variable in Portainer's **Environment variables** section:
- `CLOUDFLARE_TUNNEL_TOKEN`: `your-token-here`

## Step 3: Configure DNS via Cloudflare CLI (Config Mode)

For the locally-managed tunnel, create DNS routes pointing to the tunnel:

```bash
# Create DNS CNAME records routing to the tunnel
# Requires the cert.pem created by `cloudflared tunnel login`
cloudflared tunnel route dns portainer-tunnel portainer.example.com
cloudflared tunnel route dns portainer-tunnel traefik.example.com
cloudflared tunnel route dns portainer-tunnel myapp.example.com
```

These create CNAME records like `portainer.example.com → UUID.cfargotunnel.com` in Cloudflare DNS automatically.

## Step 4: Deploy and Monitor

```bash
# After clicking "Deploy the stack" in Portainer, monitor via:
# Portainer → Stacks → cloudflared → Logs

# Or via CLI:
docker logs cloudflared --follow

# Expected successful output:
# INF Starting tunnel tunnelID=UUID
# INF Registered tunnel connection connIndex=0
# INF Registered tunnel connection connIndex=1
# INF Registered tunnel connection connIndex=2
# INF Registered tunnel connection connIndex=3
# (4 connections = fully connected, load-balanced across Cloudflare PoPs)
```

## Step 5: Update cloudflared Through Portainer

```bash
# Method 1: Through Portainer UI
# Stacks → cloudflared → Edit
# Change image version or click Update with "Re-pull image"

# Method 2: Check for updates and notify
CURRENT=$(docker exec cloudflared cloudflared --version | awk '{print $3}')
LATEST=$(curl -s https://api.github.com/repos/cloudflare/cloudflared/releases/latest | jq -r '.tag_name')
echo "Current: $CURRENT"
echo "Latest: $LATEST"
```

## Step 6: Multi-Replica Setup for Higher Availability

```yaml
# Run two cloudflared replicas for redundancy
services:
  cloudflared-1:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      TUNNEL_TOKEN: "${CLOUDFLARE_TUNNEL_TOKEN}"
    networks:
      - proxy

  cloudflared-2:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      TUNNEL_TOKEN: "${CLOUDFLARE_TUNNEL_TOKEN}"    # Same token, creates additional connections
    networks:
      - proxy
```

Both containers connect to the same tunnel using the same token, creating 8 total connections (4 per container). For host-level redundancy, run the replicas on different Docker hosts.

## Conclusion

Deploying cloudflared as a Portainer stack integrates Cloudflare Tunnel management into your standard container workflow. Config-file mode allows routing multiple public hostnames to different services on your Docker network, while token mode is simpler when the tunnel configuration is managed in Cloudflare instead of a local config file. The key advantage is having tunnel lifecycle management - updates, restarts, and log access - through the same Portainer interface you use for everything else, rather than a separate deployment mechanism.
