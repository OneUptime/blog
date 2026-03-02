# How to Set Up a CDN Pull Zone with Nginx on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NGINX, CDN, Web Server, Performance

Description: Learn how to set up a CDN pull zone with Nginx on Ubuntu, using Nginx as a caching proxy that pulls content from an origin server and serves it with proper cache headers.

---

A CDN pull zone works by sitting between users and your origin server. When a user requests a file, the CDN edge node checks if it has a cached copy. If not, it pulls the file from your origin server, caches it, and serves it. Subsequent requests are served from cache without hitting the origin. You can replicate this behavior with Nginx, either as a self-hosted CDN or as a caching layer in front of your application server.

## Architecture Overview

The setup involves two Nginx instances (which can be on the same or different servers):

- **Origin server** - Serves the actual content (your application)
- **Nginx proxy/CDN node** - Pulls from origin, caches, and serves to users

For a real CDN, you would deploy the proxy node in multiple geographic locations. For a single-server setup, the proxy adds a caching layer in front of your application.

## Configuring the Origin Server

The origin server needs to send proper cache headers so the proxy knows what to cache and for how long:

```bash
sudo nano /etc/nginx/sites-available/origin
```

```nginx
server {
    listen 8080;  # Internal port, not exposed to the internet
    server_name origin.internal;

    root /var/www/html;
    index index.html index.php;

    # Send cache control headers for static assets
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|mp4|webm)$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        add_header Vary "Accept-Encoding";  # Important for compressed variants
    }

    # HTML files - shorter cache time
    location ~* \.html$ {
        expires 1h;
        add_header Cache-Control "public, max-age=3600";
    }

    # API responses - usually not cached
    location /api/ {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        proxy_pass http://localhost:3000;
    }

    # Send Etag headers for validation
    etag on;

    # PHP handling if needed
    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

## Setting Up the CDN Proxy Cache

Configure the caching proxy (the CDN pull zone):

```bash
# Create the cache directory
sudo mkdir -p /var/cache/nginx/cdn
sudo chown -R www-data:www-data /var/cache/nginx/cdn

sudo nano /etc/nginx/nginx.conf
```

Add the cache zone definition to the `http` block:

```nginx
http {
    # Cache zone: 1GB disk storage, 100MB key zone in RAM
    # Files not accessed in 7 days are purged
    proxy_cache_path /var/cache/nginx/cdn
        levels=1:2
        keys_zone=cdn_cache:100m
        max_size=1g
        inactive=7d
        use_temp_path=off;

    # Cache key format - include host and URI
    proxy_cache_key "$scheme$proxy_host$request_uri";

    # Lock prevents multiple simultaneous requests from hitting origin
    # for the same uncached resource (cache stampede protection)
    proxy_cache_lock on;
    proxy_cache_lock_timeout 5s;

    # ... rest of http block
}
```

Now create the CDN proxy server configuration:

```bash
sudo nano /etc/nginx/sites-available/cdn-pullzone
```

```nginx
# Upstream origin server
upstream origin_server {
    server 127.0.0.1:8080;  # Or remote origin IP
    keepalive 32;  # Keep connections to origin alive for efficiency
}

