# How to Expose Docker Containers to the Internet Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Security, Networking, DevOps, Reverse Proxy

Description: Set up Traefik or Nginx reverse proxies with TLS termination, rate limiting, and fail2ban patterns to safely expose containerized services to the internet.

Exposing containers directly to the internet is asking for trouble. Port scanning bots find open services within minutes. A reverse proxy acts as a security boundary, handling TLS, rate limiting, and access control so your application doesn't have to.

---

## Why Never Expose Containers Directly

Direct port exposure bypasses all security layers and puts your application at risk:

```bash
# DON'T do this for production
# Your application handles TLS, rate limiting, and all attacks directly
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

This Docker Compose configuration sets up Traefik with automatic Let's Encrypt certificates:

```yaml
# docker-compose.yml
services:
  traefik:
    image: traefik:v3.0
    command:
      # Enable the Traefik dashboard for monitoring
      - "--api.dashboard=true"
      # Use Docker as the provider for automatic service discovery
      - "--providers.docker=true"
      # Don't expose containers by default - require explicit labels
      - "--providers.docker.exposedbydefault=false"
      # Define HTTP entrypoint on port 80
      - "--entrypoints.web.address=:80"
      # Define HTTPS entrypoint on port 443
      - "--entrypoints.websecure.address=:443"
      # Configure Let's Encrypt with HTTP challenge
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      # Mount Docker socket for container discovery (read-only for security)
      - /var/run/docker.sock:/var/run/docker.sock:ro
      # Persist Let's Encrypt certificates
      - letsencrypt:/letsencrypt
    networks:
      - web

  api:
    image: myapp:latest
    labels:
      # Enable Traefik for this container
      - "traefik.enable=true"
      # Route requests for api.example.com to this container
      - "traefik.http.routers.api.rule=Host(`api.example.com`)"
      # Use HTTPS entrypoint
      - "traefik.http.routers.api.entrypoints=websecure"
      # Use Let's Encrypt for TLS certificates
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      # Tell Traefik which port the container listens on
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

Configure automatic HTTP to HTTPS redirection:

```yaml
# Force HTTP to HTTPS using middleware
labels:
  # Create HTTP router for redirect
  - "traefik.http.routers.api-http.rule=Host(`api.example.com`)"
  - "traefik.http.routers.api-http.entrypoints=web"
  # Apply redirect middleware
  - "traefik.http.routers.api-http.middlewares=https-redirect"
  # Define the redirect middleware
  - "traefik.http.middlewares.https-redirect.redirectscheme.scheme=https"
```

### Rate Limiting with Traefik

Protect your services from abuse with rate limiting:

```yaml
labels:
  # Rate limit: 100 requests per second average, burst of 50
  # Prevents DDoS and API abuse
  - "traefik.http.middlewares.api-ratelimit.ratelimit.average=100"
  - "traefik.http.middlewares.api-ratelimit.ratelimit.burst=50"
  # Apply rate limit middleware to the router
  - "traefik.http.routers.api.middlewares=api-ratelimit"
```

### IP Whitelist

Restrict access to specific IP ranges for internal services:

```yaml
labels:
  # Only allow specific IP ranges (internal networks)
  - "traefik.http.middlewares.api-whitelist.ipwhitelist.sourcerange=10.0.0.0/8,192.168.1.0/24"
  # Apply whitelist middleware to the router
  - "traefik.http.routers.api.middlewares=api-whitelist"
```

### Basic Authentication

Add username/password authentication for simple protection:

Generate the password hash first:

```bash
# Generate password hash using htpasswd
# The output is used in the Traefik label
htpasswd -nb admin secretpassword
```

Apply basic auth in container labels:

```yaml
labels:
  # Add basic authentication (note: $$ escapes $ in docker-compose)
  - "traefik.http.middlewares.api-auth.basicauth.users=admin:$$apr1$$xyz..."
  # Apply auth middleware to the router
  - "traefik.http.routers.api.middlewares=api-auth"
```

---

## Option 2: Nginx (Traditional and Flexible)

Nginx offers more control and is familiar to most ops teams. It requires manual configuration but provides fine-grained control.

### Basic Nginx Reverse Proxy

This setup uses Nginx as a reverse proxy in front of your application:

