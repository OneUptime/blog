# How to Set Up Apache with PHP-FPM on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Apache, PHP, PHP-FPM, Web Server

Description: Configure Apache to use PHP-FPM instead of mod_php on Ubuntu for better performance, isolation, and per-site PHP configuration.

---

PHP-FPM (FastCGI Process Manager) is a PHP implementation that runs as a separate process from the web server, communicating via FastCGI. The traditional approach uses `mod_php`, which embeds PHP directly into Apache. PHP-FPM is superior for most production deployments because it allows per-site configuration, better process management, and is required for HTTP/2 support.

## Why PHP-FPM Over mod_php

- **Per-site isolation**: Different PHP pools can run as different users, preventing cross-site contamination
- **Independent process management**: PHP workers are separate from Apache, so PHP crashes don't affect the web server
- **HTTP/2 compatibility**: Apache's HTTP/2 module requires Event MPM, which is incompatible with mod_php
- **Better resource control**: You can set different memory limits and worker counts per site
- **Easier PHP version management**: Multiple PHP versions can run simultaneously

## Installing Apache and PHP-FPM

```bash
# Update package list
sudo apt update

# Install Apache
sudo apt install apache2

# Install PHP-FPM (replace 8.3 with your desired version)
sudo apt install php8.3-fpm

# Install common PHP extensions
sudo apt install php8.3-mysql php8.3-curl php8.3-gd php8.3-mbstring php8.3-xml php8.3-zip php8.3-intl

# Verify PHP-FPM is running
sudo systemctl status php8.3-fpm
```

## Switching Apache MPM

PHP-FPM works best with Event MPM. If `mod_php` is installed, disable it first:

```bash
# Check if mod_php is currently enabled
sudo apache2ctl -M | grep php

# If it shows something like php8.x_module:
sudo a2dismod php8.3

# Disable Prefork MPM
sudo a2dismod mpm_prefork

# Enable Event MPM
sudo a2enmod mpm_event

# Restart Apache (required for MPM change)
sudo systemctl restart apache2

# Verify
sudo apache2ctl -M | grep mpm
# Should show: mpm_event_module (shared)
```

## Enabling PHP-FPM Integration Modules

```bash
# Enable the FastCGI proxy module
sudo a2enmod proxy_fcgi setenvif

# Enable the PHP-FPM configuration that comes with the package
sudo a2enconf php8.3-fpm

# Reload Apache
sudo systemctl reload apache2

# Verify PHP is working
echo "<?php phpinfo();" | sudo tee /var/www/html/phpinfo.php
curl http://localhost/phpinfo.php | grep "PHP Version" | head -1

# Clean up the test file
sudo rm /var/www/html/phpinfo.php
```

## Understanding PHP-FPM Pools

PHP-FPM uses "pools" to manage PHP processes. The default pool is `www` and its configuration is at `/etc/php/8.3/fpm/pool.d/www.conf`.

```bash
# View the default pool configuration
sudo cat /etc/php/8.3/fpm/pool.d/www.conf
```

Key pool settings:

```ini
; Pool name
[www]

; User and group that PHP-FPM runs as
user = www-data
group = www-data

; Socket configuration - using Unix socket (faster than TCP)
listen = /run/php/php8.3-fpm.sock

; Or TCP (use this for separate PHP-FPM servers)
; listen = 127.0.0.1:9000

; Socket permissions
listen.owner = www-data
listen.group = www-data
listen.mode = 0660

; Process management mode
; dynamic: spawn workers on demand (recommended for most setups)
; static: always keep a fixed number of workers
; ondemand: like dynamic but starts from 0
pm = dynamic

; Maximum number of workers
pm.max_children = 50

; Workers at startup
pm.start_servers = 5

; Minimum idle workers
pm.min_spare_servers = 5

; Maximum idle workers
pm.max_spare_servers = 35

; PHP settings override for this pool
php_admin_value[memory_limit] = 256M
php_admin_value[upload_max_filesize] = 64M
php_admin_value[post_max_size] = 64M
php_admin_value[max_execution_time] = 300
php_admin_flag[display_errors] = off
php_admin_flag[log_errors] = on
php_admin_value[error_log] = /var/log/php/www-error.log
```

## Configuring Apache to Use PHP-FPM

### Global Configuration (via a2enconf)

The `php8.3-fpm` configuration file that `a2enconf` enables handles this:

```bash
cat /etc/apache2/conf-available/php8.3-fpm.conf
```

```apache
<IfModule !mod_php8.c>
<IfModule proxy_fcgi_module>
    # Enable HTTP/1.1 Upgraded requests
    <IfModule setenvif_module>
    SetEnvIfNoCase ^Authorization$ "(.+)" HTTP_AUTHORIZATION=$1
    </IfModule>

    # For .php files, use the PHP-FPM socket
    <FilesMatch ".+\.ph(ar|p|tml)$">
        SetHandler "proxy:unix:/run/php/php8.3-fpm.sock|fcgi://localhost"
    </FilesMatch>

    # Deny access to raw php sources by default
    <FilesMatch ".+\.phps$">
        Require all denied
    </FilesMatch>

    <FilesMatch "^\.ph(ar|p|ps|tml)$">
        Require all denied
    </FilesMatch>
</IfModule>
</IfModule>
```

### Per-VirtualHost PHP-FPM Configuration

For finer control, configure PHP-FPM per virtual host:

```bash
sudo nano /etc/apache2/sites-available/example.com.conf
```

