# How to Set Up Nextcloud on Ubuntu for Self-Hosted Cloud Storage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Nextcloud, Self-Hosted, Cloud Storage, Privacy

Description: Install Nextcloud on Ubuntu with Apache or Nginx, configure PostgreSQL as the database, enable Redis caching, set up HTTPS, and connect desktop and mobile clients for self-hosted cloud storage.

---

Nextcloud is the most fully-featured self-hosted cloud storage platform available. It covers file sync, sharing, calendar, contacts, video calls, and a growing ecosystem of apps - all hosted on your own hardware. For individuals and organizations that want to keep their data off third-party cloud providers, Nextcloud on Ubuntu is a well-trodden path.

This guide covers installation using the recommended stack: Nginx, PHP-FPM, PostgreSQL, and Redis.

## System Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required PHP packages
# Nextcloud currently requires PHP 8.1-8.3
sudo apt install -y \
  php8.2 \
  php8.2-fpm \
  php8.2-common \
  php8.2-cli \
  php8.2-gd \
  php8.2-curl \
  php8.2-xml \
  php8.2-mbstring \
  php8.2-zip \
  php8.2-intl \
  php8.2-bcmath \
  php8.2-gmp \
  php8.2-pgsql \
  php8.2-redis \
  php8.2-imagick \
  php8.2-apcu \
  libmagickcore-dev

# Install Nginx
sudo apt install -y nginx

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis for caching
sudo apt install -y redis-server

# Enable services
sudo systemctl enable --now postgresql redis-server php8.2-fpm
```

## Setting Up PostgreSQL

```bash
# Create Nextcloud database and user
sudo -u postgres psql << 'EOF'
CREATE USER nextcloud WITH PASSWORD 'strong-password-here';
CREATE DATABASE nextcloud OWNER nextcloud;
GRANT ALL PRIVILEGES ON DATABASE nextcloud TO nextcloud;
\c nextcloud
GRANT ALL ON SCHEMA public TO nextcloud;
\q
EOF
```

## Configuring Redis

Redis is used for transactional file locking (critical for multi-user setups) and caching:

```bash
# Configure Redis to use Unix socket (faster than TCP for local connections)
sudo nano /etc/redis/redis.conf
```

Uncomment and set:
```
unixsocket /var/run/redis/redis-server.sock
unixsocketperm 770
```

```bash
# Add www-data to redis group (so PHP-FPM can access the socket)
sudo usermod -aG redis www-data

sudo systemctl restart redis-server
```

## Downloading and Installing Nextcloud

```bash
# Download latest Nextcloud (check nextcloud.com for current version)
NEXTCLOUD_VERSION="30.0.4"
cd /tmp
wget "https://download.nextcloud.com/server/releases/nextcloud-${NEXTCLOUD_VERSION}.tar.bz2"
wget "https://download.nextcloud.com/server/releases/nextcloud-${NEXTCLOUD_VERSION}.tar.bz2.sha256"

# Verify download integrity
sha256sum -c "nextcloud-${NEXTCLOUD_VERSION}.tar.bz2.sha256"

# Extract to web root
sudo tar -xjf "nextcloud-${NEXTCLOUD_VERSION}.tar.bz2" -C /var/www/

# Create data directory (keep this outside web root for security)
sudo mkdir -p /var/nextcloud-data

# Set ownership
sudo chown -R www-data:www-data /var/www/nextcloud /var/nextcloud-data
```

## Configuring PHP-FPM

```bash
# Edit PHP-FPM pool configuration for Nextcloud
sudo nano /etc/php/8.2/fpm/pool.d/nextcloud.conf
```

```ini
; PHP-FPM pool for Nextcloud
[nextcloud]
user = www-data
group = www-data
listen = /run/php/php8.2-fpm-nextcloud.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660

pm = dynamic
pm.max_children = 50
pm.start_servers = 5
pm.min_spare_servers = 3
pm.max_spare_servers = 10
pm.max_requests = 500

; Timeout settings for large file uploads
request_terminate_timeout = 600s
```

Configure PHP settings for Nextcloud:

```bash
sudo nano /etc/php/8.2/fpm/conf.d/99-nextcloud.ini
```

```ini
; PHP settings for Nextcloud
memory_limit = 512M
upload_max_filesize = 16G
post_max_size = 16G
max_execution_time = 300
max_input_time = 300

; Session settings
session.cookie_secure = 1
session.cookie_httponly = 1
session.cookie_samesite = Strict

; APCu for memory caching
apc.enable_cli = 1
```

```bash
sudo systemctl restart php8.2-fpm
```

## Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/nextcloud
```