server {
    listen 80;
    listen [::]:80;
    server_name cdn.example.com;

    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name cdn.example.com;

    ssl_certificate /etc/letsencrypt/live/cdn.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cdn.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Logging with cache status
    log_format cdn_log '$remote_addr - $remote_user [$time_local] '
                       '"$request" $status $body_bytes_sent '
                       '"$http_referer" "$http_user_agent" '
                       'cache:$upstream_cache_status '
                       'upstream_time:$upstream_response_time';

    access_log /var/log/nginx/cdn.access.log cdn_log;
    error_log /var/log/nginx/cdn.error.log;

    # Don't cache POST, PUT, DELETE requests
    proxy_cache_methods GET HEAD;

    location / {
        # Use the cdn_cache zone
        proxy_cache cdn_cache;

        # Cache 200 responses for 1 day, 404 for 1 minute
        proxy_cache_valid 200 206 1d;
        proxy_cache_valid 301 302 1h;
        proxy_cache_valid 404 1m;

        # Serve stale content while revalidating in the background
        proxy_cache_revalidate on;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_background_update on;

        # Bypass cache for these conditions
        proxy_cache_bypass $http_pragma $http_authorization;
        proxy_no_cache $http_pragma $http_authorization;

        # Pass requests to origin
        proxy_pass http://origin_server;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
        proxy_send_timeout 10s;

        # Add header showing cache status (HIT, MISS, BYPASS, etc.)
        add_header X-Cache-Status $upstream_cache_status always;
        add_header X-Cache-Server $hostname always;
    }

    # Static files - more aggressive caching
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_cache cdn_cache;
        proxy_cache_valid 200 7d;
        proxy_cache_use_stale error timeout updating;
        proxy_cache_background_update on;

        proxy_pass http://origin_server;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;

        # Override cache headers from origin for very long cache times
        expires 7d;
        add_header Cache-Control "public, max-age=604800, immutable";
        add_header X-Cache-Status $upstream_cache_status always;
    }

    # No caching for admin areas or dynamic content
    location ~* ^/(admin|api|wp-admin) {
        proxy_cache off;
        proxy_pass http://origin_server;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Enabling Compression at the CDN Layer

Enable gzip and Brotli compression to reduce transfer sizes:

```nginx
# Add to the server block or http block
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
    text/javascript
    text/plain
    text/xml
    image/svg+xml;
```

## Cache Purging

Nginx does not include cache purging in the open source version. You can either install the nginx-module-http-cache-purge (available in nginx-extras) or use a simple workaround:

```bash
# Install nginx-extras for purge module
sudo apt install nginx-extras
```

Or manually purge by removing cached files:

```bash
# Find and remove cached files for a specific URL
# The cache key format matters here - it matches proxy_cache_key
CACHE_KEY="httpscache.example.com/path/to/file.css"
CACHE_HASH=$(echo -n "$CACHE_KEY" | md5sum | cut -d' ' -f1)

# The file is stored based on the last 2 characters and next 1 character of the hash
echo "Cache key hash: $CACHE_HASH"

# You can find the file like this:
find /var/cache/nginx/cdn -name "${CACHE_HASH}" 2>/dev/null | xargs rm -f

# Or nuke everything for a full cache clear
sudo find /var/cache/nginx/cdn -type f -delete
sudo nginx -s reload
```

## Monitoring Cache Performance

```bash
# Watch cache hit rates in real time
sudo tail -f /var/log/nginx/cdn.access.log | grep -oP 'cache:\K\S+'  | sort | uniq -c

# Parse the log for statistics
awk '{print $NF}' /var/log/nginx/cdn.access.log | sort | uniq -c | sort -rn

# Check cache directory size
du -sh /var/cache/nginx/cdn

# Count cached files
find /var/cache/nginx/cdn -type f | wc -l
```

## Testing Cache Behavior

```bash
# First request - should be a MISS
curl -I https://cdn.example.com/style.css | grep X-Cache-Status

# Second request - should be a HIT
curl -I https://cdn.example.com/style.css | grep X-Cache-Status

# Check if origin is actually being bypassed
curl -I https://cdn.example.com/style.css

# Verify the response includes proper cache headers
curl -I https://cdn.example.com/image.png | grep -E "Cache-Control|Expires|X-Cache"
```

## Cache Size Management

Configure automatic cache size management in the `proxy_cache_path` directive and add a background cache manager tune:

```nginx
# In /etc/nginx/nginx.conf http block
proxy_cache_path /var/cache/nginx/cdn
    levels=1:2
    keys_zone=cdn_cache:100m
    max_size=10g        # Maximum disk usage
    inactive=7d         # Remove files not accessed in 7 days
    use_temp_path=off;  # Write directly to cache dir (avoid double copy)

# Cache manager runs periodically to enforce max_size
# Cache loader runs on startup to warm the cache from disk
```

With this setup, Nginx acts as a full CDN pull zone, handling cache miss pulls from origin, serving subsequent requests from local cache, and respecting cache control headers from the origin server.
