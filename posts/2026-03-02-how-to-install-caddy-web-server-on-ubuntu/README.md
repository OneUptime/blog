# How to Install Caddy Web Server on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Caddy, Web Server, HTTPS, Networking

Description: Install and configure the Caddy web server on Ubuntu, including automatic HTTPS, static file serving, and running Caddy as a systemd service.

---

Caddy is a modern web server written in Go that provisions TLS certificates automatically through Let's Encrypt or ZeroSSL. Unlike Nginx or Apache, Caddy requires no separate certbot setup - just point it at a domain and it handles the rest. The configuration syntax is clean and minimal, which makes it a good choice for developers who want a functional web server without spending hours on configuration.

This guide covers installing Caddy on Ubuntu from the official repository, running it as a systemd service, serving static files, and setting up a reverse proxy.

## Installing Caddy

Caddy maintains an official APT repository for Debian-based systems. Using the official repository ensures you get the latest stable version with automatic updates.

```bash
# Install required dependencies
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl

# Add the Caddy GPG key
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg

# Add the Caddy APT repository
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list

# Update package index and install Caddy
sudo apt update
sudo apt install caddy -y
```

Verify the installation:

```bash
caddy version
# Example output: v2.7.6 h1:...

# Check if Caddy service is running
sudo systemctl status caddy
```

Caddy starts automatically after installation and serves a welcome page on port 80. You can confirm by running `curl http://localhost`.

## Understanding the Default Configuration

The package installs a default Caddyfile at `/etc/caddy/Caddyfile`:

```bash
cat /etc/caddy/Caddyfile
```

The default file just serves a placeholder page. The main configuration file location and the Caddy binary are at:

- Caddyfile: `/etc/caddy/Caddyfile`
- Binary: `/usr/bin/caddy`
- Systemd service: `/lib/systemd/system/caddy.service`
- Default webroot: `/var/www/html`
- Logs: `/var/log/caddy/`

## Serving Static Files

Replace the default Caddyfile with a simple static file server:

```bash
sudo nano /etc/caddy/Caddyfile
```

```caddyfile
# Serve static files from /var/www/html on port 80
# Change "localhost" to your domain for automatic HTTPS
localhost {
    root * /var/www/html
    file_server
    encode gzip
}
```

Create some test content:

```bash
sudo mkdir -p /var/www/html
echo "<h1>Hello from Caddy on Ubuntu</h1>" | sudo tee /var/www/html/index.html
```

Reload Caddy to apply the configuration:

```bash
sudo systemctl reload caddy
# Or use the Caddy CLI
sudo caddy reload --config /etc/caddy/Caddyfile
```

Test it:

```bash
curl http://localhost
# Should output: <h1>Hello from Caddy on Ubuntu</h1>
```

## Enabling Automatic HTTPS

For a real domain, Caddy obtains and renews TLS certificates automatically. Replace `localhost` with your domain:

```caddyfile
# Production configuration with automatic HTTPS
example.com {
    root * /var/www/html
    file_server
    encode gzip

    # Caddy automatically provisions a certificate from Let's Encrypt
    # No additional configuration needed for basic HTTPS
}
```

Requirements for automatic HTTPS:
- The domain must point to your server's public IP (DNS A record)
- Ports 80 and 443 must be open and reachable from the internet
- The server must be able to reach Let's Encrypt's ACME servers

Caddy handles HTTP-to-HTTPS redirects automatically.

## Setting Up a Reverse Proxy

A common use case is proxying requests to an application running locally:

```caddyfile
# Reverse proxy to a local application
example.com {
    # Proxy all requests to a local app on port 3000
    reverse_proxy localhost:3000

    # Add headers
    header {
        # Security headers
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}

# API subdomain with rate limiting
api.example.com {
    reverse_proxy localhost:4000 {
        # Health check for the backend
        health_uri /health
        health_interval 10s
    }
}
```

## Hosting Multiple Sites

Caddy handles virtual hosting cleanly. Each site block is independent:

```caddyfile
# First site
site1.example.com {
    root * /var/www/site1
    file_server
}

# Second site with PHP (via PHP-FPM)
site2.example.com {
    root * /var/www/site2
    php_fastcgi unix//run/php/php8.1-fpm.sock
    file_server
}

# Wildcard subdomain
*.example.com {
    # tls with wildcard requires DNS challenge
    tls {
        dns cloudflare {env.CF_API_TOKEN}
    }
    root * /var/www/{labels.1}
    file_server
}
```

## Managing Caddy as a Systemd Service

```bash
# Start, stop, and restart Caddy
sudo systemctl start caddy
sudo systemctl stop caddy
sudo systemctl restart caddy

# Reload configuration without downtime
sudo systemctl reload caddy

# Enable Caddy to start at boot
sudo systemctl enable caddy

# Check service status and logs
sudo systemctl status caddy
sudo journalctl -u caddy -f

# View Caddy's access and error logs
sudo tail -f /var/log/caddy/access.log
```

## Validating the Caddyfile

Before reloading, validate the configuration to catch syntax errors:

```bash
# Check the Caddyfile for errors
caddy validate --config /etc/caddy/Caddyfile

# Format the Caddyfile (Caddy has an opinionated formatter)
caddy fmt --overwrite /etc/caddy/Caddyfile
```

## Configuring Firewall

Open the necessary ports in UFW:

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Or use the Caddy app profile if available
sudo ufw allow 'WWW Full'

sudo ufw status
```

## Setting File Permissions

The Caddy service runs as the `caddy` user by default. Make sure web files are readable:

```bash
# Set ownership and permissions for web files
sudo chown -R caddy:caddy /var/www/html
sudo chmod -R 755 /var/www/html

# Confirm Caddy user exists
id caddy
```

## Using the Admin API

Caddy exposes a REST API for dynamic configuration changes without reloading the process:

```bash
# Check the admin endpoint (runs on localhost:2019 by default)
curl localhost:2019/config/

# Load a new configuration via the API
curl -X POST localhost:2019/load \
  -H "Content-Type: text/caddyfile" \
  --data-binary @/etc/caddy/Caddyfile

# Get current configuration
curl localhost:2019/config/ | python3 -m json.tool
```

To expose the admin API on a specific address (be careful with security):

```caddyfile
{
    # Global options block
    admin 0.0.0.0:2019
}

example.com {
    root * /var/www/html
    file_server
}
```

## Customizing TLS Settings

Override default TLS behavior when needed:

```caddyfile
example.com {
    root * /var/www/html
    file_server

    tls {
        # Use specific protocols (TLS 1.2 minimum)
        protocols tls1.2 tls1.3

        # Use a specific email for Let's Encrypt account
        # Usually set globally
    }
}

# Global TLS configuration
{
    email admin@example.com

    # Use staging Let's Encrypt for testing
    # acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
}
```

Caddy's automatic HTTPS and straightforward configuration make it a practical choice for hosting web applications on Ubuntu without the complexity of managing certificate renewal separately.
