# How to Expose Docker Containers to the Internet Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Security, Networking, DevOps, Reverse Proxy

Description: Set up Traefik or Nginx reverse proxies with TLS termination, rate limiting, and fail2ban patterns to safely expose containerized services to the internet.

Exposing containers directly to the internet is asking for trouble. Port scanning bots find open services within minutes. A reverse proxy acts as a security boundary, handling TLS, rate limiting, and access control so your application doesn't have to.

---

## Why Never Expose Containers Directly

```bash
# DON'T do this for production
docker run -p 80:80 -p 443:443 myapp:latest
```

Problems with direct exposure:
- No TLS termination (or you manage certs in every container)
- No rate limiting (DDoS target)
- No request filtering (injection attacks hit your app directly)
- No centralized logging of access patterns
- IP bans require app changes

A reverse proxy solves all of this at the network edge.

---

## Option 1: Traefik (Automatic and Container-Native)

Traefik discovers containers via Docker labels and configures routing automatically. It's the most Docker-native solution.

### Basic Setup

```yaml
# docker-compose.yml
services:
  traefik:
    image: traefik:v3.0
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - letsencrypt:/letsencrypt
    networks:
      - web

  api:
    image: myapp:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.example.com`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      - "traefik.http.services.api.loadbalancer.server.port=3000"
    networks:
      - web

networks:
  web:
    external: true

volumes:
  letsencrypt:
```

### HTTPS Redirect

```yaml
# Force HTTP to HTTPS
labels:
  - "traefik.http.routers.api-http.rule=Host(`api.example.com`)"
  - "traefik.http.routers.api-http.entrypoints=web"
  - "traefik.http.routers.api-http.middlewares=https-redirect"
  - "traefik.http.middlewares.https-redirect.redirectscheme.scheme=https"
```

### Rate Limiting with Traefik

```yaml
labels:
  # Rate limit: 100 requests per second average, burst of 50
  - "traefik.http.middlewares.api-ratelimit.ratelimit.average=100"
  - "traefik.http.middlewares.api-ratelimit.ratelimit.burst=50"
  - "traefik.http.routers.api.middlewares=api-ratelimit"
```

### IP Whitelist

```yaml
labels:
  # Only allow specific IPs
  - "traefik.http.middlewares.api-whitelist.ipwhitelist.sourcerange=10.0.0.0/8,192.168.1.0/24"
  - "traefik.http.routers.api.middlewares=api-whitelist"
```

### Basic Authentication

```bash
# Generate password hash
htpasswd -nb admin secretpassword
```

```yaml
labels:
  - "traefik.http.middlewares.api-auth.basicauth.users=admin:$$apr1$$xyz..."
  - "traefik.http.routers.api.middlewares=api-auth"
```

---

## Option 2: Nginx (Traditional and Flexible)

Nginx offers more control and is familiar to most ops teams. It requires manual configuration but provides fine-grained control.

### Basic Nginx Reverse Proxy

```yaml
# docker-compose.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - ./logs:/var/log/nginx
    networks:
      - web
    depends_on:
      - api

  api:
    image: myapp:latest
    networks:
      - web
    # No ports exposed - only accessible through nginx

networks:
  web:
```

### Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    # Rate limiting zone
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Upstream backend
    upstream api_backend {
        server api:3000;
        keepalive 32;
    }

    # HTTP - redirect to HTTPS
    server {
        listen 80;
        server_name api.example.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS
    server {
        listen 443 ssl http2;
        server_name api.example.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers off;

        # Rate limiting
        limit_req zone=api_limit burst=20 nodelay;
        limit_conn conn_limit 10;

        location / {
            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Connection "";

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Health check endpoint (no rate limit)
        location /health {
            limit_req off;
            proxy_pass http://api_backend;
        }
    }
}
```

### Nginx with Let's Encrypt (Certbot)

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - certbot-webroot:/var/www/certbot:ro
      - certbot-certs:/etc/letsencrypt:ro

  certbot:
    image: certbot/certbot
    volumes:
      - certbot-webroot:/var/www/certbot
      - certbot-certs:/etc/letsencrypt
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

volumes:
  certbot-webroot:
  certbot-certs:
```

Initial certificate:
```bash
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  -d api.example.com
```

---

## Fail2ban Integration

Fail2ban monitors logs and bans IPs that show malicious patterns.

### Docker-Aware Fail2ban Setup

```yaml
# docker-compose.yml addition
services:
  fail2ban:
    image: crazymax/fail2ban:latest
    network_mode: host
    cap_add:
      - NET_ADMIN
      - NET_RAW
    volumes:
      - ./fail2ban:/data
      - ./logs:/var/log/nginx:ro
    environment:
      - TZ=UTC
      - F2B_LOG_LEVEL=INFO
