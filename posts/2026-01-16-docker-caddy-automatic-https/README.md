# How to Use Docker with Caddy for Automatic HTTPS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Caddy, HTTPS, SSL, Reverse Proxy

Description: Learn how to set up Caddy as a reverse proxy for Docker containers with automatic HTTPS, simple configuration, and zero-config SSL certificates.

---

Caddy is a powerful, enterprise-ready web server with automatic HTTPS. It obtains and renews SSL certificates automatically, making it an excellent choice for Docker environments requiring secure connections with minimal configuration.

## Why Caddy?

```mermaid
flowchart LR
    subgraph Caddy["Caddy Features"]
        direction TB
        F1["✓ Automatic HTTPS - Let's Encrypt"]
        F2["✓ Automatic certificate renewal"]
        F3["✓ HTTP/2 and HTTP/3 support"]
        F4["✓ Simple configuration - Caddyfile"]
        F5["✓ Reverse proxy built-in"]
        F6["✓ Load balancing"]
        F7["✓ Zero-downtime reloads"]
    end
```

## Basic Setup

### Simple Reverse Proxy

```yaml
# docker-compose.yml
version: '3.8'

services:
  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config

  app:
    image: myapp:latest
    expose:
      - "3000"

volumes:
  caddy_data:
  caddy_config:
```

### Caddyfile

```
# Caddyfile
app.example.com {
    reverse_proxy app:3000
}
```

That's it! Caddy automatically:
- Obtains SSL certificate from Let's Encrypt
- Redirects HTTP to HTTPS
- Renews certificates before expiry

## Multiple Services

### Caddyfile with Multiple Domains

```
# Caddyfile
api.example.com {
    reverse_proxy api:3000
}

www.example.com, example.com {
    reverse_proxy web:80
}

admin.example.com {
    reverse_proxy admin:8080
}
```

### Docker Compose

```yaml
version: '3.8'

services:
  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    networks:
      - frontend

  api:
    image: myapi:latest
    networks:
      - frontend
      - backend

  web:
    image: nginx:alpine
    volumes:
      - ./html:/usr/share/nginx/html:ro
    networks:
      - frontend

  admin:
    image: myadmin:latest
    networks:
      - frontend

networks:
  frontend:
  backend:

volumes:
  caddy_data:
```

## Load Balancing

### Round Robin

```
api.example.com {
    reverse_proxy api-1:3000 api-2:3000 api-3:3000
}
```

### With Health Checks

```
api.example.com {
    reverse_proxy api-1:3000 api-2:3000 api-3:3000 {
        health_uri /health
        health_interval 10s
        health_timeout 5s
        health_status 200
    }
}
```

### Weighted Load Balancing

```
api.example.com {
    reverse_proxy {
        to api-v1:3000 api-v2:3000

        lb_policy weighted_round_robin
        lb_try_duration 5s
    }
}
```

### Docker Compose with Replicas

```yaml
services:
  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data

  api:
    image: myapi:latest
    deploy:
      replicas: 3
    expose:
      - "3000"
```

```
# Caddyfile - Caddy discovers all replicas via DNS
api.example.com {
    reverse_proxy api:3000
}
```

## Path-Based Routing

```
example.com {
    # API routes
    handle /api/* {
        reverse_proxy api:3000
    }

    # WebSocket
    handle /ws/* {
        reverse_proxy api:3000
    }

    # Static files
    handle /static/* {
        root * /srv
        file_server
    }

    # Default to web app
    handle {
        reverse_proxy web:80
    }
}
```

## Headers and Security

### Security Headers

```
example.com {
    header {
        # Security headers
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        Content-Security-Policy "default-src 'self'"

        # Remove server info
        -Server
    }

    reverse_proxy app:3000
}
```

### CORS Configuration

```
api.example.com {
    @cors_preflight method OPTIONS

    handle @cors_preflight {
        header Access-Control-Allow-Origin "https://example.com"
        header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
        header Access-Control-Allow-Headers "Content-Type, Authorization"
        header Access-Control-Max-Age "86400"
        respond "" 204
    }

    header Access-Control-Allow-Origin "https://example.com"

    reverse_proxy api:3000
}
```

