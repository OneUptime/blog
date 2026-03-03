# How to Set Up Nginx with Brotli Compression on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NGINX, Performance, Web Server, Optimization

Description: Configure Nginx with Brotli compression on Ubuntu to reduce bandwidth usage and improve page load times, including building the module and configuring optimal compression settings.

---

Brotli is a compression algorithm developed by Google that typically achieves 15-25% better compression than gzip for web assets. Modern browsers support it natively, and serving Brotli-compressed content can meaningfully reduce your bandwidth costs and improve load times. Nginx does not include Brotli support in its standard build, so you need to either build the module yourself or install nginx from a repository that includes it.

## Option 1: Using the nginx-extras Package

The quickest path on Ubuntu is installing `libnginx-mod-http-brotli-filter` from nginx-extras:

```bash
# Update package list
sudo apt update

# Install nginx with extras
sudo apt install nginx-extras

# Check if Brotli module is available
ls /usr/lib/nginx/modules/ | grep brotli

# The modules should be in:
# /usr/lib/nginx/modules/ngx_http_brotli_filter_module.so
# /usr/lib/nginx/modules/ngx_http_brotli_static_module.so
```

If your Ubuntu version does not have nginx-extras with Brotli, install the separate module package:

```bash
sudo apt install libnginx-mod-http-brotli-filter libnginx-mod-http-brotli-static
```

## Option 2: Building Nginx with Brotli from Source

For more control or to use the latest version of both Nginx and the Brotli module, build from source:

```bash
# Install build dependencies
sudo apt install build-essential libpcre3 libpcre3-dev zlib1g zlib1g-dev \
  libssl-dev libgd-dev git cmake

# Get the Nginx source - match your installed version
nginx -v  # Check current version
NGINX_VERSION=1.26.0
wget http://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz
tar -xzf nginx-${NGINX_VERSION}.tar.gz

# Clone the ngx_brotli module
git clone https://github.com/google/ngx_brotli.git
cd ngx_brotli
git submodule update --init --recursive
cd ..

# Get current Nginx build flags (so you add Brotli to existing build)
nginx -V 2>&1 | grep 'configure arguments'

# Build Nginx with Brotli (add your existing configure args first)
cd nginx-${NGINX_VERSION}
./configure \
  --prefix=/etc/nginx \
  --sbin-path=/usr/sbin/nginx \
  --modules-path=/usr/lib/nginx/modules \
  --conf-path=/etc/nginx/nginx.conf \
  --error-log-path=/var/log/nginx/error.log \
  --http-log-path=/var/log/nginx/access.log \
  --pid-path=/var/run/nginx.pid \
  --with-http_ssl_module \
  --with-http_v2_module \
  --with-http_gzip_static_module \
  --add-module=../ngx_brotli  # Add Brotli module

make -j$(nproc)

# Replace the existing Nginx binary
sudo systemctl stop nginx
sudo cp objs/nginx /usr/sbin/nginx
sudo systemctl start nginx
```

## Loading the Brotli Modules

If using dynamic modules (the nginx-extras approach), load them in nginx.conf:

```bash
sudo nano /etc/nginx/nginx.conf
```

Add at the top of nginx.conf, before the `events` block:

```nginx
# Load Brotli modules
load_module modules/ngx_http_brotli_filter_module.so;
load_module modules/ngx_http_brotli_static_module.so;
```

Test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Configuring Brotli Compression

Add Brotli configuration to your nginx.conf or to individual server blocks:

```nginx
http {
    # Gzip configuration (keep this as fallback for older clients)
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_vary on;
    gzip_types
        application/javascript
        application/json
        application/xml
        text/css
        text/html
        text/javascript
        text/plain
        text/xml
        image/svg+xml;

    # Brotli configuration
    brotli on;                  # Enable dynamic Brotli compression
    brotli_static on;           # Serve pre-compressed .br files if they exist
    brotli_comp_level 6;        # Compression level 0-11 (11 is maximum)
    brotli_min_length 256;      # Minimum size to compress (bytes)
    brotli_buffers 16 8k;       # Number and size of buffers
    brotli_window 512k;         # Sliding window size

    # MIME types to compress
    brotli_types
        application/javascript
        application/json
        application/manifest+json
        application/xml
        application/x-font-ttf
        font/opentype
        image/svg+xml
        image/x-icon
        text/css
        text/html
        text/javascript
        text/plain
        text/xml;
}
```

