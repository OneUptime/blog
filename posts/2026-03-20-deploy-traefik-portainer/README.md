# How to Deploy Traefik via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Traefik, Reverse Proxy, Docker, Deployment

Description: Learn how to deploy Traefik as a standalone application via Portainer, separate from Portainer itself, for managing reverse proxy routing for all your other containerized services.

## Overview

While many guides deploy Traefik alongside Portainer in the same compose file, deploying Traefik as its own Portainer stack makes it independently manageable - you can update Traefik's configuration or version without touching Portainer itself.

## Traefik Stack via Portainer

**Stacks → Add Stack → traefik**

```yaml
version: "3.8"

services:
  traefik:
    image: traefik:v3.6
    container_name: traefik
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    networks:
      - proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/localtime:/etc/localtime:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /opt/traefik/data:/data
    command:
      # API and Dashboard
      - "--api=true"
      # Providers
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--providers.docker.network=proxy"
      # Entrypoints
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--entrypoints.web.http.redirections.entrypoint.scheme=https"
      - "--entrypoints.websecure.address=:443"
      # Let's Encrypt
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}"
      - "--certificatesresolvers.letsencrypt.acme.storage=/data/acme.json"
      # Logging
      - "--log.level=INFO"
      - "--accesslog=true"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.traefik.rule=Host(`traefik.yourdomain.com`)"
      - "traefik.http.routers.traefik.entrypoints=websecure"
      - "traefik.http.routers.traefik.tls.certresolver=letsencrypt"
      - "traefik.http.routers.traefik.service=api@internal"
      - "traefik.http.middlewares.traefik-auth.basicauth.users=${TRAEFIK_DASHBOARD_USERS}"
      - "traefik.http.routers.traefik.middlewares=traefik-auth"

networks:
  proxy:
    name: proxy
    external: true
```

## Environment Variables

```text
ACME_EMAIL = admin@yourdomain.com
TRAEFIK_DASHBOARD_USERS = admin:$$2y$$HASH_HERE
```

Generate the password hash: `htpasswd -nbB admin yourpassword | sed -e s/\\$/\\$\\$/g`

## Prerequisites: Create the Proxy Network

Before deploying the stack:

```bash
docker network create proxy
```

Or in Portainer: **Networks → Add Network → Name: proxy, Driver: bridge**

## Initialize acme.json

```bash
# On the Docker host

mkdir -p /opt/traefik/data
touch /opt/traefik/data/acme.json
chmod 600 /opt/traefik/data/acme.json
```

## Deploy the Stack

1. **Stacks → Add Stack → traefik**
2. Paste the YAML
3. Add environment variables
4. Click **Deploy the Stack**

## Adding Services to Traefik

Any new service deployed via Portainer can use Traefik by adding to the proxy network and adding labels:

```yaml
services:
  myapp:
    image: myapp:latest
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.myapp.rule=Host(`myapp.yourdomain.com`)"
      - "traefik.http.routers.myapp.entrypoints=websecure"
      - "traefik.http.routers.myapp.tls.certresolver=letsencrypt"
      - "traefik.http.services.myapp.loadbalancer.server.port=8080"

networks:
  proxy:
    external: true
```

## Updating Traefik

1. **Stacks → traefik → Editor**
2. Change `traefik:v3.6` to the newer supported `traefik:v3.x` tag you want to deploy
3. Click **Update the Stack**

Traefik restarts with the new version; all routes resume immediately because configuration is stored in labels and `acme.json`.

## Conclusion

Traefik as a standalone Portainer stack decouples the reverse proxy lifecycle from Portainer's own lifecycle. Update Traefik independently, roll back if needed, and manage its configuration through Portainer's stack editor - all without touching Portainer's own deployment.
