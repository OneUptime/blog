# How to Optimize Apache Performance for High Traffic on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Apache, Performance, Web Server, Optimization

Description: Practical techniques to optimize Apache2 on Ubuntu for high-traffic workloads including MPM tuning, caching, compression, connection management, and OS-level settings.

---

Apache works fine out of the box for low-traffic sites, but its default configuration is conservative and not optimized for production loads. When your server needs to handle hundreds or thousands of concurrent requests, you need to tune multiple layers: the MPM, caching, compression, connection handling, and even the OS networking stack.

## Baseline: Measure Before Tuning

Before making changes, establish a baseline so you can measure improvement:

```bash
# Install apache2-utils for ab (Apache Bench)
sudo apt install apache2-utils

# Basic benchmark - 1000 requests, 10 concurrent
ab -n 1000 -c 10 http://localhost/

# More realistic test - 5000 requests, 100 concurrent
ab -n 5000 -c 100 http://localhost/

# Key metrics to note:
# Requests per second
# Time per request (mean)
# Failed requests
# Transfer rate

# Also note baseline memory usage
free -m
ps aux | grep apache2 | awk '{sum += $6} END {print "Total MB:", sum/1024}'
```

## MPM Selection and Tuning

Event MPM is the best choice for high traffic:

```bash
# Switch to Event MPM (requires PHP-FPM, not mod_php)
sudo a2dismod mpm_prefork
sudo a2enmod mpm_event
sudo systemctl restart apache2
```

```bash
# Tune Event MPM for your server
sudo nano /etc/apache2/mods-available/mpm_event.conf
```

```apache
<IfModule mpm_event_module>
    # Start with a reasonable number of processes
    StartServers             4

    # Thread pool sizing:
    # MinSpareThreads = sustained idle capacity
    MinSpareThreads         75
    # MaxSpareThreads = peak idle capacity before scaling down
    MaxSpareThreads         250

    # Threads per child process
    # 64 is a good default for most workloads
    ThreadsPerChild         64

    # Total maximum concurrent connections
    # Formula: ServerLimit * ThreadsPerChild
    # 16 * 64 = 1024 max workers
    MaxRequestWorkers       1024
    ServerLimit             16
    ThreadLimit             64

    # Keep-alive settings
    # Shorter timeout = free up workers faster
    KeepAliveTimeout         5

    # Maximum requests per keep-alive connection
    MaxKeepAliveRequests   100

    # Gracefully restart each worker after this many connections
    # Prevents memory creep over time
    MaxConnectionsPerChild   10000
</IfModule>
```

After changing MPM settings:

```bash
sudo apache2ctl configtest
sudo systemctl restart apache2
```

## Keep-Alive Configuration

Keep-alive allows multiple requests over one TCP connection, reducing connection overhead:

```bash
sudo nano /etc/apache2/apache2.conf
```

```apache
# Enable keep-alive
KeepAlive On

# Maximum requests per connection
MaxKeepAliveRequests 100

# Timeout waiting for next request on a keep-alive connection
# Keep this short for high-traffic sites (2-5 seconds)
KeepAliveTimeout 2
```

For a REST API or sites with many assets per page, keep-alive significantly reduces latency.

## Enabling Compression

Compression reduces bandwidth and speeds up page load:

```bash
sudo a2enmod deflate
sudo systemctl reload apache2
```

```bash
sudo nano /etc/apache2/conf-available/deflate.conf
```

```apache
<IfModule mod_deflate.c>
    # Compress all standard text content types
    AddOutputFilterByType DEFLATE text/html text/plain text/xml
    AddOutputFilterByType DEFLATE text/css text/javascript text/x-component
    AddOutputFilterByType DEFLATE application/javascript application/json
    AddOutputFilterByType DEFLATE application/xml application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml application/atom+xml
    AddOutputFilterByType DEFLATE image/svg+xml font/truetype font/opentype

    # Don't compress already-compressed files
    SetEnvIfNoCase Request_URI \.(?:gif|jpe?g|png|webp|mp4|mp3|ogg|gz|bz2|zip|rar)$ no-gzip

    # Minimum compression level for best balance of CPU vs size
    DeflateCompressionLevel 6
</IfModule>
```

```bash
sudo a2enconf deflate
sudo systemctl reload apache2

# Test that compression is working
curl -H "Accept-Encoding: gzip" -I http://localhost/ | grep Content-Encoding
# Should show: Content-Encoding: gzip
```

## Browser Caching

Tell browsers to cache static assets:

```bash
sudo a2enmod expires headers
sudo systemctl reload apache2

sudo nano /etc/apache2/conf-available/caching.conf
```

```apache
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresDefault "access plus 1 day"

    # Images - long cache time
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/webp "access plus 1 year"
    ExpiresByType image/x-icon "access plus 1 year"

    # Fonts
    ExpiresByType font/woff "access plus 1 year"
    ExpiresByType font/woff2 "access plus 1 year"

    # CSS and JS - cache but can be refreshed with version in URL
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType text/javascript "access plus 1 month"

    # HTML - short cache
    ExpiresByType text/html "access plus 1 hour"

    # API responses - no cache
    ExpiresByType application/json "access plus 0 seconds"
</IfModule>

<IfModule mod_headers.c>
    # Add Cache-Control based on Expires header
    Header merge Cache-Control "public"
</IfModule>
```

