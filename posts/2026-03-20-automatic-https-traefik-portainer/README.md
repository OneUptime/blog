# How to Enable Automatic HTTPS with Traefik in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Traefik, HTTPS, TLS, Docker, Let's Encrypt

Description: Learn how to deploy Traefik as a reverse proxy in Portainer and configure automatic HTTPS certificate provisioning with Let's Encrypt.

---

Traefik is a cloud-native reverse proxy that integrates with Docker to automatically discover services and provision TLS certificates from Let's Encrypt. Deploying it as a Portainer stack gives you automatic HTTPS for all your containerized applications with minimal configuration.

---

## Prerequisites

- A domain name pointing to your server's public IP
- Port 80 and 443 open in your firewall
- Portainer running on a Docker host
- Deploy Traefik and any apps you expose on a shared Docker network

---

## Create the Traefik Stack in Portainer

Navigate to **Stacks** → **Add stack** in Portainer and paste the following:

```yaml
version: "3.8"

services:
  traefik:
    image: traefik:v3.7
    container_name: traefik
    restart: unless-stopped
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--providers.docker.network=proxy"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--entrypoints.web.http.redirections.entrypoint.scheme=https"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
    ports:
      - "80:80"
      - "443:443"
    networks:
      - proxy
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-certs:/letsencrypt
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(`traefik.example.com`)"
      - "traefik.http.routers.dashboard.entrypoints=websecure"
      - "traefik.http.routers.dashboard.tls=true"
      - "traefik.http.routers.dashboard.tls.certresolver=letsencrypt"
      - "traefik.http.routers.dashboard.service=api@internal"

volumes:
  traefik-certs:

networks:
  proxy:
    name: proxy
```

---

## Deploy an Application Behind Traefik

Deploy the Traefik stack first, then create your application stack and attach it to the same `proxy` network:

```yaml
services:
  myapp:
    image: nginx:alpine
    restart: unless-stopped
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=proxy"
      - "traefik.http.routers.myapp.rule=Host(`myapp.example.com`)"
      - "traefik.http.routers.myapp.entrypoints=websecure"
      - "traefik.http.routers.myapp.tls=true"
      - "traefik.http.routers.myapp.tls.certresolver=letsencrypt"
      - "traefik.http.services.myapp.loadbalancer.server.port=80"

networks:
  proxy:
    external: true
```

Traefik reads the Docker labels on the shared network and automatically creates the HTTPS router with a Let's Encrypt certificate.

---

## Verify Certificate Provisioning

```bash
# Check Traefik logs for certificate issuance

docker logs traefik | grep "certificate"

# Test with curl
curl -v https://myapp.example.com
```

---

## Summary

Deploy Traefik with the `--certificatesresolvers.letsencrypt.acme` options, enable the Docker provider, and place Traefik and your apps on a shared Docker network. Add `traefik.enable=true` and router labels with `entrypoints=websecure` and `tls.certresolver=letsencrypt` to any container you want exposed. Traefik handles certificate issuance, renewal, and HTTP-to-HTTPS redirection automatically. Manage the entire setup through Portainer stacks.
