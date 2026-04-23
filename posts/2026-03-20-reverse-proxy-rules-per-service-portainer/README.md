# How to Configure Reverse Proxy Rules per Service in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Traefik, Nginx, Reverse Proxy, Docker, Routing, HTTPS

Description: Configure per-service reverse proxy routing rules using Traefik labels or Nginx configuration in Portainer stacks for path-based routing, header manipulation, and SSL termination.

---

A reverse proxy sits in front of your containerized services and routes incoming requests based on hostnames, paths, or headers. Configuring proxy rules per service in Portainer is most elegant with Traefik's label-based routing.

## Traefik Per-Service Configuration

Traefik reads routing rules from container labels, making each service self-describing:

```yaml
services:
  traefik:
    image: traefik:v3.6
    command:
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --certificatesresolvers.le.acme.httpchallenge=true
      - --certificatesresolvers.le.acme.httpchallenge.entrypoint=web
      - --certificatesresolvers.le.acme.email=admin@example.com
      - --certificatesresolvers.le.acme.storage=/letsencrypt/acme.json
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-certs:/letsencrypt
    networks:
      - proxy-net

  # Service 1: Route by hostname
  api:
    image: myapi:1.2.3
    labels:
      - traefik.enable=true
      - traefik.http.routers.api.rule=Host(`api.example.com`)
      - traefik.http.routers.api.entrypoints=websecure
      - traefik.http.routers.api.tls.certresolver=le
      - traefik.http.services.api.loadbalancer.server.port=8080
    networks:
      - proxy-net

  # Service 2: Route by path prefix
  admin:
    image: admin-panel:1.0
    labels:
      - traefik.enable=true
      - traefik.http.routers.admin.rule=Host(`example.com`) && PathPrefix(`/admin`)
      - traefik.http.routers.admin.entrypoints=websecure
      - traefik.http.routers.admin.tls.certresolver=le
      - traefik.http.services.admin.loadbalancer.server.port=3000
      # Add authentication middleware
      - "traefik.http.middlewares.basic-auth.basicauth.users=admin:$$apr1$$H6uskkkW$$IgXLP6ewTrSuBkTrqE8wj/"
      - traefik.http.routers.admin.middlewares=basic-auth
    networks:
      - proxy-net

  # Service 3: Multiple domain routing
  docs:
    image: mkdocs:latest
    labels:
      - traefik.enable=true
      - "traefik.http.routers.docs.rule=Host(`docs.example.com`) || Host(`wiki.example.com`)"
      - traefik.http.routers.docs.entrypoints=websecure
      - traefik.http.routers.docs.tls.certresolver=le
      - traefik.http.services.docs.loadbalancer.server.port=8000
    networks:
      - proxy-net

volumes:
  traefik-certs:

networks:
  proxy-net:
    driver: bridge
```

## Traefik Middleware Examples

Add request/response manipulation per service:

```yaml
# Rate limiting middleware

labels:
  - traefik.http.middlewares.rate-limit.ratelimit.average=100
  - traefik.http.middlewares.rate-limit.ratelimit.burst=200
  - traefik.http.routers.api.middlewares=rate-limit

# Add security headers
labels:
  - "traefik.http.middlewares.security-headers.headers.frameDeny=true"
  - "traefik.http.middlewares.security-headers.headers.contentTypeNosniff=true"
  - "traefik.http.middlewares.security-headers.headers.browserXssFilter=true"
  - traefik.http.routers.webapp.middlewares=security-headers

# Basic authentication
labels:
  - "traefik.http.middlewares.basic-auth.basicauth.users=admin:$$apr1$$H6uskkkW$$IgXLP6ewTrSuBkTrqE8wj/"
  - traefik.http.routers.admin.middlewares=basic-auth
```

## Nginx Per-Service Configuration

For Nginx-based routing, use separate config files per service:

```nginx
# /opt/nginx/conf.d/api.conf
server {
    listen 443 ssl;
    server_name api.example.com;
    ssl_certificate /etc/nginx/certs/api.crt;
    ssl_certificate_key /etc/nginx/certs/api.key;

    location / {
        proxy_pass http://api:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# /opt/nginx/conf.d/admin.conf
server {
    listen 443 ssl;
    server_name example.com;
    ssl_certificate /etc/nginx/certs/example.crt;
    ssl_certificate_key /etc/nginx/certs/example.key;

    location /admin {
        proxy_pass http://admin:3000;
        auth_basic "Admin Area";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }

    location / {
        proxy_pass http://webapp:8080;
    }
}
```

## Summary

Traefik's label-based routing is the most maintainable approach for per-service proxy configuration in Portainer - each service's routing rules live in its own stack definition. For complex routing needs or when you prefer configuration files, Nginx with per-service config files is a solid alternative. Traefik integrates directly with Let's Encrypt for automatic HTTPS, and Nginx can use Let's Encrypt certificates through its ACME module or an external ACME client such as Certbot.
