# How to Use DuckDNS with Portainer for Dynamic DNS - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, DuckDNS, Dynamic DNS, SSL, Home Lab

Description: Set up DuckDNS dynamic DNS with automatic IP updates and Let's Encrypt SSL certificates for Portainer and self-hosted services.

## Introduction

DuckDNS provides free dynamic DNS subdomains (like `myserver.duckdns.org`). It's ideal for home lab setups where your ISP assigns a dynamic IP. This guide shows how to integrate DuckDNS with Portainer for automatic DNS updates and SSL certificate management.

## Setting Up DuckDNS

1. Go to https://www.duckdns.org
2. Log in with Google/GitHub/X account
3. Create a subdomain: `yourname.duckdns.org`
4. Copy your token from the dashboard

## Deploying the DuckDNS Update Container via Portainer

```yaml
# duckdns-stack.yml - Deploy as Portainer stack

services:
  duckdns:
    image: lscr.io/linuxserver/duckdns:latest
    container_name: duckdns
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
      - SUBDOMAINS=yourname  # Your DuckDNS subdomain (without .duckdns.org)
      - TOKEN=your-duckdns-token
      - LOG_FILE=false       # Set true to keep update logs
    restart: unless-stopped
```

## Getting SSL Certificates with DuckDNS

Use the DuckDNS ACME DNS challenge for Let's Encrypt certificates:

```bash
# Install certbot with DuckDNS plugin
pip install certbot-dns-duckdns

# Get SSL certificate
certbot certonly \
  --authenticator dns-duckdns \
  --dns-duckdns-token your-duckdns-token \
  --dns-duckdns-propagation-seconds 60 \
  -d yourname.duckdns.org \
  --non-interactive \
  --agree-tos \
  -m admin@example.com
```

## Traefik with DuckDNS ACME

```yaml
# traefik-duckdns-stack.yml

services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    environment:
      - DUCKDNS_TOKEN=your-duckdns-token
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-certs:/letsencrypt
    command:
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --entrypoints.web.http.redirections.entrypoint.to=websecure
      - --certificatesresolvers.duckdns.acme.email=admin@example.com
      - --certificatesresolvers.duckdns.acme.storage=/letsencrypt/acme.json
      - --certificatesresolvers.duckdns.acme.dnschallenge.provider=duckdns
      - --certificatesresolvers.duckdns.acme.dnschallenge.resolvers=1.1.1.1:53
    networks:
      - proxy

networks:
  proxy:
    external: true

volumes:
  traefik-certs:
```

## Deploying Portainer with DuckDNS Domain

```yaml
# portainer-with-duckdns.yml

services:
  portainer:
    image: portainer/portainer-ce:latest
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    labels:
      - traefik.enable=true
      - traefik.http.routers.portainer.rule=Host(`yourname.duckdns.org`)
      - traefik.http.routers.portainer.entrypoints=websecure
      - traefik.http.routers.portainer.tls.certresolver=duckdns
      - traefik.http.services.portainer.loadbalancer.server.port=9000
    networks:
      - proxy

volumes:
  portainer_data:

networks:
  proxy:
    external: true
```

## Manual DuckDNS Update Script

For environments without the DuckDNS container:

```bash
#!/bin/bash
# duckdns-update.sh

DUCKDNS_DOMAIN="yourname"
DUCKDNS_TOKEN="your-token"

# Get current public IP
CURRENT_IP=$(curl -s https://api.ipify.org)
echo "Current IP: $CURRENT_IP"

# Update DuckDNS
RESPONSE=$(curl -s "https://www.duckdns.org/update?domains=$DUCKDNS_DOMAIN&token=$DUCKDNS_TOKEN&ip=$CURRENT_IP")

if [ "$RESPONSE" = "OK" ]; then
  echo "DuckDNS updated successfully to $CURRENT_IP"
else
  echo "DuckDNS update failed: $RESPONSE"
  exit 1
fi
```

```bash
# Add to crontab (update every 5 minutes)
crontab -e

# Add this line:
*/5 * * * * /opt/scripts/duckdns-update.sh >> /var/log/duckdns.log 2>&1

# Or run as Docker container
docker run -d \
  --name duckdns-updater \
  -e SUBDOMAINS=yourname \
  -e TOKEN=your-token \
  --restart=always \
  lscr.io/linuxserver/duckdns:latest
```

## Port Forwarding on Your Router

For external access, forward ports on your router:

```text
Router > Port Forwarding:
- Port 80 (HTTP) → Server-IP:80
- Port 443 (HTTPS) → Server-IP:443
```

## Testing the Setup

```bash
# Verify DNS resolves to your current IP
dig yourname.duckdns.org

# Test HTTP redirect to HTTPS
curl -I http://yourname.duckdns.org

# Test HTTPS access
curl -v https://yourname.duckdns.org

# Check certificate
echo | openssl s_client -connect yourname.duckdns.org:443 2>/dev/null \
  | openssl x509 -noout -dates
```

## Conclusion

DuckDNS with Portainer provides a free, fully-automated solution for home labs with dynamic IP addresses. The DuckDNS container monitors your public IP and updates the DNS record automatically. Combined with Traefik for SSL certificate management, you get a production-ready HTTPS setup with a real domain name at zero cost.
