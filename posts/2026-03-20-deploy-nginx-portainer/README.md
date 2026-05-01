# How to Deploy Nginx via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Nginx, Web Server, Docker, Deployment

Description: Learn how to deploy Nginx as a web server or reverse proxy via Portainer, with custom configuration, SSL termination, and persistent content volumes.

## Deployment Options

Nginx via Portainer can serve as:
- A static file server
- A reverse proxy for backend services
- A load balancer
- An SSL termination point

## Quick Deploy: Single Container

In Portainer: **Containers → Add Container**

```text
Name:   nginx
Image:  nginx:alpine
Port Mapping:
  Host: 80  → Container: 80/tcp
  Host: 443 → Container: 443/tcp
Volumes:
  /opt/nginx/html   → /usr/share/nginx/html  (bind mount)
  /opt/nginx/conf.d → /etc/nginx/conf.d      (bind mount)
  /opt/nginx/ssl    → /etc/nginx/ssl         (bind mount)
```

## Deploy via Portainer Stack

**Stacks → Add Stack → nginx**

```yaml
services:
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      # Static content
      - /opt/nginx/html:/usr/share/nginx/html
      # Custom config files
      - /opt/nginx/conf.d:/etc/nginx/conf.d:ro
      # SSL certificates
      - /opt/nginx/ssl:/etc/nginx/ssl:ro
```

## Custom Nginx Configuration

Create `/opt/nginx/conf.d/default.conf` on the host, place your site files in `/opt/nginx/html`, and store your certificate and key as `/opt/nginx/ssl/cert.pem` and `/opt/nginx/ssl/key.pem`:

```nginx
# /opt/nginx/conf.d/default.conf

server {
    listen 80;
    server_name yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;
    http2 on;

    # SSL certificates
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Nginx as a Reverse Proxy

```nginx
# proxy to a backend service on the same Docker network
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://api-service:8080;
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

## Verifying the Deployment

```bash
# Check Nginx config
docker exec nginx nginx -t
# Expected: nginx: the configuration file /etc/nginx/nginx.conf syntax is ok

# Test HTTP response
curl -I http://localhost
# Expected: HTTP/1.1 200 OK or 301 redirect

# View access logs in Portainer
# Containers → nginx → Logs
```

## Reload Nginx Config Without Restart

```bash
# Via Portainer console or exec
docker exec nginx nginx -s reload
```

## Common Base Images

| Image | Approx. Compressed Size (amd64) | Use Case |
|-------|-------------------------------|---------|
| `nginx:alpine` | ~26MB | Production (smallest) |
| `nginx:latest` | ~63MB | Production (Debian-based) |
| `nginx:1.30.0-alpine` | ~26MB | Pinned version |

## Conclusion

Deploying Nginx via Portainer is straightforward - create a stack with a bind mount for configuration files, and update the config files on the host to modify Nginx behavior. Portainer's exec and log features let you test configuration changes and monitor access logs without leaving the browser.
