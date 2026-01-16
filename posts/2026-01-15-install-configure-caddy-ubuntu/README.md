# How to Install and Configure Caddy on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Caddy, Web Server, Reverse Proxy, HTTPS, Tutorial

Description: Complete guide to installing Caddy web server on Ubuntu with automatic HTTPS and easy configuration.

---

Caddy is a modern, open-source web server with automatic HTTPS. It simplifies web server configuration with its intuitive Caddyfile syntax and handles SSL certificate management automatically via Let's Encrypt. This guide covers Caddy installation and configuration on Ubuntu.

## Features

- Automatic HTTPS (Let's Encrypt)
- HTTP/2 and HTTP/3 support
- Reverse proxy
- Load balancing
- Simple configuration syntax
- Zero-downtime config reloads

## Prerequisites

- Ubuntu 20.04 or later
- Domain name pointed to server
- Ports 80 and 443 available
- Root or sudo access

## Installation

### Using Official Repository

```bash
# Install dependencies
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl

# Add Caddy GPG key
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg

# Add repository
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list

# Install Caddy
sudo apt update
sudo apt install caddy -y

# Verify installation
caddy version
```

### Using Binary

```bash
# Download latest binary
wget "https://github.com/caddyserver/caddy/releases/download/v2.7.6/caddy_2.7.6_linux_amd64.tar.gz"

# Extract
tar -xzf caddy_*.tar.gz

# Move to path
sudo mv caddy /usr/bin/

# Set capabilities
sudo setcap 'cap_net_bind_service=+ep' /usr/bin/caddy
```

## Basic Configuration

### Caddyfile Location

```bash
# Default location
/etc/caddy/Caddyfile
```

### Simple Static Site

```bash
sudo nano /etc/caddy/Caddyfile
```

```caddyfile
example.com {
    root * /var/www/html
    file_server
}
```

### Start Caddy

```bash
# Reload configuration
sudo systemctl reload caddy

# Check status
sudo systemctl status caddy
```

## Automatic HTTPS

Caddy automatically obtains and renews SSL certificates:

```caddyfile
# Just specify your domain - HTTPS is automatic
example.com {
    root * /var/www/example
    file_server
}

# Multiple domains
www.example.com, example.com {
    root * /var/www/example
    file_server
}
```

## Reverse Proxy

### Simple Reverse Proxy

```caddyfile
example.com {
    reverse_proxy localhost:3000
}
```

### Multiple Backends (Load Balancing)

```caddyfile
example.com {
    reverse_proxy localhost:3000 localhost:3001 localhost:3002 {
        lb_policy round_robin
        health_uri /health
        health_interval 10s
    }
}
```

### Path-Based Routing

```caddyfile
example.com {
    reverse_proxy /api/* localhost:8080
    reverse_proxy /app/* localhost:3000

    root * /var/www/html
    file_server
}
```

### WebSocket Support

```caddyfile
example.com {
    reverse_proxy /ws localhost:8080 {
        transport http {
            versions h2c 2
        }
    }
    reverse_proxy localhost:3000
}
```

## Configuration Examples

### PHP Application (Laravel/WordPress)

```caddyfile
example.com {
    root * /var/www/html/public

    php_fastcgi unix//run/php/php8.1-fpm.sock
    file_server

    encode gzip

    # Laravel specific
    @notStatic {
        not file
        path_regexp ^/
    }
    rewrite @notStatic /index.php

    # Block hidden files
    @hidden {
        path */.*
    }
    respond @hidden 404
}
```

### Node.js Application

```caddyfile
example.com {
    reverse_proxy localhost:3000

    encode gzip

    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
    }
}
```

### Static Site with SPA Support

```caddyfile
example.com {
    root * /var/www/app/dist

    encode gzip

    # SPA fallback
    try_files {path} /index.html

    file_server

    header {
        # Cache static assets
        Cache-Control "public, max-age=31536000"
    }
}
```

### Multiple Sites

```caddyfile
app.example.com {
    reverse_proxy localhost:3000
}

api.example.com {
    reverse_proxy localhost:8080
}

static.example.com {
    root * /var/www/static
    file_server browse
}
```

## SSL/TLS Configuration

### Custom Certificate

```caddyfile
example.com {
    tls /etc/ssl/certs/example.crt /etc/ssl/private/example.key

    reverse_proxy localhost:3000
}
```

### Self-Signed for Development

```caddyfile
localhost {
    tls internal

    reverse_proxy localhost:3000
}
```

### Staging Certificates

```caddyfile
example.com {
    tls {
        ca https://acme-staging-v02.api.letsencrypt.org/directory
    }

    reverse_proxy localhost:3000
}
```

## Headers and Security

### Security Headers

```caddyfile
example.com {
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        Content-Security-Policy "default-src 'self'"
        -Server  # Remove Server header
    }

    reverse_proxy localhost:3000
}
```

### CORS Headers

```caddyfile
api.example.com {
    header Access-Control-Allow-Origin "*"
    header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    header Access-Control-Allow-Headers "Content-Type, Authorization"

    @options {
        method OPTIONS
    }
    respond @options 204

    reverse_proxy localhost:8080
}
```

## Authentication

### Basic Auth

```caddyfile
example.com {
    basicauth /* {
        admin $2a$14$hash...  # Use: caddy hash-password
    }

    reverse_proxy localhost:3000
}
```

Generate password hash:

```bash
caddy hash-password
# Enter password when prompted
```

### Forward Auth (with Authelia)

```caddyfile
example.com {
    forward_auth localhost:9091 {
        uri /api/verify?rd=https://auth.example.com
        copy_headers Remote-User Remote-Groups Remote-Name Remote-Email
    }

    reverse_proxy localhost:3000
}
```

## Logging

### Access Logs

```caddyfile
example.com {
    log {
        output file /var/log/caddy/access.log
        format json
    }

    reverse_proxy localhost:3000
}
```

### Custom Log Format

```caddyfile
example.com {
    log {
        output file /var/log/caddy/access.log {
            roll_size 100mb
            roll_keep 5
            roll_keep_for 720h
        }
        format console
    }

    reverse_proxy localhost:3000
}
```

## Rate Limiting

```caddyfile
example.com {
    rate_limit {
        zone dynamic_zone {
            key {remote_host}
            events 100
            window 1m
        }
    }

    reverse_proxy localhost:3000
}
```

## Caching

### File Server Caching

```caddyfile
example.com {
    root * /var/www/html

    @static {
        path *.css *.js *.png *.jpg *.gif *.ico *.svg *.woff *.woff2
    }
    header @static Cache-Control "public, max-age=31536000"

    file_server
}
```

## Health Checks

```caddyfile
example.com {
    reverse_proxy localhost:3000 localhost:3001 {
        health_uri /health
        health_port 3000
        health_interval 10s
        health_timeout 5s
        health_status 200
    }
}
```

## Global Options

```caddyfile
{
    # Email for Let's Encrypt
    email admin@example.com

    # Custom ACME server
    acme_ca https://acme.zerossl.com/v2/DV90

    # Debug mode
    debug

    # Admin API
    admin :2019

    # Default SNI
    default_sni example.com
}

example.com {
    reverse_proxy localhost:3000
}
```

## CLI Commands

```bash
# Validate configuration
caddy validate --config /etc/caddy/Caddyfile

# Format Caddyfile
caddy fmt --overwrite /etc/caddy/Caddyfile

# Reload configuration
sudo systemctl reload caddy

# Run in foreground
caddy run --config /etc/caddy/Caddyfile

# Adapt JSON from Caddyfile
caddy adapt --config /etc/caddy/Caddyfile

# List modules
caddy list-modules

# Hash password
caddy hash-password
```

## Environment Variables

```caddyfile
example.com {
    root * {$SITE_ROOT:/var/www/html}
    reverse_proxy {$BACKEND_HOST:localhost}:{$BACKEND_PORT:3000}
}
```

```bash
# Set environment
export SITE_ROOT=/var/www/myapp
export BACKEND_HOST=app
export BACKEND_PORT=8080
```

## Docker Deployment

```yaml
# docker-compose.yml
version: '3'
services:
  caddy:
    image: caddy:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    restart: unless-stopped

volumes:
  caddy_data:
  caddy_config:
```

## Troubleshooting

### Check Logs

```bash
# System logs
sudo journalctl -u caddy -f

# Access logs (if configured)
sudo tail -f /var/log/caddy/access.log
```

### Test Configuration

```bash
# Validate Caddyfile
caddy validate --config /etc/caddy/Caddyfile

# Check certificate status
caddy trust

# Debug mode
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
```

### Common Issues

```bash
# Port 80/443 in use
sudo ss -tlnp | grep -E ':80|:443'

# Permission denied
sudo setcap 'cap_net_bind_service=+ep' /usr/bin/caddy

# Certificate issues
# Check DNS is properly configured
dig example.com

# Rate limited by Let's Encrypt
# Use staging CA for testing
```

---

Caddy simplifies web server configuration with automatic HTTPS and intuitive syntax. It's perfect for modern web applications and microservices. For monitoring your Caddy server and certificate expiration, consider using OneUptime for comprehensive uptime tracking.
