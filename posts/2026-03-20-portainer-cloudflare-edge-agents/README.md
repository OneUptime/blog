# How to Set Up Cloudflare Tunnel for Portainer Edge Agents - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Cloudflare, Edge Agent, Zero Trust, Remote Management

Description: Learn how to use Cloudflare Tunnel to connect Portainer Edge Agents running in remote or private networks to your Portainer server, enabling secure management without VPN or direct port exposure.

## Introduction

Portainer Edge Agents allow Portainer to manage Docker environments in remote networks. Traditionally, Edge Agents need to reach the Portainer server over the internet. Cloudflare Tunnel provides a secure relay for this connection, allowing Edge Agents in locked-down environments to communicate with your Portainer server without exposing direct inbound ports to either the Portainer host or the edge host.

## Prerequisites

- Portainer with Edge Agent support
- Cloudflare account with access to Cloudflare Tunnel
- Two environments: Portainer server and remote host (the edge)
- `cloudflared` on the Portainer server (optional on the remote host)

## Step 1: Architecture Overview

```text
Remote Host (Edge)                    Your Network
┌──────────────┐                    ┌──────────────────┐
│ Edge Agent   │───────HTTPS──────▶CF◀──cloudflared──│ Portainer Server │
│              │       / WSS          Tunnel         │ (Central)        │
└──────────────┘                    └──────────────────┘

Flow:
1. Portainer server is published through Cloudflare Tunnel
2. Edge Agent polls the Portainer API URL and opens the reverse tunnel through the Edge hostname when required
3. No direct inbound firewall ports are needed on either host
```

## Step 2: Expose Portainer Server via Cloudflare Tunnel

On your Portainer server, set up a tunnel exposing both the Portainer UI and the Edge tunnel endpoint:

```yaml
# /opt/cloudflared/config.yml on Portainer server

tunnel: YOUR_TUNNEL_UUID
credentials-file: /etc/cloudflared/YOUR_TUNNEL_UUID.json

ingress:
  # Standard Portainer UI
  - hostname: portainer.example.com
    service: http://portainer:9000

  # Edge Agent communication port (8000)
  - hostname: edge.portainer.example.com
    service: http://portainer:8000

  - service: http_status:404
```

```bash
# Create DNS routes for both hostnames
cloudflared tunnel route dns portainer-tunnel portainer.example.com
cloudflared tunnel route dns portainer-tunnel edge.portainer.example.com
```

## Step 3: Configure Portainer for Edge Agents

In Portainer, configure the URLs the Edge Agent will use:

1. Go to **Settings** → **Edge Compute** (or confirm the values during Edge environment creation)
2. Set **Portainer API server URL**: `https://portainer.example.com`
3. Set **Portainer tunnel server address**: `https://edge.portainer.example.com`
4. Edge Agents poll the API URL and use the tunnel server address for interactive sessions

## Step 4: Create an Edge Environment in Portainer

1. Go to **Environments** → **Add environment**
2. Select **Docker Standalone** → **Edge Agent Standard**
3. Portainer generates an Edge ID and Edge Key
4. Copy the generated docker run command for the remote host

The command looks like this (use the same agent tag or version as your Portainer server):
```bash
# Add EDGE_INSECURE_POLL=1 only if Portainer uses a self-signed certificate
docker run -d \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /:/host \
  -v portainer_agent_data:/data \
  --restart always \
  -e EDGE=1 \
  -e EDGE_ID=your-edge-id \
  -e EDGE_KEY=your-edge-key \
  --name portainer_edge_agent \
  portainer/agent:<your-portainer-version>
```

## Step 5: Deploy Edge Agent on the Remote Host

On the remote host that the Edge Agent will manage:

```yaml
# docker-compose.yml on remote host
services:
  edge-agent:
    image: portainer/agent:<your-portainer-version>
    restart: always
    environment:
      EDGE: "1"
      EDGE_ID: "${EDGE_ID}"          # From Portainer environment setup
      EDGE_KEY: "${EDGE_KEY}"        # From Portainer environment setup
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
      - /:/host
      - edge_agent_data:/data

volumes:
  edge_agent_data:
```

If your Portainer server uses a self-signed certificate, add `EDGE_INSECURE_POLL=1`.

The Edge Agent polls `https://portainer.example.com` and, when Portainer needs an interactive session, opens the reverse tunnel to `https://edge.portainer.example.com`.

## Step 6: Optional - Cloudflare Tunnel on Remote Host

If the remote host also needs to be reached for other purposes (or for a more complex setup):

```yaml
# docker-compose.yml on remote host with cloudflared
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      TUNNEL_TOKEN: "${REMOTE_TUNNEL_TOKEN}"    # Different tunnel for remote host

  edge-agent:
    image: portainer/agent:<your-portainer-version>
    restart: always
    environment:
      EDGE: "1"
      EDGE_ID: "${EDGE_ID}"
      EDGE_KEY: "${EDGE_KEY}"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
      - /:/host
      - edge_agent_data:/data

volumes:
  edge_agent_data:
```

## Step 7: Verify Edge Agent Connection

```bash
# On Portainer server, check logs for agent connection
docker logs portainer 2>&1 | grep -i "edge\|agent\|connect"

# In Portainer UI:
# Environments → your edge environment → should show "Connected" status
# The green indicator means Edge Agent has checked in successfully

# Check Edge Agent logs on remote host
docker compose logs -f edge-agent

# Expected: periodic poll and check-in messages
```

## Step 8: Cloudflare Access Considerations

Do not assume Cloudflare Access service-token authentication is a drop-in fit for the Edge endpoint:

1. Cloudflare Access service tokens require the client to send `CF-Access-Client-Id` and `CF-Access-Client-Secret` headers
2. Portainer Edge Agent documentation does not document a way to provide those headers for Edge polling or tunnel establishment
3. The Edge endpoint is already protected by Portainer's mTLS and rotating Edge credentials
4. If you want Cloudflare Access, use it for the human-facing Portainer UI and verify your Edge hostname remains reachable to the agent flow you intend to use

## Conclusion

Cloudflare Tunnel enables Portainer Edge Agents in remote or locked-down environments to communicate with the central Portainer server without any direct inbound firewall rules. The Edge Agent initiates outbound connections through Cloudflare's global network, making it ideal for environments behind strict firewalls, NAT, or in cloud regions where direct connectivity isn't available. Portainer already secures Edge communication with mTLS and rotating Edge credentials, while Cloudflare Access is better suited to protecting the human-facing Portainer UI.
