# How to Set Up HTTP/2 with Node.js Behind Nginx

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Nginx, NodeJS, HTTP2, Performance, DevOps

Description: Learn how to configure HTTP/2 between clients and Nginx, and optimize the connection between Nginx and your Node.js backend for maximum performance.

---

HTTP/2 delivers significant performance improvements over HTTP/1.1, including multiplexing, header compression, and server push. When running Node.js applications behind Nginx, you have multiple options for implementing HTTP/2. This guide covers the optimal configuration for production environments.

## Understanding the Architecture

When Nginx sits in front of Node.js, there are two separate connections to consider:

```mermaid
flowchart LR
    A[Client Browser] -->|HTTP/2 + TLS| B[Nginx]
    B -->|HTTP/1.1| C[Node.js]

    style A fill:#e1f5fe
    style B fill:#fff3e0
    style C fill:#e8f5e9
```

The recommended approach is:
- **Client to Nginx**: HTTP/2 with TLS (required by browsers)
- **Nginx to Node.js**: HTTP/1.1 with keepalive (simpler, efficient for internal traffic)

## Why HTTP/1.1 Backend is Recommended

While you can configure HTTP/2 all the way through, using HTTP/1.1 between Nginx and Node.js is often better because:

| Aspect | HTTP/2 Backend | HTTP/1.1 Backend |
|--------|---------------|------------------|
| Configuration complexity | High | Low |
| TLS requirement | Required | Optional |
| Performance gain | Minimal | N/A |
| Debugging | Harder | Easier |
| Connection reuse | Built-in | Via keepalive |

The performance benefits of HTTP/2 come from multiplexing many client requests over fewer connections. Between Nginx and your backend on localhost, HTTP/1.1 with connection pooling achieves similar efficiency.

## Step 1: SSL Certificate Setup

HTTP/2 requires TLS in browsers. Set up certificates first:

```bash
# For production - use Let's Encrypt
certbot certonly --nginx -d example.com -d www.example.com

# For development - create self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/dev.key \
    -out /etc/nginx/ssl/dev.crt \
    -subj "/CN=localhost"
```

## Step 2: Nginx HTTP/2 Configuration

Configure Nginx to accept HTTP/2 connections from clients:

```nginx
# /etc/nginx/nginx.conf

user www-data;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /run/nginx.pid;

events {
    worker_connections 2048;
    use epoll;
    multi_accept on;
}

http {
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # MIME types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript
               application/xml application/xml+rss text/javascript;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # Upstream Node.js servers
    upstream nodejs_backend {
        server 127.0.0.1:3000;
        server 127.0.0.1:3001;
        keepalive 64;
    }

    include /etc/nginx/conf.d/*.conf;
}
```

## Step 3: Server Block with HTTP/2

Create the server configuration:

```nginx
# /etc/nginx/conf.d/app.conf

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;

    return 301 https://$server_name$request_uri;
}

# HTTPS server with HTTP/2
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;

    server_name example.com www.example.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/example.com/chain.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;

    # Root for static files
    root /var/www/app/public;

    # Static files - served directly by Nginx
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # API and dynamic content - proxy to Node.js
    location / {
        proxy_pass http://nodejs_backend;

        # Use HTTP/1.1 for upstream
        proxy_http_version 1.1;

        # Connection reuse
        proxy_set_header Connection "";

        # Required headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://nodejs_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

## Step 4: Node.js Application

Configure your Node.js app to work optimally with this setup:

```javascript
// app.js
const express = require('express');
const app = express();

// Trust proxy - important for getting real client IP
app.set('trust proxy', true);

// Parse JSON bodies
app.use(express.json());

// Request logging with real IP
app.use((req, res, next) => {
    const clientIP = req.headers['x-real-ip'] || req.ip;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    console.log(`${new Date().toISOString()} - ${clientIP} - ${protocol} - ${req.method} ${req.url}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        protocol: req.protocol,
        http2: req.httpVersion === '2.0'
    });
});

// API routes
app.get('/api/data', async (req, res) => {
    // Your API logic
    res.json({ message: 'Hello from Node.js', timestamp: Date.now() });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running on http://127.0.0.1:${PORT}`);
});
```

## Step 5: HTTP/2 Server Push (Optional)

Nginx can push resources to clients before they request them:

```nginx
location / {
    proxy_pass http://nodejs_backend;

    # Push critical assets
    http2_push /static/css/main.css;
    http2_push /static/js/app.js;

    # Or use Link header from Node.js
    http2_push_preload on;
}
```

In Node.js, set the Link header:

```javascript
app.get('/', (req, res) => {
    // Tell Nginx to push these resources
    res.set('Link', [
        '</static/css/main.css>; rel=preload; as=style',
        '</static/js/app.js>; rel=preload; as=script'
    ].join(', '));

    res.send('<!DOCTYPE html>...');
});
```

## Step 6: Verify HTTP/2 is Working

### Using curl

```bash
# Check protocol negotiation
curl -I --http2 -k https://example.com

# Expected output includes:
# HTTP/2 200
```

### Using Browser DevTools

1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Right-click column headers and enable "Protocol"
4. Reload the page - you should see "h2" for HTTP/2 requests

### Using openssl

```bash
openssl s_client -connect example.com:443 -alpn h2 </dev/null 2>/dev/null | grep ALPN
# Should show: ALPN protocol: h2
```

## Performance Optimization

### Connection Pooling

Configure optimal keepalive settings:

```nginx
upstream nodejs_backend {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;

    keepalive 64;                    # Connection pool size
    keepalive_requests 1000;         # Max requests per connection
    keepalive_timeout 60s;           # Idle connection timeout
}
```

### Buffer Tuning

Optimize proxy buffers for your response sizes:

```nginx
location /api/ {
    proxy_pass http://nodejs_backend;

    # For APIs with small JSON responses
    proxy_buffering on;
    proxy_buffer_size 4k;
    proxy_buffers 8 4k;
    proxy_busy_buffers_size 8k;

    # For large file downloads
    # proxy_buffering off;
}
```

### Enable HPACK

HTTP/2 header compression (HPACK) is enabled by default. Verify with:

```bash
# Check HTTP/2 with header details
curl -v --http2 https://example.com 2>&1 | grep -i http/2
```

## Complete Configuration Example

Here is a production-ready configuration combining all elements:

```nginx
upstream nodejs_backend {
    least_conn;
    server 127.0.0.1:3000 weight=1;
    server 127.0.0.1:3001 weight=1;
    keepalive 64;
}

server {
    listen 443 ssl;
    http2 on;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Security
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Compression
    gzip on;
    gzip_types application/json text/plain application/javascript text/css;

    # Static assets
    location /static/ {
        root /var/www/app/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy
    location / {
        proxy_pass http://nodejs_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
}
```

## Summary

Setting up HTTP/2 with Node.js behind Nginx involves:

1. **TLS certificates** - Required for HTTP/2 in browsers
2. **Nginx HTTP/2** - Enable with `http2 on` directive
3. **HTTP/1.1 backend** - Use connection pooling with keepalive
4. **Proper headers** - Forward client information to Node.js
5. **Verification** - Test with curl and browser DevTools

This architecture gives you the performance benefits of HTTP/2 for client connections while maintaining simplicity and debuggability for your internal traffic. The keepalive connection pool ensures efficient reuse of backend connections without the complexity of end-to-end HTTP/2.
