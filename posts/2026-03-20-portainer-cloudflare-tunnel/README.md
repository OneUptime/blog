# How to Set Up Cloudflare Tunnel for Portainer Access - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Cloudflare, Tunnel, Zero Trust, Security

Description: Learn how to expose Portainer securely through a Cloudflare Tunnel without opening firewall ports, enabling safe remote access to your container management interface from anywhere.

## Introduction

Cloudflare Tunnel (formerly Argo Tunnel) creates an encrypted outbound connection from your server to Cloudflare's network, allowing you to expose Portainer without opening inbound firewall ports. This is ideal for home servers, servers behind NAT, and environments where you want to avoid exposing ports 443 or 80 directly. This guide covers setting up a Cloudflare Tunnel for Portainer access.

## Prerequisites

- A Cloudflare account with a domain managed by Cloudflare
- Docker installed on your host
- Outbound access to Cloudflare on port `7844` (TCP/UDP)

## Step 1: Create a Tunnel via Cloudflare Dashboard

1. Log into [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. Go to **Networks** → **Connectors** → **Cloudflare Tunnels** → **Create a tunnel**
3. Choose **Cloudflared**
4. Name your tunnel: `portainer-tunnel`
5. Copy the tunnel token from the generated `cloudflared` command - you'll need it for the container configuration

The tunnel token looks like:
```text
eyJhIjoiYWNjb3VudC1pZCIsInQiOiJ0dW5uZWwtaWQiLCJzIjoic2VjcmV0LWtleSJ9...
```

## Step 2: Configure Tunnel Routing in Cloudflare

Still in the tunnel setup wizard:

1. Under **Published application routes**, add a route:
   ```text
   Subdomain:  portainer
   Domain:     example.com
   Path:       (leave blank)
   Type:       HTTPS
   URL:        portainer:9443
   ```

   The URL `portainer:9443` refers to the Portainer container name on the shared Docker network. Portainer's default web UI listens on HTTPS port `9443`.

   Because Portainer uses a self-signed certificate by default, set **Additional application settings** → **TLS Settings** → **No TLS Verify** to `true` unless you have configured Portainer with a trusted certificate.

2. Click **Save tunnel**

## Step 3: Deploy Cloudflared as a Docker Container

```yaml
# docker-compose.yml

services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      TUNNEL_TOKEN: "${CLOUDFLARE_TUNNEL_TOKEN}"    # Set as env var
    networks:
      - proxy    # Must be on same network as Portainer

  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    networks:
      - proxy
    # No port mappings needed - accessed via Cloudflare Tunnel

networks:
  proxy:
    name: proxy
    driver: bridge

volumes:
  portainer_data:
```

```bash
# Create .env file for the token
echo "CLOUDFLARE_TUNNEL_TOKEN=your-tunnel-token-here" > .env

# Deploy
docker compose up -d

# Verify cloudflared connected
docker logs cloudflared --follow
# Expected: "Registered tunnel connection" messages
```

## Step 4: Verify Tunnel Connection

```bash
# Check cloudflared is connected
docker logs cloudflared 2>&1 | grep -i "registered\|connected\|error"

# Expected output includes lines such as:
# INF Registered tunnel connection connIndex=0 connection=UUID...

# Test access
curl -I https://portainer.example.com
# Expected: an HTTP response from Portainer, such as 200 OK or 302 Found
```

## Step 5: Secure the Tunnel with Cloudflare Access

Add authentication so only your team can access Portainer:

1. In Cloudflare Zero Trust → **Access controls** → **Applications** → **Add an application**
2. Choose **Self-hosted**
3. Configure:
   ```text
   Application name: Portainer
   Session duration: 24 hours
   Application domain: portainer.example.com
   ```
4. Add a policy:
   ```text
   Policy name: Allow Team
   Action: Allow
   Include rule: Emails ending in @yourcompany.com
   ```

Now accessing `portainer.example.com` requires Cloudflare Access authentication before reaching Portainer.

## Step 6: Handle WebSockets for Portainer Console

Portainer's terminal requires WebSocket support. Cloudflare Tunnel supports WebSockets natively, but verify:

1. In Cloudflare Dashboard → **Websites** → `example.com` → **Network**
2. Enable **WebSockets**

If Portainer console disconnects:
```yaml
# In the tunnel public hostname configuration, set:
Additional application settings:
  TLS Settings:
    No TLS Verify: true (if Portainer uses self-signed cert internally)
  HTTP Settings:
    HTTP Host Header: portainer.example.com
```

## Step 7: Monitor Tunnel Status

```yaml
# Add to the cloudflared service in docker-compose.yml
services:
  cloudflared:
    ports:
      - "127.0.0.1:2000:2000"    # Metrics only on localhost
    command: tunnel --no-autoupdate --metrics 0.0.0.0:2000 run
```

```bash
# Recreate cloudflared after updating the compose file
docker compose up -d cloudflared

# Check tunnel metrics
curl http://localhost:2000/metrics

# View recent connection status
docker logs cloudflared --tail 50
```

## Conclusion

Cloudflare Tunnel provides a secure way to access Portainer without exposing any firewall ports. Cloudflared makes outbound connections to Cloudflare's network, with routing configured entirely within the Cloudflare dashboard. For production use, combine the tunnel with Cloudflare Access policies to add identity-based authentication in front of Portainer - blocking unauthorized users at the Cloudflare edge before requests ever reach your server.
