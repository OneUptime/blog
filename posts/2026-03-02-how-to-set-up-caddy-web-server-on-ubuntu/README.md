# How to Set Up Caddy Web Server on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Caddy, Web Server, SSL, Reverse Proxy

Description: A complete guide to installing and configuring Caddy web server on Ubuntu, including automatic HTTPS, reverse proxying, file serving, and production deployment practices.

---

Caddy is a modern web server written in Go that handles TLS certificate provisioning and renewal automatically. Where Nginx or Apache require separate certbot configuration and cron jobs for SSL, Caddy talks to Let's Encrypt on its own. This makes it compelling for teams who want HTTPS without the maintenance overhead. This guide covers installing Caddy on Ubuntu and configuring it for common production scenarios.

## Installing Caddy

The Caddy project maintains an official APT repository for Ubuntu:

```bash
# Install required dependencies
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl

# Add the Caddy signing key
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg

# Add the Caddy repository
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list

# Update and install
sudo apt update
sudo apt install caddy

# Verify installation
caddy version

# Check service status
sudo systemctl status caddy
```

Caddy installs as a systemd service and starts automatically. The default configuration serves a placeholder page on port 80.

## File Locations

Understanding where Caddy stores files helps with management:

```bash
# Main configuration file
/etc/caddy/Caddyfile

# Site root default (where you put your files)
/var/www/html/

# Caddy data directory (certificates, ACME account data)
/var/lib/caddy/.local/share/caddy/

# Systemd service file
/lib/systemd/system/caddy.service

# Log files
/var/log/caddy/
# (Caddy logs to stdout by default, systemd captures this)
sudo journalctl -u caddy -f
```

## Basic Static File Server

The Caddyfile syntax is far simpler than Nginx configuration. Here is a basic static file server with automatic HTTPS:

```bash
sudo nano /etc/caddy/Caddyfile
```

```caddyfile
# Caddy automatically gets a certificate for this domain from Let's Encrypt
example.com {
    # Serve files from this directory
    root * /var/www/html

    # Enable the file server
    file_server

    # Serve index.html for directories
    try_files {path} {path}/ /index.html
}
```

```bash
# Test the configuration
caddy validate --config /etc/caddy/Caddyfile

# Reload Caddy after changes
sudo systemctl reload caddy

# Or use the Caddy admin API to reload without restart
curl -X POST localhost:2019/load \
  -H "Content-Type: text/caddyfile" \
  --data-binary @/etc/caddy/Caddyfile
```

Caddy will automatically obtain and renew the TLS certificate. No certbot needed.

## Reverse Proxy Configuration

Caddy excels as a reverse proxy. Here is proxying to a Node.js application:

```caddyfile
# Proxy to a local application on port 3000
api.example.com {
    reverse_proxy localhost:3000
}

# Proxy with path-based routing
app.example.com {
    # API requests go to the Node.js backend
    handle /api/* {
        reverse_proxy localhost:3000
    }

    # Everything else serves the React frontend
    handle {
        root * /var/www/app/dist
        file_server
        try_files {path} /index.html
    }
}

# Proxy to multiple backends with load balancing
lb.example.com {
    reverse_proxy {
        to localhost:8001
        to localhost:8002
        to localhost:8003

        # Load balancing policy options: random, round_robin, least_conn, ip_hash
        lb_policy round_robin

        # Health checking
        health_uri /health
        health_interval 10s
        health_timeout 5s
    }
}
```

## Multiple Sites in One Caddyfile

```caddyfile
# Site 1: Blog
blog.example.com {
    root * /var/www/blog
    file_server
    encode gzip zstd
}

# Site 2: API backend
api.example.com {
    reverse_proxy localhost:8080 {
        # Add headers to upstream requests
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-Proto {scheme}

        # Timeouts
        transport http {
            dial_timeout 5s
            read_timeout 30s
        }
    }
}

# Site 3: Redirect www to non-www
www.example.com {
    redir https://example.com{uri} permanent
}

# Site 4: Local development (uses self-signed cert, not Let's Encrypt)
localhost {
    root * /var/www/dev
    file_server
}
```

## PHP with Caddy

Caddy does not have built-in PHP support - you still need PHP-FPM:

