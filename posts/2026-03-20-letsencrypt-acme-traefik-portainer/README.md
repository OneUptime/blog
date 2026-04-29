# How to Set Up Let's Encrypt ACME with Traefik and Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Let's Encrypt, ACME, Traefik, Portainer, TLS, SSL, Docker

Description: Learn how to configure automatic TLS certificate provisioning using Let's Encrypt ACME with Traefik as a reverse proxy managed through Portainer.

## Introduction

Let's Encrypt provides free, automated TLS certificates through the ACME protocol. Traefik natively supports ACME, making it easy to provision and renew certificates automatically. Managing this setup through Portainer gives you a centralized dashboard for your containerized services.

## Prerequisites

- Portainer installed and running
- A domain name with DNS pointing to your server
- Docker and Docker Compose available
- Ports 80 and 443 open on your firewall

## Architecture Overview

Traefik acts as the entry point for all HTTP/HTTPS traffic. When an HTTPS router is configured with a certificate resolver, Traefik automatically requests a certificate from Let's Encrypt using the ACME HTTP-01 or DNS-01 challenge.

## Step 1: Create the Traefik Configuration

Create a `traefik.yml` static configuration file on your Docker host, for example at `/opt/traefik/traefik.yml`:

```yaml
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@yourdomain.com
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web

providers:
  docker:
    exposedByDefault: false

api:
  dashboard: true
  insecure: false
```

## Step 2: Deploy Traefik via Portainer

In Portainer, navigate to **Stacks** and create a new stack with the following `docker-compose.yml`:

```yaml
services:
  traefik:
    image: traefik:v3.5
    container_name: traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /opt/traefik/traefik.yml:/etc/traefik/traefik.yml:ro
      - letsencrypt:/letsencrypt
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(`traefik.yourdomain.com`) && (PathPrefix(`/api`) || PathPrefix(`/dashboard`))"
      - "traefik.http.routers.dashboard.entrypoints=websecure"
      - "traefik.http.routers.dashboard.tls.certresolver=letsencrypt"
      - "traefik.http.routers.dashboard.service=api@internal"
      - "traefik.http.routers.dashboard.middlewares=auth"
      - "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$..."

volumes:
  letsencrypt:
```

## Step 3: Deploy a Service with TLS

Add any service to the same stack with Traefik labels:

```yaml
  myapp:
    image: nginx:alpine
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.myapp.rule=Host(`app.yourdomain.com`)"
      - "traefik.http.routers.myapp.entrypoints=websecure"
      - "traefik.http.routers.myapp.tls.certresolver=letsencrypt"
```

## Step 4: Set File Permissions for acme.json

If you bind-mount the Let's Encrypt directory from the host instead of using a named volume, the `acme.json` file must have strict permissions:

```bash
mkdir -p /opt/traefik/letsencrypt
touch /opt/traefik/letsencrypt/acme.json
chmod 600 /opt/traefik/letsencrypt/acme.json
```

## Step 5: Verify Certificate Issuance

After deploying, Traefik will automatically request certificates. Check the Traefik dashboard at `https://traefik.yourdomain.com/dashboard/` or view logs:

```bash
docker logs traefik | grep -i acme
```

## DNS-01 Challenge for Wildcard Certificates

For wildcard certificates, use the DNS-01 challenge:

```yaml
certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@yourdomain.com
      storage: /letsencrypt/acme.json
      dnsChallenge:
        provider: cloudflare
        resolvers:
          - "1.1.1.1:53"
```

Set your DNS provider API token as an environment variable in the Portainer stack editor and pass it to the Traefik service. For example, with Cloudflare:

```yaml
services:
  traefik:
    environment:
      CF_DNS_API_TOKEN: ${CF_DNS_API_TOKEN}
```

## Best Practices

- Always use a staging ACME server first to avoid rate limits: `caServer: https://acme-staging-v02.api.letsencrypt.org/directory`
- Store `acme.json` in a named Docker volume for persistence across container restarts.
- Enable HTTP to HTTPS redirection to ensure all traffic is encrypted.
- Monitor certificate renewal in Traefik logs.

## Conclusion

Combining Let's Encrypt ACME with Traefik and Portainer provides a fully automated TLS lifecycle management solution. Certificates are provisioned and renewed without manual intervention, keeping your services secure at no cost.
