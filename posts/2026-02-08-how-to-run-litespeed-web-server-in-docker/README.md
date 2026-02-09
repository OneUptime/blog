# How to Run LiteSpeed Web Server in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, LiteSpeed, Web Servers, PHP, WordPress, DevOps, Performance

Description: Deploy LiteSpeed web server in Docker for high-performance PHP hosting with built-in caching and HTTP/3 support

---

LiteSpeed is a high-performance web server that provides a drop-in replacement for Apache httpd. It reads Apache configuration files (including .htaccess), supports mod_rewrite rules, and runs PHP through its built-in LSAPI, which is significantly faster than PHP-FPM. LiteSpeed also includes built-in page caching, HTTP/3 support, and an event-driven architecture that handles thousands of concurrent connections efficiently. Docker makes it easy to run LiteSpeed for PHP applications, especially WordPress.

## LiteSpeed Editions

LiteSpeed comes in two flavors:

**OpenLiteSpeed (OLS)**: Free and open source. Supports most features but lacks some enterprise capabilities like seamless .htaccess parsing and the LiteSpeed Cache plugin's advanced features.

**LiteSpeed Enterprise**: Commercial with a free tier for single-site use. Full .htaccess compatibility, advanced caching, and ESI support.

This guide covers both, starting with OpenLiteSpeed since it is freely available.

## Quick Start with OpenLiteSpeed

```bash
# Run OpenLiteSpeed with PHP 8.3
docker run -d \
  --name openlitespeed \
  -p 80:80 \
  -p 443:443 \
  -p 7080:7080 \
  -v ols_data:/var/www/vhosts \
  litespeedtech/openlitespeed:1.7.19-lsphp83
```

Port reference:
- **80**: HTTP traffic
- **443**: HTTPS traffic
- **7080**: OpenLiteSpeed WebAdmin console

Access the admin console at `https://localhost:7080`. The default credentials are `admin` / `123456`. Change these immediately.

## Docker Compose for PHP Application

A complete setup for hosting a PHP application with OpenLiteSpeed.

```yaml
# docker-compose.yml
version: "3.8"

services:
  litespeed:
    image: litespeedtech/openlitespeed:1.7.19-lsphp83
    container_name: openlitespeed
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "7080:7080"
    environment:
      # PHP tuning
      TZ: UTC
    volumes:
      # Web root for the default virtual host
      - ./html:/var/www/vhosts/localhost/html
      # Custom virtual host configuration
      - ./vhconf:/usr/local/lsws/conf/vhosts/localhost:ro
      # PHP configuration
      - ./php.ini:/usr/local/lsws/lsphp83/etc/php/8.3/litespeed/php.ini:ro
      # SSL certificates
      - ./certs:/usr/local/lsws/certs:ro
      # Persistent logs
      - ols_logs:/usr/local/lsws/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/"]
      interval: 15s
      timeout: 5s
      retries: 3

  mysql:
    image: mysql:8.0
    container_name: mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: myapp
      MYSQL_USER: appuser
      MYSQL_PASSWORD: apppassword
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  ols_logs:
  mysql_data:
```

## PHP Application Setup

Create a PHP application in the web root.

```php
<?php
// html/index.php

// Display server information
$server_software = $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown';
$php_version = phpversion();

echo "<h1>LiteSpeed + PHP in Docker</h1>";
echo "<p>Server: {$server_software}</p>";
echo "<p>PHP Version: {$php_version}</p>";
echo "<p>SAPI: " . php_sapi_name() . "</p>";

// Test database connection
$db_host = getenv('DB_HOST') ?: 'mysql';
$db_user = getenv('DB_USER') ?: 'appuser';
$db_pass = getenv('DB_PASS') ?: 'apppassword';
$db_name = getenv('DB_NAME') ?: 'myapp';

try {
    $pdo = new PDO("mysql:host={$db_host};dbname={$db_name}", $db_user, $db_pass);
    echo "<p>Database: Connected successfully</p>";
} catch (PDOException $e) {
    echo "<p>Database: Connection failed - " . $e->getMessage() . "</p>";
}
?>
```

## WordPress with LiteSpeed

LiteSpeed is particularly popular for WordPress hosting due to its built-in caching and the LiteSpeed Cache plugin.

```yaml
# docker-compose-wordpress.yml
version: "3.8"

services:
  litespeed:
    image: litespeedtech/openlitespeed:1.7.19-lsphp83
    container_name: ls-wordpress
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "7080:7080"
    volumes:
      - wordpress:/var/www/vhosts/localhost/html
      - ls_logs:/usr/local/lsws/logs
    depends_on:
      - mysql
      - redis
    networks:
      - wp-net

  mysql:
    image: mysql:8.0
    container_name: wp-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wpuser
      MYSQL_PASSWORD: wppassword
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - wp-net

  redis:
    image: redis:7-alpine
    container_name: wp-redis
    restart: unless-stopped
    volumes:
      - redis_data:/data
    networks:
      - wp-net

networks:
  wp-net:
    driver: bridge

volumes:
  wordpress:
  mysql_data:
  redis_data:
  ls_logs:
```

