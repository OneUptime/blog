# How to Set Up Nginx Virtual Hosts (Server Blocks) on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Nginx, Virtual Hosts, Server Blocks, Web Server, Tutorial

Description: Complete guide to configuring Nginx server blocks on Ubuntu for hosting multiple websites on a single server.

---

Nginx is one of the most popular web servers in the world, known for its high performance, stability, and low resource consumption. One of its most powerful features is the ability to host multiple websites on a single server using **server blocks** (the Nginx equivalent of Apache's virtual hosts). This guide will walk you through everything you need to know about setting up and managing Nginx server blocks on Ubuntu.

## Understanding Server Blocks vs Apache Virtual Hosts

If you are coming from an Apache background, you are probably familiar with virtual hosts. Nginx uses a similar concept called **server blocks**. While the functionality is essentially the same (hosting multiple websites on one server), there are some key differences:

| Feature | Apache Virtual Hosts | Nginx Server Blocks |
|---------|---------------------|---------------------|
| Configuration syntax | XML-like directives | C-like block syntax |
| File location | `/etc/apache2/sites-available/` | `/etc/nginx/sites-available/` |
| Enabling sites | `a2ensite` command | Manual symlinks |
| Processing order | First match wins | Most specific match wins |
| Performance | Process-based | Event-driven, asynchronous |

Nginx's event-driven architecture makes it particularly efficient at handling multiple server blocks, as it can serve thousands of concurrent connections with minimal memory overhead.

## Prerequisites

Before we begin, ensure you have:

- Ubuntu 20.04, 22.04, or 24.04 LTS
- Root or sudo access
- Nginx installed (`sudo apt install nginx`)
- Domain names pointing to your server's IP address

Verify Nginx is installed and running:

```bash
# Check Nginx version
nginx -v

# Check Nginx status
sudo systemctl status nginx
```

## Directory Structure Setup

Nginx on Ubuntu follows a specific directory structure. Let's understand and set up the necessary directories:

```bash
# Main Nginx configuration directory
/etc/nginx/
├── nginx.conf              # Main configuration file
├── sites-available/        # All server block configurations
├── sites-enabled/          # Symlinks to enabled configurations
├── conf.d/                 # Additional configuration files
├── snippets/               # Reusable configuration snippets
└── modules-enabled/        # Enabled modules

# Default web root
/var/www/
└── html/                   # Default Nginx welcome page
```

### Creating Web Root Directories

For each website you want to host, create a dedicated directory:

```bash
# Create directories for two example sites
sudo mkdir -p /var/www/example.com/html
sudo mkdir -p /var/www/test.com/html

# Set proper ownership (replace 'www-data' with your web user if different)
sudo chown -R www-data:www-data /var/www/example.com
sudo chown -R www-data:www-data /var/www/test.com

# Set proper permissions
sudo chmod -R 755 /var/www/example.com
sudo chmod -R 755 /var/www/test.com
```

### Creating Sample Content

Create simple HTML files to test your configurations:

```bash
# Create index.html for example.com
sudo tee /var/www/example.com/html/index.html > /dev/null <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Example.com</title>
</head>
<body>
    <h1>Success! Example.com is working!</h1>
    <p>This is the landing page for example.com</p>
</body>
</html>
EOF

# Create index.html for test.com
sudo tee /var/www/test.com/html/index.html > /dev/null <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Test.com</title>
</head>
<body>
    <h1>Success! Test.com is working!</h1>
    <p>This is the landing page for test.com</p>
</body>
</html>
EOF
```

## Creating Server Block Configurations

Server block configuration files are stored in `/etc/nginx/sites-available/`. Each file typically represents one website or application.

### Basic Server Block Structure

Here is a well-commented basic server block configuration:

```nginx
# /etc/nginx/sites-available/example.com
# Server block configuration for example.com
# Created: 2026-01-15
# Author: System Administrator

server {
    # Listen on port 80 for IPv4 connections
    listen 80;

    # Listen on port 80 for IPv6 connections
    listen [::]:80;

    # Domain names this server block responds to
    # Can include multiple domains and subdomains
    server_name example.com www.example.com;

    # Document root - where your website files are located
    root /var/www/example.com/html;

    # Default files to serve when a directory is requested
    # Nginx tries each file in order until one is found
    index index.html index.htm index.nginx-debian.html;

    # Main location block - handles all requests to /
    location / {
        # try_files attempts to serve files in order:
        # 1. Try the exact URI ($uri)
        # 2. Try the URI as a directory ($uri/)
        # 3. Return 404 if nothing found
        try_files $uri $uri/ =404;
    }
}
```

Create this configuration file:

```bash
sudo nano /etc/nginx/sites-available/example.com
```

### Complete Server Block with All Common Options

Here is a more comprehensive configuration with detailed comments:

```nginx
# /etc/nginx/sites-available/example.com
# Comprehensive server block configuration
# This configuration includes all common directives

server {
    # =================================================================
    # LISTENER CONFIGURATION
    # =================================================================

    # Listen on port 80 (HTTP)
    # 'default_server' makes this the fallback for unmatched requests
    listen 80;
    listen [::]:80;

    # =================================================================
    # SERVER IDENTIFICATION
    # =================================================================

    # Primary domain and aliases
    # The first name becomes the primary server name
    server_name example.com www.example.com;

    # =================================================================
    # DOCUMENT ROOT AND INDEX
    # =================================================================

    # Absolute path to website files
    root /var/www/example.com/html;

    # Index file priority (checked left to right)
    index index.html index.htm index.php;

    # =================================================================
    # LOGGING CONFIGURATION
    # =================================================================

    # Per-site access log with custom format
    access_log /var/log/nginx/example.com.access.log;

    # Per-site error log with error level
    # Levels: debug, info, notice, warn, error, crit, alert, emerg
    error_log /var/log/nginx/example.com.error.log error;

    # =================================================================
    # LOCATION BLOCKS
    # =================================================================

    # Main location - serves static files
    location / {
        # Try to serve file directly, then as directory, then 404
        try_files $uri $uri/ =404;
    }

    # Location for static assets with caching
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        # Cache static files for 30 days
        expires 30d;

        # Add cache control headers
        add_header Cache-Control "public, immutable";

        # Disable access logging for static files (reduces I/O)
        access_log off;
    }

    # Deny access to hidden files (starting with .)
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Custom error pages
    error_page 404 /404.html;
    location = /404.html {
        internal;
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        internal;
    }

    # =================================================================
    # SECURITY HEADERS
    # =================================================================

    # Prevent clickjacking attacks
    add_header X-Frame-Options "SAMEORIGIN" always;

    # Prevent MIME type sniffing
    add_header X-Content-Type-Options "nosniff" always;

    # Enable XSS filter
    add_header X-XSS-Protection "1; mode=block" always;

    # =================================================================
    # PERFORMANCE OPTIMIZATIONS
    # =================================================================

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Client body size limit (for file uploads)
    client_max_body_size 10M;
}
```

## The server_name Directive and Matching Logic

The `server_name` directive is crucial for routing requests to the correct server block. Understanding how Nginx matches server names is essential.

### Server Name Syntax Options

```nginx
# Exact match (fastest)
server_name example.com;

# Multiple exact names
server_name example.com www.example.com api.example.com;

# Wildcard at the beginning (matches any subdomain)
server_name *.example.com;

# Wildcard at the end (matches any TLD)
server_name example.*;

# Regular expression (slowest, most flexible)
# Must start with ~ character
server_name ~^(?<subdomain>.+)\.example\.com$;

# Catch-all (matches everything)
server_name _;
```

### Matching Priority

Nginx uses the following priority order when matching server names:

1. **Exact name match** - `server_name example.com;`
2. **Longest wildcard starting with asterisk** - `server_name *.example.com;`
3. **Longest wildcard ending with asterisk** - `server_name mail.*;`
4. **First matching regular expression** - `server_name ~^www\.(.+)\.com$;`
5. **Default server** - The server block with `default_server` parameter

### Example: Multiple Subdomains

```nginx
# /etc/nginx/sites-available/subdomains.example.com
# Handles all subdomains of example.com

server {
    listen 80;
    listen [::]:80;

    # Catch all subdomains
    server_name *.example.com;

    # Use the subdomain to determine the document root
    # $host contains the full hostname from the request
    set $subdomain "";
    if ($host ~* ^([^.]+)\.example\.com$) {
        set $subdomain $1;
    }

    root /var/www/example.com/subdomains/$subdomain;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

## Enabling and Disabling Sites with Symlinks

Nginx on Ubuntu uses a two-directory system for managing site configurations:

- `/etc/nginx/sites-available/` - Contains all configuration files
- `/etc/nginx/sites-enabled/` - Contains symlinks to enabled configurations

### Enabling a Site

```bash
# Create a symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/example.com /etc/nginx/sites-enabled/

# Verify the symlink was created
ls -la /etc/nginx/sites-enabled/
```

### Disabling a Site

```bash
# Remove the symbolic link (NOT the original file)
sudo rm /etc/nginx/sites-enabled/example.com

# The configuration file remains in sites-available for future use
```

### Creating a Helper Script

You can create helper scripts similar to Apache's `a2ensite` and `a2dissite`:

```bash
# Create nginx-ensite script
sudo tee /usr/local/bin/nginx-ensite > /dev/null <<'EOF'
#!/bin/bash
# Enable an Nginx site

if [ -z "$1" ]; then
    echo "Usage: nginx-ensite <site-name>"
    exit 1
fi

SITE=$1
AVAILABLE="/etc/nginx/sites-available/$SITE"
ENABLED="/etc/nginx/sites-enabled/$SITE"

if [ ! -f "$AVAILABLE" ]; then
    echo "Error: Site configuration '$SITE' not found in sites-available"
    exit 1
fi

if [ -L "$ENABLED" ]; then
    echo "Site '$SITE' is already enabled"
    exit 0
fi

sudo ln -s "$AVAILABLE" "$ENABLED"
echo "Site '$SITE' enabled. Run 'sudo nginx -t && sudo systemctl reload nginx' to apply."
EOF

# Create nginx-dissite script
sudo tee /usr/local/bin/nginx-dissite > /dev/null <<'EOF'
#!/bin/bash
# Disable an Nginx site

if [ -z "$1" ]; then
    echo "Usage: nginx-dissite <site-name>"
    exit 1
fi

SITE=$1
ENABLED="/etc/nginx/sites-enabled/$SITE"

if [ ! -L "$ENABLED" ]; then
    echo "Error: Site '$SITE' is not enabled"
    exit 1
fi

sudo rm "$ENABLED"
echo "Site '$SITE' disabled. Run 'sudo systemctl reload nginx' to apply."
EOF

# Make scripts executable
sudo chmod +x /usr/local/bin/nginx-ensite
sudo chmod +x /usr/local/bin/nginx-dissite
```

## Root and Location Blocks

Location blocks are the workhorses of Nginx configuration. They define how to handle requests for different URIs.

### Location Matching Types

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/example.com/html;

    # =================================================================
    # LOCATION MATCHING TYPES (in order of precedence)
    # =================================================================

    # 1. Exact match (=)
    # Only matches the exact URI, nothing else
    location = /favicon.ico {
        log_not_found off;
        access_log off;
    }

    # 2. Preferential prefix match (^~)
    # If matched, stops searching for regex matches
    location ^~ /images/ {
        # All requests starting with /images/ come here
        # Regex locations won't be checked
        expires 30d;
    }

    # 3. Case-sensitive regex match (~)
    location ~ \.php$ {
        # Matches URIs ending in .php (case-sensitive)
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
    }

    # 4. Case-insensitive regex match (~*)
    location ~* \.(gif|jpg|jpeg|png|css|js)$ {
        # Matches regardless of case
        expires 30d;
        add_header Cache-Control "public";
    }

    # 5. Prefix match (no modifier)
    # Longest matching prefix wins
    location /documents/ {
        # Matches any URI starting with /documents/
        alias /var/www/docs/;
        autoindex on;
    }

    # 6. Default/fallback location
    location / {
        try_files $uri $uri/ =404;
    }
}
```

### Nested Location Blocks

```nginx
location /api/ {
    # All API requests

    location /api/v1/ {
        # API version 1 specific handling
        proxy_pass http://api_v1_backend;
    }

    location /api/v2/ {
        # API version 2 specific handling
        proxy_pass http://api_v2_backend;
    }
}
```

### The root vs alias Directive

```nginx
# Using 'root' - appends the location to the root path
location /static/ {
    root /var/www/example.com;
    # Request for /static/image.png serves /var/www/example.com/static/image.png
}

# Using 'alias' - replaces the location with the alias path
location /static/ {
    alias /var/www/shared/assets/;
    # Request for /static/image.png serves /var/www/shared/assets/image.png
}
```

## try_files and Rewrite Rules

### Understanding try_files

The `try_files` directive is one of the most useful directives in Nginx. It specifies how Nginx should try to serve requests.

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/example.com/html;

    # Basic try_files - serve file, then directory, then 404
    location / {
        try_files $uri $uri/ =404;
    }

    # try_files with fallback to index.php (common for PHP frameworks)
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # try_files with named location fallback
    location / {
        try_files $uri $uri/ @backend;
    }

    # Named location for proxy
    location @backend {
        proxy_pass http://127.0.0.1:8080;
    }

    # try_files for single-page applications (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # try_files with maintenance page
    location / {
        try_files /maintenance.html $uri $uri/ =404;
    }
}
```

### Rewrite Rules

Rewrite rules modify the request URI before processing:

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/example.com/html;

    # =================================================================
    # REWRITE DIRECTIVE SYNTAX
    # rewrite regex replacement [flag];
    # Flags: last, break, redirect (302), permanent (301)
    # =================================================================

    # Redirect www to non-www (301 permanent redirect)
    if ($host ~* ^www\.(.+)$) {
        return 301 $scheme://$1$request_uri;
    }

    # Remove trailing slash
    rewrite ^/(.*)/$ /$1 permanent;

    # Add trailing slash to directories
    location / {
        if (-d $request_filename) {
            rewrite ^(.*)$ $1/ permanent;
        }
        try_files $uri $uri/ =404;
    }

    # Clean URLs - /page to /page.html
    location / {
        try_files $uri $uri.html $uri/ =404;
    }

    # Rewrite for pretty URLs (blog example)
    # /blog/2026/01/my-post -> /blog.php?year=2026&month=01&slug=my-post
    rewrite ^/blog/([0-9]+)/([0-9]+)/([a-z0-9-]+)$ /blog.php?year=$1&month=$2&slug=$3 last;

    # Multiple rewrites with 'last' flag
    rewrite ^/old-page$ /new-page last;
    rewrite ^/legacy/(.*)$ /modern/$1 last;

    # Redirect all HTTP to HTTPS
    if ($scheme != "https") {
        return 301 https://$server_name$request_uri;
    }
}
```

