# How to Deploy Caddy via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Caddy, Reverse Proxy, SSL, Self-Hosted

Description: Deploy Caddy web server via Portainer as an automatic HTTPS reverse proxy with the simplest configuration syntax and built-in Let's Encrypt certificate management.

## Introduction

Caddy is a modern web server with automatic HTTPS, an extremely simple configuration syntax (Caddyfile), and excellent performance. Unlike Traefik, Caddy uses a simple text configuration file that is intuitive for most web server use cases. Deploy it via Portainer for automatic SSL and clean reverse proxy configuration.

## Deploy as a Stack

```yaml
version: "3.8"

services:
  caddy:
    image: caddy:2-alpine
    container_name: caddy
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"   # HTTP/3 (QUIC)
    volumes:
      # Caddyfile configuration
      - /opt/caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      # Site files (for static hosting)
      - /opt/caddy/site:/srv:ro
      # Caddy data (certificates, cache)
      - caddy_data:/data
      # Caddy config
      - caddy_config:/config
    networks:
      - caddy-network
    restart: unless-stopped

networks:
  caddy-network:
    external: true

volumes:
  caddy_data:
  caddy_config:
```

## Caddyfile Configuration

Create `Caddyfile` on the Docker host at `/opt/caddy/Caddyfile`, and ensure the containers you proxy are attached to the same `caddy-network` Docker network:

```caddyfile
# Caddyfile - Caddy web server configuration

# Global options

{
    email admin@example.com
    
    # Use Let's Encrypt staging for testing
    # acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
}

# Reverse proxy for web application
app.example.com {
    reverse_proxy myapp:3000 {
        health_uri /health
        health_interval 30s
    }
    
    # Enable compression
    encode gzip zstd
    
    # Security headers
    header {
        X-Frame-Options DENY
        X-Content-Type-Options nosniff
        X-XSS-Protection "1; mode=block"
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        -Server   # Remove Server header
    }
}

# Redirect example.com to www
example.com {
    redir https://www.example.com{uri} permanent
}

# Static website hosting
www.example.com {
    root * /srv
    file_server
}

# API endpoint
api.example.com {
    reverse_proxy api-service:8080
    
    # Rate limiting requires a custom Caddy build with the rate_limit module.
    # rate_limit {remote_host} 100r/m
}

# PHPMyAdmin behind authentication
db.example.com {
    basic_auth /* {
        admin $2a$14$hashedpassword
    }
    reverse_proxy phpmyadmin:80
}

# HTTP to HTTPS redirect for all other domains
http:// {
    redir https://{host}{uri} permanent
}
```

## Local Development Caddyfile

For development with self-signed certificates:

```caddyfile
localhost:80 {
    reverse_proxy myapp:3000
}

localhost:443 {
    tls internal   # Caddy's local CA
    reverse_proxy myapp:3000
}
```

## Caddy with Docker Labels (Docker Plugin)

For dynamic routing similar to Traefik, use the caddy-docker-proxy plugin:

```yaml
version: "3.8"

services:
  caddy:
    image: lucaslorentz/caddy-docker-proxy:ci-alpine
    container_name: caddy
    ports:
      - "80:80"
      - "443:443"
    environment:
      - CADDY_INGRESS_NETWORKS=caddy-network
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - caddy_data:/data
    networks:
      - caddy-network
    restart: unless-stopped

  myapp:
    image: nginx:alpine
    labels:
      caddy: app.example.com
      caddy.reverse_proxy: "{{upstreams 80}}"
    networks:
      - caddy-network

networks:
  caddy-network:
    external: true

volumes:
  caddy_data:
```

## Reloading Configuration

```bash
# Reload Caddy configuration without downtime
docker exec caddy caddy reload --config /etc/caddy/Caddyfile

# Validate configuration before reloading
docker exec caddy caddy validate --config /etc/caddy/Caddyfile

# Print the formatted Caddyfile
docker exec caddy caddy fmt /etc/caddy/Caddyfile
```

## Conclusion

Caddy deployed via Portainer provides the simplest path to automatic HTTPS for self-hosted services. The Caddyfile syntax is readable and concise compared to Nginx or Apache configurations. Automatic certificate renewal means you never need to manually manage SSL certificates again. For home labs and small deployments, Caddy's simplicity often makes it the preferred choice over Traefik.
