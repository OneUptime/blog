# How to Configure Nginx Proxy Cache on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NGINX, Caching, Web Server, Performance

Description: Configure Nginx as a caching reverse proxy on Ubuntu to cache upstream responses, reduce backend load, and serve content faster to end users.

---

Nginx can act as a caching reverse proxy that stores upstream responses on disk and serves subsequent identical requests directly from cache without hitting the backend. This setup is useful in front of application servers, API backends, or even other web servers, and can reduce backend load by 90% or more for content-heavy sites.

## Prerequisites

Nginx should be installed and running. The `proxy_cache` module is included in the standard Nginx build.

```bash
# Install Nginx if not already installed
sudo apt update
sudo apt install nginx -y

# Verify the proxy_cache module is available
nginx -V 2>&1 | grep -o 'with-http_proxy_module'
# Should output: with-http_proxy_module
```

## Configuring the Cache Zone

The first step is to define a shared memory zone where cache metadata is stored, and a directory on disk where cached responses are written.

Edit the main Nginx configuration:

```bash
sudo nano /etc/nginx/nginx.conf
```

Add the cache zone definition inside the `http` block:

```nginx
http {
    # Define the cache zone
    # Zone name: my_cache
    # Keys zone: 10m shared memory for cache keys (stores ~80,000 keys)
    # Cache directory: /var/cache/nginx/my_cache
    # Max size: 1g total disk usage
    # Inactive: remove items not accessed for 60 minutes
    # use_temp_path: write temp files in the same directory (performance)
    proxy_cache_path /var/cache/nginx/my_cache
        levels=1:2
        keys_zone=my_cache:10m
        max_size=1g
        inactive=60m
        use_temp_path=off;

    # ... rest of http block
}
```

Create the cache directory:

```bash
sudo mkdir -p /var/cache/nginx/my_cache
sudo chown www-data:www-data /var/cache/nginx/my_cache
```

## Configuring a Proxy Cache Virtual Host

Create a new virtual host configuration:

```bash
sudo nano /etc/nginx/sites-available/cached-proxy
```

```nginx
# Define the upstream backend
upstream backend {
    server 127.0.0.1:8080;
    keepalive 32;
}

server {
    listen 80;
    server_name example.com;

    # Enable caching for this server block
    proxy_cache my_cache;

    # Cache key: use URI + query string (do not include cookies by default)
    proxy_cache_key "$scheme$host$request_uri";

    # Cache successful responses for 1 hour
    proxy_cache_valid 200 301 302 1h;

    # Cache 404 responses for 1 minute
    proxy_cache_valid 404 1m;

    # Serve stale content while fetching fresh content in the background
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;

    # Background fetch to prevent cache stampede
    proxy_cache_background_update on;

    # Lock the cache: only one request fetches the content when cache is empty
    proxy_cache_lock on;
    proxy_cache_lock_timeout 5s;

    # Add header to show cache status (useful for debugging)
    add_header X-Cache-Status $upstream_cache_status;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # How long to wait for the backend before returning an error
        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
    }

    # Skip cache for admin or authenticated endpoints
    location /admin {
        proxy_pass http://backend;
        proxy_no_cache 1;
        proxy_cache_bypass 1;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/cached-proxy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Testing Cache Behavior

The `X-Cache-Status` header tells you whether a response came from cache.

```bash
# First request - should be MISS
curl -I http://example.com/api/products
# X-Cache-Status: MISS

# Second request - should be HIT
curl -I http://example.com/api/products
# X-Cache-Status: HIT

# Possible values:
# HIT     - served from cache
# MISS    - not in cache, fetched from backend
# BYPASS  - cache bypass was triggered
# EXPIRED - cached but expired, re-fetched from backend
# STALE   - serving stale cache entry
# UPDATING - serving stale while background refresh happens
# REVALIDATED - revalidated with backend (conditional request)
```

## Cache Bypass Rules

You often want to bypass the cache for logged-in users or specific conditions.

```nginx
# Set bypass variables based on request properties
map $http_cookie $no_cache {
    default 0;
    # Bypass if session cookie is present (logged-in user)
    "~*session=" 1;
}