```

### Fail2ban Jail Configuration

```ini
# fail2ban/jail.d/nginx.conf
[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 5
bantime = 3600

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 86400

[nginx-badbots]
enabled = true
filter = nginx-badbots
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 86400
```

### Custom Filter for API Abuse

```ini
# fail2ban/filter.d/nginx-api-abuse.conf
[Definition]
failregex = ^<HOST> .* "(GET|POST|PUT|DELETE) /api/.*" (429|403)
ignoreregex =
```

```ini
# fail2ban/jail.d/nginx-api-abuse.conf
[nginx-api-abuse]
enabled = true
filter = nginx-api-abuse
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 50
findtime = 60
bantime = 3600
```

---

## Security Hardening Checklist

### TLS Configuration

```nginx
# Modern TLS settings
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
ssl_prefer_server_ciphers off;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_session_tickets off;

# HSTS
add_header Strict-Transport-Security "max-age=63072000" always;
```

### Request Filtering

```nginx
# Block common attack patterns
location ~* \.(git|svn|htaccess|env|config)$ {
    deny all;
    return 404;
}

# Block SQL injection attempts
if ($query_string ~* "union.*select.*\(") {
    return 403;
}

# Limit request body size
client_max_body_size 10m;
```

### Hide Server Information

```nginx
# Don't reveal nginx version
server_tokens off;

# Custom error pages (don't leak stack traces)
error_page 500 502 503 504 /50x.html;
location = /50x.html {
    root /usr/share/nginx/html;
    internal;
}
```

---

## Complete Production Setup

```yaml
# docker-compose.yml
services:
  traefik:
    image: traefik:v3.0
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--accesslog=true"
      - "--accesslog.filepath=/logs/access.log"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - letsencrypt:/letsencrypt
      - ./logs/traefik:/logs
    networks:
      - web

  api:
    image: myapp:latest
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      # HTTPS router
      - "traefik.http.routers.api.rule=Host(`api.example.com`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      # Middlewares
      - "traefik.http.routers.api.middlewares=api-chain"
      - "traefik.http.middlewares.api-chain.chain.middlewares=https-redirect,rate-limit,security-headers"
      # Redirect HTTP to HTTPS
      - "traefik.http.middlewares.https-redirect.redirectscheme.scheme=https"
      # Rate limiting
      - "traefik.http.middlewares.rate-limit.ratelimit.average=100"
      - "traefik.http.middlewares.rate-limit.ratelimit.burst=50"
      # Security headers
      - "traefik.http.middlewares.security-headers.headers.stsSeconds=31536000"
      - "traefik.http.middlewares.security-headers.headers.forceSTSHeader=true"
      - "traefik.http.middlewares.security-headers.headers.contentTypeNosniff=true"
      - "traefik.http.middlewares.security-headers.headers.frameDeny=true"
    networks:
      - web
      - internal

  fail2ban:
    image: crazymax/fail2ban:latest
    restart: unless-stopped
    network_mode: host
    cap_add:
      - NET_ADMIN
      - NET_RAW
    volumes:
      - ./fail2ban:/data
      - ./logs/traefik:/var/log/traefik:ro

networks:
  web:
    external: true
  internal:

volumes:
  letsencrypt:
```

---

## Quick Reference

```bash
# Create external network for Traefik
docker network create web

# Generate htpasswd for basic auth
htpasswd -nb user password

# Test TLS configuration
curl -vI https://api.example.com

# Check certificate expiry
echo | openssl s_client -connect api.example.com:443 2>/dev/null | openssl x509 -noout -dates

# View fail2ban bans
docker compose exec fail2ban fail2ban-client status
docker compose exec fail2ban fail2ban-client status nginx-http-auth

# Unban an IP
docker compose exec fail2ban fail2ban-client set nginx-http-auth unbanip 1.2.3.4
```

---

## Summary

- Never expose containers directly to the internet
- Use Traefik for automatic, container-native configuration or Nginx for fine-grained control
- Always terminate TLS at the proxy, not in application containers
- Implement rate limiting to prevent abuse and DDoS
- Add fail2ban to automatically ban malicious IPs
- Use security headers to prevent common web attacks
- Keep certificates renewed automatically with Let's Encrypt

The reverse proxy is your first line of defense. Invest the time to configure it properly.
