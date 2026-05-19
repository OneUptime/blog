# How to Install and Configure PHP on Ubuntu Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, PHP, Web Server, LAMP

Description: Step-by-step guide to installing PHP on Ubuntu Server, configuring php.ini settings, and integrating it with Nginx or Apache for web application hosting.

---

PHP remains the language behind a large share of the web, powering WordPress, Laravel, Symfony, and countless custom applications. Setting it up correctly on Ubuntu involves more than just running `apt install php`. Getting PHP-FPM configured, tuning php.ini, and integrating with a web server correctly makes the difference between a server that works and one that works well under load.

## Installation Methods

### Via Ondrej Sury PPA (Recommended)

Ubuntu's default repositories often have older PHP versions. The `ondrej/php` PPA provides current releases and lets you install multiple versions side by side:

```bash
sudo apt update
sudo apt install software-properties-common -y
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update
```

The examples below use PHP 8.3; replace `8.3` with a newer supported version if you choose one:

```bash
sudo apt install php8.3 php8.3-fpm php8.3-cli -y
```

### Via Ubuntu Default Repositories

If you prefer only packages from Ubuntu's official repos:

```bash
sudo apt update
sudo apt install php php-fpm php-cli -y
```

This installs whatever version Ubuntu's current release ships with (typically one major version behind the latest).

## Understanding PHP Installation Modes

PHP on a server typically runs in one of three modes:

- **PHP-FPM** (FastCGI Process Manager) - a separate process pool that Nginx or Apache talk to via FastCGI. This is the preferred mode for production.
- **mod_php** - PHP compiled as an Apache module. Simple but less flexible.
- **CLI** - command-line PHP for scripts and cron jobs.

For Nginx, you must use PHP-FPM since Nginx cannot run PHP directly.

## Verifying the Installation

```bash
# Check PHP version

php --version

# Check PHP-FPM is installed
php-fpm8.3 --version

# Check what modules are loaded
php -m

# Check key configuration values
php -i | grep -E "memory_limit|upload_max|post_max|max_execution"
```

## Configuring php.ini

The main configuration file location depends on the SAPI:

```bash
# CLI configuration
/etc/php/8.3/cli/php.ini

# FPM configuration (used when running via web server)
/etc/php/8.3/fpm/php.ini
```

Key settings to review and adjust:

```ini
; /etc/php/8.3/fpm/php.ini

; Memory limit per PHP process
; Increase for memory-intensive applications like WordPress with plugins
memory_limit = 256M

; Maximum time a script can run (seconds)
; Increase for long-running scripts, decrease for security
max_execution_time = 30

; Maximum time for parsing input data
max_input_time = 60

; Maximum POST data size (must be >= upload_max_filesize)
post_max_size = 64M

; Maximum file upload size
upload_max_filesize = 64M

; Maximum number of files that can be uploaded at once
max_file_uploads = 20

; Display errors (set to Off in production)
display_errors = Off

; Log errors to file
log_errors = On
error_log = /var/log/php/error.log

; Timezone - set to your local timezone
date.timezone = "America/New_York"

; OPcache settings (see below)
opcache.enable = 1
```

After editing php.ini, always validate the PHP-FPM configuration and confirm which configuration files PHP loads:

```bash
sudo php-fpm8.3 -t
php --ini
```

## Enabling OPcache

OPcache dramatically improves PHP performance by caching compiled bytecode in memory, avoiding the overhead of parsing and compiling scripts on every request:

```bash
# Install OPcache (usually included with PHP)
sudo apt install php8.3-opcache -y
```

Configure it in `php.ini` or create a dedicated file:

```ini
; /etc/php/8.3/fpm/conf.d/10-opcache.ini

opcache.enable = 1
opcache.enable_cli = 0

; Memory for storing compiled scripts
opcache.memory_consumption = 128

; Memory for storing string interning (increases efficiency)
opcache.interned_strings_buffer = 16

; Maximum number of files to cache
opcache.max_accelerated_files = 10000

; How often to check for file changes (seconds)
; Set to 0 in production if you redeploy via process restarts
opcache.revalidate_freq = 2

; Enable the JIT compiler (PHP 8.x)
; Helps CPU-bound code more than I/O-bound web apps
opcache.jit = tracing
opcache.jit_buffer_size = 128M
```

## Integrating PHP-FPM with Nginx

Configure Nginx to pass PHP requests to PHP-FPM:

```nginx
# /etc/nginx/sites-available/myapp
server {
    listen 80;
    server_name example.com;
    root /var/www/myapp;
    index index.php index.html;

    # Serve existing files directly
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Pass PHP files to PHP-FPM
    location ~ \.php(?:/|$) {
        # Support PATH_INFO for applications that use it
        fastcgi_split_path_info ^(.+\.php)(/.+)$;

        # Only pass existing PHP files to PHP-FPM
        try_files $fastcgi_script_name =404;

        # Connect to PHP-FPM socket
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;

        # Tell PHP-FPM the script filename
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param PATH_INFO $fastcgi_path_info;
    }

    # Block access to hidden files
    location ~ /\. {
        deny all;
    }
}
```

## Integrating PHP with Apache

For Apache, install mod_php or use PHP-FPM:

```bash
# Option 1: mod_php (simpler)
sudo apt install libapache2-mod-php8.3 -y
sudo a2enmod php8.3

# Option 2: PHP-FPM with Apache (more flexible)
sudo apt install php8.3-fpm -y
sudo a2enmod proxy_fcgi setenvif
sudo a2enconf php8.3-fpm
```

Apache configuration with PHP-FPM:

```apache
# /etc/apache2/sites-available/myapp.conf
<VirtualHost *:80>
    ServerName example.com
    DocumentRoot /var/www/myapp

    # Use PHP-FPM instead of mod_php
    <FilesMatch \.php$>
        SetHandler "proxy:unix:/run/php/php8.3-fpm.sock|fcgi://localhost/"
    </FilesMatch>

    <Directory /var/www/myapp>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

## Managing PHP-FPM

```bash
# Start/stop/restart PHP-FPM
sudo systemctl start php8.3-fpm
sudo systemctl enable php8.3-fpm
sudo systemctl status php8.3-fpm

# Reload after configuration changes
sudo systemctl reload php8.3-fpm

# Check if PHP-FPM socket exists
ls -la /run/php/
```

## Creating a phpinfo Test Page

Temporarily create a test page to verify the configuration:

```bash
# Create test file
echo "<?php phpinfo(); ?>" | sudo tee /var/www/html/phpinfo.php

# Test
curl http://localhost/phpinfo.php | head -50

# IMPORTANT: Remove this file after testing - it exposes server configuration
sudo rm /var/www/html/phpinfo.php
```

## Useful Extensions to Install

```bash
# Common extensions for web applications
# MySQL/MariaDB, PostgreSQL, Redis, HTTP client, image processing,
# multibyte strings, XML, ZIP, internationalization, and math support
sudo apt install \
    php8.3-mysql \
    php8.3-pgsql \
    php8.3-redis \
    php8.3-curl \
    php8.3-gd \
    php8.3-mbstring \
    php8.3-xml \
    php8.3-zip \
    php8.3-intl \
    php8.3-bcmath \
    -y

# Reload PHP-FPM after installing extensions
sudo systemctl reload php8.3-fpm
```

After installation, check extensions are active:

```bash
php -m | grep -i redis
php -m | grep -i pdo
```

With PHP installed and properly configured, your Ubuntu server is ready to host PHP-based web applications. The next step is typically configuring PHP-FPM pool settings for your specific workload.
