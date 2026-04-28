# How to Configure Nginx Upstream for IPv4 Load Balancing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, Upstream, Load Balancing, IPv4, HTTP, Reverse Proxy

Description: Configure Nginx upstream blocks to load balance HTTP traffic across multiple IPv4 backend servers with round robin, keepalive connections, and connection limits.

## Introduction

Nginx uses `upstream` blocks to define backend server pools. The `proxy_pass` directive in a `server` block routes traffic to an upstream pool. By default, Nginx uses round robin, but it supports weighted, ip_hash, least_conn, and random algorithms.

## Basic Upstream Configuration

```nginx
# /etc/nginx/conf.d/app.conf

upstream app-servers {
    server 10.0.1.10:8080;
    server 10.0.1.11:8080;
    server 10.0.1.12:8080;
}

server {
    listen 80;
    server_name app.example.com;

    location / {
        proxy_pass http://app-servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Keepalive Connections to Backends

Keepalive connections reuse TCP connections to backends, reducing latency and overhead:

```nginx
upstream app-servers {
    server 10.0.1.10:8080;
    server 10.0.1.11:8080;

    keepalive 32;    # Keep up to 32 idle connections per worker
}

server {
    listen 80;
    location / {
        proxy_pass http://app-servers;
        proxy_http_version 1.1;          # Required for keepalive
        proxy_set_header Connection "";  # Clear "close" header
    }
}
```

## Server Parameters

```nginx
upstream app-servers {
    server 10.0.1.10:8080 weight=3 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:8080 weight=1 max_fails=3 fail_timeout=30s;
    server 10.0.1.12:8080 backup;  # Only used when others are down
}
```

- `weight`: Relative weight for weighted round robin
- `max_fails`: Number of failed attempts before marking server unavailable
- `fail_timeout`: How long to mark server as unavailable after max_fails
- `backup`: Standby server, used only when all primary servers are unavailable

## Upstream Connection Limits

```nginx
upstream app-servers {
    server 10.0.1.10:8080 max_conns=100;
    server 10.0.1.11:8080 max_conns=100;
}
```

`max_conns` limits the number of simultaneous active connections to each backend (available in Nginx OSS since version 1.11.5).

## Viewing Upstream Status

```bash
# Check Nginx config syntax

sudo nginx -t

# Reload without dropping connections
sudo nginx -s reload

# View upstream status (requires Nginx status module)
curl http://localhost/nginx_status
```

## Multiple Upstream Pools

Route different paths to different pools:

```nginx
upstream web-servers {
    server 10.0.1.10:80;
    server 10.0.1.11:80;
}

upstream api-servers {
    server 10.0.2.10:8080;
    server 10.0.2.11:8080;
}

server {
    listen 80;

    location / {
        proxy_pass http://web-servers;
    }

    location /api/ {
        proxy_pass http://api-servers;
        proxy_set_header Host $host;
    }
}
```

## Testing Load Balancing

```bash
# Send multiple requests and watch which server responds
for i in $(seq 1 6); do
  curl -s http://app.example.com/server-id
done
```

## Conclusion

Define upstream pools with the `upstream` block, set `proxy_pass` to route to them. Add `keepalive` for connection reuse. Use `weight` for proportional distribution, `backup` for standby servers, and `max_fails`/`fail_timeout` for passive health checking. Always set `proxy_http_version 1.1` and clear the `Connection` header when using keepalive.