### Return vs Rewrite

```nginx
# Use 'return' for simple redirects (more efficient)
location /old-path {
    return 301 /new-path;
}

# Use 'rewrite' when you need pattern matching
rewrite ^/products/([0-9]+)$ /shop/item/$1 permanent;
```

## SSL/TLS Configuration for Multiple Sites

Securing your sites with SSL/TLS is essential. Here's how to configure HTTPS for multiple server blocks.

### Obtaining SSL Certificates with Certbot

```bash
# Install Certbot and the Nginx plugin
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtain certificate for a single domain
sudo certbot --nginx -d example.com -d www.example.com

# Obtain certificates for multiple sites
sudo certbot --nginx -d example.com -d www.example.com -d test.com -d www.test.com

# Obtain certificate without modifying Nginx config (certificate only)
sudo certbot certonly --nginx -d example.com
```

### Manual HTTPS Server Block Configuration

```nginx
# /etc/nginx/sites-available/example.com
# Full HTTPS configuration with HTTP to HTTPS redirect

# HTTP server - redirects all traffic to HTTPS
server {
    listen 80;
    listen [::]:80;

    server_name example.com www.example.com;

    # Redirect all HTTP requests to HTTPS with 301 (permanent)
    return 301 https://$server_name$request_uri;
}

# HTTPS server - main configuration
server {
    # Listen on 443 with SSL and HTTP/2 support
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name example.com www.example.com;

    # =================================================================
    # SSL CERTIFICATE CONFIGURATION
    # =================================================================

    # Path to SSL certificate (fullchain includes intermediate certs)
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;

    # Path to private key
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # =================================================================
    # SSL PROTOCOL AND CIPHER CONFIGURATION
    # =================================================================

    # Only allow TLS 1.2 and 1.3 (disable older, insecure protocols)
    ssl_protocols TLSv1.2 TLSv1.3;

    # Prefer server ciphers over client ciphers
    ssl_prefer_server_ciphers on;

    # Modern cipher suite (adjust based on compatibility needs)
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;

    # Diffie-Hellman parameters for DHE ciphers
    # Generate with: openssl dhparam -out /etc/nginx/dhparam.pem 4096
    ssl_dhparam /etc/nginx/dhparam.pem;

    # =================================================================
    # SSL SESSION CONFIGURATION
    # =================================================================

    # Enable session caching for improved performance
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Disable session tickets (for perfect forward secrecy)
    ssl_session_tickets off;

    # =================================================================
    # OCSP STAPLING
    # =================================================================

    # Enable OCSP stapling for faster certificate validation
    ssl_stapling on;
    ssl_stapling_verify on;

    # Trusted certificate for OCSP (Let's Encrypt chain)
    ssl_trusted_certificate /etc/letsencrypt/live/example.com/chain.pem;

    # DNS resolver for OCSP
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # =================================================================
    # SECURITY HEADERS
    # =================================================================

    # HTTP Strict Transport Security (HSTS)
    # Tells browsers to always use HTTPS for this domain
    # max-age=31536000 = 1 year; includeSubDomains affects all subdomains
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Other security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # =================================================================
    # STANDARD CONFIGURATION
    # =================================================================

    root /var/www/example.com/html;
    index index.html index.htm;

    access_log /var/log/nginx/example.com.access.log;
    error_log /var/log/nginx/example.com.error.log;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

### Shared SSL Configuration Snippet

Create a reusable SSL configuration snippet:

```bash
# Create SSL params snippet
sudo tee /etc/nginx/snippets/ssl-params.conf > /dev/null <<'EOF'
# /etc/nginx/snippets/ssl-params.conf
# Shared SSL configuration parameters

ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_dhparam /etc/nginx/dhparam.pem;

ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;

ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
EOF
```

Then use it in your server blocks:

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Include shared SSL configuration
    include snippets/ssl-params.conf;

    root /var/www/example.com/html;
    # ... rest of configuration
}
```

