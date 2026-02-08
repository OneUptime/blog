# How to Set Up Apache with Docker for PHP Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Apache, PHP, Web Servers, DevOps, Web Development

Description: A practical guide to running Apache with PHP in Docker containers for local development and production deployments.

---

Apache has been the backbone of PHP hosting for decades. Running it inside Docker gives you reproducible environments, easy version management, and clean isolation between projects. Whether you are working on a Laravel application, a WordPress site, or a custom PHP project, Docker simplifies the setup process significantly.

This guide covers everything from a basic Apache-PHP container to a full production stack with MySQL, Redis, and proper configuration management.

## Quick Start with the Official PHP-Apache Image

The easiest way to get Apache with PHP running in Docker is the official `php:apache` image. It bundles Apache and mod_php together.

Create a project directory and add a test file:

```bash
# Set up the project structure
mkdir -p php-docker/src
cd php-docker
```

Create a simple PHP file to test with:

```php
<?php
// src/index.php - Simple test page to verify the setup works
phpinfo();
```

Run the container directly:

```bash
# Start Apache with PHP, mapping port 8080 to Apache's port 80
docker run -d \
  --name php-app \
  -p 8080:80 \
  -v $(pwd)/src:/var/www/html \
  php:8.3-apache
```

Visit `http://localhost:8080` and you should see the PHP info page. This confirms Apache and PHP are working together.

## Docker Compose Setup

For real projects, Docker Compose provides a better workflow. Here is a basic setup:

```yaml
# docker-compose.yml - Apache PHP development environment
version: "3.8"

services:
  app:
    image: php:8.3-apache
    ports:
      - "8080:80"
    volumes:
      # Mount source code into Apache's document root
      - ./src:/var/www/html
    restart: unless-stopped
```

Start the stack:

```bash
# Launch the development environment
docker compose up -d
```

## Custom Dockerfile for PHP Extensions

Most PHP applications need extensions that are not included in the base image. Laravel, for example, requires pdo_mysql, mbstring, and others. Build a custom image to add them.

```dockerfile
# Dockerfile - Apache PHP image with common extensions
FROM php:8.3-apache

# Install system dependencies required by PHP extensions
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libicu-dev \
    libonig-dev \
    unzip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Configure and install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    pdo_mysql \
    mysqli \
    gd \
    zip \
    intl \
    mbstring \
    opcache \
    bcmath

# Enable Apache modules commonly needed for PHP apps
RUN a2enmod rewrite headers expires

# Copy custom PHP configuration
COPY php.ini /usr/local/etc/php/conf.d/custom.ini

# Copy Apache virtual host configuration
COPY apache-vhost.conf /etc/apache2/sites-available/000-default.conf

# Set the working directory
WORKDIR /var/www/html
```

Create a custom PHP configuration file:

```ini
; php.ini - Custom PHP settings for development
upload_max_filesize = 64M
post_max_size = 64M
memory_limit = 256M
max_execution_time = 300
display_errors = On
error_reporting = E_ALL

; OPcache settings for development (disable caching for live code changes)
opcache.enable = 0
```

Create the Apache virtual host configuration:

```apache
# apache-vhost.conf - Virtual host with mod_rewrite for PHP frameworks
<VirtualHost *:80>
    ServerAdmin webmaster@localhost
    DocumentRoot /var/www/html/public

    <Directory /var/www/html/public>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        # Enable URL rewriting for frameworks like Laravel and Symfony
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule ^ index.php [L]
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
```

## Full Stack with MySQL and Redis

Most PHP applications need a database. Here is a complete development stack:

