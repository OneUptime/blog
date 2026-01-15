# How to Configure Nginx for Production React SPAs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Nginx, Production, Deployment, SPA, DevOps

Description: Learn how to configure Nginx to serve React single-page applications in production with optimal performance, security, and caching strategies.

---

## Introduction

Deploying a React single-page application (SPA) to production requires more than just running `npm run build`. While the build process generates optimized static files, serving these files efficiently requires a robust web server configuration. Nginx has become the de facto standard for serving static content and React applications due to its exceptional performance, low memory footprint, and extensive configuration options.

In this comprehensive guide, we will walk through every aspect of configuring Nginx for production React SPAs. From basic setup to advanced optimization techniques, you will learn how to achieve optimal performance, implement proper caching strategies, enable compression, configure security headers, and handle the unique routing requirements of single-page applications.

## Why Nginx for React SPAs?

Before diving into configuration details, let us understand why Nginx is the preferred choice for serving React applications:

### Performance Benefits

Nginx uses an event-driven, asynchronous architecture that can handle thousands of concurrent connections with minimal memory usage. Unlike traditional web servers that spawn a new process or thread for each connection, Nginx operates with a small, predictable memory footprint.

### Static File Serving

React applications, once built, consist entirely of static files (HTML, CSS, JavaScript, images). Nginx excels at serving static content with features like:

- Efficient file caching
- Zero-copy data transfer using sendfile
- Automatic content negotiation
- Built-in gzip compression

### Reverse Proxy Capabilities

Most production React applications communicate with backend APIs. Nginx can act as a reverse proxy, routing API requests to your backend servers while serving static files directly.

### SSL/TLS Termination

Nginx handles HTTPS encryption efficiently, offloading cryptographic operations from your application servers.

## Prerequisites

Before proceeding, ensure you have:

- A Linux server (Ubuntu, CentOS, or similar)
- Nginx installed (version 1.18 or higher recommended)
- A React application built for production
- Basic familiarity with Linux command line
- Root or sudo access to the server

## Building Your React Application

First, let us prepare the React application for production deployment:

```bash
# Navigate to your React project directory
cd /path/to/your/react-app

# Install dependencies
npm install

# Create production build
npm run build
```

The build command generates optimized files in the `build` directory (or `dist` for Vite-based projects). This directory contains:

- `index.html` - The main HTML file
- `static/js/` - Bundled and minified JavaScript files
- `static/css/` - Bundled and minified CSS files
- `static/media/` - Images and other media files
- Asset manifest files

## Basic Nginx Configuration

Let us start with a basic Nginx configuration and progressively enhance it.

### Directory Structure

Create the necessary directories and copy your build files:

```bash
# Create web root directory
sudo mkdir -p /var/www/react-app

# Copy build files
sudo cp -r /path/to/your/react-app/build/* /var/www/react-app/

# Set proper ownership
sudo chown -R www-data:www-data /var/www/react-app

# Set proper permissions
sudo chmod -R 755 /var/www/react-app
```

### Basic Server Block