## Authentication

### Basic Auth

```
admin.example.com {
    basicauth {
        # Generate: caddy hash-password
        admin $2a$14$...
    }

    reverse_proxy admin:8080
}
```

### Forward Auth (with Authelia/Authentik)

```
*.example.com {
    forward_auth authelia:9091 {
        uri /api/verify?rd=https://auth.example.com/
        copy_headers Remote-User Remote-Groups Remote-Name Remote-Email
    }

    reverse_proxy app:3000
}
```

## Compression and Caching

```
example.com {
    encode gzip zstd

    header /static/* {
        Cache-Control "public, max-age=31536000"
    }

    reverse_proxy app:3000
}
```

## Websockets

```
example.com {
    reverse_proxy /ws/* api:3000

    reverse_proxy app:3000
}
```

Caddy automatically handles WebSocket upgrades.

## Local Development

### Self-Signed Certificates

```
# Caddyfile for development
{
    local_certs
}

app.localhost {
    reverse_proxy app:3000
}
```

### Development Compose

```yaml
version: '3.8'

services:
  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile.dev:/etc/caddy/Caddyfile
      - caddy_data:/data
    extra_hosts:
      - "host.docker.internal:host-gateway"

  app:
    image: node:20
    volumes:
      - ./app:/app
    working_dir: /app
    command: npm run dev

volumes:
  caddy_data:
```

## Complete Production Example

```yaml
# docker-compose.yml
version: '3.8'

services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"  # HTTP/3
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - frontend
    environment:
      - ACME_AGREE=true

  api:
    image: myapi:latest
    restart: unless-stopped
    expose:
      - "3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@postgres:5432/myapp
    networks:
      - frontend
      - backend
    depends_on:
      - postgres
      - redis

  web:
    image: myweb:latest
    restart: unless-stopped
    expose:
      - "80"
    networks:
      - frontend

  postgres:
    image: postgres:15
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=myapp
    networks:
      - backend

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    networks:
      - backend

networks:
  frontend:
  backend:
    internal: true

volumes:
  caddy_data:
  caddy_config:
  postgres_data:
```

```
# Caddyfile
{
    email admin@example.com
}

api.example.com {
    encode gzip

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        -Server
    }

    reverse_proxy api:3000 {
        health_uri /health
        health_interval 30s
    }

    log {
        output file /var/log/caddy/api.log
        format json
    }
}

www.example.com, example.com {
    encode gzip

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        -Server
    }

    # Redirect www to non-www
    @www host www.example.com
    redir @www https://example.com{uri} permanent

    reverse_proxy web:80

    log {
        output file /var/log/caddy/web.log
        format json
    }
}
```

## Caddy API

### Dynamic Configuration

```bash
# Get current config
curl localhost:2019/config/

# Update upstream
curl localhost:2019/config/apps/http/servers/srv0/routes/0/handle/0/upstreams \
  -X PATCH \
  -H "Content-Type: application/json" \
  -d '[{"dial": "api:3001"}]'

# Reload config
curl localhost:2019/load \
  -X POST \
  -H "Content-Type: text/caddyfile" \
  --data-binary @Caddyfile
```

### Expose Admin API

```
{
    admin 0.0.0.0:2019
}
```

## Metrics and Monitoring

```
{
    servers {
        metrics
    }
}

example.com {
    reverse_proxy app:3000
}

:9180 {
    metrics /metrics
}
```

## Summary

| Feature | Configuration |
|---------|--------------|
| HTTPS | Automatic (just use domain) |
| Load Balancing | List multiple upstreams |
| Health Checks | health_uri directive |
| Headers | header directive |
| Auth | basicauth or forward_auth |
| Compression | encode gzip zstd |
| Logs | log directive |

Caddy provides the simplest path to automatic HTTPS with minimal configuration. Use it for quick setups, automatic certificate management, and production deployments. For more complex routing needs, see our post on [Docker with Traefik](https://oneuptime.com/blog/post/2026-01-16-docker-traefik-reverse-proxy/view).

