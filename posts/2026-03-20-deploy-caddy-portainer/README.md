# How to Deploy Caddy via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Caddy, Reverse Proxy, HTTPS, Docker

Description: Learn how to deploy Caddy as a reverse proxy via Portainer, leveraging its automatic HTTPS and simple Caddyfile configuration for clean, zero-certificate-management routing.

## Why Caddy?

Caddy is a modern web server and reverse proxy that handles TLS certificates completely automatically:
- Auto-obtains and renews Let's Encrypt certificates
- Automatically redirects HTTP to HTTPS
- Simple, human-readable Caddyfile configuration
- Zero configuration for basic HTTPS

## Caddy Stack via Portainer

**Stacks → Add Stack → caddy**

```yaml
version: "3.8"

services:
  caddy:
    image: caddy:2-alpine
    container_name: caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"    # HTTP/3 (QUIC)
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - proxy

networks:
  proxy:
    name: proxy
    external: true

volumes:
  caddy_data:     # Stores certificates
  caddy_config:   # Stores runtime config
```

## Caddyfile Configuration

Create `Caddyfile` on the Docker host (bind-mounted):

```caddyfile
# Redirect all bare domain to www

yourdomain.com {
    redir https://www.yourdomain.com{uri}
}

# Portainer dashboard
portainer.yourdomain.com {
    reverse_proxy portainer:9000
}

# Your web application
app.yourdomain.com {
    reverse_proxy myapp:8080 {
        # Load balancing across multiple instances
        # lb_policy round_robin
    }

    # Enable compression
    encode gzip zstd

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
    }
}

# API with rate limiting (requires third-party plugin, see below)
api.yourdomain.com {
    reverse_proxy api-service:8080

    # Rate limiting via middleware
    rate_limit {
        zone static_example {
            key {remote_host}
            events 100
            window 1m
        }
    }
}
```

The `rate_limit` directive is **not** built into standard Caddy. It is provided by the third-party module [`github.com/mholt/caddy-ratelimit`](https://github.com/mholt/caddy-ratelimit) and the official `caddy:2-alpine` image will reject the Caddyfile with an "unknown directive: rate_limit" error. To use it, build a custom image with `xcaddy`:

```dockerfile
FROM caddy:2-builder-alpine AS builder
RUN xcaddy build --with github.com/mholt/caddy-ratelimit

FROM caddy:2-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
```

Caddy automatically:
- Issues Let's Encrypt certificates for all configured domains
- Redirects HTTP to HTTPS
- Renews certificates before expiry

## Dynamic Configuration via Caddy API

Caddy has a REST API for runtime configuration changes:

```bash
# Reload Caddyfile without restarting container
docker exec caddy caddy reload --config /etc/caddy/Caddyfile

# Or via Portainer exec
```

## Adding Services to Caddy

When deploying new services via Portainer, update the Caddyfile and reload:

1. Edit the `Caddyfile` on the host (or manage it in a Git repo)
2. Via Portainer: **Containers → caddy → Console**
3. Run: `caddy reload --config /etc/caddy/Caddyfile`

## Caddyfile for Multiple Environments

```caddyfile
# Use environment variable for root domain
{
    email {$ACME_EMAIL}
}

{$APP_DOMAIN} {
    reverse_proxy {$APP_BACKEND}
}
```

In the Portainer stack environment variables:

```text
ACME_EMAIL = admin@yourdomain.com
APP_DOMAIN = app.yourdomain.com
APP_BACKEND = myapp:8080
```

## Verifying HTTPS

```bash
# Test certificate
echo | openssl s_client -servername portainer.yourdomain.com \
  -connect portainer.yourdomain.com:443 2>/dev/null | \
  openssl x509 -noout -issuer -dates

# Test HTTP to HTTPS redirect
curl -I http://portainer.yourdomain.com
# Expected: 308 Permanent Redirect → https://
```

## Conclusion

Caddy via Portainer is the simplest reverse proxy configuration available. The Caddyfile syntax is human-readable, automatic HTTPS requires no configuration, and the API allows reloading without restarts. Compared to Traefik, Caddy requires an explicit Caddyfile rather than Docker labels, giving you a single source of truth for routing configuration.
