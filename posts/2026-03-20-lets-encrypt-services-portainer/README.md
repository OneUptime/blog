# How to Set Up Let's Encrypt for Services via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Let's Encrypt, SSL, TLS, HTTPS, Traefik, Certificate Management

Description: Automate Let's Encrypt TLS certificate provisioning for your containerized services deployed via Portainer using Traefik or Nginx Proxy Manager as an automated certificate manager.

---

Let's Encrypt provides free, automated TLS certificates. Combined with Traefik or Nginx Proxy Manager in a Portainer stack, you can have automatic HTTPS for all your services without manually managing certificates.

## Method 1: Traefik with Let's Encrypt

Traefik is the most popular automatic certificate manager for Docker:

```yaml
# traefik-letsencrypt-stack.yml

services:
  traefik:
    image: traefik:v3.0
    command:
      - --api.insecure=true
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      # Redirect HTTP to HTTPS
      - --entrypoints.web.http.redirections.entrypoint.to=websecure
      - --entrypoints.web.http.redirections.entrypoint.scheme=https
      # Let's Encrypt configuration
      - --certificatesresolvers.letsencrypt.acme.httpchallenge=true
      - --certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web
      - --certificatesresolvers.letsencrypt.acme.email=admin@example.com
      - --certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - letsencrypt-data:/letsencrypt
    restart: unless-stopped
    networks:
      - traefik-net

  # Example service with automatic HTTPS
  myapp:
    image: myapp:1.2.3
    labels:
      - traefik.enable=true
      # Route requests for app.example.com to this container
      - traefik.http.routers.myapp.rule=Host(`app.example.com`)
      - traefik.http.routers.myapp.entrypoints=websecure
      - traefik.http.routers.myapp.tls.certresolver=letsencrypt
      - traefik.http.services.myapp.loadbalancer.server.port=8080
    restart: unless-stopped
    networks:
      - traefik-net

volumes:
  letsencrypt-data:

networks:
  traefik-net:
    driver: bridge
```

## Method 2: Nginx Proxy Manager

Nginx Proxy Manager provides a web UI for managing certificates and proxy rules:

```yaml
# nginx-proxy-manager-stack.yml
services:
  npm:
    image: jc21/nginx-proxy-manager:latest
    ports:
      - "80:80"       # HTTP
      - "443:443"     # HTTPS
      - "81:81"       # NPM admin UI
    volumes:
      - npm-data:/data
      - npm-letsencrypt:/etc/letsencrypt
    restart: unless-stopped

volumes:
  npm-data:
  npm-letsencrypt:
```

After deploying:
1. Access NPM at `http://host:81`
2. Complete the initial admin user setup in the web UI
3. Add a **Proxy Host** for each service
4. In the **SSL** tab, select **Request a new SSL Certificate**
5. Enable **Force SSL** to redirect HTTP to HTTPS

## Method 3: Certbot with Nginx

For manual certificate management after the initial certificate has been issued:

```yaml
services:
  nginx:
    image: nginx:1.25-alpine
    volumes:
      - /opt/nginx/conf.d:/etc/nginx/conf.d:ro
      - certbot-certs:/etc/letsencrypt
      - certbot-www:/var/www/certbot
    ports:
      - "80:80"
      - "443:443"

  certbot:
    image: certbot/certbot:latest
    volumes:
      - certbot-certs:/etc/letsencrypt
      - certbot-www:/var/www/certbot
    # Periodically renew previously-issued certificates
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

volumes:
  certbot-certs:
  certbot-www:
```

Before the renewal loop can work, obtain the first certificate with `certbot certonly --webroot -w /var/www/certbot -d example.com` and configure Nginx to serve `/.well-known/acme-challenge/` from `/var/www/certbot`.

## DNS Challenge for Wildcard Certificates

For wildcard certificates (`*.example.com`), use DNS challenge instead of HTTP:

```yaml
traefik:
  command:
    - --certificatesresolvers.letsencrypt.acme.dnschallenge=true
    - --certificatesresolvers.letsencrypt.acme.dnschallenge.provider=cloudflare
  environment:
    - CF_API_EMAIL=admin@example.com
    - CF_API_KEY=your-cloudflare-api-key
```

## Summary

Traefik and Nginx Proxy Manager both provide automatic Let's Encrypt certificate management for containerized services deployed via Portainer. Traefik is the better choice for services that use Swarm or need automatic discovery from container labels. Nginx Proxy Manager is better for non-technical users who prefer a web UI for proxy and certificate management.