```apache
<VirtualHost *:80>
    ServerName example.com
    DocumentRoot /var/www/example.com/public_html

    # Direct PHP requests to PHP-FPM via the Unix socket
    <FilesMatch "\.php$">
        SetHandler "proxy:unix:/run/php/php8.3-fpm.sock|fcgi://localhost"
    </FilesMatch>

    # Or use TCP (useful if PHP-FPM is on a different machine)
    # <FilesMatch "\.php$">
    #     SetHandler "proxy:fcgi://127.0.0.1:9000"
    # </FilesMatch>

    <Directory /var/www/example.com/public_html>
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/example.com-error.log
    CustomLog ${APACHE_LOG_DIR}/example.com-access.log combined
</VirtualHost>
```

## Running Multiple PHP Versions

One of PHP-FPM's main advantages is running different PHP versions per site:

```bash
# Install multiple PHP versions
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update

sudo apt install php7.4-fpm php8.0-fpm php8.1-fpm php8.3-fpm

# Each version runs as its own service
sudo systemctl status php7.4-fpm
sudo systemctl status php8.3-fpm

# Each has its own socket
ls /run/php/
# php7.4-fpm.sock
# php8.0-fpm.sock
# php8.1-fpm.sock
# php8.3-fpm.sock
```

Configure each virtual host to use a different PHP version:

```apache
# Site A uses PHP 7.4
<VirtualHost *:80>
    ServerName legacy-app.example.com
    DocumentRoot /var/www/legacy-app

    <FilesMatch "\.php$">
        SetHandler "proxy:unix:/run/php/php7.4-fpm.sock|fcgi://localhost"
    </FilesMatch>
</VirtualHost>

# Site B uses PHP 8.3
<VirtualHost *:80>
    ServerName modern-app.example.com
    DocumentRoot /var/www/modern-app

    <FilesMatch "\.php$">
        SetHandler "proxy:unix:/run/php/php8.3-fpm.sock|fcgi://localhost"
    </FilesMatch>
</VirtualHost>
```

## Creating a Dedicated PHP-FPM Pool Per Site

For security isolation, run each site's PHP under its own user:

```bash
# Create a system user for the site
sudo useradd -r -s /bin/false www-example

# Create a new pool configuration
sudo nano /etc/php/8.3/fpm/pool.d/example.com.conf
```

```ini
; Pool for example.com
[example.com]

; Run as the site-specific user
user = www-example
group = www-example

; Site-specific socket
listen = /run/php/php8.3-example.sock

listen.owner = www-data
listen.group = www-data
listen.mode = 0660

pm = dynamic
pm.max_children = 10
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 5

; Log errors to a site-specific file
php_admin_value[error_log] = /var/log/php/example.com-error.log
php_admin_value[memory_limit] = 128M

; Disable dangerous functions
php_admin_value[disable_functions] = exec,passthru,shell_exec,system,proc_open,popen
```

```bash
# Create the log directory
sudo mkdir -p /var/log/php
sudo chown www-example:www-example /var/log/php

# Reload PHP-FPM to load the new pool
sudo systemctl reload php8.3-fpm

# Verify the new socket was created
ls -la /run/php/php8.3-example.sock

# Update the VirtualHost to use the site-specific socket
sudo nano /etc/apache2/sites-available/example.com.conf
# Change SetHandler to use: proxy:unix:/run/php/php8.3-example.sock|fcgi://localhost
```

## Managing PHP-FPM

```bash
# Reload PHP-FPM configuration without interrupting requests
sudo systemctl reload php8.3-fpm

# Restart PHP-FPM
sudo systemctl restart php8.3-fpm

# Check status and pool information
sudo systemctl status php8.3-fpm

# View PHP-FPM logs
sudo journalctl -u php8.3-fpm -f

# Or view pool-specific error log
sudo tail -f /var/log/php/www-error.log

# Check PHP-FPM status (requires enabling in pool config)
# Add to pool.conf: pm.status_path = /status
curl http://localhost/php-fpm-status
```

## Testing the Setup

```bash
# Create a test PHP file
echo "<?php echo PHP_VERSION . PHP_EOL . php_sapi_name() . PHP_EOL;" | sudo tee /var/www/html/test.php

# Test it
curl http://localhost/test.php
# Should output something like:
# 8.3.x
# fpm-fcgi

# Clean up
sudo rm /var/www/html/test.php
```

If `php_sapi_name()` returns `fpm-fcgi`, PHP-FPM is handling requests. If it returns `apache2handler`, `mod_php` is still being used.

## Troubleshooting

### 502 Bad Gateway

PHP-FPM might be down or the socket path is wrong:

```bash
# Check PHP-FPM is running
sudo systemctl status php8.3-fpm

# Check the socket exists
ls -la /run/php/php8.3-fpm.sock

# Check for errors
sudo journalctl -u php8.3-fpm -n 30

# Verify socket permissions allow Apache to connect
sudo stat /run/php/php8.3-fpm.sock
```

### PHP Files Not Being Processed

```bash
# Check if the FilesMatch handler is set correctly
sudo apache2ctl -t -D DUMP_VHOSTS

# Test configuration
sudo apache2ctl configtest

# Check which modules are loaded
sudo apache2ctl -M | grep -E "proxy|fcgi"
```

PHP-FPM is the right foundation for any Apache PHP deployment today. The per-pool configuration, multiple PHP version support, and HTTP/2 compatibility make it strictly better than `mod_php` for production use.
