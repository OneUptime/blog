# How to Configure Caddy as a Load Balancer for Backend Services on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Caddy, Load Balancer, Reverse Proxy, Web Server

Description: Learn how to configure Caddy on RHEL as a load balancer with health checks, sticky sessions, and multiple balancing policies.

---

Caddy can distribute traffic across multiple backend servers with built-in health checks and various load balancing policies. It handles TLS automatically while balancing requests.

## Installing Caddy

```bash
sudo dnf install -y dnf-plugins-core
sudo dnf copr enable @caddy/caddy -y
sudo dnf install -y caddy
```

## Basic Load Balancing

```bash
# /etc/caddy/Caddyfile

app.example.com {
    reverse_proxy localhost:3001 localhost:3002 localhost:3003
}
```

By default, Caddy uses a random selection policy. To specify round-robin or other policies:

## Load Balancing Policies

```bash
# /etc/caddy/Caddyfile
app.example.com {
    reverse_proxy {
        to localhost:3001 localhost:3002 localhost:3003

        # Load balancing policy options include:
        # random, random_choose, first, round_robin, weighted_round_robin,
        # least_conn, ip_hash, client_ip_hash, uri_hash, query, header, cookie
        lb_policy round_robin
    }
}
```

## Health Checks

```bash
# /etc/caddy/Caddyfile
app.example.com {
    reverse_proxy {
        to localhost:3001 localhost:3002 localhost:3003

        lb_policy least_conn

        # Active health checks
        health_uri /health
        health_interval 10s
        health_timeout 5s
        health_status 200

        # Passive health checks (circuit breaker)
        fail_duration 30s
        max_fails 3
        unhealthy_status 500 502 503
    }
}
```

## Sticky Sessions

```bash
# /etc/caddy/Caddyfile
app.example.com {
    reverse_proxy {
        to localhost:3001 localhost:3002 localhost:3003

        # Cookie-based sticky sessions
        lb_policy cookie
    }
}
```

## Weighted Load Balancing

```bash
# /etc/caddy/Caddyfile
app.example.com {
    reverse_proxy {
        to localhost:3001 localhost:3002 localhost:3003

        # Weighted round-robin sends proportionally more requests
        # to upstreams with higher weights
        lb_policy weighted_round_robin 3 2 1
    }
}
```

## Adding Request Headers

```bash
# /etc/caddy/Caddyfile
app.example.com {
    reverse_proxy {
        to localhost:3001 localhost:3002 localhost:3003

        lb_policy round_robin
        health_uri /health
        health_interval 10s

        # Caddy sets X-Forwarded-For, X-Forwarded-Proto,
        # and X-Forwarded-Host automatically; add X-Real-IP if needed.
        header_up X-Real-IP {remote_host}
    }
}
```

## Starting Caddy

```bash
sudo systemctl enable --now caddy

# Verify the configuration
caddy validate --config /etc/caddy/Caddyfile

# Reload after configuration changes
sudo systemctl reload caddy
```

Caddy's health check system automatically removes unhealthy backends from the pool and re-adds them when they recover. The passive health check (`fail_duration` and `max_fails`) acts as a circuit breaker for immediate failure detection.
