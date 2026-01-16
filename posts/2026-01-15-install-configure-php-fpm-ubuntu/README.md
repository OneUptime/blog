# How to Install and Configure PHP-FPM on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, PHP, PHP-FPM, Web Development, Tutorial

Description: Complete guide to installing and optimizing PHP-FPM on Ubuntu for web applications.

---

PHP-FPM (FastCGI Process Manager) is an alternative PHP FastCGI implementation that provides advanced process management features essential for high-traffic websites. This comprehensive guide walks you through installing, configuring, and optimizing PHP-FPM on Ubuntu for production environments.

## Table of Contents

1. [Understanding PHP-FPM Architecture](#understanding-php-fpm-architecture)
2. [Installing PHP and PHP-FPM](#installing-php-and-php-fpm)
3. [Managing Multiple PHP Versions](#managing-multiple-php-versions)
4. [Pool Configuration](#pool-configuration)
5. [Process Management Strategies](#process-management-strategies)
6. [Nginx Integration](#nginx-integration)
7. [Apache Integration](#apache-integration)
8. [PHP Settings Optimization](#php-settings-optimization)
9. [OPcache Configuration](#opcache-configuration)
10. [Security Hardening](#security-hardening)
11. [Monitoring PHP-FPM](#monitoring-php-fpm)
12. [Troubleshooting](#troubleshooting)

## Understanding PHP-FPM Architecture

PHP-FPM operates as a standalone FastCGI server that manages PHP worker processes. Unlike traditional CGI or mod_php approaches, PHP-FPM provides:

### Key Components

```
+------------------+     +------------------+     +------------------+
|   Web Server     | --> |    PHP-FPM       | --> |   PHP Workers    |
|  (Nginx/Apache)  |     |  Master Process  |     |   (Child Procs)  |
+------------------+     +------------------+     +------------------+
         |                        |                        |
    HTTP Request          Process Manager            Execute PHP
    FastCGI Protocol      Pool Management            Return Response
```

### How PHP-FPM Works

1. **Master Process**: Manages configuration and spawns worker processes
2. **Worker Processes**: Handle incoming PHP requests independently
3. **Pools**: Isolated groups of worker processes with separate configurations
4. **FastCGI Protocol**: Efficient communication between web server and PHP-FPM

### Advantages Over mod_php

- **Process Isolation**: Each pool runs under different users
- **Resource Control**: Fine-grained control over memory and process limits
- **Graceful Restarts**: Update configurations without dropping connections
- **Multiple PHP Versions**: Run different PHP versions simultaneously
- **Better Performance**: Optimized for high-concurrency scenarios

## Installing PHP and PHP-FPM

### Prerequisites

Update your system packages first:

```bash
# Update package lists
sudo apt update

# Upgrade existing packages
sudo apt upgrade -y
```

### Adding the PHP Repository

For the latest PHP versions, add the Ondrej Sury PPA:

```bash
# Install software-properties-common for add-apt-repository
sudo apt install -y software-properties-common

# Add the PHP repository
sudo add-apt-repository ppa:ondrej/php -y

# Update package lists again
sudo apt update
```

### Installing PHP 8.3 with PHP-FPM

```bash
# Install PHP 8.3 FPM and common extensions
sudo apt install -y \
    php8.3-fpm \
    php8.3-cli \
    php8.3-common \
    php8.3-mysql \
    php8.3-pgsql \
    php8.3-sqlite3 \
    php8.3-redis \
    php8.3-memcached \
    php8.3-curl \
    php8.3-gd \
    php8.3-imagick \
    php8.3-intl \
    php8.3-mbstring \
    php8.3-xml \
    php8.3-zip \
    php8.3-bcmath \
    php8.3-soap \
    php8.3-opcache
```

### Verify Installation

```bash
# Check PHP version
php -v

# Check PHP-FPM status
sudo systemctl status php8.3-fpm

# View loaded modules
php -m
```

### Enable and Start PHP-FPM

```bash
# Enable PHP-FPM to start on boot
sudo systemctl enable php8.3-fpm

# Start PHP-FPM service
sudo systemctl start php8.3-fpm

# Verify it's running
sudo systemctl is-active php8.3-fpm
```

## Managing Multiple PHP Versions

Running multiple PHP versions allows different applications to use their required PHP version.

### Installing Additional PHP Versions

```bash
# Install PHP 8.2
sudo apt install -y php8.2-fpm php8.2-cli php8.2-common \
    php8.2-mysql php8.2-curl php8.2-gd php8.2-mbstring \
    php8.2-xml php8.2-zip php8.2-opcache

# Install PHP 8.1 (for legacy applications)
sudo apt install -y php8.1-fpm php8.1-cli php8.1-common \
    php8.1-mysql php8.1-curl php8.1-gd php8.1-mbstring \
    php8.1-xml php8.1-zip php8.1-opcache
```

### Switching Default PHP Version

```bash
# List available PHP versions
sudo update-alternatives --list php

# Set default PHP CLI version
sudo update-alternatives --set php /usr/bin/php8.3

# Interactive selection
sudo update-alternatives --config php
```

### Managing Multiple PHP-FPM Services

```bash
# Start/stop specific versions
sudo systemctl start php8.3-fpm
sudo systemctl start php8.2-fpm
sudo systemctl start php8.1-fpm

# Check all running PHP-FPM services
systemctl list-units --type=service | grep php

# View socket files for each version
ls -la /run/php/
```

## Pool Configuration

PHP-FPM pools allow you to run multiple isolated PHP environments with different settings.

### Understanding Pool Files

Pool configurations are stored in:
- `/etc/php/8.3/fpm/pool.d/` - Pool configuration directory
- `/etc/php/8.3/fpm/php-fpm.conf` - Main PHP-FPM configuration

### Default Pool Configuration

Edit the default www pool:

```bash
sudo nano /etc/php/8.3/fpm/pool.d/www.conf
```

### Creating a Custom Pool

Create a new pool for a specific application:

```ini
; /etc/php/8.3/fpm/pool.d/myapp.conf
; Pool name - appears in process list and logs
[myapp]

; =============================================================================
; USER AND GROUP SETTINGS
; =============================================================================
; Run this pool as a specific user for security isolation
user = www-data
group = www-data

; =============================================================================
; LISTEN SETTINGS
; =============================================================================
; Use Unix socket for better performance (recommended for local connections)
listen = /run/php/php8.3-fpm-myapp.sock

; Socket permissions - must be readable by web server
listen.owner = www-data
listen.group = www-data
listen.mode = 0660

; Alternative: TCP socket (useful for remote PHP-FPM or load balancing)
; listen = 127.0.0.1:9001

; Backlog - number of pending connections in queue
listen.backlog = 511

; =============================================================================
; PROCESS MANAGER SETTINGS
; =============================================================================
; Process manager type: static, dynamic, or ondemand
pm = dynamic

; Maximum number of child processes (main memory constraint)
pm.max_children = 50

; Number of children created on startup (only for dynamic)
pm.start_servers = 5

; Minimum number of idle server processes (only for dynamic)
pm.min_spare_servers = 5

; Maximum number of idle server processes (only for dynamic)
pm.max_spare_servers = 35

; Maximum requests per child before respawning (prevents memory leaks)
pm.max_requests = 500

; Timeout for child processes to wait for connection after idle (ondemand only)
; pm.process_idle_timeout = 10s

; =============================================================================
; STATUS AND HEALTH CHECKS
; =============================================================================
; Enable status page for monitoring (protect with web server auth!)
pm.status_path = /status-myapp

; Enable ping page for basic health checks
ping.path = /ping-myapp
ping.response = pong

; =============================================================================
; LOGGING SETTINGS
; =============================================================================
; Access log for request logging (useful for debugging)
access.log = /var/log/php-fpm/myapp-access.log

; Access log format - customize based on needs
access.format = "%R - %u %t \"%m %r%Q%q\" %s %f %{mili}d %{kilo}M %C%%"

; Slow request log - log requests taking longer than threshold
slowlog = /var/log/php-fpm/myapp-slow.log
request_slowlog_timeout = 5s

; Terminate request taking too long (prevents hung processes)
request_terminate_timeout = 300s

; =============================================================================
; RESOURCE LIMITS
; =============================================================================
; Limit open files per process
rlimit_files = 1024

; Limit core dump size (0 to disable)
rlimit_core = 0

; =============================================================================
; ENVIRONMENT VARIABLES
; =============================================================================
; Clear all environment variables for security
clear_env = yes

; Pass specific environment variables to PHP
env[HOSTNAME] = $HOSTNAME
env[PATH] = /usr/local/bin:/usr/bin:/bin
env[TMP] = /tmp
env[TMPDIR] = /tmp
env[TEMP] = /tmp
env[APP_ENV] = production

; =============================================================================
; PHP SETTINGS (pool-specific overrides)
; =============================================================================
; These override php.ini settings for this pool only
php_admin_value[error_log] = /var/log/php-fpm/myapp-error.log
php_admin_flag[log_errors] = on

; Security settings
php_admin_value[open_basedir] = /var/www/myapp:/tmp:/usr/share/php
php_admin_value[disable_functions] = exec,passthru,shell_exec,system,proc_open,popen

; Memory and execution limits
php_value[memory_limit] = 256M
php_value[max_execution_time] = 300
php_value[max_input_time] = 300

; Upload settings
php_value[upload_max_filesize] = 64M
php_value[post_max_size] = 64M
php_value[max_file_uploads] = 20

; Session settings
php_value[session.save_handler] = files
php_value[session.save_path] = /var/lib/php/sessions/myapp

; OPcache settings (pool-specific adjustments)
php_value[opcache.memory_consumption] = 256
php_value[opcache.max_accelerated_files] = 20000
```

### Create Required Directories

```bash
# Create log directory
sudo mkdir -p /var/log/php-fpm
sudo chown www-data:www-data /var/log/php-fpm

# Create session directory for the pool
sudo mkdir -p /var/lib/php/sessions/myapp
sudo chown www-data:www-data /var/lib/php/sessions/myapp
sudo chmod 700 /var/lib/php/sessions/myapp
```

### Validate and Reload Configuration

```bash
# Test PHP-FPM configuration syntax
sudo php-fpm8.3 -t

# Reload PHP-FPM to apply changes
sudo systemctl reload php8.3-fpm

# Verify new pool socket exists
ls -la /run/php/php8.3-fpm-myapp.sock
```

## Process Management Strategies

PHP-FPM offers three process management strategies, each suited for different scenarios.

### Static Mode

All worker processes are created at startup and maintained constantly.

```ini
; /etc/php/8.3/fpm/pool.d/static-example.conf
[static-pool]
; =============================================================================
; STATIC PROCESS MANAGER
; =============================================================================
; Best for: Dedicated servers with consistent high traffic
; Pros: Predictable memory usage, no spawn overhead during requests
; Cons: Memory always allocated even during low traffic

user = www-data
group = www-data
listen = /run/php/php8.3-fpm-static.sock
listen.owner = www-data
listen.group = www-data

pm = static

; Fixed number of children - calculate based on available memory:
; max_children = (Total RAM - Reserved RAM) / Average PHP Process Size
; Example: (8GB - 2GB) / 50MB = ~120 children
pm.max_children = 100

; Recycle children after N requests to prevent memory leaks
pm.max_requests = 1000

; Memory calculation helper:
; - Monitor actual memory usage: ps aux | grep php-fpm
; - Average PHP process: 30-50MB for simple apps, 100-200MB for frameworks
; - Leave room for OS and database: minimum 1-2GB
```

### Dynamic Mode

Workers are spawned based on demand within defined limits.

```ini
; /etc/php/8.3/fpm/pool.d/dynamic-example.conf
[dynamic-pool]
; =============================================================================
; DYNAMIC PROCESS MANAGER (Recommended for most use cases)
; =============================================================================
; Best for: Variable traffic patterns, shared hosting, general purpose
; Pros: Balances performance and resource usage
; Cons: Slight latency when spawning new workers

user = www-data
group = www-data
listen = /run/php/php8.3-fpm-dynamic.sock
listen.owner = www-data
listen.group = www-data

pm = dynamic

; Maximum workers - hard limit to prevent server overload
pm.max_children = 50

; Workers created at startup - start with reasonable baseline
pm.start_servers = 10

; Minimum idle workers - always ready to handle bursts
pm.min_spare_servers = 5

; Maximum idle workers - release resources when not needed
pm.max_spare_servers = 20

; Recycle workers periodically
pm.max_requests = 500

; Tuning guidelines:
; - start_servers = (min_spare + max_spare) / 2
; - Monitor 'active processes' vs 'idle processes' in status page
; - If active == max_children frequently, increase max_children
; - If idle often > max_spare, decrease max_spare
```

### Ondemand Mode

Workers are only spawned when requests arrive.

```ini
; /etc/php/8.3/fpm/pool.d/ondemand-example.conf
[ondemand-pool]
; =============================================================================
; ONDEMAND PROCESS MANAGER
; =============================================================================
; Best for: Low traffic sites, development, memory-constrained servers
; Pros: Minimal memory usage during idle periods
; Cons: First request latency (worker spawn time: ~100-200ms)

user = www-data
group = www-data
listen = /run/php/php8.3-fpm-ondemand.sock
listen.owner = www-data
listen.group = www-data

pm = ondemand

; Maximum workers - same as other modes
pm.max_children = 30

; How long idle workers stay alive before terminating
; Lower = less memory, Higher = less spawn latency
pm.process_idle_timeout = 10s

; Recycle workers to prevent memory leaks
pm.max_requests = 500

; Note: No start_servers or spare_servers settings for ondemand
; All workers terminate when idle beyond process_idle_timeout
```

### Choosing the Right Strategy

| Criteria | Static | Dynamic | Ondemand |
|----------|--------|---------|----------|
| Traffic Pattern | Consistent high | Variable | Low/Sporadic |
| Memory Usage | High (fixed) | Medium (adaptive) | Low (on-demand) |
| Response Time | Best | Good | Initial latency |
| Server Type | Dedicated | VPS/Shared | Small VPS/Dev |

## Nginx Integration

Nginx is the preferred web server for PHP-FPM due to its event-driven architecture.

### Basic Nginx Configuration

```nginx
# /etc/nginx/sites-available/myapp
server {
    # ==========================================================================
    # BASIC SERVER SETTINGS
    # ==========================================================================
    listen 80;
    listen [::]:80;

    # Domain name(s) this server block handles
    server_name example.com www.example.com;

    # Document root - where PHP files are located
    root /var/www/myapp/public;

    # Default index files
    index index.php index.html index.htm;

    # ==========================================================================
    # LOGGING
    # ==========================================================================
    access_log /var/log/nginx/myapp-access.log;
    error_log /var/log/nginx/myapp-error.log;

    # ==========================================================================
    # SECURITY HEADERS
    # ==========================================================================
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # ==========================================================================
    # PHP-FPM CONFIGURATION
    # ==========================================================================
    location ~ \.php$ {
        # Ensure file exists before passing to PHP-FPM
        try_files $uri =404;

        # Split path info for PATH_INFO support
        fastcgi_split_path_info ^(.+\.php)(/.+)$;

        # Pass to PHP-FPM socket (preferred over TCP for local connections)
        fastcgi_pass unix:/run/php/php8.3-fpm-myapp.sock;

        # Default index file for directories
        fastcgi_index index.php;

        # Include FastCGI parameters
        include fastcgi_params;

        # Essential FastCGI parameters
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param PATH_INFO $fastcgi_path_info;
        fastcgi_param DOCUMENT_ROOT $document_root;

        # Timeouts - match PHP-FPM request_terminate_timeout
        fastcgi_connect_timeout 60s;
        fastcgi_send_timeout 300s;
        fastcgi_read_timeout 300s;

        # Buffering settings - adjust based on response sizes
        fastcgi_buffer_size 128k;
        fastcgi_buffers 256 16k;
        fastcgi_busy_buffers_size 256k;
        fastcgi_temp_file_write_size 256k;

        # Intercept errors from PHP-FPM
        fastcgi_intercept_errors on;
    }

    # ==========================================================================
    # STATIC FILE HANDLING
    # ==========================================================================
    location / {
        # Try file, then directory, then fall back to index.php
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Cache static files
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # ==========================================================================
    # SECURITY - BLOCK SENSITIVE FILES
    # ==========================================================================
    # Block access to hidden files (except .well-known)
    location ~ /\.(?!well-known) {
        deny all;
    }

    # Block access to sensitive files
    location ~* (?:\.(?:bak|conf|dist|fla|inc|ini|log|psd|sh|sql|sw[op])|~)$ {
        deny all;
    }

    # Block access to composer files
    location ~* composer\.(json|lock)$ {
        deny all;
    }

    # ==========================================================================
    # PHP-FPM STATUS PAGE (Protected)
    # ==========================================================================
    location ~ ^/(status-myapp|ping-myapp)$ {
        # Restrict access to localhost or specific IPs
        allow 127.0.0.1;
        allow ::1;
        # allow YOUR_MONITORING_IP;
        deny all;

        fastcgi_pass unix:/run/php/php8.3-fpm-myapp.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

### Nginx with Multiple PHP Versions

```nginx
# /etc/nginx/sites-available/multi-php
# Site using PHP 8.3
server {
    listen 80;
    server_name php83.example.com;
    root /var/www/php83-app/public;

    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
}

# Site using PHP 8.2
server {
    listen 80;
    server_name php82.example.com;
    root /var/www/php82-app/public;

    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
}

# Legacy site using PHP 8.1
server {
    listen 80;
    server_name legacy.example.com;
    root /var/www/legacy-app/public;

    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_pass unix:/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
}
```

### Enable and Test Nginx Configuration

```bash
# Create symbolic link to enable site
sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Apache Integration

Apache can work with PHP-FPM using mod_proxy_fcgi.

### Enable Required Apache Modules

```bash
# Enable FastCGI proxy modules
sudo a2enmod proxy proxy_fcgi setenvif

# Enable rewrite module (commonly needed)
sudo a2enmod rewrite

# Enable headers module for security headers
sudo a2enmod headers

# Restart Apache to load modules
sudo systemctl restart apache2
```

### Apache Virtual Host Configuration

```apache
# /etc/apache2/sites-available/myapp.conf
<VirtualHost *:80>
    # ==========================================================================
    # BASIC SETTINGS
    # ==========================================================================
    ServerName example.com
    ServerAlias www.example.com
    ServerAdmin webmaster@example.com

    DocumentRoot /var/www/myapp/public

    # ==========================================================================
    # LOGGING
    # ==========================================================================
    ErrorLog ${APACHE_LOG_DIR}/myapp-error.log
    CustomLog ${APACHE_LOG_DIR}/myapp-access.log combined

    # ==========================================================================
    # DIRECTORY SETTINGS
    # ==========================================================================
    <Directory /var/www/myapp/public>
        # Allow .htaccess files
        AllowOverride All

        # Allow access
        Require all granted

        # URL rewriting for clean URLs
        <IfModule mod_rewrite.c>
            RewriteEngine On

            # Handle Authorization Header
            RewriteCond %{HTTP:Authorization} .
            RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

            # Redirect Trailing Slashes
            RewriteCond %{REQUEST_FILENAME} !-d
            RewriteCond %{REQUEST_URI} (.+)/$
            RewriteRule ^ %1 [L,R=301]

            # Handle Front Controller
            RewriteCond %{REQUEST_FILENAME} !-d
            RewriteCond %{REQUEST_FILENAME} !-f
            RewriteRule ^ index.php [L]
        </IfModule>
    </Directory>

    # ==========================================================================
    # PHP-FPM PROXY CONFIGURATION
    # ==========================================================================
    # Method 1: Using Unix Socket (recommended)
    <FilesMatch \.php$>
        SetHandler "proxy:unix:/run/php/php8.3-fpm-myapp.sock|fcgi://localhost"
    </FilesMatch>

    # Method 2: Using TCP socket (alternative)
    # <FilesMatch \.php$>
    #     SetHandler "proxy:fcgi://127.0.0.1:9000"
    # </FilesMatch>

    # ==========================================================================
    # PHP-FPM STATUS PAGE
    # ==========================================================================
    <LocationMatch "^/(status-myapp|ping-myapp)$">
        SetHandler "proxy:unix:/run/php/php8.3-fpm-myapp.sock|fcgi://localhost"

        # Restrict access
        Require ip 127.0.0.1 ::1
        # Require ip YOUR_MONITORING_IP
    </LocationMatch>

    # ==========================================================================
    # SECURITY SETTINGS
    # ==========================================================================
    # Security headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"

    # Block access to hidden files
    <FilesMatch "^\.">
        Require all denied
    </FilesMatch>

    # Block access to sensitive files
    <FilesMatch "\.(bak|conf|dist|fla|inc|ini|log|psd|sh|sql)$">
        Require all denied
    </FilesMatch>

    # Block access to composer files
    <FilesMatch "composer\.(json|lock)$">
        Require all denied
    </FilesMatch>
</VirtualHost>
```

### Enable and Test Apache Configuration

```bash
# Enable the site
sudo a2ensite myapp.conf

# Disable default site if needed
sudo a2dissite 000-default.conf

# Test Apache configuration
sudo apachectl configtest

# Reload Apache
sudo systemctl reload apache2
```

## PHP Settings Optimization

Optimize PHP settings for performance and security.

### Main php.ini Configuration

```ini
; /etc/php/8.3/fpm/php.ini
; =============================================================================
; RESOURCE LIMITS
; =============================================================================
; Maximum execution time of each script, in seconds
max_execution_time = 300

; Maximum amount of time to parse input data (POST, GET, upload)
max_input_time = 300

; Maximum amount of memory a script may consume
; Adjust based on application needs and server resources
memory_limit = 256M

; =============================================================================
; ERROR HANDLING AND LOGGING
; =============================================================================
; Error reporting level
; Production: E_ALL & ~E_DEPRECATED & ~E_STRICT
; Development: E_ALL
error_reporting = E_ALL & ~E_DEPRECATED & ~E_STRICT

; Don't display errors in production
display_errors = Off
display_startup_errors = Off

; Log errors to file
log_errors = On
log_errors_max_len = 1024
error_log = /var/log/php/php-error.log

; Ignore repeated errors in log
ignore_repeated_errors = On
ignore_repeated_source = Off

; =============================================================================
; DATA HANDLING
; =============================================================================
; Maximum size of POST data
post_max_size = 64M

; Maximum allowed size for uploaded files
upload_max_filesize = 64M

; Maximum number of files that can be uploaded simultaneously
max_file_uploads = 20

; Maximum number of input variables accepted
max_input_vars = 5000

; =============================================================================
; DATE AND TIME
; =============================================================================
; Default timezone
date.timezone = UTC

; =============================================================================
; SESSION SETTINGS
; =============================================================================
; Session handler (files, redis, memcached)
session.save_handler = files
session.save_path = "/var/lib/php/sessions"

; Session security
session.use_strict_mode = 1
session.use_cookies = 1
session.use_only_cookies = 1
session.cookie_httponly = 1
session.cookie_secure = 1
session.cookie_samesite = "Strict"

; Session lifetime
session.gc_maxlifetime = 1440
session.gc_probability = 1
session.gc_divisor = 100

; =============================================================================
; REALPATH CACHE
; =============================================================================
; Determines the size of the realpath cache
; Increase for applications with many files (frameworks)
realpath_cache_size = 4096K

; Duration (in seconds) for which to cache realpath information
realpath_cache_ttl = 600

; =============================================================================
; CTYPE
; =============================================================================
; Enable ctype functions (required by many frameworks)
; Usually enabled by default via php8.3-common

; =============================================================================
; INTERNATIONALIZATION
; =============================================================================
; Default locale
; Set to UTF-8 for proper character handling
default_charset = "UTF-8"

; =============================================================================
; MISCELLANEOUS
; =============================================================================
; Allow include/require to access URLs (security risk - disable if not needed)
allow_url_fopen = On
allow_url_include = Off

; Expose PHP version in headers (disable for security)
expose_php = Off

; Short open tags (disabled for best practice)
short_open_tag = Off

; Zlib output compression
zlib.output_compression = On
zlib.output_compression_level = 6
```

### Create PHP Log Directory

```bash
# Create PHP log directory
sudo mkdir -p /var/log/php
sudo chown www-data:www-data /var/log/php
sudo chmod 755 /var/log/php

# Set up log rotation
sudo tee /etc/logrotate.d/php <<EOF
/var/log/php/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload php8.3-fpm > /dev/null 2>&1 || true
    endscript
}
EOF
```

## OPcache Configuration

OPcache dramatically improves PHP performance by caching precompiled script bytecode.

### OPcache Configuration

```ini
; /etc/php/8.3/fpm/conf.d/10-opcache.ini
; =============================================================================
; OPCACHE SETTINGS - PRODUCTION OPTIMIZED
; =============================================================================

; Enable OPcache
opcache.enable = 1

; Enable OPcache for CLI (useful for long-running scripts)
opcache.enable_cli = 0

; =============================================================================
; MEMORY SETTINGS
; =============================================================================
; Size of shared memory storage (in megabytes)
; Larger = more scripts can be cached
; Start with 256M and increase if needed
opcache.memory_consumption = 256

; Size of the interned strings buffer (in megabytes)
; Stores strings used across scripts
opcache.interned_strings_buffer = 32

; Maximum number of scripts that can be cached
; Check opcache_get_status()['opcache_statistics']['num_cached_keys']
; Should be ~80% of max_accelerated_files
opcache.max_accelerated_files = 30000

; Maximum percentage of wasted memory before restart
opcache.max_wasted_percentage = 10

; =============================================================================
; VALIDATION SETTINGS
; =============================================================================
; PRODUCTION: Disable file timestamp validation for performance
; Set to 1 only during development
opcache.validate_timestamps = 0

; If validate_timestamps=1, how often to check (in seconds)
opcache.revalidate_freq = 0

; Use file path as cache key (better for multi-site)
opcache.use_cwd = 1

; =============================================================================
; OPTIMIZATION SETTINGS
; =============================================================================
; Optimization level (default is good for most cases)
; Bitmask: see PHP documentation for details
opcache.optimization_level = 0x7FFEBFFF

; Enable file-based cache for faster restarts
; Requires writable directory
opcache.file_cache = /tmp/php-opcache
opcache.file_cache_only = 0
opcache.file_cache_consistency_checks = 1

; =============================================================================
; JIT COMPILATION (PHP 8.0+)
; =============================================================================
; JIT buffer size (0 to disable)
; Recommended: 100M for most applications
opcache.jit_buffer_size = 100M

; JIT optimization strategy
; 1255 = optimize hot code paths (recommended for web)
; tracing = full optimization (good for CLI)
opcache.jit = 1255

; =============================================================================
; PRELOADING (PHP 7.4+)
; =============================================================================
; Preload script (loads files into memory at startup)
; Requires custom preload script
; opcache.preload = /var/www/myapp/preload.php
; opcache.preload_user = www-data

; =============================================================================
; LOGGING
; =============================================================================
; Log OPcache errors
opcache.log_verbosity_level = 1
opcache.error_log = /var/log/php/opcache-error.log

; =============================================================================
; ADDITIONAL SETTINGS
; =============================================================================
; Save comments (required for some frameworks like Doctrine)
opcache.save_comments = 1

; Disable huge pages (can cause issues on some systems)
opcache.huge_code_pages = 0

; Restrict to specific paths (security)
; opcache.restrict_api = /var/www
```

### Create OPcache File Cache Directory

```bash
# Create file cache directory
sudo mkdir -p /tmp/php-opcache
sudo chown www-data:www-data /tmp/php-opcache
sudo chmod 755 /tmp/php-opcache
```

### OPcache Status Script

Create a script to monitor OPcache status:

```php
<?php
// /var/www/opcache-status.php
// IMPORTANT: Protect this file with authentication or IP restrictions!

if (!function_exists('opcache_get_status')) {
    die('OPcache is not installed or enabled.');
}

$status = opcache_get_status(false);
$config = opcache_get_configuration();

header('Content-Type: application/json');
echo json_encode([
    'enabled' => $status['opcache_enabled'],
    'cache_full' => $status['cache_full'],
    'memory' => [
        'used_mb' => round($status['memory_usage']['used_memory'] / 1024 / 1024, 2),
        'free_mb' => round($status['memory_usage']['free_memory'] / 1024 / 1024, 2),
        'wasted_mb' => round($status['memory_usage']['wasted_memory'] / 1024 / 1024, 2),
        'wasted_percentage' => round($status['memory_usage']['current_wasted_percentage'], 2),
    ],
    'strings' => [
        'buffer_size_mb' => round($status['interned_strings_usage']['buffer_size'] / 1024 / 1024, 2),
        'used_mb' => round($status['interned_strings_usage']['used_memory'] / 1024 / 1024, 2),
        'free_mb' => round($status['interned_strings_usage']['free_memory'] / 1024 / 1024, 2),
    ],
    'statistics' => [
        'num_cached_scripts' => $status['opcache_statistics']['num_cached_scripts'],
        'num_cached_keys' => $status['opcache_statistics']['num_cached_keys'],
        'max_cached_keys' => $status['opcache_statistics']['max_cached_keys'],
        'hits' => $status['opcache_statistics']['hits'],
        'misses' => $status['opcache_statistics']['misses'],
        'hit_rate' => round($status['opcache_statistics']['opcache_hit_rate'], 2),
        'blacklist_misses' => $status['opcache_statistics']['blacklist_misses'],
    ],
    'jit' => $status['jit'] ?? null,
], JSON_PRETTY_PRINT);
```

### Reset OPcache

```bash
# Create a script to reset OPcache
sudo tee /usr/local/bin/opcache-reset <<'EOF'
#!/bin/bash
# Reset PHP OPcache via PHP-FPM reload
echo "Resetting OPcache..."
systemctl reload php8.3-fpm
echo "OPcache reset complete"
EOF

sudo chmod +x /usr/local/bin/opcache-reset
```

## Security Hardening

Implement security best practices for PHP-FPM.

### PHP Security Settings

```ini
; /etc/php/8.3/fpm/conf.d/99-security.ini
; =============================================================================
; PHP SECURITY HARDENING
; =============================================================================

; Disable dangerous functions (customize based on application needs)
; Common functions to disable in production:
disable_functions = exec,passthru,shell_exec,system,proc_open,popen,curl_exec,curl_multi_exec,parse_ini_file,show_source,proc_nice,proc_terminate,proc_get_status,proc_close,leak,apache_child_terminate,posix_kill,posix_mkfifo,posix_setpgid,posix_setsid,posix_setuid,escapeshellcmd,escapeshellarg,dl

; Disable dangerous classes
disable_classes =

; Hide PHP version
expose_php = Off

; Limit resources
max_execution_time = 30
max_input_time = 60
memory_limit = 128M

; Disable remote file operations
allow_url_fopen = Off
allow_url_include = Off

; SQL safety mode
sql.safe_mode = Off

; Restrict open_basedir (set per-pool for flexibility)
; open_basedir = /var/www:/tmp:/usr/share/php

; Session security
session.cookie_httponly = 1
session.cookie_secure = 1
session.use_strict_mode = 1
session.cookie_samesite = Strict

; Disable potentially dangerous settings
enable_dl = Off
file_uploads = On
upload_max_filesize = 10M
max_file_uploads = 5

; Prevent null byte attacks
; magic_quotes_gpc is removed in PHP 8.0+

; Limit error information exposure
display_errors = Off
display_startup_errors = Off
log_errors = On

; Prevent CRLF injection
mail.add_x_header = Off
```

### Pool Security Configuration

```ini
; /etc/php/8.3/fpm/pool.d/secure-pool.conf
[secure-app]
; =============================================================================
; SECURE POOL CONFIGURATION
; =============================================================================

; Run as unprivileged user
user = www-data
group = www-data

; Socket with restrictive permissions
listen = /run/php/php8.3-fpm-secure.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660

; Process management
pm = dynamic
pm.max_children = 20
pm.start_servers = 5
pm.min_spare_servers = 3
pm.max_spare_servers = 10
pm.max_requests = 500

; Security settings
; Clear environment variables
clear_env = yes

; Restrict filesystem access
php_admin_value[open_basedir] = /var/www/secure-app:/tmp:/usr/share/php

; Disable dangerous functions at pool level
php_admin_value[disable_functions] = exec,passthru,shell_exec,system,proc_open,popen

; Prevent code execution from upload directories
; (implement via web server config as well)

; Chroot (optional - advanced security)
; Requires proper setup of chroot environment
; chroot = /var/www/secure-app
; chdir = /

; Logging
php_admin_value[error_log] = /var/log/php-fpm/secure-app-error.log
php_admin_flag[log_errors] = on

; Limit request sizes
php_value[post_max_size] = 10M
php_value[upload_max_filesize] = 10M

; Request timeouts
request_terminate_timeout = 30s
request_slowlog_timeout = 10s
slowlog = /var/log/php-fpm/secure-app-slow.log
```

### Filesystem Permissions

```bash
#!/bin/bash
# /usr/local/bin/secure-php-permissions.sh
# Secure filesystem permissions for PHP applications

APP_ROOT="/var/www/myapp"
WEB_USER="www-data"
WEB_GROUP="www-data"

# Set ownership
chown -R $WEB_USER:$WEB_GROUP $APP_ROOT

# Directories: rwxr-x--- (750)
find $APP_ROOT -type d -exec chmod 750 {} \;

# Files: rw-r----- (640)
find $APP_ROOT -type f -exec chmod 640 {} \;

# Make storage/cache writable
chmod -R 770 $APP_ROOT/storage
chmod -R 770 $APP_ROOT/bootstrap/cache

# Protect configuration files
chmod 600 $APP_ROOT/.env
chmod 600 $APP_ROOT/config/*.php

# Remove write permissions from vendor
chmod -R 755 $APP_ROOT/vendor
find $APP_ROOT/vendor -type f -exec chmod 644 {} \;

echo "Permissions secured for $APP_ROOT"
```

## Monitoring PHP-FPM

Effective monitoring ensures optimal performance and quick issue detection.

### Enable Status Page

Configure PHP-FPM status endpoint in pool configuration:

```ini
; In pool configuration
pm.status_path = /fpm-status
ping.path = /fpm-ping
ping.response = pong
```

### Status Page Nginx Configuration

```nginx
# PHP-FPM Status and Ping endpoints
location ~ ^/(fpm-status|fpm-ping)$ {
    # Restrict access to localhost and monitoring servers
    allow 127.0.0.1;
    allow ::1;
    # allow YOUR_MONITORING_SERVER_IP;
    deny all;

    fastcgi_pass unix:/run/php/php8.3-fpm.sock;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    include fastcgi_params;
}
```

### Understanding Status Output

```bash
# Request status in various formats
# Plain text
curl http://localhost/fpm-status

# JSON format
curl http://localhost/fpm-status?json

# Full details with process information
curl "http://localhost/fpm-status?json&full"

# XML format
curl http://localhost/fpm-status?xml

# HTML format
curl http://localhost/fpm-status?html
```

### Status Output Explained

```json
{
    "pool": "www",
    "process manager": "dynamic",
    "start time": 1704067200,
    "start since": 86400,
    "accepted conn": 150000,
    "listen queue": 0,
    "max listen queue": 5,
    "listen queue len": 511,
    "idle processes": 10,
    "active processes": 5,
    "total processes": 15,
    "max active processes": 25,
    "max children reached": 0,
    "slow requests": 12
}
```

Key metrics to monitor:

| Metric | Description | Warning Threshold |
|--------|-------------|-------------------|
| `listen queue` | Requests waiting for worker | > 0 frequently |
| `max children reached` | Times all workers were busy | > 0 indicates need for more workers |
| `slow requests` | Requests exceeding slowlog threshold | Investigate slow queries |
| `active processes` | Currently handling requests | Close to max_children |
| `idle processes` | Available workers | Too low = may cause queuing |

### Monitoring Script

```bash
#!/bin/bash
# /usr/local/bin/php-fpm-monitor.sh
# PHP-FPM monitoring script for alerting

STATUS_URL="http://localhost/fpm-status?json"
THRESHOLD_QUEUE=5
THRESHOLD_ACTIVE_PERCENT=80

# Fetch status
STATUS=$(curl -s "$STATUS_URL")

if [ -z "$STATUS" ]; then
    echo "ERROR: Could not fetch PHP-FPM status"
    exit 1
fi

# Parse values
LISTEN_QUEUE=$(echo "$STATUS" | jq -r '."listen queue"')
ACTIVE=$(echo "$STATUS" | jq -r '."active processes"')
TOTAL=$(echo "$STATUS" | jq -r '."total processes"')
MAX_CHILDREN=$(echo "$STATUS" | jq -r '."max children reached"')
SLOW=$(echo "$STATUS" | jq -r '."slow requests"')

# Calculate active percentage
ACTIVE_PERCENT=$((ACTIVE * 100 / TOTAL))

# Check thresholds
ALERT=0

if [ "$LISTEN_QUEUE" -gt "$THRESHOLD_QUEUE" ]; then
    echo "WARNING: Listen queue is $LISTEN_QUEUE (threshold: $THRESHOLD_QUEUE)"
    ALERT=1
fi

if [ "$ACTIVE_PERCENT" -gt "$THRESHOLD_ACTIVE_PERCENT" ]; then
    echo "WARNING: Active processes at $ACTIVE_PERCENT% ($ACTIVE/$TOTAL)"
    ALERT=1
fi

if [ "$MAX_CHILDREN" -gt 0 ]; then
    echo "WARNING: Max children reached $MAX_CHILDREN times"
    ALERT=1
fi

# Output summary
echo "PHP-FPM Status: Queue=$LISTEN_QUEUE, Active=$ACTIVE/$TOTAL ($ACTIVE_PERCENT%), MaxChildrenReached=$MAX_CHILDREN, SlowRequests=$SLOW"

exit $ALERT
```

### Process Memory Monitoring

```bash
#!/bin/bash
# Monitor PHP-FPM memory usage

echo "=== PHP-FPM Memory Usage ==="
echo ""

# Get PHP-FPM processes
ps aux | grep 'php-fpm' | grep -v grep | awk '
BEGIN {
    printf "%-10s %-10s %-10s %-10s %s\n", "PID", "RSS(MB)", "VSZ(MB)", "%MEM", "PROCESS"
    printf "%-10s %-10s %-10s %-10s %s\n", "---", "-------", "-------", "----", "-------"
    total_rss = 0
    count = 0
}
{
    rss_mb = $6 / 1024
    vsz_mb = $5 / 1024
    printf "%-10s %-10.1f %-10.1f %-10.1f %s\n", $2, rss_mb, vsz_mb, $4, $11
    total_rss += rss_mb
    count++
}
END {
    printf "\n"
    printf "Total processes: %d\n", count
    printf "Total RSS: %.1f MB\n", total_rss
    printf "Average RSS per process: %.1f MB\n", (count > 0 ? total_rss/count : 0)
}'
```

## Troubleshooting

Common issues and solutions for PHP-FPM.

### Common Issues and Solutions

#### 1. 502 Bad Gateway

```bash
# Check if PHP-FPM is running
sudo systemctl status php8.3-fpm

# Check PHP-FPM socket exists
ls -la /run/php/

# Check socket permissions
ls -la /run/php/php8.3-fpm.sock

# Check PHP-FPM logs
sudo tail -f /var/log/php8.3-fpm.log

# Verify socket ownership matches web server user
# Nginx: usually www-data
# Apache: usually www-data
```

#### 2. 504 Gateway Timeout

```bash
# Increase timeouts in PHP-FPM pool
request_terminate_timeout = 300s

# Increase timeouts in Nginx
fastcgi_read_timeout 300s;
fastcgi_send_timeout 300s;

# Check for long-running scripts
sudo tail -f /var/log/php-fpm/slow.log

# Identify slow database queries
# Enable MySQL slow query log
```

#### 3. High Memory Usage

```bash
# Check per-process memory
ps aux | grep php-fpm | awk '{sum+=$6} END {print "Total: " sum/1024 " MB"}'

# Reduce max_children
pm.max_children = 20

# Enable max_requests to prevent memory leaks
pm.max_requests = 500

# Profile application memory
# Add to php.ini temporarily:
# memory_limit = 128M
```

#### 4. "No Pool Defined" Error

```bash
# Check pool configuration files exist
ls -la /etc/php/8.3/fpm/pool.d/

# Verify pool configuration syntax
sudo php-fpm8.3 -t

# Check for syntax errors
sudo php-fpm8.3 -t 2>&1 | head -20

# Ensure at least one pool is defined
cat /etc/php/8.3/fpm/pool.d/www.conf | grep '\[www\]'
```

#### 5. Permission Denied Errors

```bash
# Check file ownership
ls -la /var/www/myapp/

# Fix ownership
sudo chown -R www-data:www-data /var/www/myapp/

# Check open_basedir restrictions
php -i | grep open_basedir

# Check SELinux/AppArmor (if enabled)
sudo aa-status
sudo getenforce
```

### Diagnostic Commands

```bash
# =============================================================================
# PHP-FPM DIAGNOSTIC COMMANDS
# =============================================================================

# Check PHP-FPM configuration
sudo php-fpm8.3 -t

# Show all PHP-FPM configuration
sudo php-fpm8.3 -tt

# View loaded PHP configuration
php -i | head -100

# Check installed PHP modules
php -m

# Find PHP configuration files
php --ini

# Check PHP-FPM master process
ps aux | grep "php-fpm: master"

# Count PHP-FPM workers
ps aux | grep "php-fpm: pool" | wc -l

# Monitor PHP-FPM in real-time
watch -n 1 "ps aux | grep php-fpm | grep -v grep"

# Check system resources
free -m
top -b -n 1 | head -20

# View PHP-FPM logs
sudo journalctl -u php8.3-fpm -f

# Check socket status
ss -tuln | grep php

# Verify Nginx to PHP-FPM connection
sudo nginx -t
```

### Performance Tuning Checklist

```bash
#!/bin/bash
# /usr/local/bin/php-fpm-health-check.sh
# Comprehensive PHP-FPM health check

echo "=== PHP-FPM Health Check ==="
echo "Date: $(date)"
echo ""

# 1. Service Status
echo "1. Service Status:"
systemctl is-active php8.3-fpm && echo "   PHP-FPM: Running" || echo "   PHP-FPM: NOT RUNNING!"
echo ""

# 2. Process Count
echo "2. Process Count:"
MASTER=$(ps aux | grep "php-fpm: master" | grep -v grep | wc -l)
WORKERS=$(ps aux | grep "php-fpm: pool" | grep -v grep | wc -l)
echo "   Master processes: $MASTER"
echo "   Worker processes: $WORKERS"
echo ""

# 3. Memory Usage
echo "3. Memory Usage:"
TOTAL_MEM=$(ps aux | grep php-fpm | grep -v grep | awk '{sum+=$6} END {print sum/1024}')
AVG_MEM=$(echo "scale=2; $TOTAL_MEM / ($WORKERS + $MASTER)" | bc)
echo "   Total PHP-FPM memory: ${TOTAL_MEM}MB"
echo "   Average per process: ${AVG_MEM}MB"
echo ""

# 4. Socket Status
echo "4. Socket Status:"
for sock in /run/php/*.sock; do
    if [ -e "$sock" ]; then
        echo "   $sock: EXISTS"
        ls -la "$sock" | awk '{print "   Permissions: " $1 " Owner: " $3 ":" $4}'
    fi
done
echo ""

# 5. Configuration Test
echo "5. Configuration Test:"
sudo php-fpm8.3 -t 2>&1
echo ""

# 6. OPcache Status
echo "6. OPcache Status:"
php -r 'if(function_exists("opcache_get_status")){$s=opcache_get_status();echo "   Enabled: ".($s["opcache_enabled"]?"Yes":"No")."\n   Cached scripts: ".$s["opcache_statistics"]["num_cached_scripts"]."\n   Hit rate: ".round($s["opcache_statistics"]["opcache_hit_rate"],2)."%\n";}else{echo "   OPcache not available\n";}'
echo ""

# 7. Recent Errors
echo "7. Recent Errors (last 5):"
sudo tail -5 /var/log/php8.3-fpm.log 2>/dev/null || echo "   No log file found"
echo ""

echo "=== Health Check Complete ==="
```

### Log Analysis

```bash
# Analyze slow requests
awk '/\[pool/ {pool=$2} /script_filename/ {print pool, $NF}' /var/log/php-fpm/slow.log | sort | uniq -c | sort -rn | head -10

# Count errors by type
grep -oE 'PHP (Fatal|Warning|Notice|Parse) error' /var/log/php-fpm/error.log | sort | uniq -c | sort -rn

# Find most common errors
grep 'PHP Fatal error' /var/log/php-fpm/error.log | sort | uniq -c | sort -rn | head -10

# Monitor access patterns
tail -f /var/log/php-fpm/access.log | awk '{print $7, $10, $11}'
```

## Complete Working Example

Here is a complete, production-ready configuration example:

### 1. PHP-FPM Pool Configuration

```ini
; /etc/php/8.3/fpm/pool.d/production.conf
[production]
; User and group
user = www-data
group = www-data

; Socket configuration
listen = /run/php/php8.3-fpm-production.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660
listen.backlog = 511

; Process management - dynamic for balanced performance
pm = dynamic
pm.max_children = 50
pm.start_servers = 10
pm.min_spare_servers = 5
pm.max_spare_servers = 20
pm.max_requests = 500

; Status and health
pm.status_path = /fpm-status
ping.path = /fpm-ping
ping.response = pong

; Logging
access.log = /var/log/php-fpm/production-access.log
access.format = "%R - %u %t \"%m %r%Q%q\" %s %f %{mili}d %{kilo}M %C%%"
slowlog = /var/log/php-fpm/production-slow.log
request_slowlog_timeout = 5s
request_terminate_timeout = 300s

; Environment
clear_env = yes
env[PATH] = /usr/local/bin:/usr/bin:/bin

; Security
php_admin_value[open_basedir] = /var/www/production:/tmp:/usr/share/php
php_admin_value[disable_functions] = exec,passthru,shell_exec,system
php_admin_value[error_log] = /var/log/php-fpm/production-error.log
php_admin_flag[log_errors] = on

; Performance
php_value[memory_limit] = 256M
php_value[max_execution_time] = 300
php_value[opcache.memory_consumption] = 256
php_value[opcache.max_accelerated_files] = 20000
php_value[opcache.validate_timestamps] = 0
```

### 2. Nginx Server Block

```nginx
# /etc/nginx/sites-available/production
server {
    listen 80;
    listen [::]:80;
    server_name production.example.com;

    root /var/www/production/public;
    index index.php index.html;

    # Logging
    access_log /var/log/nginx/production-access.log;
    error_log /var/log/nginx/production-error.log;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Main location
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # PHP handling
    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass unix:/run/php/php8.3-fpm-production.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param PATH_INFO $fastcgi_path_info;
        fastcgi_connect_timeout 60s;
        fastcgi_send_timeout 300s;
        fastcgi_read_timeout 300s;
        fastcgi_buffer_size 128k;
        fastcgi_buffers 256 16k;
        fastcgi_busy_buffers_size 256k;
    }

    # Static files
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Block hidden files
    location ~ /\. {
        deny all;
    }

    # PHP-FPM status (protected)
    location ~ ^/(fpm-status|fpm-ping)$ {
        allow 127.0.0.1;
        deny all;
        fastcgi_pass unix:/run/php/php8.3-fpm-production.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

### 3. Deployment Script

```bash
#!/bin/bash
# /usr/local/bin/deploy-php-fpm.sh
# Complete PHP-FPM deployment script

set -e

echo "=== PHP-FPM Deployment Script ==="

# Create directories
echo "Creating directories..."
sudo mkdir -p /var/log/php-fpm
sudo mkdir -p /var/log/php
sudo mkdir -p /tmp/php-opcache
sudo mkdir -p /var/lib/php/sessions

# Set permissions
echo "Setting permissions..."
sudo chown -R www-data:www-data /var/log/php-fpm
sudo chown -R www-data:www-data /var/log/php
sudo chown -R www-data:www-data /tmp/php-opcache
sudo chown -R www-data:www-data /var/lib/php/sessions
sudo chmod 700 /var/lib/php/sessions

# Test PHP-FPM configuration
echo "Testing PHP-FPM configuration..."
sudo php-fpm8.3 -t

# Test Nginx configuration
echo "Testing Nginx configuration..."
sudo nginx -t

# Restart services
echo "Restarting services..."
sudo systemctl restart php8.3-fpm
sudo systemctl reload nginx

# Verify services
echo "Verifying services..."
sudo systemctl is-active php8.3-fpm
sudo systemctl is-active nginx

# Check socket
echo "Checking socket..."
ls -la /run/php/php8.3-fpm-production.sock

echo "=== Deployment Complete ==="
```

## Summary

PHP-FPM is a powerful FastCGI process manager that offers:

- **Flexibility**: Multiple pools, PHP versions, and process management strategies
- **Performance**: OPcache integration, JIT compilation, and efficient resource usage
- **Security**: Process isolation, open_basedir restrictions, and disabled functions
- **Monitoring**: Built-in status pages and comprehensive logging

Key takeaways:

1. **Choose the right process manager**: Use `dynamic` for most cases, `static` for dedicated high-traffic servers, and `ondemand` for low-traffic or development environments.

2. **Tune max_children carefully**: Calculate based on available memory and average PHP process size.

3. **Enable OPcache**: Essential for production performance with proper memory allocation.

4. **Monitor continuously**: Use status pages and logs to detect issues early.

5. **Secure your setup**: Implement open_basedir, disable dangerous functions, and use proper permissions.

---

**Monitoring PHP-FPM with OneUptime**: For comprehensive PHP-FPM monitoring in production environments, consider using [OneUptime](https://oneuptime.com). OneUptime provides real-time monitoring of your PHP-FPM pools, alerting you to performance degradation, high memory usage, or process failures before they impact your users. With OneUptime's synthetic monitoring, you can continuously test your PHP applications from multiple locations worldwide, ensuring optimal performance and availability. Set up custom dashboards to track key metrics like active processes, request rates, and response times, and receive instant notifications via email, SMS, or Slack when issues arise.