## Default Server and Catch-All Configuration

The default server handles requests that don't match any other server block. This is important for security and proper request routing.

### Setting a Default Server

```nginx
# /etc/nginx/sites-available/default
# Default server block - catches unmatched requests

server {
    # The 'default_server' parameter makes this the fallback
    listen 80 default_server;
    listen [::]:80 default_server;

    # For HTTPS default server
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;

    # Self-signed certificate for default server (to handle HTTPS requests)
    ssl_certificate /etc/nginx/ssl/default.crt;
    ssl_certificate_key /etc/nginx/ssl/default.key;

    # Catch-all server name
    server_name _;

    # Return 444 (Nginx-specific: close connection without response)
    # This prevents information disclosure
    return 444;
}
```

### Different Default Server Strategies

```nginx
# Strategy 1: Return 444 (close connection silently)
server {
    listen 80 default_server;
    server_name _;
    return 444;
}

# Strategy 2: Return 404 with custom page
server {
    listen 80 default_server;
    server_name _;
    root /var/www/default;

    location / {
        return 404;
    }

    error_page 404 /404.html;
    location = /404.html {
        internal;
    }
}

# Strategy 3: Redirect to main site
server {
    listen 80 default_server;
    server_name _;
    return 301 https://www.example.com$request_uri;
}

# Strategy 4: Show server status/info page (development only!)
server {
    listen 80 default_server;
    server_name _;
    root /var/www/status;

    location / {
        autoindex on;
    }
}
```