```yaml
# docker-compose.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      # Only Nginx is exposed to the internet
      - "80:80"
      - "443:443"
    volumes:
      # Mount configuration file
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      # Mount SSL certificates
      - ./ssl:/etc/nginx/ssl:ro
      # Mount log directory for fail2ban integration
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

A comprehensive Nginx configuration with security features:

```nginx
# nginx.conf
events {
    # Maximum simultaneous connections per worker
    worker_connections 1024;
}

http {
    # Rate limiting zone - tracks requests per IP
    # 10m zone size allows tracking ~160,000 IPs
    # rate=10r/s means 10 requests per second per IP
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    # Connection limiting zone - limits simultaneous connections per IP
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

    # Logging format - includes all fields needed for security analysis
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Security headers - protect against common web attacks
    add_header X-Frame-Options "SAMEORIGIN" always;        # Prevent clickjacking
    add_header X-Content-Type-Options "nosniff" always;    # Prevent MIME sniffing
    add_header X-XSS-Protection "1; mode=block" always;    # XSS filter

    # Upstream backend - defines the application server pool
    upstream api_backend {
        # Container name resolves via Docker DNS
        server api:3000;
        # Keep connections alive for better performance
        keepalive 32;
    }

    # HTTP server - redirect to HTTPS
    server {
        listen 80;
        server_name api.example.com;
        # Permanent redirect to HTTPS
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server - main application entry point
    server {
        listen 443 ssl http2;
        server_name api.example.com;

        # SSL certificate configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        # Modern TLS configuration - disable old protocols
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers off;

        # Rate limiting - burst allows temporary spikes, nodelay returns 503 immediately
        limit_req zone=api_limit burst=20 nodelay;
        # Connection limiting - max 10 simultaneous connections per IP
        limit_conn conn_limit 10;

        location / {
            proxy_pass http://api_backend;
            # Use HTTP/1.1 for keepalive connections
            proxy_http_version 1.1;
            # Pass original host header to backend
            proxy_set_header Host $host;
            # Pass real client IP to backend
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            # Disable connection header for keepalive
            proxy_set_header Connection "";

            # Timeouts - prevent slow connections from blocking workers
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Health check endpoint - no rate limit for monitoring
        location /health {
            limit_req off;  # Disable rate limiting for health checks
            proxy_pass http://api_backend;
        }
    }
}
```

### Nginx with Let's Encrypt (Certbot)

Automated certificate management with Certbot:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      # Webroot for ACME challenge
      - certbot-webroot:/var/www/certbot:ro
      # Certificate storage
      - certbot-certs:/etc/letsencrypt:ro

  # Certbot container for automatic certificate renewal
  certbot:
    image: certbot/certbot
    volumes:
      - certbot-webroot:/var/www/certbot
      - certbot-certs:/etc/letsencrypt
    # Run renewal check every 12 hours
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

volumes:
  certbot-webroot:
  certbot-certs:
```

Initial certificate:

```bash
# Obtain initial certificate using webroot authentication
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  -d api.example.com
```

---

## Fail2ban Integration

Fail2ban monitors logs and bans IPs that show malicious patterns.

### Docker-Aware Fail2ban Setup

This configuration runs fail2ban in a container with access to Nginx logs:

```yaml
# docker-compose.yml addition
services:
  fail2ban:
    image: crazymax/fail2ban:latest
    # Host network mode required to modify host iptables
    network_mode: host
    # Capabilities needed to modify firewall rules
    cap_add:
      - NET_ADMIN
      - NET_RAW
    volumes:
      # Fail2ban configuration directory
      - ./fail2ban:/data
      # Nginx logs for monitoring (read-only)
      - ./logs:/var/log/nginx:ro
    environment:
      - TZ=UTC
      - F2B_LOG_LEVEL=INFO
```

### Fail2ban Jail Configuration

Define jails for different attack patterns:

```ini
# fail2ban/jail.d/nginx.conf
# Ban IPs with too many authentication failures
[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 5
bantime = 3600

# Ban IPs scanning for vulnerabilities (404 errors)
[nginx-botsearch]
enabled = true
filter = nginx-botsearch
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 86400

# Ban known bad bots
[nginx-badbots]
enabled = true
filter = nginx-badbots
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 86400
```

### Custom Filter for API Abuse

Create custom filters for application-specific abuse patterns:

```ini
# fail2ban/filter.d/nginx-api-abuse.conf
[Definition]
# Match IPs receiving 429 (rate limited) or 403 (forbidden) responses
failregex = ^<HOST> .* "(GET|POST|PUT|DELETE) /api/.*" (429|403)
ignoreregex =
```

Configure the jail for the custom filter:

```ini
# fail2ban/jail.d/nginx-api-abuse.conf
[nginx-api-abuse]
enabled = true
filter = nginx-api-abuse
port = http,https
logpath = /var/log/nginx/access.log
# Ban after 50 rate-limit hits within 60 seconds
maxretry = 50
findtime = 60
bantime = 3600
```

---

## Security Hardening Checklist

### TLS Configuration

Modern TLS settings for maximum security:

```nginx
# Modern TLS settings - disable vulnerable protocols and ciphers
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
ssl_prefer_server_ciphers off;
# Session caching for performance
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
# Disable session tickets (potential security issue)
ssl_session_tickets off;

# HSTS - force browsers to always use HTTPS
add_header Strict-Transport-Security "max-age=63072000" always;
```

### Request Filtering

Block common attack patterns at the proxy level:

```nginx
# Block common attack patterns - return 404 to avoid revealing information
location ~* \.(git|svn|htaccess|env|config)$ {
    deny all;
    return 404;
}

# Block SQL injection attempts in query strings
if ($query_string ~* "union.*select.*\(") {
    return 403;
}

# Limit request body size to prevent large payload attacks
client_max_body_size 10m;
```

### Hide Server Information

Prevent information disclosure about your server:

```nginx
# Don't reveal nginx version in error pages or headers
server_tokens off;

# Custom error pages - prevent stack traces from reaching users
error_page 500 502 503 504 /50x.html;
location = /50x.html {
    root /usr/share/nginx/html;
    internal;  # Only accessible via error_page directive
}
```

---

## Complete Production Setup

A complete production-ready setup combining Traefik, security middlewares, and fail2ban:

```yaml
# docker-compose.yml
services:
  traefik:
    image: traefik:v3.0
    restart: unless-stopped
    # Prevent privilege escalation attacks
    security_opt:
      - no-new-privileges:true
    command:
      # Docker provider configuration
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      # Entrypoints for HTTP and HTTPS
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      # Let's Encrypt with TLS challenge
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      # Access logging for fail2ban integration
      - "--accesslog=true"
      - "--accesslog.filepath=/logs/access.log"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      # Docker socket for service discovery (read-only)
      - /var/run/docker.sock:/var/run/docker.sock:ro
      # Certificate storage
      - letsencrypt:/letsencrypt
      # Access logs for fail2ban
      - ./logs/traefik:/logs
    networks:
      - web

  api:
    image: myapp:latest
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      # HTTPS router configuration
      - "traefik.http.routers.api.rule=Host(`api.example.com`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      # Apply middleware chain for security
      - "traefik.http.routers.api.middlewares=api-chain"
      # Define middleware chain: redirect, rate limit, security headers
      - "traefik.http.middlewares.api-chain.chain.middlewares=https-redirect,rate-limit,security-headers"
      # Redirect HTTP to HTTPS
      - "traefik.http.middlewares.https-redirect.redirectscheme.scheme=https"
      # Rate limiting: 100 req/s average, 50 burst
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

  # Fail2ban for automatic IP banning
  fail2ban:
    image: crazymax/fail2ban:latest
    restart: unless-stopped
    network_mode: host
    cap_add:
      - NET_ADMIN
      - NET_RAW
    volumes:
      # Fail2ban configuration
      - ./fail2ban:/data
      # Traefik logs for monitoring
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

Common commands for managing reverse proxies and security:

```bash
# Create external network for Traefik (run once)
docker network create web

# Generate htpasswd for basic auth
htpasswd -nb user password

# Test TLS configuration
curl -vI https://api.example.com

# Check certificate expiry date
echo | openssl s_client -connect api.example.com:443 2>/dev/null | openssl x509 -noout -dates

# View fail2ban status and banned IPs
docker compose exec fail2ban fail2ban-client status
docker compose exec fail2ban fail2ban-client status nginx-http-auth

# Unban an IP that was incorrectly banned
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
