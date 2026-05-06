# How to Configure Caddy HTTP/3 with IPv6 - Configure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Caddy, HTTP/3, QUIC, IPv6, Web Server, TLS, Automatic HTTPS

Description: Configure Caddy to serve HTTP/3 over QUIC with IPv6 support, taking advantage of Caddy's automatic HTTPS and native HTTP/3 implementation for low-latency connections.

---

Caddy enables HTTP/3 by default when TLS is configured, and it supports IPv6 natively. This combination makes Caddy one of the simplest ways to serve HTTP/3 over IPv6 with automatic certificate management.

## HTTP/3 Status in Caddy

Caddy supports HTTP/3 in current v2 releases, and it is enabled by default for HTTPS sites:

```bash
# Check Caddy version

caddy version

# HTTP/3 is enabled by default when HTTPS is configured
```

## Basic Caddyfile with HTTP/3 and IPv6

```caddy
# /etc/caddy/Caddyfile

{
    # Global options
    email admin@example.com
    # HTTP/3 is enabled by default; this makes it explicit
    servers {
        protocols h1 h2 h3
    }
}

# Caddy listens on the HTTPS port for this site; use bind/default_bind to constrain interfaces
yourdomain.com {
    # Caddy automatically manages publicly trusted certificates for qualifying domain names
    # HTTP/3 is advertised via Alt-Svc header
    root * /var/www/html
    file_server

    # Enable response compression
    encode gzip zstd

    # Log request protocol
    log {
        output file /var/log/caddy/access.log
        format json
    }
}
```

## JSON Config with HTTP/3 and IPv6

For more granular control, use Caddy's JSON configuration:

```json
{
  "apps": {
    "http": {
      "servers": {
        "main": {
          "listen": [":443"],
          "protocols": ["h1", "h2", "h3"],
          "routes": [
            {
              "match": [{"host": ["yourdomain.com"]}],
              "handle": [
                {
                  "handler": "file_server",
                  "root": "/var/www/html"
                }
              ]
            }
          ]
        }
      }
    }
  }
}
```

## Testing HTTP/3 with Caddy over IPv6

```bash
# Check Alt-Svc header (indicates HTTP/3 support)
curl -6 -I https://yourdomain.com/ | grep -i "^alt-svc:"

# Test HTTP/3 explicitly (requires a curl build with HTTP/3 support)
curl --http3-only -6 -o /dev/null -s -w "HTTP/%{http_version}\n" https://yourdomain.com/

# Check QUIC UDP traffic
sudo tcpdump -i eth0 ip6 and udp port 443

# Verify IPv6 is being used
curl -6 -s -o /dev/null -w "%{remote_ip}\n" https://yourdomain.com/
```

## Caddy with Reverse Proxy and HTTP/3

```caddy
# /etc/caddy/Caddyfile

yourdomain.com {
    # Reverse proxy to backend service
    reverse_proxy /api/* {
        # Cleartext HTTP/2 to backend (h2c)
        to h2c://[2001:db8::10]:8080
    }

    # Static files
    root * /var/www/html
    file_server

    # Caddy handles HTTP/3 negotiation with clients automatically
}
```

## Exposing IPv6-Only Service via Caddy

```caddy
# /etc/caddy/Caddyfile

{
    # Bind site listeners to a specific IPv6 address
    default_bind [2001:db8::1]
}

yourdomain.com {
    # HTTP/3 on the IPv6-bound site listener
    root * /var/www/html
    file_server
}
```

This binds the site listener to the IPv6 address above. Automatic HTTPS can still create a separate port 80 listener for redirects or ACME HTTP challenges, so account for that if you need every listener constrained to IPv6.

## Monitoring Caddy HTTP/3 Performance

```bash
# Check Caddy metrics (Prometheus-compatible)
# Enable metrics collection in global options:
# {
#   metrics
# }

curl -s http://localhost:2019/metrics | grep "^caddy_http_"

# View access logs for protocol distribution
cat /var/log/caddy/access.log | \
  python3 -c "
import sys, json
h3=h2=h1=0
for line in sys.stdin:
    d = json.loads(line)
    proto = d.get('request', {}).get('proto', '')
    if 'HTTP/3' in proto: h3 += 1
    elif 'HTTP/2' in proto: h2 += 1
    else: h1 += 1
print(f'HTTP/3: {h3}, HTTP/2: {h2}, HTTP/1.x: {h1}')
"
```

Caddy's built-in HTTP/3 support combined with automatic HTTPS and native IPv6 binding makes it the most operationally simple way to deploy an HTTP/3-capable web server on IPv6 infrastructure.
