# How to Use Nginx as a ClickHouse Load Balancer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Nginx, Load Balancing, Reverse Proxy, Networking

Description: Learn how to configure Nginx as a load balancer for ClickHouse HTTP connections, enabling health checks, upstream rotation, and SSL termination.

---

## Why Nginx for ClickHouse?

Nginx is a popular choice for load balancing ClickHouse's HTTP interface (port 8123). It supports upstream health checks (in the Plus edition and with community modules), easy SSL termination, request buffering, and access logging. It is a natural fit if you are already using Nginx elsewhere in your stack.

## Basic Upstream Configuration

```nginx
upstream clickhouse_nodes {
    least_conn;
    server 10.0.0.1:8123;
    server 10.0.0.2:8123;
    server 10.0.0.3:8123;
}

server {
    listen 8123;

    location / {
        proxy_pass http://clickhouse_nodes;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        proxy_connect_timeout 5s;
    }
}
```

## Adding Health Checks (Open Source)

The open-source Nginx does not support active health checks, but you can mark a node as backup or use `max_fails`:

```nginx
upstream clickhouse_nodes {
    least_conn;
    server 10.0.0.1:8123 max_fails=3 fail_timeout=30s;
    server 10.0.0.2:8123 max_fails=3 fail_timeout=30s;
    server 10.0.0.3:8123 backup;
}
```

A server that fails 3 times within 30 seconds is removed from the pool for 30 seconds.

## SSL Termination

```nginx
server {
    listen 8443 ssl;
    ssl_certificate     /etc/ssl/certs/clickhouse.crt;
    ssl_certificate_key /etc/ssl/private/clickhouse.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://clickhouse_nodes;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 300s;
    }
}
```

## Authentication Passthrough

If your ClickHouse nodes require HTTP Basic Auth, you can forward credentials from the client:

```nginx
location / {
    proxy_pass http://clickhouse_nodes;
    proxy_set_header Authorization $http_authorization;
    proxy_pass_header Authorization;
}
```

Alternatively, inject credentials at the proxy level using a Base64-encoded `Authorization` header:

```nginx
location / {
    proxy_pass http://clickhouse_nodes;
    proxy_set_header Authorization "Basic Y2xpY2tob3VzZV91c2VyOnNlY3JldA==";
}
```

## Request Buffering for Large Inserts

Large INSERT payloads benefit from buffering at the proxy:

```nginx
location / {
    proxy_pass          http://clickhouse_nodes;
    proxy_request_buffering on;
    client_max_body_size 1g;
    proxy_read_timeout  600s;
}
```

## Logging ClickHouse Queries

Log the query string for debugging:

```nginx
log_format clickhouse '$remote_addr - $remote_user [$time_local] '
                      '"$request" $status $body_bytes_sent '
                      '"$http_x_query_id"';

access_log /var/log/nginx/clickhouse.log clickhouse;
```

## Testing the Load Balancer

```bash
for i in {1..6}; do
  curl -s "http://nginx-host:8123/?query=SELECT+hostName()"
done
```

Each request should return different hostnames if the upstream is distributing correctly.

## Summary

Nginx works well as a ClickHouse HTTP load balancer using the `upstream` block with `least_conn` or the default round-robin method. Use `max_fails` and `fail_timeout` for passive health checking, and enable SSL termination to secure client connections. Increase `proxy_read_timeout` to handle long-running analytical queries that can take minutes to complete.
