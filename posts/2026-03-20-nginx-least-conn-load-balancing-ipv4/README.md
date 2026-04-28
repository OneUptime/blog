# How to Configure Nginx least_conn Load Balancing with IPv4 Backends

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, Load Balancing, Least_conn, IPv4, Reverse Proxy, Performance

Description: Configure Nginx upstream load balancing using the least_conn algorithm to route new connections to the backend with the fewest active connections.

## Introduction

Nginx supports multiple load balancing algorithms. `least_conn` routes each new request to the backend with the fewest active connections - ideal when backend response times vary significantly or when some requests are long-lived (WebSocket, file uploads).

## Load Balancing Algorithms in Nginx

| Directive | Algorithm |
|-----------|-----------|
| (default) | Round-robin |
| `least_conn` | Least connections |
| `ip_hash` | Client IP hash |
| `hash $var` | Custom key hash |
| `random` | Random selection |

## Basic least_conn Configuration

```nginx
# /etc/nginx/conf.d/app.conf

upstream app_backends {
    least_conn;   # Route to the backend with fewest active connections

    server 10.0.1.10:8080;
    server 10.0.1.11:8080;
    server 10.0.1.12:8080;
}

server {
    listen 80;
    server_name app.example.com;

    location / {
        proxy_pass http://app_backends;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Adding Weights to Backends

If backends have different capacities, combine `least_conn` with weights:

```nginx
upstream app_backends {
    least_conn;

    server 10.0.1.10:8080 weight=3;   # Receives 3x more connections
    server 10.0.1.11:8080 weight=2;
    server 10.0.1.12:8080 weight=1;
}
```

## Health Checks and Failover

```nginx
upstream app_backends {
    least_conn;

    server 10.0.1.10:8080 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:8080 max_fails=3 fail_timeout=30s;
    server 10.0.1.12:8080 backup;     # Only used when all primaries fail
}
```

- `max_fails=3`: Mark server as down after 3 consecutive failures
- `fail_timeout=30s`: Time before retrying a failed server
- `backup`: Standby server used only when all others are unavailable

## Active Health Checks (Nginx Plus)

Nginx Plus supports proactive health checks. For open-source Nginx, use passive health checks only (based on actual request failures).

## Enabling Keep-Alive Connections to Backends

Persistent connections to backends significantly improve performance:

```nginx
upstream app_backends {
    least_conn;

    server 10.0.1.10:8080;
    server 10.0.1.11:8080;
    server 10.0.1.12:8080;

    keepalive 32;   # Max idle keepalive connections cached per worker (total across upstream)
}

server {
    location / {
        proxy_pass http://app_backends;
        proxy_http_version 1.1;                          # Required for keepalive
        proxy_set_header Connection "";                   # Clear Connection header
    }
}
```

## Monitoring Backend Status

Enable the Nginx status module to monitor connection counts:

```nginx
server {
    listen 127.0.0.1:8080;

    location /nginx_status {
        stub_status;
        allow 127.0.0.1;
        deny all;
    }
}
```

```bash
# Check real-time connection stats

curl http://127.0.0.1:8080/nginx_status
```

## When to Use least_conn

- **API servers with variable latency**: Long-running requests leave one backend saturated with round-robin; least_conn distributes more evenly
- **WebSocket connections**: Long-lived connections accumulate; least_conn prevents overloading a single backend
- **Mixed workloads**: When some requests are fast and others slow, least_conn adapts better than round-robin

## Conclusion

`least_conn` is the best default load balancing algorithm for most HTTP API and WebSocket workloads. Combine it with keepalive connections and passive health checks for reliable, efficient backend distribution.
