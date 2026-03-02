# How to Set Up Apache mod_cache for Content Caching on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Apache, Caching, Web Server, Performance

Description: Configure Apache mod_cache on Ubuntu to cache static and dynamic content, reducing backend load and improving response times for frequently accessed resources.

---

Apache's mod_cache module implements an HTTP caching layer that stores responses and serves them directly without hitting the backend application. This reduces load on application servers, databases, and APIs, and improves response times for clients. Unlike reverse proxy caches like Varnish or Nginx's proxy_cache, mod_cache works natively inside Apache without additional software.

## Understanding Apache Caching Modes

Apache mod_cache operates in two modes:

- **Shared Object Cache** - stores cached content in memory using `mod_cache_socache`
- **Disk Cache** - stores cached content on disk using `mod_cache_disk`

Memory caching is faster but limited by available RAM. Disk caching handles larger volumes but is slower. You can combine both: use memory caching for hot content and disk caching for everything else.

## Enable Required Modules

```bash
# Enable caching modules
sudo a2enmod cache
sudo a2enmod cache_disk
sudo a2enmod cache_socache
sudo a2enmod socache_shmcb

# Also enable headers for cache control inspection
sudo a2enmod headers
sudo a2enmod expires

# Restart Apache
sudo systemctl restart apache2

# Verify modules are active
apache2ctl -M | grep cache
```

## Disk Cache Configuration

Create the cache directory and configure disk caching:

```bash
# Create a cache directory
sudo mkdir -p /var/cache/apache2/mod_cache_disk
sudo chown www-data:www-data /var/cache/apache2/mod_cache_disk
sudo chmod 750 /var/cache/apache2/mod_cache_disk
```

Create a global cache configuration:

```bash
sudo nano /etc/apache2/conf-available/cache-disk.conf
```

```apache
# Enable disk caching
CacheEnable disk /

# Path to the disk cache directory
CacheRoot /var/cache/apache2/mod_cache_disk

# Maximum size of a single cached object (10 MB)
CacheMaxFileSize 10485760

# Minimum size of objects to cache (1 KB - skip tiny files)
CacheMinFileSize 1024

# Maximum age of cached content if no expiry header (1 hour)
CacheDefaultExpire 3600

# Maximum age regardless of expiry headers (24 hours)
CacheMaxExpire 86400

# Ignore URLs with query strings by default (set to On if your app is safe to cache)
CacheIgnoreQueryString Off

# Store cache files in a directory hierarchy
# DirLevels=2 DirLength=1 creates a two-level directory tree
CacheDirLevels 2
CacheDirLength 1
```

```bash
sudo a2enconf cache-disk
sudo systemctl reload apache2
```

## Cache Static Assets in a Virtual Host

Configure caching for specific paths within a virtual host:

```bash
sudo nano /etc/apache2/sites-available/mysite.conf
```

```apache
<VirtualHost *:80>
    ServerName example.com
    DocumentRoot /var/www/html

    # Enable the cache for this virtual host
    CacheQuickHandler off

    # Cache static assets with long TTLs
    <LocationMatch "\.(css|js|png|jpg|gif|ico|woff|woff2|svg)$">
        CacheEnable disk
        CacheDefaultExpire 86400
        CacheMaxExpire 604800

        # Set cache-control headers from Apache (useful when upstream app doesn't)
        Header merge Cache-Control "public"
        ExpiresActive On
        ExpiresDefault "access plus 7 days"
    </LocationMatch>

    # Cache HTML responses for 5 minutes
    <LocationMatch "\.html$">
        CacheEnable disk
        CacheDefaultExpire 300
        CacheMaxExpire 300
        Header merge Cache-Control "public, max-age=300"
    </LocationMatch>

    # Never cache these paths
    <LocationMatch "^/(admin|api|login|logout)">
        CacheDisable On
        Header always set Cache-Control "no-store, no-cache, must-revalidate"
    </LocationMatch>

    # Add a header to show whether a response was served from cache
    Header always set X-Cache-Status "%{cache-status}e"
</VirtualHost>
```

## Memory Cache with mod_cache_socache

For high-traffic sites where disk I/O is the bottleneck, use memory-based caching:

```bash
sudo nano /etc/apache2/conf-available/cache-memory.conf
```