```bash
sudo a2enconf caching
sudo systemctl reload apache2
```

## Server-Side Caching with mod_cache

For cached content served entirely from memory:

```bash
sudo a2enmod cache cache_disk
sudo systemctl reload apache2

sudo nano /etc/apache2/conf-available/mod-cache.conf
```

```apache
<IfModule mod_cache.c>
    # Cache timeout in seconds (1 hour)
    CacheDefaultExpire 3600

    # Maximum size of an object to cache (1MB)
    CacheMaxExpire 86400

    # Don't cache if Last-Modified is newer than this
    CacheLastModifiedFactor 0.5

    # Disk cache configuration
    <IfModule mod_cache_disk.c>
        CacheRoot /var/cache/apache2/mod_cache_disk
        # Cache the document root
        CacheEnable disk /
        # Size limits
        CacheDirLevels 5
        CacheDirLength 3
        CacheMaxFileSize 1000000
        CacheMinFileSize 1
    </IfModule>
</IfModule>
```

```bash
# Create cache directory
sudo mkdir -p /var/cache/apache2/mod_cache_disk
sudo chown www-data:www-data /var/cache/apache2/mod_cache_disk

sudo a2enconf mod-cache
sudo systemctl reload apache2
```

## Disabling Unnecessary Modules

Every module adds overhead. Disable unused ones:

```bash
# List enabled modules
sudo apache2ctl -M | sort

# Common modules to disable if not needed:
sudo a2dismod autoindex    # Directory listing
sudo a2dismod status       # Server status (keep for monitoring if needed)
sudo a2dismod userdir      # ~/public_html user directories
sudo a2dismod cgi          # CGI execution
sudo a2dismod negotiation  # Content negotiation
sudo a2dismod info         # Server info page

sudo systemctl reload apache2
```

## Reducing DNS Lookups

By default, Apache logs client hostnames by doing reverse DNS lookups. This adds latency:

```bash
sudo nano /etc/apache2/apache2.conf
```

```apache
# Disable reverse DNS lookups (use IPs in logs instead of hostnames)
HostnameLookups Off
```

## Tuning ServerTokens and Reducing Information Leakage

```bash
sudo nano /etc/apache2/conf-available/security.conf
```

```apache
# Show minimal server information in headers
ServerTokens Prod       # Only "Apache", no version

# Don't show server signature on error pages
ServerSignature Off
```

```bash
sudo a2enconf security
sudo systemctl reload apache2

# Verify
curl -I http://localhost/ | grep Server
# Should show: Server: Apache
# Not: Server: Apache/2.4.52 (Ubuntu)
```

## File Descriptor and Connection Limits

Apache may need to open many files under high load:

```bash
# Check current file descriptor limit for Apache processes
cat /proc/$(pgrep -o apache2)/limits | grep "open files"

# Increase system-wide file descriptor limits
sudo nano /etc/security/limits.conf
# Add:
# www-data soft nofile 65535
# www-data hard nofile 65535

# Also set systemd service limits
sudo mkdir -p /etc/systemd/system/apache2.service.d
sudo nano /etc/systemd/system/apache2.service.d/override.conf
```

```ini
[Service]
LimitNOFILE=65535
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart apache2
```

## OS-Level TCP Tuning

For high-traffic servers, tune the kernel networking stack:

```bash
sudo nano /etc/sysctl.d/99-apache-performance.conf
```

```text
# Increase maximum number of connection requests in listen queue
net.core.somaxconn = 65535

# Increase number of backlogged connections per listening socket
net.ipv4.tcp_max_syn_backlog = 65535

# Enable TCP window scaling for high-bandwidth connections
net.ipv4.tcp_window_scaling = 1

# Reduce TIME_WAIT timeout (default 60 seconds)
net.ipv4.tcp_fin_timeout = 30

# Reuse TIME_WAIT sockets for new connections
net.ipv4.tcp_tw_reuse = 1

# Increase local port range
net.ipv4.ip_local_port_range = 1024 65535

# Increase system memory allocated to TCP read/write buffers
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
```

```bash
sudo sysctl -p /etc/sysctl.d/99-apache-performance.conf
```

## Enabling HTTP/2

HTTP/2's multiplexing reduces the number of connections needed:

```bash
sudo a2enmod http2
sudo systemctl reload apache2
```

Add to HTTPS VirtualHost:

```apache
Protocols h2 http/1.1
```

## Benchmarking After Optimization

```bash
# Re-run the baseline benchmark
ab -n 5000 -c 100 http://localhost/

# Compare:
# - Requests per second (higher is better)
# - Time per request (lower is better)
# - Failed requests (should be 0)
# - Transfer rate (higher is better)

# Monitor Apache during the test in another terminal
watch -n 1 'sudo apache2ctl status | tail -20'
```

## Quick Checklist

```bash
# Verify all optimizations are active
sudo apache2ctl -M | grep -E "mpm_event|deflate|expires|headers|http2|cache"

# Check configuration
sudo apache2ctl configtest

# Run ab benchmark
ab -n 10000 -c 200 http://localhost/

# Monitor memory
ps aux | grep apache2 | awk '{sum+=$6} END {print "Total MB:", sum/1024}'
```

Performance tuning is iterative. Make one change at a time, benchmark, and check that the change had the expected effect before moving to the next. The most impactful changes for most deployments are: Event MPM, compression, browser caching, and disabling unnecessary modules.