```yaml
# docker-compose.yml - Full PHP development stack
version: "3.8"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:80"
    volumes:
      - ./src:/var/www/html
    environment:
      DB_HOST: mysql
      DB_DATABASE: app
      DB_USERNAME: app_user
      DB_PASSWORD: secret
      REDIS_HOST: redis
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - app-network

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root_secret
      MYSQL_DATABASE: app
      MYSQL_USER: app_user
      MYSQL_PASSWORD: secret
    volumes:
      # Persist database data across container restarts
      - mysql_data:/var/lib/mysql
      # Run initialization scripts on first start
      - ./docker/mysql/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - app-network

  phpmyadmin:
    image: phpmyadmin:latest
    ports:
      - "8081:80"
    environment:
      PMA_HOST: mysql
      PMA_USER: root
      PMA_PASSWORD: root_secret
    depends_on:
      - mysql
    networks:
      - app-network

networks:
  app-network:

volumes:
  mysql_data:
  redis_data:
```

## Installing Composer Dependencies

PHP projects use Composer for dependency management. Add it to your Dockerfile:

```dockerfile
# Add Composer to the image for dependency management
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Copy composer files first to leverage Docker layer caching
COPY src/composer.json src/composer.lock* /var/www/html/

# Install dependencies (production mode)
RUN composer install --no-dev --optimize-autoloader --no-scripts

# Copy the rest of the application source code
COPY src/ /var/www/html/

# Set correct file permissions for Apache
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
```

## Production Configuration

For production, adjust the PHP and Apache settings:

```ini
; php-production.ini - Production PHP settings
display_errors = Off
error_reporting = E_ALL & ~E_DEPRECATED & ~E_STRICT
log_errors = On
error_log = /var/log/php/error.log

; Enable OPcache for production performance
opcache.enable = 1
opcache.memory_consumption = 128
opcache.interned_strings_buffer = 8
opcache.max_accelerated_files = 10000
opcache.revalidate_freq = 0
opcache.validate_timestamps = 0

; Security settings
expose_php = Off
session.cookie_httponly = 1
session.cookie_secure = 1
```

## Running Cron Jobs for Scheduled Tasks

Many PHP applications need scheduled tasks. Add a cron service to your compose file:

```yaml
# Cron service for Laravel's task scheduler
  cron:
    build:
      context: .
      dockerfile: Dockerfile
    volumes:
      - ./src:/var/www/html
    entrypoint: []
    command: >
      bash -c "echo '* * * * * cd /var/www/html && php artisan schedule:run >> /dev/null 2>&1' | crontab - && cron -f"
    depends_on:
      - mysql
      - redis
    networks:
      - app-network
```

## Running Queue Workers

For background job processing in Laravel or Symfony:

```yaml
# Queue worker service for processing background jobs
  worker:
    build:
      context: .
      dockerfile: Dockerfile
    volumes:
      - ./src:/var/www/html
    entrypoint: []
    command: php artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
    depends_on:
      - mysql
      - redis
    networks:
      - app-network
    restart: unless-stopped
```

## Useful Commands

Here are commands you will use frequently during development:

```bash
# Enter the Apache container to run PHP commands
docker compose exec app bash

# Run Composer inside the container
docker compose exec app composer install

# Run database migrations (Laravel example)
docker compose exec app php artisan migrate

# Clear application cache
docker compose exec app php artisan cache:clear

# View Apache error logs in real time
docker compose logs -f app

# Restart Apache inside the container without restarting the container
docker compose exec app apachectl graceful
```

## Debugging with Xdebug

Add Xdebug to your Dockerfile for step debugging:

```dockerfile
# Install Xdebug for development debugging
RUN pecl install xdebug && docker-php-ext-enable xdebug

# Configure Xdebug for remote debugging
RUN echo "xdebug.mode=debug" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini \
    && echo "xdebug.client_host=host.docker" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini \
    && echo "xdebug.client_port=9003" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini \
    && echo "xdebug.start_with_request=yes" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini
```

## Summary

Running Apache with PHP in Docker provides a consistent development environment that closely mirrors production. The official `php:apache` images handle the integration between Apache and PHP, and you can extend them with any extensions your project needs. Combining this with MySQL, Redis, and tools like Composer creates a complete, portable development stack that any team member can start with a single `docker compose up` command.
