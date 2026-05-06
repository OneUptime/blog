# How to Configure Caddy HTTP/3 with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Caddy, HTTP/3, QUIC, IPv6, Web Server

Description: Configure Caddy web server to serve HTTP/3 over QUIC with IPv6 support, leveraging Caddy's automatic HTTPS and built-in QUIC implementation.

## Why Caddy for HTTP/3?

Caddy has supported HTTP/3 and QUIC natively since version 2.x, making it one of the easiest ways to serve HTTP/3 without compiling from source. It also handles TLS certificates automatically via public ACME CAs such as Let's Encrypt.

## Installation

```bash
# Install Caddy on Ubuntu/Debian

sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
sudo chmod o+r /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update
sudo apt-get install caddy

# Verify version
caddy version
```

## Basic Caddyfile for HTTP/3 with IPv6

Caddy enables HTTP/3 by default when serving HTTPS. By default it binds to all interfaces; if you want to make the listener addresses explicit, you can:

```caddyfile
# /etc/caddy/Caddyfile

# Bind to both IPv4 and IPv6
{
    # Global options
    http_port 80
    https_port 443

    # Explicitly bind to both IPv4 and IPv6
    default_bind :: 0.0.0.0
}

example.com {
    # Caddy automatically enables HTTP/3 with HTTPS
    # Just serve your content
    root * /var/www/html
    file_server

    # Optional: Explicitly set the Alt-Svc header
    header Alt-Svc "h3=\":443\"; ma=86400"

    # Enable access logging
    log {
        output file /var/log/caddy/access.log
        format json
    }
}
```

## IPv6-Only Binding

To serve exclusively on IPv6:

```caddyfile
# /etc/caddy/Caddyfile

# Listen only on IPv6
:443 {
    bind ::

    tls /etc/ssl/certs/example.com.crt /etc/ssl/private/example.com.key

    root * /var/www/html
    file_server

    header Alt-Svc "h3=\":443\"; ma=86400"
}
```

## Reverse Proxy with HTTP/3

Caddy is commonly used as a reverse proxy. Configure it to accept HTTP/3 from clients while proxying to backends:

```caddyfile
# /etc/caddy/Caddyfile

{
    default_bind :: 0.0.0.0
}

api.example.com {
    # Accept HTTP/3 from clients, proxy to an h2c backend over IPv6
    reverse_proxy {
        to h2c://[::1]:8080
    }

    # HTTP/3 is automatically served
    header Alt-Svc "h3=\":443\"; ma=86400"
}
```

## Checking HTTP/3 Status

```bash
# Test HTTP/3 over IPv6 with curl
curl -6 --http3-only https://example.com -v 2>&1 | head -20

# Check that Caddy is listening on UDP 443 for IPv6
sudo ss -tulnp | grep caddy

# Expected output includes:
# udp UNCONN [::]:443 caddy (for QUIC)
# tcp LISTEN  [::]:443 caddy (for TLS/HTTP2 fallback)

# Inspect the configured HTTP servers through the admin API
curl http://localhost:2019/config/apps/http/servers
```

## Firewall Configuration

```bash
# Allow UDP 443 for HTTP/3 QUIC on IPv6
sudo ufw allow 443/udp

# With ip6tables
sudo ip6tables -A INPUT -p udp --dport 443 -m comment --comment "HTTP/3 QUIC" -j ACCEPT

# Verify
sudo ip6tables -L INPUT -v -n | grep 443
```

## JSON Config for Caddy (Alternative to Caddyfile)

```json
{
  "apps": {
    "http": {
      "servers": {
        "myserver": {
          "listen": ["[::]:443", "0.0.0.0:443"],
          "protocols": ["h1", "h2", "h3"],
          "routes": [
            {
              "match": [
                {
                  "host": ["example.com"]
                }
              ],
              "handle": [
                {
                  "handler": "file_server",
                  "root": "/var/www/html"
                }
              ],
              "terminal": true
            }
          ]
        }
      }
    }
  }
}
```

## Monitoring

Use [OneUptime](https://oneuptime.com) to monitor your Caddy server's HTTP/3 endpoints over IPv6. Set up checks that verify both the TCP (HTTP/2) and UDP (HTTP/3) ports are available, and alert on any performance degradation.

## Conclusion

Caddy makes HTTP/3 over IPv6 almost automatic. With an HTTPS site address and, if needed, an IPv6 bind such as `bind ::`, Caddy serves HTTP/3 automatically and can manage TLS certificates for qualifying hostnames. Open UDP port 443 in your firewall and test with `curl --http3-only` to verify the setup.
