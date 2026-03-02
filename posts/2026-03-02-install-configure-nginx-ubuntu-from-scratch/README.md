# How to Install and Configure Nginx on Ubuntu from Scratch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Nginx, Web Server, Linux, Configuration

Description: Complete guide to installing Nginx on Ubuntu from scratch, including virtual host configuration, SSL setup, and essential performance settings.

---

Nginx is a high-performance web server and reverse proxy that's well-suited for serving static content at scale and proxying requests to backend applications. Its event-driven, asynchronous architecture handles concurrent connections efficiently with low memory usage. This guide covers a complete Nginx installation and configuration on Ubuntu.

## Installing Nginx

### From Ubuntu Repository (Stable)

```bash
# Update package list
sudo apt update

# Install Nginx
sudo apt install nginx

# Verify installation
nginx -v
# Example: nginx version: nginx/1.24.0 (Ubuntu)

# Check running status
sudo systemctl status nginx
```

### From Nginx's Official Repository (Latest Features)

For the latest stable or mainline version:

```bash
# Install prerequisites
sudo apt install curl gnupg2 ca-certificates lsb-release ubuntu-keyring

# Import the Nginx signing key
curl https://nginx.org/keys/nginx_signing.key | gpg --dearmor | sudo tee /usr/share/keyrings/nginx-archive-keyring.gpg > /dev/null

# Add the stable repository
echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] http://nginx.org/packages/ubuntu $(lsb_release -cs) nginx" | sudo tee /etc/apt/sources.list.d/nginx.list

sudo apt update
sudo apt install nginx

nginx -v
```

## Nginx Directory Structure

```
/etc/nginx/
├── nginx.conf            # Main configuration file
├── conf.d/               # Additional global configurations
├── sites-available/      # Available virtual host configs
├── sites-enabled/        # Active virtual hosts (symlinks)
├── modules-available/    # Dynamic modules
├── modules-enabled/      # Active modules (symlinks)
├── snippets/             # Reusable configuration fragments
└── mime.types            # MIME type mappings
```

```
/var/log/nginx/
├── access.log            # HTTP access log
└── error.log             # Error log

/var/www/html/            # Default document root
```

## Basic Nginx Management

```bash
# Start Nginx
sudo systemctl start nginx

# Stop Nginx
sudo systemctl stop nginx

# Restart (brief downtime)
sudo systemctl restart nginx

# Reload configuration (no downtime)
sudo systemctl reload nginx

# Enable at boot
sudo systemctl enable nginx

# Test configuration syntax
sudo nginx -t

# Test and show configuration details
sudo nginx -T

# Send reload signal directly to master process
sudo nginx -s reload

# Graceful shutdown
sudo nginx -s quit
```

## The Main Configuration File

```bash
sudo nano /etc/nginx/nginx.conf
```

A well-structured `nginx.conf`:

```nginx
# Number of worker processes - set to auto to match CPU core count
worker_processes auto;

# Max open files per worker (increase for high traffic)
worker_rlimit_nofile 65535;

# Log file for nginx master process
error_log /var/log/nginx/error.log warn;

# PID file location
pid /run/nginx.pid;

# Dynamic modules
include /etc/nginx/modules-enabled/*.conf;

events {
    # Max connections per worker (worker_processes * worker_connections = total capacity)
    worker_connections 1024;

    # Accept multiple connections per event loop iteration
    multi_accept on;

    # Efficient connection processing method (Linux)
    use epoll;
}

http {
    # Include MIME types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Log format
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # Efficient file sending
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;

    # Keep-alive timeout
    keepalive_timeout 65;
    keepalive_requests 1000;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 256;

    # Security: hide Nginx version in headers
    server_tokens off;

    # Include site configurations
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

## Configuring a Virtual Host

Create a new site configuration:

```bash
sudo nano /etc/nginx/sites-available/example.com
```

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name example.com www.example.com;

    # Document root
    root /var/www/example.com/public_html;

    # Default index files
    index index.html index.htm index.php;

    # Logging
    access_log /var/log/nginx/example.com-access.log;
    error_log /var/log/nginx/example.com-error.log;

    # Handle requests
    location / {
        # Try serving the file, then directory, then return 404
        try_files $uri $uri/ =404;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }

    # Deny access to PHP files in uploads directory
    location ~* /uploads/.*\.php$ {
        deny all;
    }
}
```

### Enable the Site

```bash
# Create symlink in sites-enabled
sudo ln -s /etc/nginx/sites-available/example.com /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Create Website Files

```bash
# Create the document root
sudo mkdir -p /var/www/example.com/public_html

# Create a test page
sudo tee /var/www/example.com/public_html/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head><title>Example.com</title></head>
<body><h1>Welcome to Example.com</h1></body>
</html>
EOF

# Set proper ownership
sudo chown -R www-data:www-data /var/www/example.com
sudo chmod -R 755 /var/www/example.com
```

## Setting Up HTTPS with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain and automatically configure certificate
sudo certbot --nginx -d example.com -d www.example.com

# Test renewal
sudo certbot renew --dry-run

# Check auto-renewal timer
sudo systemctl status certbot.timer
```

After Certbot runs, it modifies the site config to add SSL settings automatically.

## Manual HTTPS Configuration

```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;

    # Redirect all HTTP to HTTPS
    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name example.com www.example.com;

    root /var/www/example.com/public_html;
    index index.html index.php;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';

    # SSL session caching
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    location / {
        try_files $uri $uri/ =404;
    }

    # Logging
    access_log /var/log/nginx/example.com-access.log;
    error_log /var/log/nginx/example.com-error.log;
}
```

## Firewall Configuration

```bash
# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Or individually
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# View Nginx-specific UFW profiles
sudo ufw app list | grep Nginx

# Verify
sudo ufw status
```

## Setting Up as a Reverse Proxy

Nginx excels as a reverse proxy in front of application servers:

```nginx
server {
    listen 80;
    server_name app.example.com;

    location / {
        # Proxy to Node.js/Gunicorn/other app on port 3000
        proxy_pass http://localhost:3000;

        # Pass original headers to backend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

## Serving Static Files Efficiently

```nginx
server {
    listen 80;
    server_name static.example.com;
    root /var/www/static;

    # Enable sendfile for efficient static serving
    sendfile on;
    tcp_nopush on;

    # Browser caching
    location ~* \.(jpg|jpeg|png|gif|ico|webp|svg|css|js|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;  # Don't log static asset requests
    }

    # HTML - short cache
    location ~* \.html$ {
        expires 1h;
        add_header Cache-Control "public";
    }
}
```

## Checking Nginx Status

```bash
# Check running status
sudo systemctl status nginx

# View access log in real time
sudo tail -f /var/log/nginx/access.log

# View error log
sudo tail -f /var/log/nginx/error.log

# Check open connections
ss -tlnp | grep nginx

# Check worker processes
ps aux | grep nginx

# Enable stub_status for monitoring (add to server block)
# location /nginx-status {
#     stub_status;
#     allow 127.0.0.1;
#     deny all;
# }

# Then check:
curl http://localhost/nginx-status
```

## Default Site

Ubuntu's Nginx package includes a default site that serves from `/var/www/html`:

```bash
# Disable the default site
sudo rm /etc/nginx/sites-enabled/default

# Or keep it but modify
sudo nano /etc/nginx/sites-available/default

sudo systemctl reload nginx
```

Nginx is fast and memory-efficient right out of the box. The main configuration areas to understand are: the main nginx.conf for global settings, the sites-available/sites-enabled pattern for virtual hosts, and the `location` block for URL-level routing. From these building blocks you can construct anything from a simple static site to a complex reverse proxy setup.
