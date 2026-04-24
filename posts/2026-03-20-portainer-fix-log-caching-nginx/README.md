# How to Fix Log Caching Issues with Nginx Reverse Proxy in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Nginx, Logging, Troubleshooting

Description: Learn how to fix issues where Portainer log streaming is delayed or broken when running behind an Nginx reverse proxy due to buffering.

## Introduction

When Portainer is deployed behind an Nginx reverse proxy, you may notice that the log viewer doesn't show real-time logs - there's a delay, logs appear in bursts, or the follow mode doesn't work. This is caused by Nginx's proxy buffering, which buffers the streaming HTTP response from Portainer before forwarding it to your browser. This guide explains how to disable buffering for Portainer log streaming.

## Prerequisites

- Portainer deployed behind an Nginx reverse proxy
- Nginx configuration access

## Understanding the Problem

Portainer's log viewer relies on a streaming HTTP response from the Docker/Portainer API to push log lines to the browser in real time. When Nginx buffers responses:

1. Browser requests logs from Portainer via Nginx.
2. Portainer sends log lines incrementally.
3. Nginx buffers the response and only forwards when the buffer is full or a timeout is reached.
4. Browser sees no logs until the buffer flushes.

The result: logs appear in large bursts instead of line-by-line, or not at all until the buffer timeout.

## Step 1: Identify the Nginx Reverse Proxy Config

Find your Nginx configuration for Portainer:

```nginx
# Example: /etc/nginx/conf.d/portainer.conf

# or /etc/nginx/sites-available/portainer
```

## Step 2: Disable Proxy Buffering for Portainer

The key fix is to disable proxy buffering:

```nginx
# /etc/nginx/conf.d/portainer.conf

server {
    listen 80;
    server_name portainer.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name portainer.example.com;

    ssl_certificate     /etc/ssl/certs/portainer.crt;
    ssl_certificate_key /etc/ssl/private/portainer.key;

    location / {
        proxy_pass http://portainer:9000;
        proxy_http_version 1.1;

        # WebSocket support (Portainer uses WebSockets for console)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CRITICAL: Disable proxy buffering for real-time log streaming
        proxy_buffering off;
        # Increase timeout for long-running log sessions
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_connect_timeout 60s;

        # Disable caching of responses
        proxy_cache off;
        proxy_cache_bypass 1;
    }
}
```

## Step 3: Fine-Grained Buffering Control

If you want buffering for most traffic but not for streaming endpoints, use location-based configuration:

```nginx
server {
    listen 443 ssl;
    server_name portainer.example.com;

    # Default location: enable buffering for regular requests
    location / {
        proxy_pass http://portainer:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_read_timeout 86400s;
    }

    # Log streaming endpoints: disable buffering
    location ~ ^/api/endpoints/[0-9]+/docker/containers/.*/logs {
        proxy_pass http://portainer:9000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;

        # Disable buffering for log streaming
        proxy_buffering off;
        proxy_read_timeout 86400s;
    }

    # WebSocket paths for console
    location ~ ^/api/websocket/ {
        proxy_pass http://portainer:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
        proxy_buffering off;
    }
}
```

## Step 4: About X-Accel-Buffering

Nginx can also honor the `X-Accel-Buffering: no` **response** header when the upstream application sends it. `proxy_set_header` only sets **request** headers sent to Portainer, so it does not disable Nginx response buffering. In an Nginx reverse proxy config, use `proxy_buffering off`:

```nginx
location /api/ {
    proxy_pass http://portainer:9000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;

    # Disable response buffering in Nginx for streamed log output
    proxy_buffering off;
}
```

If an upstream application emits `X-Accel-Buffering: no` in its response, Nginx will honor it. For Portainer, the most direct fix in Nginx is still `proxy_buffering off`.

## Step 5: Docker Compose with Nginx Proxy

Complete docker-compose.yml for Portainer + Nginx:

```yaml
# docker-compose.yml
services:
  portainer:
    image: portainer/portainer-ce:latest
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    # Don't expose Portainer directly - Nginx handles external access
    expose:
      - "9000"

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/portainer.conf:/etc/nginx/conf.d/portainer.conf:ro
      - ./nginx/certs:/etc/ssl/certs:ro
      - ./nginx/private:/etc/ssl/private:ro
    depends_on:
      - portainer

volumes:
  portainer_data:
```

```nginx
# nginx/portainer.conf
upstream portainer {
    server portainer:9000;
}

server {
    listen 80;
    server_name portainer.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name portainer.example.com;

    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    # Gzip (disable for streaming)
    gzip off;

    location / {
        proxy_pass http://portainer;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Critical: disable buffering for real-time logs
        proxy_buffering off;
        proxy_cache off;

        # Long timeout for persistent connections (logs, console)
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        keepalive_timeout 86400;

    }
}
```

## Step 6: Reload Nginx

After making configuration changes:

```bash
# Test the configuration:
nginx -t
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok

# Reload (no downtime):
nginx -s reload

# Or via Docker Compose:
docker compose exec nginx nginx -s reload

# Or restart via Portainer:
# Navigate to the nginx container → Restart
```

## Step 7: Verify the Fix

After reloading:
1. Open Portainer in the browser.
2. Navigate to a container's logs.
3. Enable **Follow** mode.
4. The logs should now appear in real time, line by line.

```bash
# Test that log output is streamed instead of buffered:
curl -v -N https://portainer.example.com/api/endpoints/1/docker/containers/my-app/logs?stdout=1&follow=1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" 2>&1 | head -30

# New log lines should arrive incrementally instead of in large bursts
```

## Conclusion

Log streaming issues in Portainer behind Nginx are almost always caused by proxy buffering. The fix is to add `proxy_buffering off` to your Nginx location block, along with a long `proxy_read_timeout` for persistent streaming connections. If you also use Portainer's console feature, ensure WebSocket upgrade headers are configured properly. These changes together give you a fully functional Portainer experience through an Nginx reverse proxy.