Create a new Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/react-app
```

Add the following basic configuration:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/react-app;
    index index.html;

    # Handle React Router - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable the site:

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/react-app /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Understanding SPA Routing with try_files

The most critical aspect of serving a React SPA is handling client-side routing. The `try_files` directive is essential for this purpose.

### How try_files Works

```nginx
try_files $uri $uri/ /index.html;
```

This directive tells Nginx to:

1. First, try to serve the exact file requested (`$uri`)
2. If that fails, try to serve it as a directory (`$uri/`)
3. If both fail, serve `index.html` (fallback for React Router)

### Why This Matters

When a user navigates to `/dashboard` in your React app:

1. React Router handles the navigation client-side
2. The URL changes to `/dashboard`
3. If the user refreshes the page, the browser requests `/dashboard` from the server
4. Without `try_files`, Nginx would return a 404 error
5. With `try_files`, Nginx serves `index.html`, and React Router handles the route

## Complete Production Configuration

Here is a comprehensive Nginx configuration for production React SPAs:

```nginx
# Main server block for HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Document root
    root /var/www/react-app;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.yourdomain.com;" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
    gzip_min_length 256;
    gzip_types
        application/atom+xml
        application/geo+json
        application/javascript
        application/x-javascript
        application/json
        application/ld+json
        application/manifest+json
        application/rdf+xml
        application/rss+xml
        application/xhtml+xml
        application/xml
        font/eot
        font/otf
        font/ttf
        image/svg+xml
        text/css
        text/javascript
        text/plain
        text/xml;

    # Brotli compression (if module available)
    # brotli on;
    # brotli_comp_level 6;
    # brotli_types application/javascript application/json application/xml text/css text/javascript text/plain text/xml image/svg+xml;

    # Cache static assets with hashed filenames
    location ~* \.(?:css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Cache images and fonts
    location ~* \.(?:jpg|jpeg|gif|png|ico|svg|webp|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Cache JSON and XML files
    location ~* \.(?:json|xml)$ {
        expires 1d;
        add_header Cache-Control "public, must-revalidate";
    }

    # Service worker - no cache
    location = /service-worker.js {
        expires off;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Manifest file - short cache
    location = /manifest.json {
        expires 1d;
        add_header Cache-Control "public, must-revalidate";
    }

    # index.html - no cache to ensure latest version
    location = /index.html {
        expires off;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
    }

    # Main location block for SPA routing
    location / {
        try_files $uri $uri/ /index.html;

        # Prevent caching of HTML files
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires 0;
    }

    # API reverse proxy
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
        proxy_connect_timeout 90;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Deny access to sensitive files
    location ~* (?:\.(?:bak|conf|dist|fla|in[ci]|log|psd|sh|sql|sw[op])|~)$ {
        deny all;
    }

    # Error pages
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }

    # Logging
    access_log /var/log/nginx/react-app.access.log;
    error_log /var/log/nginx/react-app.error.log;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# Redirect www to non-www (optional)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    return 301 https://yourdomain.com$request_uri;
}
```

## Deep Dive: Gzip Compression

Gzip compression significantly reduces the size of transmitted data, improving load times and reducing bandwidth costs.

### Understanding Gzip Settings

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_buffers 16 8k;
gzip_http_version 1.1;
gzip_min_length 256;
```

Let us break down each directive:

| Directive | Value | Purpose |
|-----------|-------|---------|
| `gzip on` | on | Enables gzip compression |
| `gzip_vary` | on | Adds Vary: Accept-Encoding header |
| `gzip_proxied` | any | Compress responses from proxied requests |
| `gzip_comp_level` | 6 | Compression level (1-9, 6 is optimal balance) |
| `gzip_buffers` | 16 8k | Number and size of compression buffers |
| `gzip_http_version` | 1.1 | Minimum HTTP version for compression |
| `gzip_min_length` | 256 | Minimum file size to compress |

### Compression Level Trade-offs

The compression level affects CPU usage and compression ratio:

| Level | CPU Usage | Compression Ratio | Use Case |
|-------|-----------|-------------------|----------|
| 1-3 | Low | Lower | High-traffic servers |
| 4-6 | Medium | Good | Most production servers |
| 7-9 | High | Maximum | When bandwidth is critical |

### MIME Types to Compress

Only compress text-based content that benefits from compression:

```nginx
gzip_types
    application/atom+xml
    application/geo+json
    application/javascript
    application/x-javascript
    application/json
    application/ld+json
    application/manifest+json
    application/rdf+xml
    application/rss+xml
    application/xhtml+xml
    application/xml
    font/eot
    font/otf
    font/ttf
    image/svg+xml
    text/css
    text/javascript
    text/plain
    text/xml;
```

Note: Do not compress already-compressed formats like JPEG, PNG, GIF, or WOFF2.

## Deep Dive: Caching Strategies

Effective caching is crucial for React SPA performance. The strategy differs based on how files are named and versioned.

### Understanding Cache Headers

```nginx
# Long-term cache for hashed files
expires 1y;
add_header Cache-Control "public, immutable";
```

The `immutable` directive tells browsers the file will never change, preventing revalidation requests.

### Cache Strategy by File Type

| File Type | Cache Duration | Cache-Control | Reason |
|-----------|---------------|---------------|--------|
| index.html | None | no-cache, no-store | Must always check for updates |
| JS bundles (hashed) | 1 year | public, immutable | Hash changes when content changes |
| CSS bundles (hashed) | 1 year | public, immutable | Hash changes when content changes |
| Images (hashed) | 1 year | public, immutable | Hash changes when content changes |
| service-worker.js | None | no-cache, no-store | Must always be fresh |
| manifest.json | 1 day | public, must-revalidate | May change occasionally |
| favicon.ico | 1 week | public | Rarely changes |

### Why Not Cache index.html?

The `index.html` file contains references to your JavaScript and CSS bundles with their hashed filenames. When you deploy an update:

1. New bundles are created with new hashes
2. `index.html` is updated to reference the new bundles
3. If `index.html` is cached, users will request old bundle files that no longer exist

### Implementing Cache Busting

Modern React build tools (Create React App, Vite, Next.js) automatically add content hashes to filenames:

```
main.abc123.js
styles.def456.css
logo.789ghi.png
```

This allows aggressive caching because:
- Same hash = same content (safe to cache forever)
- Different hash = new content (new file, no cache conflict)

## Deep Dive: Security Headers

Security headers protect your application and users from various attacks.

### Content Security Policy (CSP)

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.yourdomain.com;" always;
```

| Directive | Value | Purpose |
|-----------|-------|---------|
| `default-src` | 'self' | Default policy for all content |
| `script-src` | 'self' 'unsafe-inline' | Allow scripts from same origin |
| `style-src` | 'self' 'unsafe-inline' | Allow styles from same origin |
| `img-src` | 'self' data: https: | Allow images from various sources |
| `font-src` | 'self' data: | Allow fonts from same origin and data URIs |
| `connect-src` | 'self' https://api... | Allow XHR/fetch to specified origins |

### Other Security Headers

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

| Header | Purpose |
|--------|---------|
| `X-Frame-Options` | Prevents clickjacking by controlling iframe embedding |
| `X-Content-Type-Options` | Prevents MIME type sniffing |
| `X-XSS-Protection` | Enables browser XSS filter |
| `Referrer-Policy` | Controls referrer information in requests |
| `Strict-Transport-Security` | Enforces HTTPS connections |
| `Permissions-Policy` | Controls browser feature permissions |

## API Reverse Proxy Configuration

Most React applications communicate with backend APIs. Nginx can proxy these requests efficiently.

### Basic Proxy Configuration

```nginx
location /api/ {
    proxy_pass http://localhost:3001/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 90;
    proxy_connect_timeout 90;
}
```

### Proxy Headers Explained

| Header | Purpose |
|--------|---------|
| `Host` | Preserves original host header |
| `X-Real-IP` | Passes client IP to backend |
| `X-Forwarded-For` | Chain of proxy IPs |
| `X-Forwarded-Proto` | Original protocol (HTTP/HTTPS) |
| `Upgrade` | WebSocket support |
| `Connection` | WebSocket support |

### Load Balancing Multiple Backends

```nginx
upstream api_servers {
    least_conn;
    server 127.0.0.1:3001 weight=5;
    server 127.0.0.1:3002 weight=5;
    server 127.0.0.1:3003 backup;
    keepalive 32;
}

location /api/ {
    proxy_pass http://api_servers/;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    # ... other proxy settings
}
```

## Performance Optimization

### Enable HTTP/2

HTTP/2 provides significant performance improvements:

```nginx
listen 443 ssl http2;
```

Benefits include:
- Multiplexing (multiple requests over single connection)
- Header compression
- Server push capability
- Stream prioritization

### Worker Processes and Connections

Configure Nginx workers in the main configuration file (`/etc/nginx/nginx.conf`):

```nginx
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}
```

| Directive | Recommended Value | Purpose |
|-----------|-------------------|---------|
| `worker_processes` | auto | Match CPU cores |
| `worker_rlimit_nofile` | 65535 | Maximum open files per worker |
| `worker_connections` | 4096 | Connections per worker |
| `use epoll` | epoll | Efficient event method (Linux) |
| `multi_accept` | on | Accept multiple connections |

### Buffer Settings

```nginx
http {
    client_body_buffer_size 10K;
    client_header_buffer_size 1k;
    client_max_body_size 8m;
    large_client_header_buffers 4 32k;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;

    keepalive_timeout 65;
    keepalive_requests 100;
}
```

### Open File Cache

```nginx
open_file_cache max=10000 inactive=20s;
open_file_cache_valid 30s;
open_file_cache_min_uses 2;
open_file_cache_errors on;
```

This caches file descriptors and metadata for frequently accessed files.

## SSL/TLS Configuration

### Obtaining SSL Certificates

Using Let's Encrypt with Certbot:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

### SSL Session Configuration

```nginx
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_session_tickets off;
```

### Modern TLS Configuration

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
```

