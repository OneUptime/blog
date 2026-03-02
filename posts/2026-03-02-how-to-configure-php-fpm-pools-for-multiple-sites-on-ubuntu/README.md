# How to Configure PHP-FPM Pools for Multiple Sites on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, PHP, PHP-FPM, Web Server, Performance

Description: Configure separate PHP-FPM pools for multiple websites on Ubuntu to isolate processes, set per-site resource limits, and improve security and performance.

---

PHP-FPM's pool system is one of its most useful features for multi-tenant servers. Instead of all PHP requests going through a single pool of worker processes, you can create dedicated pools for each site or application. This provides resource isolation (a traffic spike on one site does not steal workers from another), security isolation (each pool runs as a different system user), and the ability to tune settings per application.

## Understanding PHP-FPM Pools

A PHP-FPM pool is a group of PHP worker processes that listen on a socket and handle requests for a specific application. The pool configuration defines:

- Which socket or TCP port to listen on
- Which user and group the workers run as
- How many worker processes to spawn
- Environment variables to pass to workers
- PHP settings to override

Pool configuration files live in `/etc/php/8.3/fpm/pool.d/`. The default pool is `www.conf`.

## Default Pool Structure

Look at the default pool to understand the format:

```bash
cat /etc/php/8.3/fpm/pool.d/www.conf
```

Key sections:

```ini
; Pool name (shown in process list and logs)
[www]

; Run as this user/group
user = www-data
group = www-data

; Listen on a Unix socket (faster than TCP for local connections)
listen = /run/php/php8.3-fpm.sock

; Socket permissions
listen.owner = www-data
listen.group = www-data
listen.mode = 0660

; Process manager type (static, dynamic, or ondemand)
pm = dynamic

; Max worker processes
pm.max_children = 5

; Workers started at boot
pm.start_servers = 2

; Minimum idle workers
pm.min_spare_servers = 1

; Maximum idle workers
pm.max_spare_servers = 3
```

## Creating Separate System Users for Each Site

For proper isolation, each site should run as its own system user:

```bash
# Create system users for each site (no home directory, no login shell)
sudo useradd -r -s /bin/false -M site1user
sudo useradd -r -s /bin/false -M site2user
sudo useradd -r -s /bin/false -M shop1user

# Create web root directories
sudo mkdir -p /var/www/site1
sudo mkdir -p /var/www/site2
sudo mkdir -p /var/www/shop1

# Set ownership
sudo chown site1user:site1user /var/www/site1
sudo chown site2user:site2user /var/www/site2
sudo chown shop1user:shop1user /var/www/shop1
```

## Creating Pool Configuration Files

Create a separate pool config file for each site:

```bash
sudo nano /etc/php/8.3/fpm/pool.d/site1.conf
```

```ini
; /etc/php/8.3/fpm/pool.d/site1.conf
; Pool for site1.example.com - a small marketing site

[site1]
; Run as dedicated user
user = site1user
group = site1user

; Dedicated socket for this pool
listen = /run/php/php8.3-fpm-site1.sock

; Socket readable by nginx (which runs as www-data)
listen.owner = www-data
listen.group = www-data
listen.mode = 0660

; Process management for a small/low-traffic site
pm = ondemand

; Maximum number of PHP workers for this site
pm.max_children = 10

; Kill idle workers after 10 seconds (saves RAM)
pm.process_idle_timeout = 10s

; Limit requests per worker (prevents memory leaks)
pm.max_requests = 500

; Log slow requests (>5 seconds)
slowlog = /var/log/php/site1-slow.log
request_slowlog_timeout = 5s

; Terminate requests that take too long
request_terminate_timeout = 60s

; Per-pool php.ini overrides
php_admin_value[error_log] = /var/log/php/site1-error.log
php_admin_flag[log_errors] = on
php_value[memory_limit] = 128M
php_value[max_execution_time] = 30

; Environment variables for the pool
env[HOSTNAME] = $HOSTNAME
env[APP_ENV] = production
```

```bash
sudo nano /etc/php/8.3/fpm/pool.d/site2.conf
```

```ini
; /etc/php/8.3/fpm/pool.d/site2.conf
; Pool for site2.example.com - a high-traffic application

[site2]
user = site2user
group = site2user

listen = /run/php/php8.3-fpm-site2.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660

; Dynamic PM for unpredictable traffic
pm = dynamic
pm.max_children = 30
pm.start_servers = 5
pm.min_spare_servers = 3
pm.max_spare_servers = 10
pm.max_requests = 1000

slowlog = /var/log/php/site2-slow.log
request_slowlog_timeout = 3s
request_terminate_timeout = 120s

; Higher limits for this application
php_admin_value[error_log] = /var/log/php/site2-error.log
php_admin_flag[log_errors] = on
php_value[memory_limit] = 256M
php_value[max_execution_time] = 60
php_value[upload_max_filesize] = 32M
php_value[post_max_size] = 32M

env[APP_ENV] = production
env[DB_HOST] = localhost
```

```ini
; /etc/php/8.3/fpm/pool.d/shop1.conf
; Pool for shop1.example.com - an e-commerce site

[shop1]
user = shop1user
group = shop1user

listen = /run/php/php8.3-fpm-shop1.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660

; Static PM for predictable load (dedicated server or known high load)
pm = static
pm.max_children = 20
pm.max_requests = 2000

php_admin_value[error_log] = /var/log/php/shop1-error.log
php_admin_flag[log_errors] = on
php_value[memory_limit] = 512M
php_value[max_execution_time] = 120
```

## Disable the Default Pool

If you are using dedicated pools, disable the default www pool to avoid having orphaned processes:

```bash
# Rename or remove the default pool
sudo mv /etc/php/8.3/fpm/pool.d/www.conf /etc/php/8.3/fpm/pool.d/www.conf.disabled
```

## Create Log Directories

```bash
sudo mkdir -p /var/log/php
sudo chown root:www-data /var/log/php
sudo chmod 775 /var/log/php
```

## Configure Nginx to Use Each Pool

Point each site's Nginx server block to its dedicated socket:

```nginx
# /etc/nginx/sites-available/site1.conf
server {
    listen 80;
    server_name site1.example.com;
    root /var/www/site1;

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.3-fpm-site1.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
}
```

```nginx
# /etc/nginx/sites-available/site2.conf
server {
    listen 80;
    server_name site2.example.com;
    root /var/www/site2;

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.3-fpm-site2.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
}
```

## Validating and Reloading

```bash
# Check PHP-FPM configuration for syntax errors
sudo php-fpm8.3 -t

# Reload PHP-FPM to apply new pool configs
sudo systemctl reload php8.3-fpm

# Verify all sockets are created
ls -la /run/php/

# Check pool processes are running
ps aux | grep php-fpm | grep -v grep
```

## Monitoring Per-Pool Status

Enable the status page per pool:

```ini
; Add to each pool configuration
pm.status_path = /fpm-status
```

```nginx
# Add to each site's Nginx config
location ~ ^/fpm-status$ {
    fastcgi_pass unix:/run/php/php8.3-fpm-site1.sock;
    include fastcgi_params;
    allow 127.0.0.1;
    deny all;
}
```

```bash
# Check pool status
curl http://site1.example.com/fpm-status
curl http://site1.example.com/fpm-status?full
```

Separate PHP-FPM pools are the right approach for any server hosting more than one application. The small overhead of managing separate configuration files pays off in stability, security, and the ability to troubleshoot issues per application.