### Generating Self-Signed Certificate for Default Server

```bash
# Create SSL directory
sudo mkdir -p /etc/nginx/ssl

# Generate self-signed certificate (valid for 365 days)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/default.key \
    -out /etc/nginx/ssl/default.crt \
    -subj "/CN=default/O=Default Server/C=US"
```

## Per-Site Logging

Proper logging is essential for debugging and monitoring. Configure separate log files for each site.

### Basic Per-Site Logging

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/example.com/html;

    # Access log - records all requests
    access_log /var/log/nginx/example.com.access.log;

    # Error log - records errors and warnings
    error_log /var/log/nginx/example.com.error.log;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

### Custom Log Formats

Define custom log formats in the main nginx.conf:

```nginx
# Add to /etc/nginx/nginx.conf inside the http block

http {
    # Standard combined format (Apache-compatible)
    log_format combined '$remote_addr - $remote_user [$time_local] '
                        '"$request" $status $body_bytes_sent '
                        '"$http_referer" "$http_user_agent"';

    # Extended format with timing information
    log_format detailed '$remote_addr - $remote_user [$time_local] '
                        '"$request" $status $body_bytes_sent '
                        '"$http_referer" "$http_user_agent" '
                        'rt=$request_time uct="$upstream_connect_time" '
                        'uht="$upstream_header_time" urt="$upstream_response_time"';

    # JSON format for log aggregation tools
    log_format json_combined escape=json '{'
        '"time_local":"$time_local",'
        '"remote_addr":"$remote_addr",'
        '"remote_user":"$remote_user",'
        '"request":"$request",'
        '"status":"$status",'
        '"body_bytes_sent":"$body_bytes_sent",'
        '"request_time":"$request_time",'
        '"http_referrer":"$http_referer",'
        '"http_user_agent":"$http_user_agent",'
        '"http_x_forwarded_for":"$http_x_forwarded_for"'
    '}';

    # ... rest of http block
}
```

