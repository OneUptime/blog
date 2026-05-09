# How to Proxy TCP Traffic to IPv4 Backend Servers with Nginx Stream

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, TCP, IPv4, Proxy, Stream Module, Load Balancing, Networking

Description: Learn how to use the Nginx stream module to proxy raw TCP connections to IPv4 backend servers with load balancing support.

---

Nginx's `stream` module lets you proxy TCP (and UDP) traffic at layer 4, making it useful for load-balancing database connections, MQTT brokers, game servers, or any non-HTTP TCP service.

## Prerequisites

Ensure Nginx was compiled with `--with-stream`. Check with:

```bash
nginx -V 2>&1 | grep -o with-stream
```

Most distribution packages include it. The `stream` module requires its own top-level block in `nginx.conf`.

## Basic TCP Proxy Configuration

The following configuration listens on port 3306 and forwards connections to a MySQL backend.

```nginx
# /etc/nginx/nginx.conf (top-level, outside the http {} block)

stream {
    # Define a backend pool of IPv4 MySQL servers
    upstream mysql_backends {
        server 10.0.0.1:3306;
        server 10.0.0.2:3306;
        server 10.0.0.3:3306;
    }

    server {
        # Listen on all IPv4 interfaces for MySQL connections
        listen 3306;

        # Forward to the upstream pool
        proxy_pass mysql_backends;

        # Timeouts: how long to wait for backend response
        proxy_connect_timeout 5s;
        proxy_timeout         30s;
    }
}
```

## Load Balancing Methods

By default Nginx uses round-robin. You can switch to least-connections or hash-based balancing (the stream module exposes the `hash` directive - use `hash $remote_addr` for client-IP affinity, since `ip_hash` is only available in the `http` module).

```nginx
stream {
    upstream app_backends {
        least_conn;           # Route to the backend with fewest active connections
        server 10.0.1.10:8080 weight=3;  # Higher weight = more traffic
        server 10.0.1.11:8080;
        server 10.0.1.12:8080 backup;    # Only used when others are down
    }

    server {
        listen 8080;
        proxy_pass app_backends;
    }
}
```

## Health Checks

Nginx Plus supports active health checks natively. In the open-source version, use the `max_fails` and `fail_timeout` parameters for passive health checking.

```nginx
upstream redis_backends {
    server 10.0.2.10:6379 max_fails=3 fail_timeout=30s;
    server 10.0.2.11:6379 max_fails=3 fail_timeout=30s;
}
```

## Logging TCP Connections

The stream module uses its own `log_format` directive.

```nginx
stream {
    log_format tcp_proxy '$remote_addr [$time_local] '
                         '$protocol $status $bytes_sent $bytes_received '
                         '$session_time -> $upstream_addr';

    access_log /var/log/nginx/tcp-access.log tcp_proxy;

    upstream backend { server 10.0.3.5:5432; }

    server {
        listen 5432;
        proxy_pass backend;
    }
}
```

## Verifying the Setup

```bash
# Test Nginx configuration
nginx -t

# Reload to apply
systemctl reload nginx

# Check that Nginx is listening on the port
ss -tlnp | grep nginx

# Test the proxy (e.g., connect to a proxied Redis)
redis-cli -h 127.0.0.1 -p 6379 ping
```

## Key Takeaways

- The `stream {}` block is separate from `http {}` and lives at the top level of `nginx.conf`.
- Use `upstream` pools for load balancing across multiple IPv4 backends.
- `proxy_connect_timeout` controls how long Nginx waits for the backend TCP handshake.
- Passive health checks with `max_fails` and `fail_timeout` remove unhealthy backends temporarily.
