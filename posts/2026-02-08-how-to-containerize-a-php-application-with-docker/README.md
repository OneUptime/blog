# How to Containerize a PHP Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, PHP, Apache, Nginx, Containerization, DevOps, Web Development

Description: Build production-ready Docker images for PHP applications with proper web server configuration, extensions, and performance tuning.

---

PHP powers a huge portion of the web, from WordPress sites to custom enterprise applications. Containerizing PHP with Docker gives you consistent environments, easy scaling, and reproducible deployments. But PHP has a unique architecture - the language runtime alone cannot serve HTTP requests. You need a web server (Apache or Nginx) paired with PHP-FPM or mod_php. This guide covers both approaches and shows you how to build optimized containers for production.

## PHP with Apache (mod_php)

The simplest approach uses the official PHP Apache image, which bundles Apache and mod_php together.

Here is a basic PHP application:

```php
<?php
// public/index.php
echo "Hello from PHP in Docker!";
```

```php
<?php
// public/health.php
header('Content-Type: application/json');
echo json_encode(['status' => 'UP', 'php_version' => phpversion()]);
```

The Dockerfile for PHP with Apache:

```dockerfile
# Dockerfile - PHP with Apache
FROM php:8.3-apache

# Enable Apache mod_rewrite for clean URLs
RUN a2enmod rewrite headers

# Install common PHP extensions
# Each extension has its own system dependencies
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libicu-dev \
    libpq-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        gd \
        zip \
        intl \
        pdo \
        pdo_mysql \
        pdo_pgsql \
        opcache \
    && rm -rf /var/lib/apt/lists/*

# Configure PHP for production
COPY php-production.ini /usr/local/etc/php/conf.d/production.ini

# Configure Apache virtual host
COPY apache-vhost.conf /etc/apache2/sites-available/000-default.conf

# Copy application code
COPY . /var/www/html/

# Set proper ownership
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD curl -f http://localhost/health.php || exit 1
```

Create the PHP production configuration:

```ini
; php-production.ini - Optimized PHP settings for production
[PHP]
; Error handling - log errors but do not display them to users
display_errors = Off
display_startup_errors = Off
log_errors = On
error_reporting = E_ALL & ~E_DEPRECATED & ~E_STRICT

; Performance settings
memory_limit = 256M
max_execution_time = 30
max_input_time = 60
upload_max_filesize = 50M
post_max_size = 50M

; OPcache - critical for PHP performance in production
[opcache]
opcache.enable = 1
opcache.memory_consumption = 128
opcache.interned_strings_buffer = 16
opcache.max_accelerated_files = 10000
opcache.validate_timestamps = 0
opcache.save_comments = 1
opcache.fast_shutdown = 1

; Session settings
session.save_handler = files
session.save_path = /tmp
```

Create the Apache virtual host configuration:

```apache
# apache-vhost.conf - Apache virtual host for PHP application
<VirtualHost *:80>
    ServerAdmin webmaster@localhost
    DocumentRoot /var/www/html/public

    <Directory /var/www/html/public>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        # Clean URL rewriting
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule ^ index.php [L]
    </Directory>

    # Security headers
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-XSS-Protection "1; mode=block"

    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
```

## PHP with Nginx and PHP-FPM

For better performance, use Nginx as the web server with PHP-FPM handling PHP processing. This requires two containers or a combined container.

Combined Dockerfile with Nginx and PHP-FPM:

```dockerfile
# Dockerfile.nginx - PHP-FPM with Nginx in a single container
FROM php:8.3-fpm-alpine

# Install Nginx
RUN apk add --no-cache nginx curl

# Install PHP extensions
RUN apk add --no-cache \
    freetype-dev \
    libjpeg-turbo-dev \
    libpng-dev \
    libzip-dev \
    icu-dev \
    postgresql-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        gd zip intl pdo pdo_mysql pdo_pgsql opcache

# PHP-FPM configuration
COPY php-fpm.conf /usr/local/etc/php-fpm.d/www.conf
COPY php-production.ini /usr/local/etc/php/conf.d/production.ini

# Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-default.conf /etc/nginx/http.d/default.conf

# Copy application code
COPY . /var/www/html/
RUN chown -R www-data:www-data /var/www/html

# Startup script that runs both Nginx and PHP-FPM
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD curl -f http://localhost/health.php || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
```

