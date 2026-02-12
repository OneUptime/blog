# How to Install and Configure Nginx on EC2

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Nginx, Web Server

Description: Complete guide to installing, configuring, and optimizing Nginx on EC2 for serving static sites, reverse proxying applications, and load balancing.

---

Nginx has become the default web server and reverse proxy for modern web applications. It's fast, resource-efficient, and handles thousands of concurrent connections without breaking a sweat. Whether you're serving static files, proxying to a Node.js backend, or load balancing across multiple application servers, Nginx is the tool for the job.

Here's how to install it on EC2 and configure it for the most common use cases.

## Installation

SSH into your EC2 instance and install Nginx. The process varies slightly between Amazon Linux and Ubuntu.

Install Nginx on Amazon Linux 2023:

```bash
# Update packages
sudo yum update -y

# Install Nginx
sudo yum install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify it's running
sudo systemctl status nginx
curl http://localhost
```

Install Nginx on Ubuntu:

```bash
# Update packages
sudo apt update

# Install Nginx
sudo apt install -y nginx

# Nginx starts automatically on Ubuntu
sudo systemctl status nginx
```

Make sure your security group allows HTTP (port 80) and HTTPS (port 443) traffic:

```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc123 \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc123 \
  --protocol tcp --port 443 --cidr 0.0.0.0/0
```

## Understanding the Configuration Structure

Nginx configuration files are organized in a hierarchy. Understanding this structure saves a lot of debugging time.

On Amazon Linux:
- Main config: `/etc/nginx/nginx.conf`
- Site configs: `/etc/nginx/conf.d/*.conf`

On Ubuntu:
- Main config: `/etc/nginx/nginx.conf`
- Available sites: `/etc/nginx/sites-available/`
- Enabled sites: `/etc/nginx/sites-enabled/` (symlinks to available)

Always test configuration before reloading:

```bash
# Test configuration syntax
sudo nginx -t

# Reload configuration without downtime
sudo systemctl reload nginx
```

## Serving Static Files

The most basic use case - serving a static website or single-page application.

Configure Nginx to serve static files:

```bash
sudo cat > /etc/nginx/conf.d/static-site.conf << 'EOF'
server {
    listen 80;
    server_name example.com www.example.com;

    root /var/www/mysite;
    index index.html;

    # Serve static files directly
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
}
EOF
```

Create the site directory and add content:

```bash
# Create the document root
sudo mkdir -p /var/www/mysite

# Add a simple index page
sudo cat > /var/www/mysite/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head><title>My Site</title></head>
<body><h1>Hello from Nginx on EC2!</h1></body>
</html>
EOF

# Set proper ownership
sudo chown -R nginx:nginx /var/www/mysite

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

## Reverse Proxy Configuration

This is the most common pattern - Nginx sits in front of your application server (Node.js, Python, Ruby, etc.) and handles HTTP concerns.

Set up Nginx as a reverse proxy:

```bash
sudo cat > /etc/nginx/conf.d/app-proxy.conf << 'EOF'
upstream app_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name app.example.com;

    # Increase buffer sizes for large headers
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;

    location / {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Serve static files directly, don't proxy them
    location /static/ {
        alias /var/www/app/static/;
        expires 30d;
    }
}
EOF
```

The `keepalive 32` directive maintains persistent connections to your backend, which significantly reduces latency by avoiding TCP handshake overhead for every request.

## Load Balancing

When you have multiple backend servers, Nginx can distribute traffic across them.

Configure load balancing across multiple backends:

```bash
sudo cat > /etc/nginx/conf.d/load-balancer.conf << 'EOF'
upstream app_cluster {
    # Round-robin by default
    server 10.0.1.10:3000;
    server 10.0.1.11:3000;
    server 10.0.1.12:3000;

    # Or use least connections
    # least_conn;

    # Or IP hash for session stickiness
    # ip_hash;

    keepalive 64;
}

server {
    listen 80;
    server_name app.example.com;

    location / {
        proxy_pass http://app_cluster;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Health check - mark server as down after 3 failures
        proxy_next_upstream error timeout http_502 http_503 http_504;
        proxy_next_upstream_tries 3;
    }
}
EOF
```

## SSL/TLS with Let's Encrypt

Every production site needs HTTPS. Let's Encrypt makes this free and automated.

Install Certbot and obtain a certificate:

```bash
# Install Certbot for Nginx
sudo yum install -y certbot python3-certbot-nginx

# Obtain certificate (Certbot automatically configures Nginx)
sudo certbot --nginx -d app.example.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

For manual SSL configuration (if you have your own certificate):

```bash
sudo cat > /etc/nginx/conf.d/ssl-app.conf << 'EOF'
server {
    listen 443 ssl http2;
    server_name app.example.com;

    ssl_certificate /etc/letsencrypt/live/app.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://app_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name app.example.com;
    return 301 https://$server_name$request_uri;
}
EOF
```

## Performance Tuning

Tune Nginx for your instance size and expected traffic.

Optimize the main Nginx configuration:

```bash
sudo cat > /etc/nginx/nginx.conf << 'EOF'
user nginx;

# Set worker processes to number of CPU cores
worker_processes auto;

error_log /var/log/nginx/error.log warn;
pid /run/nginx.pid;

events {
    # Max connections per worker
    worker_connections 2048;

    # Accept multiple connections at once
    multi_accept on;

    # Use epoll on Linux for better performance
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging format
    log_format main '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    '$request_time';

    access_log /var/log/nginx/access.log main;

    # Performance optimizations
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml application/xml+rss text/javascript
               image/svg+xml;
    gzip_min_length 256;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;

    # Include site configurations
    include /etc/nginx/conf.d/*.conf;
}
EOF
```

## Rate Limiting

Protect your application from abuse with rate limiting.

Add rate limiting to specific endpoints:

```nginx
# In your server block
location /api/login {
    limit_req zone=general burst=5 nodelay;
    proxy_pass http://app_backend;
}

location /api/ {
    limit_req zone=general burst=20 nodelay;
    proxy_pass http://app_backend;
}
```

## Monitoring Nginx

Enable the stub status module for basic monitoring:

```bash
# Add to your server block
location /nginx_status {
    stub_status;
    allow 127.0.0.1;
    allow 10.0.0.0/8;
    deny all;
}
```

Check the status:

```bash
# View Nginx stats
curl http://localhost/nginx_status
```

For comprehensive monitoring of Nginx alongside your application, check our guide on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/aws-infrastructure-monitoring/view).

## Log Rotation

Prevent log files from filling your disk:

```bash
sudo cat > /etc/logrotate.d/nginx << 'EOF'
/var/log/nginx/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 nginx adm
    sharedscripts
    postrotate
        /bin/kill -USR1 $(cat /run/nginx.pid 2>/dev/null) 2>/dev/null || true
    endscript
}
EOF
```

## Wrapping Up

Nginx is incredibly versatile - it handles static files, reverse proxying, load balancing, SSL termination, and rate limiting all in one package. On EC2, the setup is straightforward: install it, write your configuration files, test them, and reload. Start with the configuration that matches your use case, tune worker processes and connections for your instance size, and add SSL for production. It's one of those tools that's simple to start with but deep enough to handle any scale.
