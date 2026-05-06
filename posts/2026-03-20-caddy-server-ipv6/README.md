# How to Configure Caddy Server for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Caddy, IPv6, Web Server, Reverse Proxy, Automatic HTTPS, Load Balancing

Description: A guide to configuring Caddy web server and reverse proxy with IPv6 support, including listening on IPv6 addresses and proxying to IPv6 backends.

Caddy automatically handles IPv6 in most configurations. By default, Caddy sites bind on all network interfaces unless configured otherwise. This guide covers explicitly configuring IPv6 and using IPv6 backends.

## Default Behavior

Caddy sites bind on all interfaces by default:

```bash
# Caddy binds sites on all network interfaces by default

# Verify with:
ss -ltnp | grep caddy
# Look for listeners on :80 and :443; on dual-stack Linux hosts
# they often appear as tcp6 listeners
```

## Caddyfile: Listen on IPv6

```caddyfile
# Listen on all interfaces (default behavior)
example.com {
    reverse_proxy localhost:8080
}

# Explicitly listen on IPv6 only
:80 {
    bind tcp6/[::]
    respond "IPv6 only server" 200
}

# Listen on specific IPv6 address
ipv6.example.com {
    bind tcp6/[2001:db8::proxy]
    reverse_proxy [2001:db8::backend]:8080
}

# Listen on multiple addresses including IPv6
:8080 {
    bind 192.0.2.10 [2001:db8::proxy]
    respond "Dual-stack server" 200
}
```

## Reverse Proxy to IPv6 Backends

```caddyfile
# Proxy to a single IPv6 backend
example.com {
    reverse_proxy [2001:db8::backend]:8080
}

# Load balance across IPv6 backends
api.example.com {
    reverse_proxy {
        to [2001:db8::server1]:8080
        to [2001:db8::server2]:8080
        to [2001:db8::server3]:8080

        lb_policy round_robin
        health_uri /health
        health_interval 10s
    }
}

# Mix IPv4 and IPv6 backends
mixed.example.com {
    reverse_proxy {
        to 10.0.0.1:8080
        to [2001:db8::server]:8080
        lb_policy least_conn
    }
}
```

## JSON Configuration for IPv6

```json
{
  "apps": {
    "http": {
      "servers": {
        "main": {
          "listen": [
            "tcp6/[::]:443"
          ],
          "routes": [
            {
              "match": [
                {"host": ["example.com"]}
              ],
              "handle": [
                {
                  "handler": "reverse_proxy",
                  "upstreams": [
                    {"dial": "[2001:db8::backend1]:8080"},
                    {"dial": "[2001:db8::backend2]:8080"}
                  ],
                  "health_checks": {
                    "active": {
                      "uri": "/health",
                      "interval": "10s",
                      "timeout": "5s"
                    }
                  }
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

## Automatic HTTPS with IPv6

Caddy's automatic HTTPS works with IPv6:

```caddyfile
# Caddy automatically obtains TLS certificates
# DNS needs an AAAA record for IPv6; add an A record too if you also serve IPv4
example.com {
    # Caddy obtains the certificate and serves on the configured listener(s)
    reverse_proxy [fd00:internal::backend]:3000
}
```

## IPv6 Real IP Headers

```caddyfile
api.example.com {
    reverse_proxy [2001:db8::backend]:8080 {
        # Caddy already sets X-Forwarded-For, X-Forwarded-Proto, and X-Forwarded-Host
        header_up X-Real-IP {remote_host}
    }
}
```

## Verify IPv6 Connectivity

```bash
# Test with curl over IPv6
curl -6 https://example.com/

# If access logging is enabled, watch for IPv6 client connections
journalctl -u caddy -f

# Caddy access logs include IPv6 addresses in request.remote_ip/client_ip
# {"level":"info","ts":"2026-03-20T...","logger":"http.log.access","msg":"handled request",
#   "request":{"remote_ip":"2001:db8::client","client_ip":"2001:db8::client",...}}
```

## IPv6-Only Caddy Server

```caddyfile
# For an IPv6-only deployment
http://example.com {
    bind tcp6/[::]
    redir https://{host}{uri}
}

example.com {
    bind tcp6/[::]
    tls /etc/caddy/cert.pem /etc/caddy/key.pem
    reverse_proxy [2001:db8::backend]:8080
}
```

Caddy's zero-config approach to IPv6 - binding on all interfaces by default and supporting IPv6 backend addresses with bracket notation - makes it one of the easiest web servers to use in dual-stack and IPv6-only environments.