### Using Custom Log Formats

```nginx
server {
    listen 80;
    server_name example.com;

    # Use custom log format
    access_log /var/log/nginx/example.com.access.log detailed;

    # JSON logs for analytics pipeline
    access_log /var/log/nginx/example.com.json.log json_combined;

    # Conditional logging - only log errors
    access_log /var/log/nginx/example.com.errors.log combined if=$loggable;

    # Error log with debug level (verbose - use only for debugging)
    error_log /var/log/nginx/example.com.error.log warn;

    # ...
}
```

### Log Rotation Configuration

Create a logrotate configuration for Nginx:

```bash
# /etc/logrotate.d/nginx
sudo tee /etc/logrotate.d/nginx-sites > /dev/null <<'EOF'
/var/log/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    prerotate
        if [ -d /etc/logrotate.d/httpd-prerotate ]; then
            run-parts /etc/logrotate.d/httpd-prerotate
        fi
    endscript
    postrotate
        invoke-rc.d nginx rotate >/dev/null 2>&1
    endscript
}
EOF
```

## Testing Configuration with nginx -t

Always test your Nginx configuration before reloading or restarting the service.

### Testing Commands

```bash
# Test configuration syntax
sudo nginx -t

# Expected output for valid configuration:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Test with verbose output
sudo nginx -T

# Test a specific configuration file
sudo nginx -t -c /etc/nginx/nginx.conf

# Check configuration and show parsed config
sudo nginx -T 2>&1 | less
```

