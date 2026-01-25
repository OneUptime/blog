# How to Integrate Node.js with Nginx

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, Nginx, DevOps, Reverse Proxy, Performance

Description: Learn how to configure Nginx as a reverse proxy for Node.js applications, handle load balancing, SSL termination, and optimize performance for production deployments.

---

Running Node.js directly in production without a reverse proxy is like driving without a seatbelt. It works until it does not. Nginx sits in front of your Node.js application, handling tasks that Node.js was never designed to do efficiently: SSL termination, static file serving, load balancing, and connection management.

## Why Use Nginx with Node.js?

Node.js is excellent at handling application logic and I/O operations, but it has limitations when it comes to serving static files, managing thousands of concurrent connections, and handling SSL certificates. Nginx excels at these tasks.

| Task | Node.js Alone | Node.js + Nginx |
|------|---------------|-----------------|
| Static files | Slow, uses app resources | Fast, separate process |
| SSL termination | CPU intensive | Hardware accelerated |
| Load balancing | Manual implementation | Built-in feature |
| Connection pooling | Limited | Thousands easily |
| DDoS protection | Vulnerable | Rate limiting built-in |

## Basic Nginx Configuration

First, install Nginx on your server:

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx

# macOS
brew install nginx
```

Create a basic configuration file for your Node.js application:

```nginx
# /etc/nginx/sites-available/myapp
server {
    listen 80;
    server_name myapp.com www.myapp.com;

    # Proxy requests to Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        # Required headers for WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # Pass client information to Node.js
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Disable buffering for real-time applications
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the configuration:

```bash
# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/

# Test configuration for syntax errors
sudo nginx -t

# Reload Nginx to apply changes
sudo systemctl reload nginx
```

## Adding SSL/TLS with Let's Encrypt

Secure your application with free SSL certificates from Let's Encrypt:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain and install certificate
sudo certbot --nginx -d myapp.com -d www.myapp.com
```

After running Certbot, your configuration will be updated automatically:

```nginx
server {
    listen 80;
    server_name myapp.com www.myapp.com;

    # Redirect all HTTP traffic to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name myapp.com www.myapp.com;

    # SSL certificate paths (added by Certbot)
    ssl_certificate /etc/letsencrypt/live/myapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/myapp.com/privkey.pem;

    # SSL security settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    # HSTS header for security
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Load Balancing Multiple Node.js Instances

Run multiple Node.js processes and let Nginx distribute traffic:

```nginx
# Define upstream servers
upstream nodejs_cluster {
    # Load balancing method: round-robin (default)
    # Other options: least_conn, ip_hash, hash

    server 127.0.0.1:3000 weight=3;  # Higher weight gets more traffic
    server 127.0.0.1:3001 weight=2;
    server 127.0.0.1:3002 weight=1;

    # Health check settings
    keepalive 64;  # Keep connections alive for better performance
}

server {
    listen 443 ssl http2;
    server_name myapp.com;

    ssl_certificate /etc/letsencrypt/live/myapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/myapp.com/privkey.pem;

    location / {
        proxy_pass http://nodejs_cluster;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Start multiple Node.js instances using PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Start 3 instances of your app
pm2 start app.js -i 3 --name "myapp"

# Or use cluster mode to match CPU cores
pm2 start app.js -i max --name "myapp"
```

## Serving Static Files with Nginx

Let Nginx handle static files instead of Node.js:

```nginx
server {
    listen 443 ssl http2;
    server_name myapp.com;

    ssl_certificate /etc/letsencrypt/live/myapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/myapp.com/privkey.pem;

    # Serve static files directly from Nginx
    location /static/ {
        alias /var/www/myapp/public/;
        expires 30d;
        add_header Cache-Control "public, immutable";

        # Enable gzip compression for text files
        gzip on;
        gzip_types text/css application/javascript image/svg+xml;
    }

    # Serve uploaded files
    location /uploads/ {
        alias /var/www/myapp/uploads/;
        expires 7d;
    }

    # Proxy API requests to Node.js
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy everything else to Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Reading Client IP in Node.js

When behind Nginx, your Node.js app sees Nginx's IP. Use the forwarded headers:

```javascript
const express = require('express');
const app = express();

// Trust the proxy headers
app.set('trust proxy', true);

app.get('/api/info', (req, res) => {
    // req.ip now contains the real client IP
    const clientIp = req.ip;

    // Or get it from headers directly
    const realIp = req.headers['x-real-ip'];
    const forwardedFor = req.headers['x-forwarded-for'];

    res.json({
        clientIp,
        realIp,
        forwardedFor,
        protocol: req.protocol  // Will correctly show 'https'
    });
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
```

## Rate Limiting with Nginx

Protect your Node.js app from abuse:

```nginx
# Define rate limit zones (put this in http block)
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=1r/s;

server {
    listen 443 ssl http2;
    server_name myapp.com;

    # Apply rate limiting to API endpoints
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Stricter limit for login endpoint
    location /api/auth/login {
        limit_req zone=login_limit burst=5 nodelay;

        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Performance Optimization

Tune Nginx for high traffic:

```nginx
# In the http block of nginx.conf
http {
    # Enable sendfile for static files
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;

    # Increase buffer sizes
    client_body_buffer_size 10K;
    client_header_buffer_size 1k;
    client_max_body_size 8m;
    large_client_header_buffers 4 32k;

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript
               application/rss+xml application/atom+xml image/svg+xml;

    # Connection timeouts
    keepalive_timeout 65;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

## Health Checks and Monitoring

Add a health check endpoint in your Node.js app:

```javascript
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});
```

Configure Nginx to use it (Nginx Plus feature, or use upstream with passive checks):

```nginx
upstream nodejs_cluster {
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3002 backup;  # Only used when others are down
}
```

## Summary

Nginx and Node.js make an excellent combination. Nginx handles what it does best (SSL, static files, load balancing, rate limiting) while Node.js focuses on application logic. This setup scales horizontally, handles more concurrent connections, and provides better security than running Node.js directly.

Start with a basic reverse proxy configuration and add features as needed. Monitor your application to identify bottlenecks and adjust the configuration accordingly.
