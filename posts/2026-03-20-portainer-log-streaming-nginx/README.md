# How to Fix Log Streaming Issues Behind Nginx Reverse Proxy - Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Nginx, Reverse Proxy, Log, Troubleshooting

Description: Fix Portainer container log streaming failures behind Nginx, including buffering issues, timeout configuration, and WebSocket configuration for real-time log display.

## Introduction

Portainer's log streaming feature shows live container logs in the browser. Behind Nginx, logs may not update in real-time (appearing only when Nginx flushes its buffer) or stop completely after a few minutes (timeout). Portainer also has separate WebSocket endpoints for console access that need their own proxy configuration. This guide fixes all three problems.

## Step 1: Identify the Log Streaming Problem

```bash
# Test log streaming directly (without proxy)

# Go directly to https://your-host:9443
# Or use http://your-host:9000 if legacy HTTP is enabled
# Open container logs
# If logs stream in real-time: proxy is the issue

# Check what protocol log streaming uses
# F12 → Network → inspect the /api/endpoints/.../docker/containers/.../logs request
# Portainer proxies Docker's HTTP log stream for container logs
# WebSockets are used for console attach/exec, not container logs
```

## Step 2: Nginx - Fix Buffering (Most Common Issue)

```nginx
server {
    listen 443 ssl;
    server_name portainer.yourdomain.com;

    ssl_certificate /etc/ssl/certs/portainer.crt;
    ssl_certificate_key /etc/ssl/private/portainer.key;

    location / {
        proxy_pass https://localhost:9443;

        # HTTP/1.1 for streaming responses
        proxy_http_version 1.1;

        # Standard headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CRITICAL: Disable buffering for log streaming
        proxy_buffering off;

        # Disable any configured proxy cache for this location
        proxy_cache off;

        # Disable gzip for log streaming (interferes with streaming)
        gzip off;

        # Timeouts for long log streaming sessions
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;

        # Large body for image uploads
        client_max_body_size 500m;
    }
}
```

## Step 3: Fix Streaming HTTP Responses for Log Endpoints

Portainer container logs are exposed through Portainer's HTTP API as a streaming response. A dedicated location block makes the buffering rule explicit:

```nginx
# For container log endpoints
location ~ ^/api/endpoints/.*/docker/containers/.*/logs$ {
    proxy_pass https://localhost:9443;
    proxy_http_version 1.1;

    proxy_buffering off;
    proxy_cache off;
    gzip off;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;

    # Headers
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Step 4: Fix Nginx Timeout Causing Log Interruption

```nginx
# Default Nginx setting that commonly causes log streaming to cut off:
# proxy_read_timeout 60s (default) → logs stop after 60 seconds with no new log lines

# Increase timeouts
proxy_read_timeout 3600s;    # 1 hour
proxy_send_timeout 3600s;    # 1 hour
```

## Step 5: Check Nginx Worker Connections

```nginx
# /etc/nginx/nginx.conf
events {
    # Default is often 1024; increase if needed
    worker_connections 4096;
}
```

## Step 6: Fix gzip Compression Interference

```nginx
# gzip can interfere with streaming responses
server {
    # Disable globally for the Portainer vhost
    gzip off;
}
```

## Step 7: Fix Nginx Proxy Buffer Settings

```nginx
# Disable proxy buffers entirely for log streaming
proxy_buffering off;
```

## Step 8: Specific Endpoint Configuration

Create separate location blocks for Portainer's log streaming endpoint and WebSocket console endpoint:

```nginx
# Map for WebSocket upgrade detection
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 443 ssl;
    server_name portainer.yourdomain.com;

    # WebSocket endpoints (console attach/exec)
    location /api/websocket/ {
        proxy_pass https://localhost:9443;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # Streaming container logs
    location ~ ^/api/endpoints/.*/docker/containers/.*/logs$ {
        proxy_pass https://localhost:9443;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache off;
        gzip off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # All other Portainer requests
    location / {
        proxy_pass https://localhost:9443;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
    }
}
```

## Step 9: Test Log Streaming End-to-End

```bash
# First: Test log streaming directly (no proxy)
docker logs -f some-noisy-container &

# Second: Check if Portainer shows the same logs in real-time
# via the direct URL https://your-host:9443
# or http://your-host:9000 if legacy HTTP is enabled

# Third: Test via the proxy
# If #2 works but #3 doesn't: proxy is the issue
# If #2 doesn't work: Portainer or Docker issue

# Test the streaming log endpoint directly through the proxy
curl -N -H "Authorization: Bearer $TOKEN" \
  "https://portainer.yourdomain.com/api/endpoints/1/docker/containers/CONTAINER_ID/logs?stdout=1&stderr=1&follow=1"
# You should see log lines continue to arrive without waiting for the connection to close
```

## Step 10: Reload Nginx After Configuration Changes

```bash
# Test configuration syntax first
sudo nginx -t

# Reload (no downtime)
sudo nginx -s reload

# Or restart (brief downtime)
sudo systemctl restart nginx

# Verify Nginx is running correctly
sudo nginx -T | grep -A 5 "portainer"
```

## Conclusion

Log streaming issues behind Nginx are most commonly caused by `proxy_buffering on` (the default), which causes Nginx to accumulate log output before forwarding to the browser. The fix is `proxy_buffering off` combined with appropriate timeout settings (`proxy_read_timeout 3600s`) to prevent the proxy from closing long-lived streaming connections. For Portainer WebSocket endpoints such as console attach/exec, also add the `Upgrade` and `Connection` headers.