### Common Configuration Errors and Solutions

```bash
# Error: "duplicate default server"
# Solution: Only one server block can have 'default_server' per port
# Check: grep -r "default_server" /etc/nginx/sites-enabled/

# Error: "could not build server_names_hash"
# Solution: Increase hash bucket size in nginx.conf
# Add to http block: server_names_hash_bucket_size 64;

# Error: "conflicting server name"
# Solution: Each server_name should be unique across all server blocks
# Check: grep -r "server_name" /etc/nginx/sites-enabled/

# Error: "open() failed (13: Permission denied)"
# Solution: Check file permissions and SELinux/AppArmor settings
# Check: ls -la /var/www/example.com/
# Fix: sudo chown -R www-data:www-data /var/www/example.com/

# Error: "nginx: [emerg] unknown directive"
# Solution: Check for typos or missing modules
# Enable module: sudo nginx -V 2>&1 | grep modules
```

### Applying Configuration Changes

```bash
# Method 1: Reload (graceful - no downtime)
sudo systemctl reload nginx

# Method 2: Restart (brief downtime)
sudo systemctl restart nginx

# Method 3: Using nginx directly
sudo nginx -s reload

# Verify Nginx is running after changes
sudo systemctl status nginx

# Check for any errors in the error log
sudo tail -f /var/log/nginx/error.log
```

## Complete Working Example

Here is a complete, production-ready server block configuration:

