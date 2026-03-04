# How to Configure Caddy as a Load Balancer for Backend Services on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Caddy, Web Server, Load Balancing, Linux

Description: Learn how to configure Caddy as a Load Balancer for Backend Services on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Caddy can act as a load balancer, distributing traffic across multiple backend servers with health checking, various balancing algorithms, and automatic HTTPS termination.

## Prerequisites

- RHEL 9 with Caddy installed
- Multiple backend servers running

## Step 1: Basic Round-Robin Load Balancing

```bash
sudo vi /etc/caddy/Caddyfile
```

```
myapp.example.com {
    reverse_proxy 10.0.1.10:3000 10.0.1.11:3000 10.0.1.12:3000
}
```

Caddy distributes requests across all three backends using round-robin by default.

## Step 2: Choose a Load Balancing Policy

```
myapp.example.com {
    reverse_proxy 10.0.1.10:3000 10.0.1.11:3000 {
        lb_policy least_conn
    }
}
```

Available policies:
- `round_robin` (default)
- `least_conn` - Send to server with fewest connections
- `random` - Random selection
- `first` - Always use first available
- `ip_hash` - Sticky sessions by client IP
- `uri_hash` - Route by request URI
- `header` - Route by header value

## Step 3: Add Health Checks

```
myapp.example.com {
    reverse_proxy 10.0.1.10:3000 10.0.1.11:3000 {
        lb_policy least_conn

        health_uri /health
        health_interval 10s
        health_timeout 5s
        health_status 200
    }
}
```

Caddy removes unhealthy backends from the pool and re-adds them when they recover.

## Step 4: Configure Sticky Sessions

```
myapp.example.com {
    reverse_proxy 10.0.1.10:3000 10.0.1.11:3000 {
        lb_policy cookie
    }
}
```

This sets a cookie on the first response, ensuring subsequent requests from the same client go to the same backend.

## Step 5: Add Request Headers

```
myapp.example.com {
    reverse_proxy 10.0.1.10:3000 10.0.1.11:3000 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

## Step 6: Reload

```bash
sudo systemctl reload caddy
```

## Conclusion

Caddy provides straightforward load balancing on RHEL 9 with automatic HTTPS, health checking, and multiple balancing algorithms. Its Caddyfile syntax makes load balancer configuration remarkably concise compared to traditional tools.
