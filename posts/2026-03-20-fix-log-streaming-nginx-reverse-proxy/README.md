# How to Fix Log Streaming Issues Behind Nginx Reverse Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Log Streaming, Nginx, Reverse Proxy, WebSocket, Buffering

Description: Learn how to fix Portainer container log streaming delays and disconnections behind Nginx by disabling proxy buffering and configuring proper streaming headers.

---

Container log streaming in Portainer is proxied through the Docker HTTP API. Nginx buffers proxied HTTP responses by default, which can cause log streams to appear delayed or cut off. This guide configures Nginx for real-time log delivery.

## The Root Cause: Nginx Proxy Buffering

By default, Nginx buffers responses from the proxied server. For streaming log endpoints that send data continuously, this means:

- Logs appear in large delayed batches instead of in real-time
- Streams can stall or appear to stop updating promptly
- Long-lived streams can hit `proxy_read_timeout` if the upstream stays idle too long

## Step 1: Diagnose Buffering

```bash
# Test if logs stream without the proxy

curl -N "http://portainer:9000/api/endpoints/1/docker/containers/<id>/logs?follow=true&stdout=true" \
  -H "Authorization: Bearer <your-portainer-api-token>"

# If logs appear in real-time without the proxy but not through Nginx,
# Nginx buffering is the problem
```

## Step 2: Disable Buffering for Log Endpoints

```nginx
server {
    listen 443 ssl;
    server_name portainer.example.com;

    # Specifically handle log streaming endpoint
    location ~ ^/api/endpoints/[0-9]+/docker/containers/.*/logs {
        proxy_pass http://portainer:9000;
        proxy_http_version 1.1;

        # Disable all buffering for streaming responses
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;

        # Pass important headers
        proxy_set_header Host $host;
        proxy_set_header Connection "";
    }

    # WebSocket endpoint used by Portainer
    location /api/websocket {
        proxy_pass http://portainer:9000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;
        proxy_read_timeout 86400s;
    }

    # Default location
    location / {
        proxy_pass http://portainer:9000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Step 3: Global Buffering Override

For simpler configurations, disable buffering globally for the Portainer virtual host:

```nginx
server {
    listen 443 ssl;
    server_name portainer.example.com;

    # Disable all response buffering for this server block
    proxy_buffering off;

    location /api/websocket {
        proxy_pass http://portainer:9000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
    }

    location / {
        proxy_pass http://portainer:9000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
    }
}
```

## Step 4: Test Log Streaming After Fix

```bash
# Test log streaming through the proxy
curl -N "https://portainer.example.com/api/endpoints/1/docker/containers/<id>/logs?follow=true&stdout=true" \
  -H "Authorization: Bearer <your-portainer-api-token>"

# Logs should now appear in real-time
```

## Step 5: Reload Nginx

```bash
sudo nginx -t        # Test configuration syntax
sudo nginx -s reload # Reload without downtime
```
