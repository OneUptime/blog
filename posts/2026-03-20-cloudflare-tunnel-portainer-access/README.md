# How to Access Portainer Securely with a Cloudflare Tunnel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Cloudflare, Tunnel, Security, Networking, Docker

Description: Learn how to expose Portainer securely over the internet using Cloudflare Tunnel without opening any inbound firewall ports.

---

Cloudflare Tunnel (formerly Argo Tunnel) creates an outbound-only encrypted connection from your server to Cloudflare's network, exposing services without opening firewall ports. This is a secure way to access Portainer remotely.

---

## Prerequisites

- A Cloudflare account with a domain added to Cloudflare
- Docker installed on the Portainer host
- `cloudflared` CLI or Docker image

---

## Create a Cloudflare Tunnel

```bash
# Install cloudflared

curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64   -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Authenticate (opens browser)
cloudflared tunnel login

# Create the tunnel
cloudflared tunnel create portainer-tunnel

# Note the tunnel UUID from output
```

---

## Configure the Tunnel

```yaml
# ~/.cloudflared/config.yml on the Portainer host,
# mounted into /home/nonroot/.cloudflared in the container below
tunnel: <TUNNEL-UUID>
credentials-file: /home/nonroot/.cloudflared/<TUNNEL-UUID>.json

ingress:
  - hostname: portainer.example.com
    service: https://<PORTAINER-HOST-IP>:9443
    originRequest:
      noTLSVerify: true  # For self-signed Portainer cert
  - service: http_status:404
```

Because `cloudflared` runs in its own container below, do not use `localhost` here unless the container shares the host network. Use the Portainer host IP address or another address the container can actually reach.

---

## Add DNS Record

```bash
cloudflared tunnel route dns portainer-tunnel portainer.example.com
```

---

## Deploy as a Portainer Stack

```yaml
version: "3.8"
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel --no-autoupdate run portainer-tunnel
    volumes:
      - /root/.cloudflared:/home/nonroot/.cloudflared:ro
```

Mount the locally-managed tunnel directory into the container so `cloudflared` can read `config.yml` and the tunnel credentials file you created earlier.

---

## Enable Zero Trust Access (Optional)

In Cloudflare Zero Trust dashboard:
1. Go to **Access controls** → **Applications** → **Add an application**.
2. Select **Self-hosted**, enter `portainer.example.com`.
3. Add an **Access Policy** requiring your email or Google SSO.

This adds an authentication layer in front of Portainer itself.

---

## Summary

Create a Cloudflare Tunnel and configure it to forward traffic from `portainer.example.com` to `https://<PORTAINER-HOST-IP>:9443`. Deploy `cloudflared` as a Docker container in a Portainer stack by mounting the tunnel config and credentials files into the container. No inbound firewall ports are required - all traffic flows outbound through Cloudflare's network. Add Cloudflare Access policies for additional authentication before reaching Portainer.
