# How to Use DuckDNS with Portainer for Dynamic DNS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, DuckDNS, Dynamic DNS, Docker, Self-Hosted, SSL, Traefik

Description: Learn how to use DuckDNS for free dynamic DNS with Portainer, automatically updating your domain when your home IP changes.

---

Most home internet connections have a dynamic IP that changes periodically. DuckDNS is a free dynamic DNS service that gives you a subdomain (e.g., `myserver.duckdns.org`) and an API to update it when your IP changes. Combined with Portainer and Traefik, this gives you a complete self-hosted setup accessible from the internet with automatic SSL.

---

## Step 1: Create a DuckDNS Account and Domain

1. Visit [duckdns.org](https://www.duckdns.org) and sign in with GitHub, Google, or another provider
2. Create a subdomain (e.g., `myserver.duckdns.org`)
3. Note your **token** - you'll need it for IP updates
4. Your current IP is automatically populated when you create the domain

---

## Step 2: Deploy the DuckDNS Updater via Portainer

Run the DuckDNS updater container as a Portainer stack. It pings the DuckDNS API every 5 minutes to update your IP.

```yaml
# duckdns-stack.yml

version: "3.8"

services:
  duckdns:
    image: lscr.io/linuxserver/duckdns:latest
    container_name: duckdns
    restart: unless-stopped
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
      # Comma-separated list of your DuckDNS subdomains (without .duckdns.org)
      - SUBDOMAINS=myserver
      # Your DuckDNS token from duckdns.org
      - TOKEN=your-duckdns-token-here
      - UPDATE_IP=ipv4
      - LOG_FILE=false
    volumes:
      - duckdns_config:/config

volumes:
  duckdns_config:
```

---

## Step 3: Verify IP Updates

```bash
# Check the DuckDNS updater logs
docker logs -f duckdns

# Manual DNS lookup to confirm your domain resolves correctly
nslookup myserver.duckdns.org
# Should resolve to your current public IP

# Get your current public IP for comparison
curl -s https://api.ipify.org
```

---

## Step 4: Deploy Traefik with DuckDNS DNS Challenge for SSL

DuckDNS supports the ACME DNS-01 challenge through Traefik, enabling free Let's Encrypt SSL.

Because Traefik and Portainer both attach to the same external Docker network, create it once before deploying the next two stacks:

```bash
docker network create proxy
```

```yaml
# traefik-duckdns-stack.yml
version: "3.8"

services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.websecure.address=:443"
      # Use DuckDNS DNS challenge for SSL
      - "--certificatesresolvers.duckdns.acme.dnschallenge=true"
      - "--certificatesresolvers.duckdns.acme.dnschallenge.provider=duckdns"
      - "--certificatesresolvers.duckdns.acme.email=admin@example.com"
      - "--certificatesresolvers.duckdns.acme.storage=/letsencrypt/acme.json"
    environment:
      # Your DuckDNS token for DNS challenge
      DUCKDNS_TOKEN: "your-duckdns-token-here"
    ports:
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_letsencrypt:/letsencrypt
    networks:
      - proxy

networks:
  proxy:
    external: true

volumes:
  traefik_letsencrypt:
```

---

## Step 5: Deploy Portainer with DuckDNS Domain

```yaml
# portainer-duckdns-stack.yml
version: "3.8"

services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      # Route portainer.myserver.duckdns.org (use subdomains of your domain)
      - "traefik.http.routers.portainer.rule=Host(`portainer.myserver.duckdns.org`)"
      - "traefik.http.routers.portainer.entrypoints=websecure"
      - "traefik.http.routers.portainer.tls.certresolver=duckdns"
      - "traefik.http.services.portainer.loadbalancer.server.port=9000"

volumes:
  portainer_data:

networks:
  proxy:
    external: true
```

---

## Step 6: Open Router Port Forwarding

For external access with the DNS-01 configuration above, forward port 443 from your router to your server's LAN IP.

```text
Router Port Forwarding:
  External 443 → Internal 192.168.1.100:443
```

---

## Summary

DuckDNS + Portainer + Traefik gives you a complete self-hosted setup with free dynamic DNS and automatic SSL. The DuckDNS updater container keeps your domain pointing to your current IP, Traefik uses the DuckDNS API to obtain Let's Encrypt certificates, and all your services get HTTPS access via clean subdomains.