Install WordPress into the web root.

```bash
# Start the stack
docker compose -f docker-compose-wordpress.yml up -d

# Download WordPress into the container
docker exec ls-wordpress bash -c \
  "cd /var/www/vhosts/localhost/html && \
   wget https://wordpress.org/latest.tar.gz && \
   tar xzf latest.tar.gz --strip-components=1 && \
   rm latest.tar.gz && \
   chown -R nobody:nogroup ."
```

## Virtual Host Configuration

Customize the virtual host settings for better performance.

```
# vhconf/vhconf.conf
docRoot                   /var/www/vhosts/localhost/html
enableGzip                1
enableBr                  1

# PHP handler
context / {
    type                    NULL
    location                /var/www/vhosts/localhost/html
    allowBrowse             1

    rewrite {
        enable              1
        autoLoadHtaccess    1
    }
}

# Deny access to sensitive files
context /.git {
    type                    NULL
    allowBrowse             0
}

context /.env {
    type                    NULL
    allowBrowse             0
}

# Static file caching
expires {
    enableExpires           1
    expiresByType           image/*=A604800
    expiresByType           text/css=A604800
    expiresByType           application/javascript=A604800
    expiresByType           font/*=A2592000
}
```

## PHP Configuration

Optimize PHP settings for performance.

```ini
; php.ini - Performance-tuned for LiteSpeed
[PHP]
; Memory and execution limits
memory_limit = 256M
max_execution_time = 300
max_input_vars = 3000
post_max_size = 64M
upload_max_filesize = 64M

; OPcache settings (critical for PHP performance)
[opcache]
opcache.enable = 1
opcache.memory_consumption = 128
opcache.interned_strings_buffer = 16
opcache.max_accelerated_files = 10000
opcache.revalidate_freq = 2
opcache.save_comments = 1

; Session settings
[Session]
session.save_handler = redis
session.save_path = "tcp://redis:6379"

; Error handling
[Error]
display_errors = Off
log_errors = On
error_log = /usr/local/lsws/logs/php_error.log
```

## LiteSpeed Cache Configuration

Enable the LiteSpeed Cache for dramatic performance improvements.

```bash
# Install the LiteSpeed Cache plugin for WordPress
docker exec ls-wordpress bash -c \
  "cd /var/www/vhosts/localhost/html && \
   wp plugin install litespeed-cache --activate --allow-root"
```

For non-WordPress PHP applications, use LiteSpeed's built-in cache directives.

```
# .htaccess cache rules for LiteSpeed
<IfModule LiteSpeed>
    # Enable public cache for static content
    CacheEnable public /

    # Cache HTML pages for 1 hour
    CacheLookup on
    RewriteRule .* - [E=Cache-Control:max-age=3600]

    # Do not cache admin or login pages
    RewriteRule ^wp-admin - [E=Cache-Control:no-cache]
    RewriteRule ^wp-login - [E=Cache-Control:no-cache]
</IfModule>
```

## Performance Benchmarking

Compare LiteSpeed performance against Apache and Nginx.

```bash
# Install wrk for benchmarking
docker run --rm --network host williamyeh/wrk \
  -t4 -c100 -d30s http://localhost:80/

# Or use Apache Bench
docker run --rm --network host httpd:2.4 \
  ab -n 10000 -c 100 http://host.docker.internal:80/
```

## SSL with Let's Encrypt

LiteSpeed supports automatic SSL through certbot.

```bash
# Install certbot inside the container
docker exec ls-wordpress bash -c \
  "apt-get update && apt-get install -y certbot"

# Generate a certificate
docker exec ls-wordpress certbot certonly \
  --webroot -w /var/www/vhosts/localhost/html \
  -d yourdomain.com \
  --agree-tos \
  --email you@example.com
```

## Monitoring

```bash
# Check LiteSpeed server status
docker exec openlitespeed /usr/local/lsws/bin/lswsctrl status

# View real-time access logs
docker exec openlitespeed tail -f /usr/local/lsws/logs/access.log

# View error logs
docker exec openlitespeed tail -f /usr/local/lsws/logs/error.log

# PHP error logs
docker exec openlitespeed tail -f /usr/local/lsws/logs/php_error.log

# Container resource usage
docker stats openlitespeed --no-stream
```

## Summary

LiteSpeed in Docker provides a high-performance web server that excels at PHP hosting. Its built-in LSAPI processes PHP faster than PHP-FPM, the caching layer reduces server load dramatically, and HTTP/3 support delivers modern transport performance. For WordPress sites, combine LiteSpeed with the LiteSpeed Cache plugin and Redis for object caching. The Apache-compatible configuration means you can migrate from Apache with minimal changes. Start with OpenLiteSpeed for free, and consider LiteSpeed Enterprise if you need full .htaccess compatibility or advanced ESI caching.
