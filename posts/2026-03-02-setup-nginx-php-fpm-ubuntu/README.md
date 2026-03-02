# How to Set Up Nginx with PHP-FPM on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NGINX, PHP, PHP-FPM, Web Server

Description: Configure Nginx to serve PHP applications using PHP-FPM on Ubuntu, including pool configuration, multiple PHP versions, and security hardening.

---

Nginx doesn't execute PHP natively. Instead, it passes PHP requests to PHP-FPM (FastCGI Process Manager) via FastCGI, which processes them and returns the output. This is actually an advantage - PHP runs as a separate process pool that can be independently scaled, configured, and secured. This guide covers the full setup.

## Installing Nginx and PHP-FPM

```bash
# Update packages
sudo apt update

# Install Nginx
sudo apt install nginx

# Install PHP-FPM (use your target PHP version)
sudo apt install php8.3-fpm

# Install common PHP extensions for web applications
sudo apt install php8.3-mysql php8.3-curl php8.3-gd php8.3-mbstring \
  php8.3-xml php8.3-zip php8.3-intl php8.3-bcmath

# Verify both are running
sudo systemctl status nginx
sudo systemctl status php8.3-fpm
```

## Understanding How Nginx + PHP-FPM Works

When a request for a `.php` file arrives at Nginx:

1. Nginx matches the request against its `location` blocks
2. A `location ~ \.php$` block matches
3. Nginx forwards the request to PHP-FPM via FastCGI protocol
4. PHP-FPM processes the PHP file and returns the output
5. Nginx sends the output to the client

The connection between Nginx and PHP-FPM uses either:
- A Unix socket: `/run/php/php8.3-fpm.sock` (faster, local only)
- A TCP socket: `127.0.0.1:9000` (works across machines)

## Basic Nginx + PHP-FPM Configuration

