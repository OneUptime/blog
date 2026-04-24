# How to Deploy Nginx via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Nginx, Web Server, Reverse Proxy, Self-Hosted

Description: Deploy Nginx as a web server or reverse proxy using Portainer, with custom configuration, SSL termination, and persistent configuration management.

## Introduction

Nginx is one of the most widely deployed web servers and reverse proxies in the world. Deploying it via Portainer makes it easy to manage configuration files, update to new versions, and monitor access logs - all from a web browser.

## Quick Deploy via Portainer UI

Navigate to **Containers > Add container**:
- Image: `nginx:alpine`
- Ports: Host `80` → Container `80`, Host `443` → Container `443`
- Volumes: Add bind mount for config

## Deploy as a Stack

In Portainer, create a stack named `nginx` and use absolute host paths for bind mounts:

```yaml
services:
  nginx:
    image: nginx:alpine
    container_name: nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      # Custom nginx configuration
      - /opt/portainer/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - /opt/portainer/nginx/conf.d:/etc/nginx/conf.d:ro
      # Web content
      - /opt/portainer/nginx/html:/usr/share/nginx/html:ro
      # SSL certificates
      - /opt/portainer/nginx/certs:/etc/nginx/certs:ro
      # Access and error logs
      - nginx_logs:/var/log/nginx
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  nginx_logs:
```

## Custom Nginx Configuration

Create `/opt/portainer/nginx/nginx.conf` on the Docker host:

```nginx
# nginx.conf - main configuration

user  nginx;
worker_processes  auto;

error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;

events {
    worker_connections  1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Log format with request timing
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" $request_time';

    access_log  /var/log/nginx/access.log  main;

    sendfile        on;
    keepalive_timeout  65;

    # Gzip compression
    gzip  on;
    gzip_types text/plain text/css application/json application/javascript;

    include /etc/nginx/conf.d/*.conf;
}
```

Create `/opt/portainer/nginx/conf.d/default.conf`:

```nginx
# Default server block
server {
    listen 80;
    server_name _;

    # Health check endpoint
    location /health {
        default_type text/plain;
        return 200 'OK';
    }

    # Static content
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ =404;
    }
}
```

## Using Nginx as a Reverse Proxy

```nginx
# /opt/portainer/nginx/conf.d/reverse-proxy.conf
server {
    listen 80;
    server_name app.example.com;

    location / {
        # Proxy to upstream application
        proxy_pass http://myapp:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## SSL Configuration

```nginx
# /opt/portainer/nginx/conf.d/ssl.conf
server {
    listen 443 ssl;
    http2 on;
    server_name example.com;

    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        root /usr/share/nginx/html;
        index index.html;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;
}
```

## Reloading Configuration Without Restart

After updating config files, reload Nginx without downtime:

```bash
# Test configuration before reloading
docker exec nginx nginx -t

# Via Portainer Console or:
docker exec nginx nginx -s reload
```

## Updating Nginx

In Portainer, update the image version in your stack editor and click **Update the stack**. Nginx will be recreated with the new image while configuration volumes persist.

## Conclusion

Nginx deployed via Portainer is a flexible foundation for web serving and reverse proxy needs. Configuration files stored as bind mounts make it easy to edit and reload without rebuilding the container. The stack approach keeps your Nginx setup reproducible and easy to migrate between environments.
