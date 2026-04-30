# How to Configure HTTP Keep-Alive on Nginx for Better Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, HTTP, Keep-Alive, Performance, Web Server, Optimization

Description: Learn how to tune HTTP Keep-Alive settings in Nginx to reduce connection overhead and improve web application performance.

## What Is HTTP Keep-Alive?

HTTP Keep-Alive (also called persistent connections) allows a single TCP connection to be reused for multiple HTTP requests. Without it, every request requires a full TCP handshake-adding latency and CPU overhead. Enabling and tuning Keep-Alive is one of the simplest performance wins for high-traffic Nginx deployments.

## Default Nginx Keep-Alive Behavior

Nginx enables Keep-Alive by default for HTTP/1.1 clients. The key directives controlling this behavior live in the `http`, `server`, or `location` context.

## Configuring Keep-Alive Timeouts

The `keepalive_timeout` directive sets how long Nginx will keep an idle connection open:

```nginx
# /etc/nginx/nginx.conf

http {
    # Keep idle connections open for up to 65 seconds
    # The optional second value sets the Keep-Alive header value sent to clients
    keepalive_timeout 65 60;

    # Maximum number of requests allowed over a single Keep-Alive connection
    keepalive_requests 1000;

    server {
        listen 80;
        server_name example.com;

        root /var/www/html;
    }
}
```

- `keepalive_timeout 65 60;` - Nginx closes idle connections after 65 seconds; it also sends a `Keep-Alive: timeout=60` header to hint to clients.
- `keepalive_requests 1000;` - After 1000 requests on a single connection, Nginx closes it to prevent resource exhaustion.

## Keep-Alive Between Nginx and Upstream Servers

When Nginx acts as a reverse proxy, enabling Keep-Alive to upstream application servers significantly reduces handshake overhead:

```nginx
# Define upstream pool with Keep-Alive connections
upstream app_backend {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;

    # Keep up to 32 idle upstream Keep-Alive connections per worker process
    keepalive 32;
}

server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://app_backend;

        # Required on Nginx versions before 1.29.7
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
```

For Nginx versions before 1.29.7, setting `proxy_http_version 1.1` and clearing the `Connection` header are both required for HTTP upstream Keep-Alive. Since 1.29.7, Nginx uses HTTP/1.1 for proxying and enables upstream Keep-Alive by default.

## Tuning for High-Traffic Sites

For sites with heavy traffic, increase `keepalive_requests` and lower `keepalive_timeout` to balance connection reuse against resource consumption:

```nginx
http {
    # Lower timeout to free connections faster under heavy load
    keepalive_timeout 30;

    # Allow more requests per connection for API-heavy workloads
    keepalive_requests 10000;
}
```

## Verifying Keep-Alive Is Active

Use `curl` to inspect the response headers:

```bash
# --http1.1 forces HTTP/1.1; -I shows response headers only
curl -I --http1.1 http://example.com
```

With HTTP/1.1, persistent connections are the default, so you may not see `Connection: keep-alive`. If you set a second `keepalive_timeout` value, you may see a `Keep-Alive: timeout=...` header; `Connection: close` indicates the server will not keep the connection open.

## Monitoring Keep-Alive Connections

If Nginx was built with the stub status module, enable it to monitor active connections:

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

Then poll it with:

```bash
curl http://127.0.0.1:8080/nginx_status
```

The `Reading`, `Writing`, and `Waiting` counters show connections currently being read, written, and kept idle waiting for the next request respectively.

## Conclusion

Tuning HTTP Keep-Alive in Nginx is a low-effort, high-reward optimization. Set `keepalive_timeout` and `keepalive_requests` appropriate for your traffic pattern, and configure upstream Keep-Alive when proxying to application servers. Always validate with load testing to confirm the improvements.