```bash
sudo nano /etc/nginx/sites-available/example.com
```

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name example.com www.example.com;

    root /var/www/example.com/public_html;
    index index.php index.html index.htm;

    # Access and error logs
    access_log /var/log/nginx/example.com-access.log;
    error_log /var/log/nginx/example.com-error.log;

    # Handle static files and pass unknown URLs to PHP
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Process PHP files through PHP-FPM
    location ~ \.php$ {
        # Prevent arbitrary PHP execution in uploads directories
        # This is a security check - only process PHP if the file exists
        try_files $uri =404;

        # Split path_info from the script filename
        fastcgi_split_path_info ^(.+\.php)(/.+)$;

        # Connect to PHP-FPM via Unix socket
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;

        # Set standard FastCGI parameters
        fastcgi_index index.php;
        include fastcgi_params;

        # Pass the script path to PHP
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT $realpath_root;

        # Optional: increase timeouts for long-running PHP scripts
        fastcgi_read_timeout 300;
    }

    # Deny access to hidden files (.htaccess, .git, etc.)
    location ~ /\. {
        deny all;
    }

    # Deny access to PHP files in sensitive directories
    location ~* /(?:uploads|files|media)/.*\.php$ {
        deny all;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/example.com /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Testing the Setup

```bash
# Create test PHP file
echo "<?php phpinfo();" | sudo tee /var/www/example.com/public_html/phpinfo.php

# Test
curl http://example.com/phpinfo.php | grep -i "fpm-fcgi"
# Should output a line containing "fpm-fcgi" indicating PHP-FPM is handling the request

# Test basic PHP output
echo "<?php echo 'PHP is working via ' . php_sapi_name() . PHP_EOL;" | sudo tee /var/www/example.com/public_html/test.php
curl http://example.com/test.php
# Expected: PHP is working via fpm-fcgi

# Clean up test files
sudo rm /var/www/example.com/public_html/phpinfo.php
sudo rm /var/www/example.com/public_html/test.php
```

## HTTPS Configuration with PHP-FPM

```nginx
# HTTP redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name example.com www.example.com;

    root /var/www/example.com/public_html;
    index index.php index.html;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT $realpath_root;
        fastcgi_param HTTPS on;   # Tell PHP the connection is HTTPS
    }

    location ~ /\. {
        deny all;
    }
}
```

## PHP-FPM Pool Configuration

PHP-FPM's pool settings control how PHP processes are managed:

```bash
sudo nano /etc/php/8.3/fpm/pool.d/www.conf
```

```ini
[www]

; Run as the web server user
user = www-data
group = www-data

; Socket connection
listen = /run/php/php8.3-fpm.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660

; Process management
; dynamic = spawn workers on demand
pm = dynamic

; Max worker processes - set based on available RAM
; Formula: (Total RAM * 0.8) / PHP process memory usage
; Example: (2048MB * 0.8) / 50MB per process = ~32 workers
pm.max_children = 32

; Workers at startup
pm.start_servers = 4

; Idle worker limits
pm.min_spare_servers = 2
pm.max_spare_servers = 8

; Recycle workers after this many requests (prevents memory leaks)
pm.max_requests = 500

; PHP settings for this pool
php_admin_value[memory_limit] = 256M
php_admin_value[max_execution_time] = 60
php_admin_value[upload_max_filesize] = 64M
php_admin_value[post_max_size] = 64M
php_admin_flag[display_errors] = off
php_admin_flag[log_errors] = on
php_admin_value[error_log] = /var/log/php/www-error.log
```

```bash
# Create PHP log directory
sudo mkdir -p /var/log/php
sudo chown www-data:www-data /var/log/php

# Reload PHP-FPM after configuration changes
sudo systemctl reload php8.3-fpm
```

## Multiple PHP Versions Per Site

One of the benefits of PHP-FPM is running different PHP versions for different sites:

```bash
# Install multiple versions via ondrej/php PPA
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update

sudo apt install php7.4-fpm php8.0-fpm php8.1-fpm php8.3-fpm

# Each version has its own socket
ls /run/php/
# php7.4-fpm.sock
# php8.0-fpm.sock
# php8.1-fpm.sock
# php8.3-fpm.sock
```

Configure different sites to use different PHP versions:

```nginx
# Legacy application uses PHP 7.4
server {
    server_name legacy.example.com;
    root /var/www/legacy;

    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_pass unix:/run/php/php7.4-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
    }
}

# Modern application uses PHP 8.3
server {
    server_name modern.example.com;
    root /var/www/modern;

    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
    }
}
```

## Per-Site PHP-FPM Pool

For security isolation, run each site's PHP under a dedicated user:

```bash
# Create a user for the site
sudo useradd -r -s /bin/false site-example

# Create site-specific pool
sudo nano /etc/php/8.3/fpm/pool.d/example.com.conf
```

```ini
; Pool for example.com
[example.com]

; Run as site-specific user
user = site-example
group = site-example

; Site-specific socket
listen = /run/php/php8.3-example.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660

pm = dynamic
pm.max_children = 10
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 4

; PHP configuration
php_admin_value[memory_limit] = 128M
php_admin_value[error_log] = /var/log/php/example.com-error.log
; Disable dangerous functions
php_admin_value[disable_functions] = exec,passthru,shell_exec,system,proc_open,popen,curl_multi_exec
```

```bash
sudo systemctl reload php8.3-fpm

# Update Nginx config to use the site-specific socket
# fastcgi_pass unix:/run/php/php8.3-example.sock;
```

## Troubleshooting

### 502 Bad Gateway

PHP-FPM is not running or the socket path is wrong:

```bash
# Check PHP-FPM status
sudo systemctl status php8.3-fpm

# Verify socket exists and has correct permissions
ls -la /run/php/php8.3-fpm.sock

# Check PHP-FPM error log
sudo journalctl -u php8.3-fpm -n 30

# Verify the socket path in Nginx config matches
sudo grep fastcgi_pass /etc/nginx/sites-enabled/example.com
```

### PHP Files Served as Plain Text

Nginx is not matching the PHP location block:

```bash
# Check the location block syntax in your Nginx config
sudo nginx -t

# Verify the PHP-FPM socket exists
ls -la /run/php/

# Test with curl to see Content-Type header
curl -I http://example.com/test.php
# If Content-Type is text/html or application/json, PHP is executing
# If it's text/x-php or similar, PHP is not executing
```

### Permission Denied Accessing PHP File

```bash
# Check PHP-FPM error log
sudo tail -f /var/log/php/www-error.log

# Verify file permissions
ls -la /var/www/example.com/public_html/index.php
# Should be readable (644 minimum)

# Verify directory permissions
ls -la /var/www/example.com/
# Directories should be traversable (755 minimum)

# Check who PHP-FPM runs as
ps aux | grep php-fpm | grep -v master | head -3
```

### Variable SCRIPT_FILENAME Behavior

If PHP is running but variables like `$_SERVER['DOCUMENT_ROOT']` are wrong:

```nginx
# In the PHP location block, include both lines:
fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
fastcgi_param DOCUMENT_ROOT $realpath_root;

# $realpath_root resolves symlinks - important if your document root is a symlink
# $document_root might not resolve symlinks correctly
```

Nginx with PHP-FPM is the standard configuration for PHP web applications today. Once you understand the FastCGI handoff between Nginx and FPM, the configuration is flexible enough to handle anything from a basic PHP site to multi-site deployments with different PHP versions and user isolation per site.
