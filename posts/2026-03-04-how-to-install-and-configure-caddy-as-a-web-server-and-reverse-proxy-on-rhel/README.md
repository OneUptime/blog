# How to Install and Configure Caddy as a Web Server and Reverse Proxy on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Caddy, Web Server, Reverse Proxy, HTTPS

Description: Learn how to install and configure Caddy on RHEL as a web server and reverse proxy with automatic HTTPS.

---

Caddy is a modern web server that provides automatic HTTPS by default. It has a simple configuration syntax and handles TLS certificate provisioning and renewal automatically.

## Installing Caddy

```bash
# Add the Caddy repository
sudo dnf install -y dnf-plugins-core
sudo dnf copr enable @caddy/caddy -y

# Install Caddy
sudo dnf install -y caddy
```

## Serving Static Files

```bash
# Create a web root directory
sudo mkdir -p /var/www/mysite
echo "<h1>Hello from Caddy</h1>" | sudo tee /var/www/mysite/index.html
```

Edit the Caddyfile:

```
# Save as /etc/caddy/Caddyfile

# Serve static files
mysite.example.com {
    root * /var/www/mysite
    file_server
}
```

## Configuring as a Reverse Proxy

```
# /etc/caddy/Caddyfile

# Reverse proxy to a backend application
app.example.com {
    reverse_proxy localhost:3000
}

# Reverse proxy with load balancing
api.example.com {
    reverse_proxy localhost:8001 localhost:8002 localhost:8003
}
```

## Advanced Reverse Proxy Options

```
# /etc/caddy/Caddyfile

app.example.com {
    # Add custom headers
    header {
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        -Server
    }

    # Reverse proxy with health checks
    reverse_proxy localhost:3000 {
        health_uri /health
        health_interval 10s
        health_timeout 5s
    }

    # Access logging
    log {
        output file /var/log/caddy/access.log
        format json
    }
}
```

## Managing the Service

```bash
# Start and enable Caddy
sudo systemctl enable --now caddy

# Reload configuration without downtime
sudo systemctl reload caddy

# Check status
sudo systemctl status caddy

# Validate the Caddyfile
caddy validate --config /etc/caddy/Caddyfile
```

## Firewall Configuration

```bash
sudo firewall-cmd --add-service=http --permanent
sudo firewall-cmd --add-service=https --permanent
sudo firewall-cmd --reload
```

Caddy automatically provisions TLS certificates from Let's Encrypt for all configured domains. No additional TLS configuration is needed. Just point your DNS records to the server and Caddy handles the rest.
