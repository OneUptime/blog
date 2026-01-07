# How to Set Up a Reverse Proxy with Nginx on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, NGINX, Reverse Proxy, SSL, TLS, Let's Encrypt

Description: Configure Nginx as a reverse proxy on Ubuntu with SSL termination using Let's Encrypt for secure HTTPS traffic handling.

---

A reverse proxy sits between your clients and backend servers, forwarding client requests to the appropriate server and returning the server's response to the client. Nginx is one of the most popular choices for implementing a reverse proxy due to its high performance, stability, and rich feature set. In this comprehensive guide, we will walk through setting up Nginx as a reverse proxy on Ubuntu, complete with SSL termination using Let's Encrypt, WebSocket support, load balancing, and security hardening.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installing Nginx on Ubuntu](#installing-nginx-on-ubuntu)
3. [Understanding Reverse Proxy Concepts](#understanding-reverse-proxy-concepts)
4. [Basic Reverse Proxy Configuration](#basic-reverse-proxy-configuration)
5. [SSL/TLS with Let's Encrypt and Certbot](#ssltls-with-lets-encrypt-and-certbot)
6. [Setting Up Auto-Renewal](#setting-up-auto-renewal)
7. [WebSocket Proxying](#websocket-proxying)
8. [Load Balancing Basics](#load-balancing-basics)
9. [Security Headers Configuration](#security-headers-configuration)
10. [Testing and Troubleshooting](#testing-and-troubleshooting)
11. [Best Practices](#best-practices)
12. [Conclusion](#conclusion)

## Prerequisites

Before we begin, ensure you have the following:

- Ubuntu 20.04 LTS or later (this guide uses Ubuntu 22.04/24.04)
- A user account with sudo privileges
- A registered domain name pointing to your server's public IP address
- At least one backend application running (e.g., Node.js, Python, Go, or any HTTP service)
- Open ports 80 (HTTP) and 443 (HTTPS) in your firewall

## Installing Nginx on Ubuntu

Let's start by installing Nginx from the official Ubuntu repositories.

### Update the package index and install Nginx

```bash
# Update the package index to ensure we get the latest version
sudo apt update

# Install Nginx web server
sudo apt install nginx -y
```

### Verify the installation and check the service status

```bash
# Check if Nginx is running
sudo systemctl status nginx

# Enable Nginx to start automatically on system boot
sudo systemctl enable nginx

# Verify the installed version
nginx -v
```

### Configure the firewall to allow HTTP and HTTPS traffic

```bash
# Allow Nginx Full profile (both HTTP and HTTPS)
sudo ufw allow 'Nginx Full'

# Verify the firewall rules
sudo ufw status
```

### Test the default Nginx installation

```bash
# Check if Nginx is responding on localhost
curl -I http://localhost
```

You should see a response with `HTTP/1.1 200 OK` indicating Nginx is working correctly.

## Understanding Reverse Proxy Concepts

A reverse proxy provides several key benefits:

- **Load Distribution**: Distribute incoming requests across multiple backend servers
- **SSL Termination**: Handle SSL/TLS encryption at the proxy level, reducing backend server load
- **Caching**: Cache static content to reduce backend server requests
- **Security**: Hide backend server details and provide an additional security layer
- **Compression**: Compress responses before sending to clients
- **Centralized Logging**: Aggregate access logs in one location

In a typical setup, clients connect to the Nginx reverse proxy, which then forwards requests to one or more backend servers running your applications.

## Basic Reverse Proxy Configuration

Let's configure Nginx as a reverse proxy for a backend application running on port 3000.

### Create a new server block configuration

```bash
# Create a new configuration file for your site
sudo nano /etc/nginx/sites-available/myapp.conf
```

### Basic reverse proxy configuration file

```nginx
# Basic reverse proxy configuration for a single backend server
# This configuration forwards all requests to a backend application on port 3000

server {
    # Listen on port 80 for HTTP connections
    listen 80;
    listen [::]:80;

    # Replace with your actual domain name
    server_name example.com www.example.com;

    # Access and error logs for this virtual host
    access_log /var/log/nginx/myapp.access.log;
    error_log /var/log/nginx/myapp.error.log;

    # Main location block - proxies all requests to the backend
    location / {
        # Forward requests to the backend application
        proxy_pass http://127.0.0.1:3000;

        # Pass the original host header to the backend
        proxy_set_header Host $host;

        # Pass the real client IP address to the backend
        proxy_set_header X-Real-IP $remote_addr;

        # Pass the full chain of proxy IPs
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Tell the backend the original protocol (http or https)
        proxy_set_header X-Forwarded-Proto $scheme;

        # Connection settings for better performance
        proxy_http_version 1.1;
        proxy_set_header Connection "";

        # Timeout settings - adjust based on your application needs
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Optional: Serve static files directly from Nginx for better performance
    location /static/ {
        alias /var/www/myapp/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### Enable the site and test the configuration

```bash
# Create a symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/myapp.conf /etc/nginx/sites-enabled/

# Remove the default site if not needed
sudo rm /etc/nginx/sites-enabled/default

# Test the Nginx configuration for syntax errors
sudo nginx -t

# If the test passes, reload Nginx to apply changes
sudo systemctl reload nginx
```

## SSL/TLS with Let's Encrypt and Certbot

Let's Encrypt provides free SSL/TLS certificates. Certbot is the recommended tool for obtaining and managing these certificates.

### Install Certbot and the Nginx plugin

```bash
# Install Certbot and the Nginx plugin
sudo apt install certbot python3-certbot-nginx -y
```

### Obtain an SSL certificate for your domain

```bash
# Run Certbot with the Nginx plugin
# This command will automatically obtain and install the certificate
sudo certbot --nginx -d example.com -d www.example.com
```

During the process, Certbot will:
1. Verify domain ownership via HTTP challenge
2. Obtain the certificate from Let's Encrypt
3. Automatically modify your Nginx configuration
4. Set up HTTPS with recommended security settings

### Understanding the SSL-enabled configuration

After Certbot modifies your configuration, it will look similar to this:

```nginx
# SSL-enabled reverse proxy configuration
# Certbot automatically adds SSL directives and redirects

server {
    # Listen on port 443 for HTTPS connections with HTTP/2 support
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name example.com www.example.com;

    # SSL certificate files managed by Certbot
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Include recommended SSL settings from Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf;

    # Diffie-Hellman parameters for enhanced security
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Access and error logs
    access_log /var/log/nginx/myapp.access.log;
    error_log /var/log/nginx/myapp.error.log;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}

# HTTP to HTTPS redirect - Certbot adds this automatically
server {
    listen 80;
    listen [::]:80;

    server_name example.com www.example.com;

    # Redirect all HTTP traffic to HTTPS
    return 301 https://$host$request_uri;
}
```

### Manual SSL configuration with custom settings

For more control over SSL settings, you can manually configure SSL:

```nginx
# Advanced SSL configuration with custom security settings

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name example.com www.example.com;

    # SSL certificate paths
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # SSL session settings for performance
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern SSL protocols - disable older insecure protocols
    ssl_protocols TLSv1.2 TLSv1.3;

    # Strong cipher suite configuration
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;

    # Prefer server ciphers over client ciphers
    ssl_prefer_server_ciphers off;

    # OCSP Stapling for faster SSL handshakes
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/example.com/chain.pem;

    # DNS resolver for OCSP stapling
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Rest of your configuration...
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Setting Up Auto-Renewal

Let's Encrypt certificates expire after 90 days. Certbot automatically sets up a renewal timer, but let's verify and customize it.

### Verify the automatic renewal timer

```bash
# Check the status of the Certbot renewal timer
sudo systemctl status certbot.timer

# List all timers to see when renewal will run
sudo systemctl list-timers | grep certbot
```

### Test the renewal process without making changes

```bash
# Perform a dry run to test the renewal process
sudo certbot renew --dry-run
```

### Create a custom renewal hook to reload Nginx

```bash
# Create a post-renewal hook directory if it doesn't exist
sudo mkdir -p /etc/letsencrypt/renewal-hooks/post

# Create a script to reload Nginx after certificate renewal
sudo nano /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh
```

### Post-renewal hook script content

```bash
#!/bin/bash
# This script runs after successful certificate renewal
# It reloads Nginx to pick up the new certificates

# Log the renewal event
echo "$(date): Certificate renewed, reloading Nginx" >> /var/log/letsencrypt-renewal.log

# Reload Nginx to apply new certificates
systemctl reload nginx

# Optional: Send notification email
# echo "SSL certificate renewed for $(hostname)" | mail -s "Certificate Renewed" admin@example.com
```

### Make the hook script executable

```bash
# Set executable permissions on the renewal hook
sudo chmod +x /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh
```

### Set up a custom cron job for renewal (optional)

```bash
# Edit the crontab for root user
sudo crontab -e
```

### Add the following cron entry

```cron
# Run certificate renewal check twice daily at 3:00 AM and 3:00 PM
# The --quiet flag suppresses output unless there's an error
0 3,15 * * * /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
```

## WebSocket Proxying

Many modern applications use WebSockets for real-time communication. Here's how to configure Nginx to properly proxy WebSocket connections.

### WebSocket-enabled reverse proxy configuration

```nginx
# WebSocket-enabled reverse proxy configuration
# Supports both regular HTTP and WebSocket upgrade requests

# Map to handle WebSocket upgrade headers
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;

    # Main application with WebSocket support
    location / {
        proxy_pass http://127.0.0.1:3000;

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket specific headers
        # These are essential for WebSocket connections to work
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        # Extended timeouts for long-lived WebSocket connections
        # Default timeout is 60s, which would disconnect idle WebSocket clients
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;

        # Disable buffering for real-time data
        proxy_buffering off;
    }

    # Dedicated WebSocket endpoint (if your app uses a specific path)
    location /ws {
        proxy_pass http://127.0.0.1:3000/ws;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Longer timeout for persistent connections
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # Socket.IO specific configuration (if using Socket.IO)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000/socket.io/;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 86400s;
        proxy_buffering off;
    }
}
```

## Load Balancing Basics

Nginx can distribute traffic across multiple backend servers for improved performance and reliability.

### Define an upstream group and configure load balancing

```nginx
# Load balancing configuration with multiple backend servers
# Distributes incoming requests across multiple application instances

# Define the upstream group of backend servers
upstream myapp_backend {
    # Default load balancing method is round-robin
    # Requests are distributed evenly across all servers

    # Backend server 1
    server 127.0.0.1:3001 weight=3;  # Higher weight = more requests

    # Backend server 2
    server 127.0.0.1:3002 weight=2;

    # Backend server 3
    server 127.0.0.1:3003 weight=1;

    # Backup server - only used when all primary servers are down
    server 127.0.0.1:3004 backup;

    # Keep connections alive for better performance
    keepalive 32;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;

    location / {
        # Proxy to the upstream group instead of a single server
        proxy_pass http://myapp_backend;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Enable keepalive connections to upstream
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
```

### Alternative load balancing methods

```nginx
# Different load balancing algorithms available in Nginx

# 1. Least Connections - sends requests to server with fewest active connections
upstream myapp_least_conn {
    least_conn;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

# 2. IP Hash - ensures requests from same client go to same server (session persistence)
upstream myapp_ip_hash {
    ip_hash;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

# 3. Generic Hash - custom hash key for request distribution
upstream myapp_hash {
    hash $request_uri consistent;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

# 4. Random with Two Choices (requires Nginx 1.15.1+)
upstream myapp_random {
    random two least_conn;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}
```

### Health checks and failure handling

```nginx
# Upstream configuration with health check parameters

upstream myapp_backend {
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3002 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3003 max_fails=3 fail_timeout=30s;

    # max_fails: Number of failed attempts before marking server as unavailable
    # fail_timeout: Time period for max_fails AND how long to wait before retrying

    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        proxy_pass http://myapp_backend;

        # Retry failed requests on other servers
        proxy_next_upstream error timeout http_500 http_502 http_503 http_504;

        # Limit number of retry attempts
        proxy_next_upstream_tries 3;

        # Time limit for retrying
        proxy_next_upstream_timeout 10s;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Security Headers Configuration

Adding security headers helps protect your application from common web vulnerabilities.

### Complete security headers configuration

```nginx
# Security-hardened reverse proxy configuration
# Includes all recommended security headers

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;

    # === Security Headers ===

    # HTTP Strict Transport Security (HSTS)
    # Forces browsers to only use HTTPS for this domain
    # max-age is in seconds (31536000 = 1 year)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # X-Frame-Options prevents clickjacking attacks
    # DENY: Page cannot be displayed in a frame
    # SAMEORIGIN: Page can only be displayed in a frame on the same origin
    add_header X-Frame-Options "SAMEORIGIN" always;

    # X-Content-Type-Options prevents MIME type sniffing
    add_header X-Content-Type-Options "nosniff" always;

    # X-XSS-Protection enables browser's XSS filtering
    # Note: Modern browsers are phasing this out in favor of CSP
    add_header X-XSS-Protection "1; mode=block" always;

    # Referrer-Policy controls how much referrer information is sent
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Content-Security-Policy (CSP) - Adjust based on your application needs
    # This is a restrictive example - modify for your specific requirements
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:; frame-ancestors 'self';" always;

    # Permissions-Policy (formerly Feature-Policy)
    # Controls which browser features the page can use
    add_header Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()" always;

    # Cross-Origin headers for enhanced isolation
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Embedder-Policy "require-corp" always;
    add_header Cross-Origin-Resource-Policy "same-origin" always;

    # === Hide Server Information ===

    # Don't reveal Nginx version
    server_tokens off;

    # Remove headers that reveal backend information
    proxy_hide_header X-Powered-By;
    proxy_hide_header Server;

    # === Rate Limiting ===

    # Apply rate limiting to prevent abuse
    # Requires rate limit zone defined in http block
    limit_req zone=general burst=20 nodelay;

    # === Proxy Configuration ===

    location / {
        proxy_pass http://127.0.0.1:3000;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }

    # Block access to sensitive files
    location ~ /\.(git|env|htaccess|htpasswd) {
        deny all;
        return 404;
    }

    # Block access to backup files
    location ~ \.(bak|orig|save|swp|tmp)$ {
        deny all;
        return 404;
    }
}
```

### Configure rate limiting in the main Nginx configuration

```bash
# Edit the main Nginx configuration to add rate limiting zones
sudo nano /etc/nginx/nginx.conf
```

### Add rate limiting zones to the http block

```nginx
# Add these lines inside the http block in /etc/nginx/nginx.conf

http {
    # ... existing configuration ...

    # Define rate limiting zones
    # Zone 'general': 10 requests per second per IP, with 10MB of shared memory
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;

    # Zone 'login': Stricter limit for authentication endpoints
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    # Zone 'api': Rate limit for API endpoints
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;

    # Log rate limited requests
    limit_req_log_level warn;

    # Return 429 Too Many Requests instead of 503
    limit_req_status 429;

    # ... rest of configuration ...
}
```

### Apply stricter rate limits to specific endpoints

```nginx
# Example of applying different rate limits to different locations

server {
    # ... SSL and other configuration ...

    # Login endpoint with strict rate limiting
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;

        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API endpoints with moderate rate limiting
    location /api/ {
        limit_req zone=api burst=50 nodelay;

        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # General pages with standard rate limiting
    location / {
        limit_req zone=general burst=20 nodelay;

        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Testing and Troubleshooting

### Test your Nginx configuration

```bash
# Test configuration syntax
sudo nginx -t

# Test configuration with verbose output
sudo nginx -T

# Reload Nginx if configuration is valid
sudo systemctl reload nginx
```

### Test SSL configuration

```bash
# Test SSL connection with OpenSSL
openssl s_client -connect example.com:443 -servername example.com

# Check certificate details
echo | openssl s_client -connect example.com:443 2>/dev/null | openssl x509 -text -noout

# Test SSL configuration with SSL Labs (online)
# Visit: https://www.ssllabs.com/ssltest/
```

### Test headers with curl

```bash
# Check response headers
curl -I https://example.com

# Check all headers including security headers
curl -sI https://example.com | grep -E "(Strict-Transport|X-Frame|X-Content|X-XSS|Content-Security|Referrer-Policy)"

# Test WebSocket upgrade
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" https://example.com/ws
```

### Common troubleshooting commands

```bash
# Check Nginx error log
sudo tail -f /var/log/nginx/error.log

# Check Nginx access log
sudo tail -f /var/log/nginx/access.log

# Check site-specific error log
sudo tail -f /var/log/nginx/myapp.error.log

# Test if backend is reachable
curl -I http://127.0.0.1:3000

# Check if ports are listening
sudo ss -tlnp | grep -E '(80|443|3000)'

# Check Nginx process status
ps aux | grep nginx

# Check for configuration issues
sudo nginx -t 2>&1

# Reload Nginx without dropping connections
sudo nginx -s reload
```

### Debug proxy issues

```bash
# Enable debug logging temporarily
# Edit your server block and add:
# error_log /var/log/nginx/debug.log debug;

# Then reload and watch the debug log
sudo tail -f /var/log/nginx/debug.log
```

## Best Practices

### 1. Keep Nginx and Certbot updated

```bash
# Update packages regularly
sudo apt update && sudo apt upgrade -y

# Check for Nginx security advisories
apt-cache policy nginx
```

### 2. Use separate configuration files

```bash
# Organize configurations by site/application
/etc/nginx/sites-available/app1.conf
/etc/nginx/sites-available/app2.conf
/etc/nginx/sites-available/api.conf

# Use includes for common configurations
/etc/nginx/snippets/ssl-params.conf
/etc/nginx/snippets/proxy-params.conf
/etc/nginx/snippets/security-headers.conf
```

### 3. Create reusable configuration snippets

```nginx
# /etc/nginx/snippets/proxy-params.conf
# Include this in your location blocks

proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_http_version 1.1;
proxy_set_header Connection "";
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```

### 4. Use this snippet in your server blocks

```nginx
server {
    # ... other configuration ...

    location / {
        proxy_pass http://127.0.0.1:3000;
        include snippets/proxy-params.conf;
    }
}
```

### 5. Monitor and log effectively

```nginx
# Custom log format with useful information
log_format detailed '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

# Use the custom log format
access_log /var/log/nginx/myapp.access.log detailed;
```

### 6. Implement request buffering appropriately

```nginx
# For most applications, enable buffering for better performance
proxy_buffering on;
proxy_buffer_size 4k;
proxy_buffers 8 4k;
proxy_busy_buffers_size 8k;

# For real-time applications or streaming, disable buffering
# proxy_buffering off;
```

### 7. Set appropriate client limits

```nginx
# Limit client body size (important for file uploads)
client_max_body_size 100M;

# Limit client body buffer
client_body_buffer_size 128k;

# Limit header buffer size
client_header_buffer_size 1k;
large_client_header_buffers 4 8k;
```

## Conclusion

You have successfully set up Nginx as a reverse proxy on Ubuntu with SSL termination using Let's Encrypt. Your configuration now includes:

- A fully functional reverse proxy forwarding requests to your backend application
- HTTPS with automatic certificate renewal from Let's Encrypt
- WebSocket support for real-time applications
- Load balancing across multiple backend servers
- Comprehensive security headers to protect against common vulnerabilities
- Rate limiting to prevent abuse

Remember to regularly update your server, monitor your logs, and test your SSL configuration periodically. As your application grows, consider implementing additional features like caching, gzip compression, and more advanced load balancing strategies.

For production deployments, always test configuration changes in a staging environment first and maintain proper backup and rollback procedures.
