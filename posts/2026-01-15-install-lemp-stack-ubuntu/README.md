# How to Install a LEMP Stack (Linux, Nginx, MySQL, PHP) on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, LEMP, Nginx, MySQL, PHP, Web Server, Tutorial

Description: Step-by-step guide to installing and configuring a complete LEMP stack on Ubuntu for hosting PHP applications with Nginx.

---

The LEMP stack (Linux, Nginx, MySQL, PHP) is a popular alternative to LAMP, using Nginx instead of Apache for improved performance with static content and lower memory usage. This guide walks through installing and configuring each component on Ubuntu.

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04 LTS
- Root or sudo access
- At least 1GB RAM

## Step 1: Update System Packages

```bash
# Update package lists and upgrade existing packages
sudo apt update && sudo apt upgrade -y
```

## Step 2: Install Nginx

```bash
# Install Nginx web server
sudo apt install nginx -y

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify installation
sudo systemctl status nginx
```

Test by visiting `http://your_server_ip` in a browser.

### Configure Firewall

```bash
# Allow HTTP and HTTPS traffic
sudo ufw allow 'Nginx Full'
sudo ufw status
```

## Step 3: Install MySQL

```bash
# Install MySQL server
sudo apt install mysql-server -y

# Start and enable MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Verify installation
sudo systemctl status mysql
```

### Secure MySQL Installation

```bash
# Run security script
sudo mysql_secure_installation
```

Follow the prompts to:
- Set up VALIDATE PASSWORD component (optional)
- Set root password
- Remove anonymous users
- Disallow remote root login
- Remove test database
- Reload privilege tables

### Create Application Database

```bash
# Log into MySQL
sudo mysql
```

```sql
-- Create database
CREATE DATABASE myapp_db;

-- Create user with strong password
CREATE USER 'myapp_user'@'localhost' IDENTIFIED BY 'SecurePassword123!';

-- Grant privileges
GRANT ALL PRIVILEGES ON myapp_db.* TO 'myapp_user'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Exit
EXIT;
```

## Step 4: Install PHP

```bash
# Install PHP-FPM and common extensions
sudo apt install php-fpm php-mysql php-cli php-curl php-gd php-mbstring php-xml php-zip php-intl php-bcmath -y

# Verify PHP version
php -v

# Check PHP-FPM status
sudo systemctl status php8.3-fpm  # Adjust version number as needed
```

## Step 5: Configure Nginx for PHP

### Create Site Configuration

```bash
# Create site directory
sudo mkdir -p /var/www/mysite

# Set ownership
sudo chown -R www-data:www-data /var/www/mysite

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/mysite
```

Add configuration:

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name mysite.com www.mysite.com;
    root /var/www/mysite;

    index index.php index.html index.htm;

    # Logging
    access_log /var/log/nginx/mysite.access.log;
    error_log /var/log/nginx/mysite.error.log;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # PHP processing
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Deny access to .htaccess files
    location ~ /\.ht {
        deny all;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
}
```

### Enable the Site

```bash
# Create symlink to enable site
sudo ln -s /etc/nginx/sites-available/mysite /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Step 6: Test the LEMP Stack

### Create PHP Info File

```bash
# Create test PHP file
sudo nano /var/www/mysite/info.php
```

```php
<?php
// Display PHP configuration
phpinfo();
?>
```

Visit `http://your_server_ip/info.php` to verify PHP is working.

**Important:** Remove this file after testing:

```bash
sudo rm /var/www/mysite/info.php
```

### Test Database Connection

```bash
sudo nano /var/www/mysite/db_test.php
```

```php
<?php
// Database connection test
$servername = "localhost";
$username = "myapp_user";
$password = "SecurePassword123!";
$database = "myapp_db";

// Create connection using mysqli
$conn = new mysqli($servername, $username, $password, $database);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
echo "Connected successfully to MySQL database!";

// Close connection
$conn->close();
?>
```

Visit `http://your_server_ip/db_test.php`, then remove:

```bash
sudo rm /var/www/mysite/db_test.php
```

## PHP-FPM Configuration

### Tune PHP-FPM Pool

```bash
# Edit PHP-FPM pool configuration
sudo nano /etc/php/8.3/fpm/pool.d/www.conf
```

Key settings to adjust:

```ini
; Process manager settings
pm = dynamic
pm.max_children = 50
pm.start_servers = 5
pm.min_spare_servers = 5
pm.max_spare_servers = 35
pm.max_requests = 500

; User/group
user = www-data
group = www-data

; Listen socket
listen = /var/run/php/php8.3-fpm.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660
```

