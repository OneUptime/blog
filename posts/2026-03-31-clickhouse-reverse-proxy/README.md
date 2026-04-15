# How to Set Up ClickHouse Behind a Reverse Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Reverse Proxy, Nginx, Security, Networking

Description: Learn how to set up ClickHouse behind a reverse proxy to add SSL termination, authentication, rate limiting, and access control.

---

## Why Use a Reverse Proxy?

Placing a reverse proxy in front of ClickHouse provides several benefits without modifying ClickHouse itself:

- SSL/TLS termination so ClickHouse does not need certificates
- IP-based access control at the proxy layer
- Basic authentication for clients that do not support ClickHouse user management
- Request rate limiting to protect against runaway queries
- Centralized access logging

## Nginx Reverse Proxy for HTTP Interface

```nginx
server {
    listen 443 ssl;
    server_name clickhouse.example.com;

    ssl_certificate     /etc/ssl/certs/clickhouse.crt;
    ssl_certificate_key /etc/ssl/private/clickhouse.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Restrict access to internal network
    allow 10.0.0.0/8;
    deny all;

    location / {
        proxy_pass http://127.0.0.1:8123;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        client_max_body_size 1g;
    }
}
```

## Adding HTTP Basic Authentication

```bash
# Create password file
htpasswd -c /etc/nginx/.htpasswd clickhouse_user
```

```nginx
location / {
    auth_basic "ClickHouse Access";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://127.0.0.1:8123;
}
```

## Rate Limiting with Nginx

```nginx
http {
    limit_req_zone $binary_remote_addr zone=ch_limit:10m rate=10r/s;

    server {
        location / {
            limit_req zone=ch_limit burst=20 nodelay;
            proxy_pass http://127.0.0.1:8123;
        }
    }
}
```

This limits each IP to 10 requests per second with a burst of 20.

## Restricting Access to Specific Paths

Block dangerous endpoints at the proxy:

```nginx
location /query {
    deny all;
}

location /ping {
    proxy_pass http://127.0.0.1:8123;
    # Allow health checks from anywhere
    allow all;
}

location / {
    allow 10.0.0.0/8;
    deny all;
    proxy_pass http://127.0.0.1:8123;
}
```

## Logging Query Details

```nginx
log_format clickhouse_log '$remote_addr - $remote_user [$time_local] '
                           '"$request" $status $body_bytes_sent '
                           '$request_time';
access_log /var/log/nginx/clickhouse_access.log clickhouse_log;
```

## Bind ClickHouse to Localhost Only

When using a reverse proxy, restrict ClickHouse to listen only on localhost:

```xml
<listen_host>127.0.0.1</listen_host>
```

This prevents direct external access to ClickHouse, forcing all traffic through the proxy.

## Testing the Setup

```bash
# Should succeed
curl -u clickhouse_user:password https://clickhouse.example.com/?query=SELECT+1

# Should be blocked (direct access bypassed proxy)
curl http://clickhouse-host:8123/?query=SELECT+1
```

## Summary

A reverse proxy in front of ClickHouse adds SSL termination, authentication, IP restrictions, and rate limiting with minimal changes to ClickHouse itself. Bind ClickHouse to localhost and expose it only through the proxy. Use Nginx's `allow`/`deny` directives for network-level access control and `limit_req` for rate limiting.