## Compression Level Guide

Brotli levels 0-11 trade CPU time for compression ratio:

```text
Level 1  - Fastest, minimal compression (similar to gzip level 1)
Level 4  - Good balance for dynamic content (real-time compression)
Level 6  - Default for most web content (good balance)
Level 11 - Maximum compression (only for pre-compressed static files)
```

For dynamic content (PHP, Node.js responses), use level 4-6. For pre-compressed static files, use level 11.

## Pre-Compressing Static Files

The most efficient approach is to pre-compress static assets at build time and serve them directly without runtime compression overhead:

```bash
# Pre-compress your static files using the brotli command-line tool
sudo apt install brotli

# Compress all CSS, JS, and HTML files at maximum level
find /var/www/html -type f \( -name "*.css" -o -name "*.js" -o -name "*.html" -o -name "*.json" \) \
  -exec brotli --quality=11 --force {} \;

# This creates .br files alongside the originals:
# style.css -> style.css.br
# app.js -> app.js.br
ls -la /var/www/html/
```

Configure Nginx to serve the pre-compressed files:

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    root /var/www/html;

    # Brotli static: serve .br files when available
    brotli_static on;

    # Gzip static: serve .gz files as fallback
    gzip_static on;

    location ~* \.(css|js|html|json|svg)$ {
        # Nginx automatically checks for .br or .gz versions
        # based on the Accept-Encoding header
        expires 1y;
        add_header Cache-Control "public, immutable";

        # Vary header is critical - tells caches to store separate
        # versions for different Accept-Encoding values
        add_header Vary Accept-Encoding;
    }
}
```

## Automate Pre-Compression in Build Pipelines

For a Node.js project, add compression to your build script:

```bash
# Build script example
#!/bin/bash

# Run your build
npm run build

# Pre-compress build output
cd dist/
find . -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" -o -name "*.json" \) | while read file; do
    # Brotli compression (level 11 for maximum)
    brotli --quality=11 --force "$file"
    # Gzip compression as fallback
    gzip --best --keep --force "$file"
done

echo "Compressed files:"
ls -la *.br *.gz 2>/dev/null | head -20
```

## Verifying Brotli is Working

```bash
# Test Brotli compression with curl
# The Accept-Encoding header tells the server the client supports Brotli
curl -H "Accept-Encoding: br" -I https://example.com/style.css

# Look for these in the response:
# Content-Encoding: br
# Vary: Accept-Encoding

# Full verbose test showing request and response headers
curl -H "Accept-Encoding: br, gzip" -v https://example.com/ 2>&1 | grep -E "Accept|Content-Encoding|Vary"

# Use an online tool like https://tools.keycdn.com/brotli-test to verify
# Or check with browser developer tools (Network tab, look at Content-Encoding column)
```

## Comparing Compression Sizes

```bash
# Compare original, gzip, and Brotli sizes
FILE=/var/www/html/app.js

# Original size
ls -la $FILE

# Gzip at level 9
gzip -9 -c $FILE | wc -c

# Brotli at level 11
brotli --quality=11 -c $FILE | wc -c

# Typical results for a large JavaScript file:
# Original: 500KB
# Gzip level 9: 150KB (70% reduction)
# Brotli level 11: 130KB (74% reduction)
```

## Server Block Example with Full Configuration

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name example.com;

    root /var/www/html;
    index index.html;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Brotli for dynamic content
    brotli on;
    brotli_comp_level 4;
    brotli_min_length 256;
    brotli_types text/css application/javascript text/html application/json image/svg+xml;

    # Serve pre-compressed static files
    brotli_static on;
    gzip_static on;

    # Static assets with long cache
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
        access_log off;
    }

    # HTML - shorter cache
    location ~* \.html$ {
        expires 1h;
        add_header Cache-Control "public";
        add_header Vary "Accept-Encoding";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

After enabling Brotli, check your server's bandwidth usage - you should see a noticeable reduction in outbound transfer for text-based assets, especially on sites serving large JavaScript bundles.
