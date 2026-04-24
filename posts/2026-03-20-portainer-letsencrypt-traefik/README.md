# How to Configure Portainer with Let's Encrypt via Traefik

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Traefik, Let's Encrypt, SSL, HTTPS

Description: Set up automatic Let's Encrypt TLS certificates for Portainer using Traefik's built-in ACME support with both HTTP and DNS challenges.

## Introduction

Let's Encrypt provides free, automatically renewed TLS certificates. Traefik's built-in ACME client makes certificate management hands-free - once configured, Traefik requests, stores, and renews certificates automatically. This guide covers both the HTTP-01 challenge (for public servers) and the DNS-01 challenge (for private servers or wildcard certs).

## Prerequisites

- Docker and Docker Compose
- Domain pointing to your server (for HTTP-01)
- OR DNS provider API credentials (for DNS-01)
- Ports 80 and 443 open to the internet (for HTTP-01)

## Method 1: HTTP-01 Challenge (Public Servers)

This is the simplest method. Traefik answers Let's Encrypt's HTTP challenge on port 80.

### Docker Compose with HTTP-01

```yaml
services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: always
    command:
      # Provider
      - "--providers.docker=true"
      - "--providers.docker.exposedByDefault=false"
      # Entrypoints
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      # HTTP->HTTPS redirect
      - "--entrypoints.web.http.redirections.entryPoint.to=websecure"
      - "--entrypoints.web.http.redirections.entryPoint.scheme=https"
      # ACME / Let's Encrypt
      - "--certificatesresolvers.myresolver.acme.httpChallenge=true"
      - "--certificatesresolvers.myresolver.acme.httpChallenge.entryPoint=web"
      - "--certificatesresolvers.myresolver.acme.email=admin@example.com"
      - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
      # Uncomment for staging (testing):
      # - "--certificatesresolvers.myresolver.acme.caServer=https://acme-staging-v02.api.letsencrypt.org/directory"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./letsencrypt:/letsencrypt
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - proxy

  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    command:
      - "--http-enabled"
      - "--trusted-origins=https://portainer.example.com"
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.portainer.rule=Host(`portainer.example.com`)"
      - "traefik.http.routers.portainer.entrypoints=websecure"
      # Link to the ACME resolver
      - "traefik.http.routers.portainer.tls.certresolver=myresolver"
      - "traefik.http.services.portainer.loadbalancer.server.port=9000"

networks:
  proxy:
    driver: bridge

volumes:
  portainer_data:
```

## Method 2: DNS-01 Challenge (Private Servers & Wildcards)

Use DNS-01 when your server is not publicly accessible, or when you want wildcard certificates (`*.example.com`).

### DNS-01 with Cloudflare

```yaml
  traefik:
    image: traefik:v3.0
    environment:
      # Cloudflare API token with Zone:Read and DNS:Edit permissions
      - CF_DNS_API_TOKEN=your_cloudflare_token_here
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedByDefault=false"
      - "--entrypoints.websecure.address=:443"
      # DNS-01 challenge with Cloudflare
      - "--certificatesresolvers.cloudflare.acme.dnsChallenge=true"
      - "--certificatesresolvers.cloudflare.acme.dnsChallenge.provider=cloudflare"
      - "--certificatesresolvers.cloudflare.acme.dnsChallenge.resolvers=1.1.1.1:53,8.8.8.8:53"
      - "--certificatesresolvers.cloudflare.acme.email=admin@example.com"
      - "--certificatesresolvers.cloudflare.acme.storage=/letsencrypt/acme.json"
```

Then reference the `cloudflare` resolver in Portainer's labels:

```yaml
    labels:
      - "traefik.http.routers.portainer.tls.certresolver=cloudflare"
      # Wildcard certificate:
      - "traefik.http.routers.portainer.tls.domains[0].main=example.com"
      - "traefik.http.routers.portainer.tls.domains[0].sans=*.example.com"
```

## Step 3: Deploy and Verify

```bash
# Create cert storage with correct permissions

mkdir -p letsencrypt
touch letsencrypt/acme.json
chmod 600 letsencrypt/acme.json

# Start the stack
docker compose up -d

# Monitor certificate acquisition (usually takes 30-60 seconds)
docker logs traefik -f | grep -i acme

# Verify certificate details
curl -sv https://portainer.example.com 2>&1 | grep -A5 "Server certificate"
```

## Troubleshooting

**Rate limit errors**: Use the staging CA server first. Let's Encrypt allows up to 5 authorization failures per identifier, per account, every hour.

**Permission errors on acme.json**: The file must be mode 600 and writable by Traefik.

**DNS-01 propagation delay**: Add `--certificatesresolvers.cloudflare.acme.dnsChallenge.delayBeforeCheck=30` to wait for DNS propagation.

## Conclusion

Traefik's ACME support eliminates the need for separate certificate management tools like Certbot. HTTP-01 is perfect for public servers, while DNS-01 unlocks certificates for private infrastructure and wildcard domains. Once deployed, certificates renew automatically before expiry.