```nginx
# Nextcloud Nginx configuration
upstream php-handler {
    server unix:/run/php/php8.2-fpm-nextcloud.sock;
}

# HTTP redirect to HTTPS
server {
    listen 80;
    server_name cloud.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name cloud.example.com;

    root /var/www/nextcloud;
    index index.php index.html;

    ssl_certificate     /etc/letsencrypt/live/cloud.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cloud.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Security headers
    add_header Strict-Transport-Security "max-age=15768000; includeSubDomains; preload" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Download-Options "noopen" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Permitted-Cross-Domain-Policies "none" always;
    add_header X-Robots-Tag "noindex, nofollow" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Remove X-Powered-By header
    fastcgi_hide_header X-Powered-By;

    # Max upload size
    client_max_body_size 16G;
    client_body_buffer_size 512k;
    client_body_timeout 300s;

    # Nextcloud-specific paths
    location = /robots.txt { allow all; log_not_found off; access_log off; }
    location = /.well-known/carddav { return 301 $scheme://$host/remote.php/dav; }
    location = /.well-known/caldav { return 301 $scheme://$host/remote.php/dav; }
    location /.well-known/acme-challenge { try_files $uri $uri/ =404; }
    location /.well-known/pki-validation { try_files $uri $uri/ =404; }

    # Block access to sensitive files
    location ~ ^/(?:build|tests|config|lib|3rdparty|templates|data)(?:$|/)  { return 404; }
    location ~ ^/(?:\.|autotest|occ|issue|indie|db_|console)                 { return 404; }

    location / {
        rewrite ^ /index.php;
    }

    location ~ ^\/(?:index|remote|public|cron|core\/ajax\/update|status|ocs\/v[12]|updater\/.+|ocs-provider\/.+)\.php(?:$|\/) {
        fastcgi_split_path_info ^(.+?\.php)(\/.*|)$;
        set $path_info $fastcgi_path_info;
        try_files $fastcgi_script_name =404;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param PATH_INFO $path_info;
        fastcgi_param HTTPS on;
        fastcgi_param modHeadersAvailable true;
        fastcgi_param front_controller_active true;
        fastcgi_pass php-handler;
        fastcgi_intercept_errors on;
        fastcgi_request_buffering off;
        fastcgi_read_timeout 600;
    }

    location ~ ^\/(?:updater|ocs-provider)(?:$|\/) {
        try_files $uri/ =404;
        index index.php;
    }

    location ~ \.(?:css|js|woff2?|svg|gif|map)$ {
        try_files $uri /index.php$request_uri;
        add_header Cache-Control "public, max-age=15778463";
        expires 6M;
        access_log off;
    }

    location ~ \.(?:png|html|ttf|ico|jpg|jpeg|bcmap|mp4|webm)$ {
        try_files $uri /index.php$request_uri;
        access_log off;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/nextcloud /etc/nginx/sites-enabled/
sudo nginx -t

# Get SSL certificate
sudo apt install -y certbot python3-certbot-nginx
sudo certbot certonly --nginx -d cloud.example.com

sudo systemctl reload nginx
```

## Running the Nextcloud Installer

Use the command-line installer for a non-interactive setup:

```bash
# Run the Nextcloud installer via occ (OCC command)
sudo -u www-data php /var/www/nextcloud/occ maintenance:install \
  --database pgsql \
  --database-host 127.0.0.1 \
  --database-name nextcloud \
  --database-user nextcloud \
  --database-pass "strong-password-here" \
  --admin-user admin \
  --admin-pass "your-admin-password" \
  --data-dir /var/nextcloud-data
```

## Post-Installation Configuration

```bash
# Edit Nextcloud config for performance and security
sudo -u www-data nano /var/www/nextcloud/config/config.php
```

Add or modify these settings:

```php
<?php
$CONFIG = array(
  // Trusted domains - must include your domain
  'trusted_domains' => array(
    'cloud.example.com',
  ),

  // URL configuration
  'overwrite.cli.url' => 'https://cloud.example.com',
  'overwriteprotocol' => 'https',

  // Redis caching configuration
  'memcache.locking' => '\\OC\\Memcache\\Redis',
  'memcache.local' => '\\OC\\Memcache\\APCu',
  'memcache.distributed' => '\\OC\\Memcache\\Redis',
  'redis' => array(
    'host' => '/var/run/redis/redis-server.sock',
    'port' => 0,
    'timeout' => 0.0,
  ),

  // Default phone region (affects phone number validation)
  'default_phone_region' => 'US',

  // Log settings
  'loglevel' => 1,
  'logfile' => '/var/nextcloud-data/nextcloud.log',

  // Disable index.php in URLs
  'htaccess.RewriteBase' => '/',
);
```

```bash
# Set up background jobs cron (required for Nextcloud to function properly)
sudo crontab -u www-data -e
```

Add:
```
*/5 * * * * php -f /var/www/nextcloud/cron.php
```

```bash
# Tell Nextcloud to use cron (not ajax) for background jobs
sudo -u www-data php /var/www/nextcloud/occ background:cron
```

## Useful OCC Commands

```bash
# Check Nextcloud status and warnings
sudo -u www-data php /var/www/nextcloud/occ status
sudo -u www-data php /var/www/nextcloud/occ check

# Add missing database indices (run after updates)
sudo -u www-data php /var/www/nextcloud/occ db:add-missing-indices

# List installed apps
sudo -u www-data php /var/www/nextcloud/occ app:list

# Install an app
sudo -u www-data php /var/www/nextcloud/occ app:enable calendar
sudo -u www-data php /var/www/nextcloud/occ app:enable contacts

# Create a user
sudo -u www-data php /var/www/nextcloud/occ user:add --display-name "Alice Smith" alice

# Scan files if files were added outside Nextcloud
sudo -u www-data php /var/www/nextcloud/occ files:scan --all

# Update Nextcloud
sudo -u www-data php /var/www/nextcloud/occ maintenance:mode --on
# ... perform update ...
sudo -u www-data php /var/www/nextcloud/occ upgrade
sudo -u www-data php /var/www/nextcloud/occ maintenance:mode --off
```

## Connecting Desktop and Mobile Clients

Download the Nextcloud desktop client from nextcloud.com/install for Windows, macOS, and Linux.

Connection settings:
- Server URL: `https://cloud.example.com`
- Username and password (or app password for 2FA accounts)

For the mobile app (Nextcloud on iOS/Android), use the same server URL and credentials.

## Summary

Nextcloud on Ubuntu with PostgreSQL, Redis, and Nginx provides a production-ready self-hosted cloud storage platform. The key to keeping it running well is: keep PHP memory limits generous, use Redis for file locking, run the cron job every 5 minutes, and keep the software updated via the OCC command. Once it's running, the desktop and mobile clients provide a seamless sync experience that rivals commercial cloud storage for day-to-day file access.
