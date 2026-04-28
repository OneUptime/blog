# How to Set Up Nginx as a Reverse Proxy with IPv4 Backend Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Nginx, Reverse Proxy, IPv4, Networking, Web Server

Description: Configure Nginx as a reverse proxy that forwards requests to IPv4 backend servers, including header forwarding, timeouts, buffering, and HTTPS termination.

## Introduction

Nginx as a reverse proxy accepts client requests and forwards them to backend servers using `proxy_pass`. Using explicit IPv4 addresses in `proxy_pass` ensures connections go to the correct backend without DNS resolution delays or IPv6 fallback issues.

## Basic Reverse Proxy to IPv4 Backend

```nginx
# /etc/nginx/sites-available/app

server {
    listen 80;
    server_name app.example.com;

    location / {
        # Forward to IPv4 backend on port 3000
        proxy_pass http://10.0.0.10:3000;

        # Forward original client information
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## HTTPS Termination → IPv4 Backend

```nginx
server {
    listen 80;
    server_name app.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name app.example.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        # Backend is plain HTTP on IPv4
        proxy_pass http://10.0.0.10:8080;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

## Proxy with Upstream Block (Load Balanced)

```nginx
http {
    upstream app_backend {
        server 10.0.0.10:8080;
        server 10.0.0.11:8080;
        server 10.0.0.12:8080;
    }

    server {
        listen 80;
        server_name app.example.com;

        location / {
            proxy_pass http://app_backend;

            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```

## Configure Proxy Timeouts

```nginx
location / {
    proxy_pass http://10.0.0.10:8080;

    # Timeout for establishing connection
    proxy_connect_timeout 10s;

    # Timeout between successive reads from backend
    proxy_read_timeout 60s;

    # Timeout for sending request to backend
    proxy_send_timeout 60s;
}
```

## Enable Proxy Buffering

```nginx
location / {
    proxy_pass http://10.0.0.10:8080;

    # Buffer the backend response
    proxy_buffering on;
    proxy_buffer_size 4k;
    proxy_buffers 8 4k;
    proxy_busy_buffers_size 8k;
}
```

## Proxy for WebSockets

```nginx
location /ws {
    proxy_pass http://10.0.0.10:8080;

    # Required for WebSocket proxying
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

## Test the Reverse Proxy

```bash
# Verify config syntax
nginx -t

# Reload
systemctl reload nginx

# Test the proxy
curl -v http://app.example.com/

# Check Nginx access log
tail -f /var/log/nginx/access.log
```

## Conclusion

Nginx reverse proxy configuration uses `proxy_pass http://<ipv4>:<port>` to forward requests to IPv4 backends. Always include `proxy_set_header` directives to forward client IP and protocol information. For multiple backends, use an `upstream` block with load balancing. Set appropriate timeouts with `proxy_connect_timeout`, `proxy_read_timeout`, and `proxy_send_timeout`.