map $request_method $no_cache_method {
    default 0;
    # Never cache POST, PUT, DELETE requests
    POST 1;
    PUT 1;
    DELETE 1;
    PATCH 1;
}

server {
    # ...

    proxy_cache_bypass $no_cache $no_cache_method;
    proxy_no_cache $no_cache $no_cache_method;
}
```

## Controlling Cache with Upstream Headers

The backend can control caching behavior through response headers.

```nginx
# Respect Cache-Control headers from the backend
# proxy_ignore_headers Cache-Control;  # Uncomment to ignore Cache-Control

# Override cache validity from response headers
proxy_cache_valid 200 10m;  # Cache 200 responses for 10 min regardless of headers
```

If your backend sends `Cache-Control: no-store` or `Cache-Control: private`, Nginx will not cache those responses by default. You can override this behavior:

```nginx
# Ignore Cache-Control and Expires headers from backend
# (useful when backend headers are misconfigured)
proxy_ignore_headers Cache-Control Expires;
```

## Purging Cache Entries

Nginx's open-source version does not include a cache purge module natively. The simplest approach is to delete cache files manually.

```bash
# Find and delete a specific cached response
# Cache files are stored with a hash-based directory structure
# Use this approach to purge by URL

# Example: purge cache for /api/products
CACHE_KEY="httpexample.com/api/products"
HASH=$(echo -n "$CACHE_KEY" | md5sum | awk '{print $1}')

find /var/cache/nginx/my_cache -name "${HASH: -1}/${HASH: -3:2}/${HASH}" -delete

# Or simply clear all cache (restart-safe)
sudo rm -rf /var/cache/nginx/my_cache/*
sudo systemctl reload nginx
```

For production use, consider Nginx Plus (which has a native purge API) or the third-party `ngx_cache_purge` module.

## Monitoring Cache Usage

```bash
# Check cache disk usage
du -sh /var/cache/nginx/my_cache

# Count cached files
find /var/cache/nginx/my_cache -type f | wc -l

# Enable access logging with cache status
# Add to the log_format in nginx.conf:
log_format cache_log '$remote_addr - [$time_local] '
                     '"$request" $status $body_bytes_sent '
                     '"$http_referer" "$http_user_agent" '
                     'cache:$upstream_cache_status '
                     'rt:$request_time uct:$upstream_connect_time '
                     'urt:$upstream_response_time';

# Then reference it in your server block
access_log /var/log/nginx/cached-proxy.log cache_log;
```

Analyze hit rates from logs:

```bash
# Calculate cache hit rate from access log
HIT=$(grep 'cache:HIT' /var/log/nginx/cached-proxy.log | wc -l)
TOTAL=$(grep -c 'cache:' /var/log/nginx/cached-proxy.log)
echo "Hit rate: $(echo "scale=2; $HIT * 100 / $TOTAL" | bc)%"
```

## Filesystem Considerations

For high-traffic sites, use a dedicated fast disk or tmpfs for the cache.

```bash
# Mount tmpfs for ultra-fast in-memory cache (data lost on reboot)
sudo mkdir -p /var/cache/nginx/my_cache
sudo mount -t tmpfs -o size=512m tmpfs /var/cache/nginx/my_cache

# Make it persistent across reboots (in /etc/fstab)
echo "tmpfs /var/cache/nginx/my_cache tmpfs size=512m 0 0" | sudo tee -a /etc/fstab
```

Using tmpfs is effective for small, frequently-accessed responses. For larger caches that need persistence across restarts, use an SSD-backed directory with the `max_size` limit set appropriately.

Nginx proxy caching is one of the most effective and low-configuration tools for reducing backend load. A well-configured Nginx cache in front of a Rails, Django, or Node.js application can handle traffic spikes without scaling the application tier at all.