The Nginx configuration for PHP:

```nginx
# nginx-default.conf - Nginx server block for PHP-FPM
server {
    listen 80;
    server_name _;
    root /var/www/html/public;
    index index.php index.html;

    # Security: hide Nginx version
    server_tokens off;

    # Main location block
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # PHP processing through PHP-FPM
    location ~ \.php$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_buffering on;
        fastcgi_buffer_size 16k;
        fastcgi_buffers 16 16k;
    }

    # Block access to hidden files
    location ~ /\. {
        deny all;
    }

    # Cache static assets
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

The PHP-FPM pool configuration:

```ini
; php-fpm.conf - PHP-FPM pool configuration for containers
[www]
user = www-data
group = www-data

listen = 127.0.0.1:9000

; Process management - static is predictable in containers
pm = static
pm.max_children = 10

; Logging
access.log = /proc/self/fd/2
slowlog = /proc/self/fd/2
request_slowlog_timeout = 10s

; Security
security.limit_extensions = .php
```

The startup script:

```bash
#!/bin/sh
# docker-entrypoint.sh - Start both PHP-FPM and Nginx

# Start PHP-FPM in the background
php-fpm -D

# Start Nginx in the foreground so Docker can track it
exec nginx -g "daemon off;"
```

## Installing Composer Dependencies

Most PHP applications use Composer for dependency management. Install dependencies during the Docker build:

```dockerfile
# Multi-stage build with Composer
FROM composer:2 AS composer

WORKDIR /app
COPY composer.json composer.lock ./

# Install dependencies without dev packages for production
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

COPY . .

# Generate the optimized autoloader
RUN composer dump-autoload --optimize --no-dev

# Runtime stage
FROM php:8.3-fpm-alpine

# ... (extension installation as above)

# Copy application with installed dependencies
COPY --from=composer /app /var/www/html

RUN chown -R www-data:www-data /var/www/html
```

## Docker Compose for Development

A development setup with database and debugging tools:

```yaml
# docker-compose.dev.yml - PHP development environment
version: "3.9"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:80"
    volumes:
      # Mount source code for live editing
      - ./:/var/www/html
    environment:
      - PHP_DISPLAY_ERRORS=On
      - XDEBUG_MODE=debug
      - XDEBUG_CONFIG=client_host=host.docker.internal
    depends_on:
      mysql:
        condition: service_healthy

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: myapp
      MYSQL_USER: myapp
      MYSQL_PASSWORD: devpass
    ports:
      - "3306:3306"
    volumes:
      - mysql-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 5s
      retries: 5

  phpmyadmin:
    image: phpmyadmin:latest
    ports:
      - "8081:80"
    environment:
      PMA_HOST: mysql
      PMA_USER: root
      PMA_PASSWORD: rootpass

volumes:
  mysql-data:
```

## Docker Compose for Production

```yaml
# docker-compose.prod.yml
version: "3.9"

services:
  app:
    image: myphpapp:${VERSION:-latest}
    restart: unless-stopped
    ports:
      - "8080:80"
    environment:
      - APP_ENV=production
      - DB_HOST=mysql
      - DB_NAME=myapp
      - DB_USER=myapp
      - DB_PASS=${DB_PASSWORD}
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 512M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health.php"]
      interval: 15s
      timeout: 5s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "25m"
        max-file: "5"
```

## Performance Tuning Checklist

A few things that make a big difference for PHP in containers:

1. **Enable OPcache.** This is the single biggest performance win. Set `opcache.validate_timestamps=0` in production since files do not change in a container.

2. **Use `pm = static` in PHP-FPM.** Dynamic process management adds overhead in containers where memory is pre-allocated. Set `pm.max_children` based on your container's memory limit (roughly `memory_limit / per_request_memory`).

3. **Use Alpine-based images.** The Alpine variants are 3-4x smaller than Debian-based images.

4. **Separate static files.** Serve CSS, JavaScript, and images directly from Nginx without involving PHP at all.

5. **Pre-warm OPcache.** Add a script that loads all PHP files into OPcache during container startup.

PHP containerization is straightforward once you understand the web server and PHP-FPM relationship. Build your Dockerfile to match your specific framework and server combination, enable OPcache, and set appropriate PHP-FPM pool sizes for your container's resource limits.