### OCSP Stapling

```nginx
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
```

OCSP stapling improves SSL handshake performance by caching certificate revocation status.

## Monitoring and Logging

### Access Log Format

```nginx
log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                '$status $body_bytes_sent "$http_referer" '
                '"$http_user_agent" "$http_x_forwarded_for" '
                'rt=$request_time uct="$upstream_connect_time" '
                'uht="$upstream_header_time" urt="$upstream_response_time"';

access_log /var/log/nginx/react-app.access.log main;
```

### JSON Log Format

For easier parsing with log aggregation tools:

```nginx
log_format json_combined escape=json
    '{'
        '"time_local":"$time_local",'
        '"remote_addr":"$remote_addr",'
        '"remote_user":"$remote_user",'
        '"request":"$request",'
        '"status": "$status",'
        '"body_bytes_sent":"$body_bytes_sent",'
        '"request_time":"$request_time",'
        '"http_referrer":"$http_referer",'
        '"http_user_agent":"$http_user_agent"'
    '}';
```

### Stub Status for Monitoring

```nginx
location /nginx_status {
    stub_status on;
    allow 127.0.0.1;
    deny all;
}
```

This exposes basic Nginx metrics for monitoring tools.

## Docker Deployment

For containerized deployments, here is a complete Dockerfile and Nginx configuration:

### Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Nginx Configuration

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_types
        text/plain
        text/css
        text/xml
        application/json
        application/javascript
        application/xml+rss
        image/svg+xml;

    # Cache static assets
    location ~* \.(?:css|js|jpg|jpeg|gif|png|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Health check
    location /health {
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}
```

### Docker Compose

```yaml
version: '3.8'
services:
  react-app:
    build: .
    ports:
      - "80:80"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Troubleshooting Common Issues

### 404 Errors on Page Refresh

**Problem:** Refreshing the page on a route like `/dashboard` returns 404.

**Solution:** Ensure `try_files` directive is properly configured:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### Static Assets Not Loading

**Problem:** CSS and JavaScript files return 404.

**Solution:** Check the `root` directive points to the correct directory and verify file permissions:

```bash
sudo chown -R www-data:www-data /var/www/react-app
sudo chmod -R 755 /var/www/react-app
```

### Gzip Not Working

**Problem:** Response headers show no compression.

**Solution:** Verify the content type is included in `gzip_types` and the response is larger than `gzip_min_length`.

### Cache Headers Not Applied

**Problem:** Browser shows wrong cache headers.

**Solution:** Note that `add_header` in nested blocks may override parent headers. Use the `always` parameter:

```nginx
add_header Cache-Control "public, immutable" always;
```

### SSL Certificate Errors

**Problem:** Browser shows certificate warnings.

**Solution:** Verify certificate paths and ensure the certificate chain is complete:

```bash
sudo certbot certificates
sudo nginx -t
```

## Configuration Checklist

Use this checklist when deploying your React SPA:

| Item | Status | Notes |
|------|--------|-------|
| SSL certificate installed | Required | Use Let's Encrypt for free certificates |
| HTTP to HTTPS redirect | Required | Redirect all HTTP traffic to HTTPS |
| try_files configured | Required | Essential for SPA routing |
| Gzip compression enabled | Required | Reduces transfer size by 60-80% |
| Static asset caching | Required | Long-term cache with immutable flag |
| index.html no-cache | Required | Ensures users get latest version |
| Security headers | Required | CSP, HSTS, X-Frame-Options, etc. |
| Error pages configured | Recommended | Custom 404 and 500 pages |
| Access logging enabled | Recommended | For debugging and analytics |
| API proxy configured | Optional | If frontend and backend share domain |
| HTTP/2 enabled | Recommended | Better multiplexing performance |
| OCSP stapling enabled | Recommended | Faster SSL handshakes |
| Rate limiting | Optional | Protect against abuse |

## Summary

Configuring Nginx for production React SPAs involves several key areas:

### Essential Configuration

1. **SPA Routing**: Use `try_files $uri $uri/ /index.html` to handle client-side routing
2. **SSL/TLS**: Always use HTTPS with modern TLS 1.2+ and strong ciphers
3. **Compression**: Enable gzip with level 6 for text-based content
4. **Caching**: Aggressive caching for hashed assets, no caching for index.html

### Security Measures

1. Security headers (CSP, HSTS, X-Frame-Options, etc.)
2. Deny access to hidden and sensitive files
3. HTTPS redirect and HSTS preloading

### Performance Optimization

1. HTTP/2 multiplexing
2. Open file cache
3. Optimized worker processes and connections
4. Efficient buffer settings

### Configuration Summary Table

| Category | Directive/Setting | Recommended Value | Impact |
|----------|-------------------|-------------------|--------|
| **Routing** | try_files | $uri $uri/ /index.html | Essential for SPA |
| **Compression** | gzip_comp_level | 6 | Best balance |
| **Compression** | gzip_min_length | 256 | Avoid tiny files |
| **Caching** | Static assets | 1 year, immutable | Max performance |
| **Caching** | index.html | no-cache, no-store | Always fresh |
| **SSL** | Protocols | TLSv1.2 TLSv1.3 | Modern security |
| **SSL** | Session cache | shared:SSL:50m | Faster handshakes |
| **Performance** | HTTP/2 | Enabled | Multiplexing |
| **Performance** | sendfile | on | Zero-copy transfer |
| **Performance** | tcp_nopush | on | Packet optimization |
| **Security** | HSTS max-age | 31536000 (1 year) | Force HTTPS |
| **Security** | X-Frame-Options | SAMEORIGIN | Prevent clickjacking |

By following this guide, you will have a robust, secure, and high-performance Nginx configuration for your React SPA. Remember to test your configuration thoroughly in a staging environment before deploying to production, and regularly update both Nginx and your SSL certificates.

## Additional Resources

For further reading and advanced topics:

- [Nginx Official Documentation](https://nginx.org/en/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [Security Headers Reference](https://securityheaders.com/)
- [WebPageTest](https://www.webpagetest.org/) - Performance testing
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Performance auditing
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

By implementing these configurations, your React SPA will be well-prepared for production traffic with optimal performance, security, and reliability.