### Tune PHP Configuration

```bash
# Edit PHP configuration
sudo nano /etc/php/8.3/fpm/php.ini
```

Recommended settings for web applications:

```ini
; Resource Limits
max_execution_time = 300
max_input_time = 300
memory_limit = 256M

; File Uploads
upload_max_filesize = 64M
post_max_size = 64M
max_file_uploads = 20

; Error Handling (production settings)
display_errors = Off
log_errors = On
error_log = /var/log/php/error.log

; Session
session.save_handler = files
session.save_path = "/var/lib/php/sessions"

; Security
expose_php = Off
```

Create log directory:

```bash
sudo mkdir -p /var/log/php
sudo chown www-data:www-data /var/log/php
```

Restart PHP-FPM:

```bash
sudo systemctl restart php8.3-fpm
```

## Enable HTTPS with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d mysite.com -d www.mysite.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

## Performance Optimization

### Nginx Performance Tuning

```bash
sudo nano /etc/nginx/nginx.conf
```

```nginx
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    multi_accept on;
    use epoll;
}

http {
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml;

    # File cache
    open_file_cache max=10000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;

    # Buffer sizes
    client_body_buffer_size 10K;
    client_header_buffer_size 1k;
    client_max_body_size 64M;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

### Enable PHP OPcache

```bash
sudo nano /etc/php/8.3/fpm/conf.d/10-opcache.ini
```

```ini
opcache.enable=1
opcache.memory_consumption=256
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=10000
opcache.revalidate_freq=2
opcache.fast_shutdown=1
opcache.enable_cli=0
```

## MySQL Performance Tuning

```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Add/modify:

```ini
[mysqld]
# InnoDB settings
innodb_buffer_pool_size = 256M
innodb_log_file_size = 64M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT

# Query cache (MariaDB) or buffer pool (MySQL 8.0+)
# MySQL 8.0+ doesn't have query cache

# Connection settings
max_connections = 151
wait_timeout = 600
interactive_timeout = 600

# Logging
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
```

Restart MySQL:

```bash
sudo systemctl restart mysql
```

## Installing phpMyAdmin (Optional)

```bash
# Install phpMyAdmin
sudo apt install phpmyadmin -y

# During installation:
# - Select "nginx" (press space, then Enter)
# - Choose "Yes" to configure database

# Create symlink
sudo ln -s /usr/share/phpmyadmin /var/www/mysite/phpmyadmin

# Secure with authentication (recommended)
```

Access at `http://your_server_ip/phpmyadmin`

## Deploying a PHP Application

Example deploying a Laravel application:

```bash
# Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Clone your application
cd /var/www
sudo git clone https://github.com/your-repo/your-app.git mysite

# Install dependencies
cd mysite
sudo composer install --no-dev --optimize-autoloader

# Set permissions
sudo chown -R www-data:www-data /var/www/mysite
sudo chmod -R 755 /var/www/mysite
sudo chmod -R 775 /var/www/mysite/storage
sudo chmod -R 775 /var/www/mysite/bootstrap/cache

# Configure environment
sudo cp .env.example .env
sudo nano .env  # Edit database credentials

# Generate key
sudo php artisan key:generate
```

Update Nginx for Laravel:

```nginx
root /var/www/mysite/public;

location / {
    try_files $uri $uri/ /index.php?$query_string;
}
```

## Troubleshooting

### PHP Not Processing

```bash
# Check PHP-FPM is running
sudo systemctl status php8.3-fpm

# Check socket exists
ls -la /var/run/php/

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### 502 Bad Gateway

```bash
# Usually PHP-FPM socket issue
# Verify socket path in Nginx config matches PHP-FPM config
grep "listen =" /etc/php/8.3/fpm/pool.d/www.conf
grep "fastcgi_pass" /etc/nginx/sites-enabled/mysite
```

### Permission Issues

```bash
# Fix ownership
sudo chown -R www-data:www-data /var/www/mysite

# Fix permissions
sudo find /var/www/mysite -type d -exec chmod 755 {} \;
sudo find /var/www/mysite -type f -exec chmod 644 {} \;
```

---

Your LEMP stack is now ready to host PHP applications. Nginx with PHP-FPM provides excellent performance for modern PHP frameworks like Laravel, Symfony, and WordPress. For production environments, remember to configure SSL, optimize PHP-FPM pool settings based on your server resources, and implement proper backup strategies.