```bash
# Install PHP-FPM
sudo apt install php8.3-fpm php8.3-mysql php8.3-xml php8.3-curl php8.3-gd php8.3-mbstring

# Enable and start PHP-FPM
sudo systemctl enable php8.3-fpm
sudo systemctl start php8.3-fpm
```

```caddyfile
php.example.com {
    root * /var/www/php-app

    # Handle PHP files with FPM
    php_fastcgi unix//run/php/php8.3-fpm.sock

    # File server for static assets
    file_server

    # Encode responses
    encode gzip zstd
}

# WordPress example
wordpress.example.com {
    root * /var/www/wordpress

    php_fastcgi unix//run/php/php8.3-fpm.sock {
        # Set index.php as the index file
        index index.php
    }

    # Handle WordPress pretty permalinks
    @notFound not file
    rewrite @notFound /index.php?{query}

    file_server

    encode gzip zstd
}
```

## Security Headers and Custom Headers

```caddyfile
secure.example.com {
    root * /var/www/html
    file_server

    # Add security headers
    header {
        # HSTS - tell browsers to always use HTTPS
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"

        # Prevent clickjacking
        X-Frame-Options "SAMEORIGIN"

        # Stop MIME sniffing
        X-Content-Type-Options "nosniff"

        # XSS protection for older browsers
        X-XSS-Protection "1; mode=block"

        # Referrer policy
        Referrer-Policy "strict-origin-when-cross-origin"

        # Remove the Server header
        -Server
    }
}
```

## Rate Limiting

Caddy's rate limiting is available through a plugin. For basic protection, you can use the `limits` plugin or handle it upstream. The community `caddy-ratelimit` module can be built in:

```bash
# Install xcaddy to build custom Caddy with plugins
sudo apt install golang-go
go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest

# Build Caddy with the rate limiting module
xcaddy build --with github.com/mholt/caddy-ratelimit

# Move the binary to replace the system Caddy
sudo mv caddy /usr/bin/caddy
```

## Using the Caddy Admin API

Caddy has a built-in admin API for dynamic configuration:

```bash
# Check current config
curl http://localhost:2019/config/

# Get server status
curl http://localhost:2019/metrics

# Load a new Caddyfile
curl -X POST localhost:2019/load \
  -H "Content-Type: text/caddyfile" \
  --data-binary @/etc/caddy/Caddyfile

# Add a route dynamically (JSON API)
curl -X POST http://localhost:2019/config/apps/http/servers/srv0/routes/ \
  -H "Content-Type: application/json" \
  -d '{"handle": [{"handler": "static_response", "body": "Hello!"}]}'

# Disable the admin API if not needed (add to Caddyfile)
{
    admin off
}
```

## Logging Configuration

```caddyfile
{
    # Global options block
    email admin@example.com  # For Let's Encrypt notifications

    # Custom log format
    log {
        output file /var/log/caddy/access.log {
            roll_size 100mb
            roll_keep 5
        }
        format json
        level INFO
    }
}

example.com {
    root * /var/www/html
    file_server

    # Per-site logging
    log {
        output file /var/log/caddy/example.com.access.log
        format json
    }
}
```

## Systemd Service Management

```bash
# Standard service management
sudo systemctl start caddy
sudo systemctl stop caddy
sudo systemctl restart caddy
sudo systemctl reload caddy    # Graceful reload, no downtime

# Enable on boot
sudo systemctl enable caddy

# View logs
sudo journalctl -u caddy
sudo journalctl -u caddy -f    # Follow logs in real time
sudo journalctl -u caddy --since "1 hour ago"

# View certificate info
# Caddy stores certs in its data directory
sudo ls /var/lib/caddy/.local/share/caddy/certificates/
```

## Testing Automatic TLS

```bash
# Verify your site is up and using HTTPS
curl -I https://example.com

# Check certificate details
openssl s_client -connect example.com:443 -servername example.com < /dev/null 2>/dev/null \
  | openssl x509 -noout -dates -subject -issuer

# Test HTTP to HTTPS redirect
curl -I http://example.com
```

Caddy's automatic HTTPS is one of its biggest advantages over Nginx and Apache for teams without dedicated ops staff. Once your DNS is pointed at the server, it handles the rest.