```nginx
# /etc/nginx/sites-available/myapp.example.com
# Production server block for myapp.example.com
# Last updated: 2026-01-15

# =================================================================
# HTTP SERVER - Redirect to HTTPS
# =================================================================
server {
    listen 80;
    listen [::]:80;
    server_name myapp.example.com www.myapp.example.com;

    # Redirect all HTTP traffic to HTTPS
    return 301 https://myapp.example.com$request_uri;
}

# =================================================================
# WWW REDIRECT - Canonical URL
# =================================================================
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.myapp.example.com;

    ssl_certificate /etc/letsencrypt/live/myapp.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/myapp.example.com/privkey.pem;
    include snippets/ssl-params.conf;

    # Redirect www to non-www
    return 301 https://myapp.example.com$request_uri;
}

# =================================================================
# MAIN HTTPS SERVER
# =================================================================
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name myapp.example.com;

    # ---------------------------------------------------------
    # SSL Configuration
    # ---------------------------------------------------------
    ssl_certificate /etc/letsencrypt/live/myapp.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/myapp.example.com/privkey.pem;
    include snippets/ssl-params.conf;

    # ---------------------------------------------------------
    # Document Root
    # ---------------------------------------------------------
    root /var/www/myapp.example.com/html;
    index index.html index.htm index.php;

    # ---------------------------------------------------------
    # Logging
    # ---------------------------------------------------------
    access_log /var/log/nginx/myapp.example.com.access.log detailed;
    error_log /var/log/nginx/myapp.example.com.error.log warn;

    # ---------------------------------------------------------
    # Security Headers
    # ---------------------------------------------------------
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;

    # ---------------------------------------------------------
    # Performance
    # ---------------------------------------------------------
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 5;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # Client settings
    client_max_body_size 25M;
    client_body_timeout 60s;
    client_header_timeout 60s;

    # ---------------------------------------------------------
    # Location Blocks
    # ---------------------------------------------------------

    # Main location
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (if applicable)
    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
    }

    # Static assets with caching
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|mp4|webm|pdf)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
        try_files $uri =404;
    }

    # Favicon
    location = /favicon.ico {
        log_not_found off;
        access_log off;
        expires 30d;
    }

    # Robots.txt
    location = /robots.txt {
        log_not_found off;
        access_log off;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Deny access to sensitive files
    location ~* \.(engine|inc|info|install|make|module|profile|test|po|sh|sql|theme|tpl|xtmpl|yml|yaml)$ {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Health check endpoint
    location = /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # ---------------------------------------------------------
    # Error Pages
    # ---------------------------------------------------------
    error_page 404 /404.html;
    location = /404.html {
        internal;
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        internal;
    }
}
```

## Quick Reference Commands

Here is a summary of essential commands for managing Nginx server blocks:

```bash
# Test configuration
sudo nginx -t

# Reload configuration (graceful)
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# Start Nginx
sudo systemctl start nginx

# Stop Nginx
sudo systemctl stop nginx

# Check status
sudo systemctl status nginx

# Enable site
sudo ln -s /etc/nginx/sites-available/example.com /etc/nginx/sites-enabled/

# Disable site
sudo rm /etc/nginx/sites-enabled/example.com

# View access logs
sudo tail -f /var/log/nginx/example.com.access.log

# View error logs
sudo tail -f /var/log/nginx/example.com.error.log

# Check which sites are enabled
ls -la /etc/nginx/sites-enabled/

# Check Nginx processes
ps aux | grep nginx

# Check listening ports
sudo ss -tlnp | grep nginx

# Obtain SSL certificate
sudo certbot --nginx -d example.com

# Renew SSL certificates
sudo certbot renew --dry-run
```

## Troubleshooting Tips

1. **Always test before reloading**: Run `nginx -t` before applying changes
2. **Check logs for errors**: Both `/var/log/nginx/error.log` and site-specific logs
3. **Verify DNS resolution**: Ensure domain names point to your server
4. **Check file permissions**: Web files should be readable by the Nginx user (www-data)
5. **Verify symlinks**: Ensure sites-enabled contains valid symlinks
6. **Check for port conflicts**: Make sure no other service is using ports 80 or 443
7. **Validate SSL certificates**: Use `openssl s_client -connect example.com:443` to test

## Monitoring Your Nginx Server Blocks with OneUptime

Setting up Nginx server blocks is just the first step. To ensure your websites remain available and performant, you need proper monitoring in place.

[OneUptime](https://oneuptime.com) provides comprehensive monitoring solutions for your Nginx-powered websites:

- **Uptime Monitoring**: Get instant alerts when any of your sites go down
- **SSL Certificate Monitoring**: Receive notifications before your certificates expire
- **Performance Monitoring**: Track response times and identify slow pages
- **Status Pages**: Keep your users informed about service status
- **Incident Management**: Streamline your incident response process
- **Log Management**: Aggregate and analyze logs from all your Nginx instances

With OneUptime, you can monitor all your server blocks from a single dashboard, ensuring you never miss critical issues affecting your websites. Start monitoring your Nginx deployments today and maintain the reliability your users expect.
