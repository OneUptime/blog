# How to Deploy Cloudflared as a Portainer Stack

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Cloudflare, Cloudflared, Stack, Docker Compose

Description: Learn how to deploy cloudflared (Cloudflare Tunnel connector) as a Portainer-managed stack, enabling tunneled access to your services without command-line management.

## Overview

Deploying cloudflared as a Portainer stack lets you manage your Cloudflare Tunnel connector through the Portainer UI - view logs, restart, update, and monitor the tunnel alongside your other services.

## Prerequisites

- Portainer running on your server
- A Cloudflare account with a domain and tunnel created
- Your tunnel token from the Cloudflare Zero Trust dashboard

## Getting Your Tunnel Token

1. Go to [Cloudflare Zero Trust](https://one.dash.cloudflare.com)
2. Open **Networks → Connectors → Cloudflare Tunnels**
3. Select your tunnel
4. Click **Add a replica**
5. Copy the token from the install command shown:

```bash
cloudflared service install eyJhY...  # This is your token
```

## Portainer Stack: cloudflared Only

If cloudflared is a standalone stack separate from your services:

```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${TUNNEL_TOKEN}
    networks:
      - proxy    # Must share network with services it tunnels to

networks:
  proxy:
    external: true
```

In Portainer's stack environment variables, set `TUNNEL_TOKEN` to your tunnel token.

## Portainer Stack: cloudflared + Portainer Together

Deploy both in one stack for a self-contained setup:

```yaml
services:
  portainer:
    image: portainer/portainer-ce:latest
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    # No ports published - cloudflared handles external access

  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${TUNNEL_TOKEN}
    depends_on:
      - portainer

volumes:
  portainer_data:
```

In the Cloudflare tunnel config, set:
- Hostname: `portainer.yourdomain.com`
- Service: `http://portainer:9000`

## Step-by-Step: Deploy via Portainer

1. **Stacks → Add Stack**
2. Name: `cloudflared`
3. Paste the compose content
4. Scroll to **Environment Variables**
5. Add: `TUNNEL_TOKEN = eyJhY...your-token...`
6. Click **Deploy the Stack**

## Monitoring the Tunnel

From Portainer:

1. Go to **Stacks → cloudflared**
2. Click on the **cloudflared** service
3. View **Logs** - a healthy tunnel shows:

```text
2026-03-20T10:00:00Z INF Starting tunnel tunnelID=...
2026-03-20T10:00:01Z INF Registered tunnel connection connIndex=0
2026-03-20T10:00:01Z INF Connection registered with Cloudflare
```

Also check in the Cloudflare Zero Trust dashboard under **Networks → Connectors → Cloudflare Tunnels** - status should show **Healthy**.

## Updating cloudflared

Cloudflare periodically releases new versions. To update via Portainer:

1. **Stacks → cloudflared → Editor**
2. Change `cloudflare/cloudflared:latest` to a specific version or back to `latest`
3. Click **Update the Stack**

Or pin a specific version for stability:

```yaml
image: cloudflare/cloudflared:2026.3.0
```

## Multiple Tunnels for Different Environments

```yaml
services:
  cloudflared-prod:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${TUNNEL_TOKEN_PROD}

  cloudflared-staging:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${TUNNEL_TOKEN_STAGING}
```

## Conclusion

Managing cloudflared as a Portainer stack turns tunnel maintenance into a UI-driven task. You can update the tunnel connector, view live logs, and restart it on failure without SSHing into your server. Combined with the Cloudflare Zero Trust dashboard for routing configuration, this provides a complete GUI-managed tunnel setup.
