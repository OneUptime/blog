# How to Configure Custom Domain Names for Portainer Services - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, DNS, Traefik, Nginx, Domain

Description: Configure custom domain names for services managed by Portainer using Traefik or Nginx as a reverse proxy with automatic SSL.

## Introduction

Accessing services via custom domain names (like `myapp.example.com`) instead of bare IP:port pairs improves usability, enables SSL, and prepares services for production. Portainer integrates with Traefik via labels and Nginx via configuration files to provide automatic domain routing.

## Prerequisites

- Domain name with DNS management access
- Portainer managing Docker containers
- Shared Docker network created for the reverse proxy (for example, `docker network create proxy`)
- Traefik or Nginx deployed via Portainer

## Option 1: Custom Domains with Traefik

### Deploy Traefik via Portainer

```yaml
# traefik-stack.yml - deploy as a Portainer stack

version: '3.8'

services:
  traefik:
    image: traefik:v3.0
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    environment:
      # For Let's Encrypt DNS challenge (Cloudflare example)
      CF_DNS_API_TOKEN: "${CF_DNS_API_TOKEN}"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-certs:/letsencrypt
    command:
      - --api=true
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --entrypoints.web.http.redirections.entrypoint.to=websecure
      - --certificatesresolvers.le.acme.email=admin@example.com
      - --certificatesresolvers.le.acme.storage=/letsencrypt/acme.json
      - --certificatesresolvers.le.acme.dnschallenge=true
      - --certificatesresolvers.le.acme.dnschallenge.provider=cloudflare
    labels:
      - traefik.enable=true
      - traefik.http.routers.dashboard.rule=Host(`traefik.example.com`)
      - traefik.http.routers.dashboard.tls.certresolver=le
      - traefik.http.routers.dashboard.service=api@internal
    networks:
      - proxy

networks:
  proxy:
    external: true

volumes:
  traefik-certs:
```

### Deploying Services with Custom Domains

```yaml
# myapp-stack.yml
version: '3.8'

services:
  myapp:
    image: myapp:latest
    restart: unless-stopped
    labels:
      # Enable Traefik routing
      - traefik.enable=true
      # Route by domain name
      - traefik.http.routers.myapp.rule=Host(`myapp.example.com`)
      # Use HTTPS with Let's Encrypt
      - traefik.http.routers.myapp.tls.certresolver=le
      # Define the service port
      - traefik.http.services.myapp.loadbalancer.server.port=3000
    networks:
      - proxy

  api:
    image: myapp-api:latest
    restart: unless-stopped
    labels:
      - traefik.enable=true
      - traefik.http.routers.api.rule=Host(`api.example.com`)
      - traefik.http.routers.api.tls.certresolver=le
      - traefik.http.services.api.loadbalancer.server.port=8080
    networks:
      - proxy

networks:
  proxy:
    external: true
```

## Option 2: Custom Domains with Nginx Proxy Manager

```yaml
# nginx-proxy-manager-stack.yml
version: '3.8'

services:
  npm:
    image: jc21/nginx-proxy-manager:latest
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "81:81"  # Admin UI
    volumes:
      - npm-data:/data
      - npm-letsencrypt:/etc/letsencrypt
    environment:
      DB_SQLITE_FILE: "/data/database.sqlite"
    networks:
      - proxy

volumes:
  npm-data:
  npm-letsencrypt:

networks:
  proxy:
    external: true
```

Then in NPM Admin UI (port 81):
1. **Hosts > Proxy Hosts > Add Proxy Host**
2. Domain: `myapp.example.com`
3. Forward Hostname: `myapp`
4. Forward Port: `3000`
5. Enable **SSL > Request a new SSL Certificate**

## Option 3: Manual Nginx Configuration

```nginx
# /etc/nginx/sites-available/myapp.example.com
server {
    listen 80;
    server_name myapp.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name myapp.example.com;

    ssl_certificate /etc/letsencrypt/live/myapp.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/myapp.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## DNS Configuration

```bash
# Add DNS records for each service
# Using Cloudflare CLI (flarectl)

# Create the shared network before deploying the stacks
docker network create proxy

# Add A records
flarectl dns create --zone example.com --type A --name myapp --content YOUR-SERVER-IP
flarectl dns create --zone example.com --type A --name api --content YOUR-SERVER-IP
flarectl dns create --zone example.com --type A --name traefik --content YOUR-SERVER-IP

# Or a wildcard A record for all subdomains
flarectl dns create --zone example.com --type A --name "*" --content YOUR-SERVER-IP
```

## Conclusion

Custom domain names make Portainer-managed services production-ready and user-friendly. Traefik with Docker labels provides the most seamless integration, automatically obtaining SSL certificates as new services are deployed. Nginx Proxy Manager offers a GUI for non-technical administrators. Both approaches work perfectly within the Portainer stack workflow.
