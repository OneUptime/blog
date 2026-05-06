# How to Set Up Caddy as a Reverse Proxy with Automatic HTTPS for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Caddy, Reverse Proxy, HTTPS, IPv4, TLS, Caddyfile

Description: Configure Caddy v2 as a reverse proxy for IPv4 backend services with automatic TLS certificate provisioning, load balancing, and header manipulation.

## Introduction

Caddy automatically provisions and renews TLS certificates from Let's Encrypt or ZeroSSL. Its Caddyfile syntax is concise - a simple reverse proxy with automatic HTTPS is often just 3 lines. Caddy is ideal for small to medium deployments where certificate management complexity is a concern.

## Installing Caddy

```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
sudo chmod o+r /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update
sudo apt-get install -y caddy
```

## Basic Reverse Proxy with Auto HTTPS

```caddyfile
# /etc/caddy/Caddyfile

app.example.com {
    reverse_proxy 10.0.1.10:8080
}
```

Caddy automatically:
1. Obtains a TLS certificate for `app.example.com`
2. Redirects HTTP to HTTPS
3. Proxies HTTPS traffic to `10.0.1.10:8080`

## Multiple Backends (Load Balancing)

```caddyfile
app.example.com {
    reverse_proxy 10.0.1.10:8080 10.0.1.11:8080 10.0.1.12:8080 {
        lb_policy round_robin
        health_uri /health
        health_interval 10s
    }
}
```

## Path-Based Routing

```caddyfile
example.com {
    # Route /api/* to API backend
    handle /api/* {
        reverse_proxy 10.0.2.10:8080 10.0.2.11:8080
    }

    # Route everything else to web frontend
    handle {
        reverse_proxy 10.0.1.10:80
    }
}
```

## Header Manipulation

```caddyfile
app.example.com {
    reverse_proxy 10.0.1.10:8080 {
        # Caddy sets X-Forwarded-For, X-Forwarded-Proto, and X-Forwarded-Host automatically.
        header_up X-Real-IP {remote_host}
    }

    header {
        # Remove server header from responses
        -Server
        # Add security headers
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
    }
}
```

## Binding to a Specific IPv4 Address

```caddyfile
# Bind to a specific IP address

:80 {
    bind 10.0.1.5
    redir https://app.example.com{uri}
}

app.example.com {
    bind 10.0.1.5
    reverse_proxy localhost:8080
}
```

## Using Caddy's Internal CA

For internal/development use:

```caddyfile
app.internal {
    tls internal  # Use Caddy's internal CA
    reverse_proxy 10.0.1.10:8080
}
```

Caddy creates a local CA for internal HTTPS and will try to install its root certificate into the local trust store. If that does not succeed automatically, run `caddy trust`.

## Basic Auth

```caddyfile
api.example.com {
    # Basic authentication
    basic_auth /admin/* {
        admin $2a$14$Zkx19XLiW6VYouLHR5NmfOFU0z2GTNmpkT/5qqR7hx4IjWJPDhjvG   # example bcrypt hash
    }

    reverse_proxy 10.0.2.10:8080
}
```

Generate password hash:

```bash
caddy hash-password --plaintext "mypassword"
```

## Testing Configuration

```bash
# Validate Caddyfile syntax
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

# Reload without downtime
sudo caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile

# Or via systemd
sudo systemctl reload caddy
```

## Using the Caddy API

```bash
# Load a config via API (JSON format)
curl localhost:2019/load \
  -H "Content-Type: application/json" \
  -d @caddy-config.json

# Get current config
curl localhost:2019/config/
```

## Log Access Requests

```caddyfile
app.example.com {
    log {
        output file /var/log/caddy/access.log
        format json
    }
    reverse_proxy 10.0.1.10:8080
}
```

## Conclusion

Caddy's `reverse_proxy` directive handles automatic TLS, HTTP→HTTPS redirect, and proxying in a single Caddyfile block. Add multiple backend IPs with `lb_policy round_robin` for load balancing. Use `health_uri` and `health_interval` for backend health checking. Run `caddy validate` before reloading to catch configuration errors.
