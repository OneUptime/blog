# How to Install and Configure Nginx as a Web Server on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Nginx, Web Server, HTTP, Reverse Proxy, Tutorial

Description: Comprehensive guide to installing, configuring, and optimizing Nginx web server on Ubuntu for high-performance web hosting.

---

Nginx is a high-performance web server known for its stability, rich feature set, and low resource consumption. It excels at serving static content, reverse proxying, and load balancing. This guide covers installation, configuration, and optimization on Ubuntu.

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04
- Root or sudo access
- Domain name (optional, for virtual hosts)

## Installing Nginx

```bash
# Update package lists
sudo apt update

# Install Nginx
sudo apt install nginx -y

# Verify installation
nginx -v

# Check service status
sudo systemctl status nginx
```

Visit `http://your_server_ip` to see the default Nginx welcome page.

## Managing Nginx Service

```bash
# Start Nginx
sudo systemctl start nginx

# Stop Nginx
sudo systemctl stop nginx

# Restart Nginx (full restart)
sudo systemctl restart nginx

# Reload configuration (graceful, no downtime)
sudo systemctl reload nginx

# Enable on boot
sudo systemctl enable nginx

# Test configuration syntax
sudo nginx -t
```

## Understanding Nginx Directory Structure

```
/etc/nginx/
├── nginx.conf              # Main configuration
├── sites-available/        # Available site configs
├── sites-enabled/          # Active site configs (symlinks)
├── conf.d/                 # Additional configurations
├── snippets/               # Reusable config snippets
├── modules-available/      # Available modules
└── modules-enabled/        # Enabled modules

/var/www/                   # Default web root
/var/log/nginx/             # Log files
```

## Basic Configuration

### Main Configuration File

```bash
sudo nano /etc/nginx/nginx.conf
```

Key settings:

```nginx
# Worker processes (auto = one per CPU core)
worker_processes auto;

# Maximum connections per worker
events {
    worker_connections 1024;
    multi_accept on;
}

http {
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Hide Nginx version
    server_tokens off;

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
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml;

    # Include site configurations
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

## Virtual Hosts (Server Blocks)

### Create Website Directory

```bash
# Create directory structure
sudo mkdir -p /var/www/example.com/html

# Create sample page
sudo nano /var/www/example.com/html/index.html
```

```html
<!DOCTYPE html>
<html>
<head>
    <title>Welcome to Example.com</title>
</head>
<body>
    <h1>Example.com is working!</h1>
</body>
</html>
```

### Set Permissions

```bash
# Set ownership
sudo chown -R www-data:www-data /var/www/example.com

# Set permissions
sudo chmod -R 755 /var/www/example.com
```

### Create Server Block

```bash
sudo nano /etc/nginx/sites-available/example.com
```

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name example.com www.example.com;
    root /var/www/example.com/html;
    index index.html index.htm;

    # Logging
    access_log /var/log/nginx/example.com.access.log;
    error_log /var/log/nginx/example.com.error.log;

    # Main location
    location / {
        try_files $uri $uri/ =404;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
}
```

### Enable the Site

```bash
# Create symlink to enable site
sudo ln -s /etc/nginx/sites-available/example.com /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## SSL/HTTPS Configuration

### Using Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain and install certificate
sudo certbot --nginx -d example.com -d www.example.com
```

### Manual SSL Configuration

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name example.com www.example.com;
    root /var/www/example.com/html;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # SSL settings
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        try_files $uri $uri/ =404;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;
    return 301 https://$server_name$request_uri;
}
```

## Reverse Proxy Configuration

### Basic Reverse Proxy

```nginx
server {
    listen 80;
    server_name app.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
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

### WebSocket Support

```nginx
location /ws/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
}
```

### Load Balancing

```nginx
upstream backend {
    least_conn;  # Load balancing method
    server 192.168.1.10:3000 weight=3;
    server 192.168.1.11:3000 weight=2;
    server 192.168.1.12:3000 backup;
}

server {
    listen 80;
    server_name app.example.com;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Performance Optimization

### Caching Static Content

```nginx
# Cache static files
location ~* \.(jpg|jpeg|png|gif|ico|css|js|pdf|txt)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}

# Cache HTML (shorter duration)
location ~* \.html$ {
    expires 1h;
    add_header Cache-Control "public";
}
```

### Enable Gzip Compression

```nginx
# In http block
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_min_length 256;
gzip_types
    application/atom+xml
    application/javascript
    application/json
    application/ld+json
    application/manifest+json
    application/rss+xml
    application/vnd.geo+json
    application/vnd.ms-fontobject
    application/x-font-ttf
    application/x-web-app-manifest+json
    application/xhtml+xml
    application/xml
    font/opentype
    image/bmp
    image/svg+xml
    image/x-icon
    text/cache-manifest
    text/css
    text/plain
    text/vcard
    text/vnd.rim.location.xloc
    text/vtt
    text/x-component
    text/x-cross-domain-policy
    text/xml;
```

### Buffer Settings

```nginx
# Client buffers
client_body_buffer_size 10K;
client_header_buffer_size 1k;
client_max_body_size 100M;
large_client_header_buffers 4 32k;

# Proxy buffers
proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;
```

## Security Hardening

### Security Headers

```nginx
# Add to server block
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self';" always;
```

### Rate Limiting

```nginx
# In http block - define rate limit zone
limit_req_zone $binary_remote_addr zone=one:10m rate=10r/s;

# In server/location block - apply rate limit
location /api/ {
    limit_req zone=one burst=20 nodelay;
    proxy_pass http://backend;
}
```

### Block Bad Bots

```nginx
# In server block
if ($http_user_agent ~* (wget|curl|scrapy|bot|spider)) {
    return 403;
}
```

### Restrict Methods

```nginx
# Only allow GET, POST, HEAD
if ($request_method !~ ^(GET|POST|HEAD)$) {
    return 405;
}
```

## PHP-FPM Integration

```bash
# Install PHP-FPM
sudo apt install php-fpm -y
```

```nginx
server {
    listen 80;
    server_name php.example.com;
    root /var/www/php.example.com;
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.ht {
        deny all;
    }
}
```

## Log Management

### Custom Log Format

```nginx
# In http block
log_format detailed '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    '$request_time $upstream_response_time';

# Use in server block
access_log /var/log/nginx/example.access.log detailed;
```

### Disable Logging for Static Files

```nginx
location ~* \.(jpg|jpeg|gif|png|ico|css|js)$ {
    access_log off;
    expires 30d;
}
```

## Firewall Configuration

```bash
# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Or use Nginx profile
sudo ufw allow 'Nginx Full'

# Check status
sudo ufw status
```

## Troubleshooting

### Test Configuration

```bash
# Check syntax
sudo nginx -t

# Detailed syntax check
sudo nginx -T
```

### View Error Logs

```bash
# Main error log
sudo tail -f /var/log/nginx/error.log

# Site-specific logs
sudo tail -f /var/log/nginx/example.com.error.log
```

### Common Errors

**502 Bad Gateway:**
```bash
# Check upstream service is running
sudo systemctl status php8.1-fpm
# Or your app service
```

**403 Forbidden:**
```bash
# Check permissions
ls -la /var/www/example.com/

# Check SELinux (if enabled)
getenforce
```

**Connection Refused:**
```bash
# Check Nginx is listening
sudo ss -tlnp | grep nginx

# Check firewall
sudo ufw status
```

---

Nginx is a versatile web server ideal for static content, reverse proxying, and load balancing. Start with basic configuration and gradually add features like SSL, caching, and security hardening. For high-traffic sites, focus on buffer tuning and worker process optimization.