```apache
# Configure the shared memory cache backend
# 512KB shared memory segment - increase if caching many objects
CacheSocache shmcb:/var/run/apache2/cache_socache(512000)

# Enable memory caching for specific locations
<LocationMatch "\.(css|js|ico)$">
    CacheEnable socache
    CacheSocacheMaxTime 3600
    CacheHeader On
</LocationMatch>
```

```bash
sudo a2enconf cache-memory
sudo systemctl reload apache2
```

## Proxy Cache for Reverse Proxy Setups

If Apache proxies requests to a backend application, enable caching at the proxy layer:

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
```

```apache
<VirtualHost *:80>
    ServerName example.com

    # Cache responses from the proxied application
    CacheEnable disk "/"
    CacheRoot /var/cache/apache2/mod_cache_disk
    CacheDefaultExpire 300
    CacheQuickHandler off

    # Ignore Authorization headers for caching (careful with authenticated content)
    CacheIgnoreHeaders Set-Cookie

    # Proxy to backend
    ProxyPass "/" "http://127.0.0.1:3000/"
    ProxyPassReverse "/" "http://127.0.0.1:3000/"
    ProxyPreserveHost On

    # Lock the cache to prevent thundering herd on cache miss
    CacheLock on
    CacheLockPath /tmp/mod_cache-lock
    CacheLockMaxAge 5

    # Add cache status header for debugging
    Header always set X-Cache "%{cache-status}e"
</VirtualHost>
```

The `CacheLock` directive prevents multiple simultaneous requests from all hitting the backend when a cache entry expires. Only one request fetches the new content while others wait briefly.

## Cache Invalidation

Apache mod_cache does not provide a built-in purge mechanism. Options for invalidation:

### Use mod_expires for Time-Based Expiry

```apache
<IfModule mod_expires.c>
    ExpiresActive On

    # Default expiry
    ExpiresDefault "access plus 1 hour"

    # Specific content types
    ExpiresByType text/css "access plus 1 week"
    ExpiresByType application/javascript "access plus 1 week"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType text/html "access plus 5 minutes"
</IfModule>
```

### Manual Cache Clearing

```bash
# Clear the entire disk cache
sudo systemctl stop apache2
sudo rm -rf /var/cache/apache2/mod_cache_disk/*
sudo systemctl start apache2

# Clear just a specific directory (more targeted)
sudo find /var/cache/apache2/mod_cache_disk/ -name "*.header" -mmin +60 -delete
```

### Use Cache-Busting in Application Code

Rather than purging, use versioned URLs for assets:

```html
<!-- Version string forces a cache miss -->
<link rel="stylesheet" href="/style.css?v=20260302">
```

## Monitor Cache Performance

Check whether the cache is actually helping by watching the cache hit rate:

```bash
# Add to LogFormat in apache2.conf or virtual host
LogFormat "%h %l %u %t \"%r\" %>s %b \"%{cache-status}e\"" cached_combined
CustomLog /var/log/apache2/access.log cached_combined

# Parse the log to see cache hit ratio
sudo awk '{print $NF}' /var/log/apache2/access.log | sort | uniq -c | sort -rn
```

The cache-status field shows values like `hit`, `miss`, `expired`, `revalidate`, and `pass`.

```bash
# Quick hit rate calculation
HITS=$(grep '"hit"' /var/log/apache2/access.log | wc -l)
TOTAL=$(wc -l < /var/log/apache2/access.log)
echo "Cache hit rate: $((HITS * 100 / TOTAL))%"
```

## Maintain the Disk Cache

The disk cache grows over time. Set up automatic cleanup with the `htcacheclean` tool included with Apache:

```bash
# Run htcacheclean to trim the cache to 2GB
sudo htcacheclean -t -p /var/cache/apache2/mod_cache_disk -l 2048M

# Set up automatic cleanup via systemd
sudo nano /etc/systemd/system/htcacheclean.service
```

```ini
[Unit]
Description=Apache cache cleaner

[Service]
Type=simple
ExecStart=/usr/sbin/htcacheclean -d 120 -p /var/cache/apache2/mod_cache_disk \
          -l 2048M -i
```

```bash
sudo systemctl enable --now htcacheclean
```

The `-d 120` flag runs the cleaner as a daemon with a 120-second interval, `-l 2048M` keeps the cache under 2GB, and `-i` makes it idle between runs rather than burning CPU constantly.

With caching properly configured, Apache can handle significantly higher request rates without additional backend resources. Even a 50% cache hit rate on a busy site can cut backend load in half, directly improving performance for all users.
