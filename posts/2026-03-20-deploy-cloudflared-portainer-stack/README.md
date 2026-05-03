# How to Deploy cloudflared as a Portainer Stack - Deploy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Cloudflare, Cloudflared, Docker, Networking, Security

Description: Learn how to deploy the Cloudflare tunnel daemon (cloudflared) as a Portainer stack for secure, no-inbound-port service exposure.

---

cloudflared is the daemon that establishes and maintains Cloudflare Tunnels. Running it as a Portainer stack makes it easy to manage, restart on failure, and update alongside your other containerized services.

---

## Prerequisites

- Cloudflare account with Zero Trust enabled
- A tunnel created in the Cloudflare dashboard or via CLI
- A tunnel token from the dashboard

---

## Create the Tunnel in Cloudflare Dashboard

1. Go to **Zero Trust** → **Networks** → **Tunnels** → **Create a tunnel**.
2. Name your tunnel (e.g., `homelab`).
3. Copy the **Tunnel token** shown.
4. Add a **Public Hostname**:
   - Subdomain: `portainer`
   - Domain: `example.com`
   - Service: `https://portainer:9443`

---

## Deploy as a Portainer Stack

In Portainer: **Stacks** → **Add stack** → paste the following:

```yaml
version: "3.8"

services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${TUNNEL_TOKEN}
    networks:
      - portainer_default

networks:
  portainer_default:
    external: true
```

Set `TUNNEL_TOKEN` in the Portainer stack **Environment variables** section.

---

## Verify Tunnel Status

In the cloudflared container logs:
```text
2024-01-01T12:00:00Z INF Starting tunnel tunnelID=abc123...
2024-01-01T12:00:01Z INF Connection registered connIndex=0 ip=198.41.192.7
```

In Cloudflare Dashboard under **Tunnels**, the tunnel should show **Healthy**.

---

## Expose Multiple Services

In the Cloudflare tunnel configuration, add multiple public hostnames:

| Subdomain     | Service                          |
|---------------|----------------------------------|
| portainer     | https://portainer:9443           |
| grafana       | http://grafana:3000              |
| traefik       | https://traefik:8443             |

All route through the single cloudflared container.

---

## Update cloudflared

```yaml
# Change image tag to update

image: cloudflare/cloudflared:2024.1.0
```

Update via Portainer: open the stack, edit the image version, and redeploy.

---

## Summary

Deploy cloudflared with `TUNNEL_TOKEN` from the Cloudflare Zero Trust dashboard. The container connects outbound to Cloudflare and receives traffic for all configured public hostnames. Connect it to the same Docker network as your services so it can forward traffic internally. No inbound firewall ports required.
