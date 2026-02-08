# How to Use docker init for PHP Projects

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Init, PHP, Laravel, Symfony, Composer, Apache, Nginx, Containerization, DevOps

Description: A hands-on guide to using docker init with PHP projects, covering Laravel, Symfony, and custom PHP applications with Apache or Nginx.

---

PHP applications require a web server (Apache or Nginx), the PHP runtime with the right extensions, and often Composer for dependency management. Getting all of these pieces right in a Dockerfile takes more effort than most languages. The `docker init` command detects PHP projects by looking for composer.json and generates Docker configuration that sets up the web server, PHP extensions, and Composer dependencies automatically.

## Setting Up a Sample Laravel Project

Let's use a Laravel application as our primary example since it is the most common PHP framework:

```bash
# Create a new Laravel project (requires Composer installed locally)
composer create-project laravel/laravel php-docker-demo
cd php-docker-demo
```

If you already have a PHP project, just navigate to it. Docker init works with any PHP project that has a composer.json file.

## Running docker init

```bash
docker init
```

Docker init detects the composer.json and identifies the project as PHP:

```
? What application platform does your project use? PHP with Apache
? What version of PHP do you want to use? 8.3
? What port does your server listen on? 80
? What is the document root for your app? /var/www/html/public
```

For Laravel, the document root is `/var/www/html/public`. For other frameworks, adjust accordingly.

## Understanding the Generated Dockerfile

The generated Dockerfile installs PHP extensions, Composer dependencies, and configures Apache:

```dockerfile
# syntax=docker/dockerfile:1

ARG PHP_VERSION=8.3
FROM php:${PHP_VERSION}-apache as base

# Install system dependencies for common PHP extensions
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libicu-dev \
    unzip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions commonly needed by Laravel/Symfony
RUN docker-php-ext-configure gd --with-freetype --with-jpeg && \
    docker-php-ext-install \
    pdo_mysql \
    gd \
    zip \
    intl \
    opcache \
    bcmath

# Enable Apache mod_rewrite for URL routing
RUN a2enmod rewrite

# Set the document root to Laravel's public directory
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' \
    /etc/apache2/sites-available/*.conf \
    /etc/apache2/apache2.conf

WORKDIR /var/www/html

# Install Composer from the official image
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy composer files and install dependencies
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader

# Copy application code
COPY . .

# Generate optimized autoload and run post-install scripts
RUN composer dump-autoload --optimize && \
    composer run-script post-autoload-dump

# Set proper permissions for Laravel's storage and cache directories
RUN chown -R www-data:www-data storage bootstrap/cache && \
    chmod -R 775 storage bootstrap/cache

EXPOSE 80
```

This Dockerfile handles several PHP-specific requirements. The `docker-php-ext-install` command builds PHP extensions from source. The Composer install is split into two steps (copy lock file first, then full install) to leverage Docker layer caching. Apache's document root is redirected to Laravel's public directory.

## Using Nginx Instead of Apache

If you prefer Nginx, modify the approach to use PHP-FPM with a separate Nginx container:

```dockerfile
# syntax=docker/dockerfile:1

ARG PHP_VERSION=8.3
FROM php:${PHP_VERSION}-fpm as base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libicu-dev \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg && \
    docker-php-ext-install \
    pdo_mysql \
    gd \
    zip \
    intl \
    opcache \
    bcmath

WORKDIR /var/www/html

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Install dependencies
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader

# Copy application
COPY . .
RUN composer dump-autoload --optimize

# Set permissions
RUN chown -R www-data:www-data storage bootstrap/cache && \
    chmod -R 775 storage bootstrap/cache

EXPOSE 9000
CMD ["php-fpm"]
```

Create a companion Nginx configuration:

```nginx
# nginx/default.conf - Nginx configuration for PHP-FPM
server {
    listen 80;
    server_name _;
    root /var/www/html/public;
    index index.php;

    # Handle Laravel routes
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Pass PHP requests to the FPM container
    location ~ \.php$ {
        fastcgi_pass app:9000;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
}
```

## compose.yaml with Full Laravel Stack

A production-like Laravel setup needs a database, cache, and queue worker:

```yaml
# compose.yaml - Laravel with MySQL, Redis, and queue worker
services:
  app:
    build:
      context: .
    volumes:
      - storage:/var/www/html/storage
    environment:
      - APP_ENV=production
      - APP_KEY=base64:your-app-key-here
      - DB_CONNECTION=mysql
      - DB_HOST=db
      - DB_PORT=3306
      - DB_DATABASE=laravel
      - DB_USERNAME=laravel
      - DB_PASSWORD=secret
      - REDIS_HOST=redis
      - CACHE_DRIVER=redis
      - SESSION_DRIVER=redis
      - QUEUE_CONNECTION=redis
    ports:
      - "80:80"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started

  # Queue worker runs the same image with a different command
  worker:
    build:
      context: .
    command: php artisan queue:work --sleep=3 --tries=3
    environment:
      - APP_ENV=production
      - DB_CONNECTION=mysql
      - DB_HOST=db
      - DB_DATABASE=laravel
      - DB_USERNAME=laravel
      - DB_PASSWORD=secret
      - REDIS_HOST=redis
      - QUEUE_CONNECTION=redis
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started

  # Scheduler runs cron jobs
  scheduler:
    build:
      context: .
    command: >
      sh -c "while true; do
        php artisan schedule:run --verbose --no-interaction;
        sleep 60;
      done"
    environment:
      - APP_ENV=production
      - DB_CONNECTION=mysql
      - DB_HOST=db
      - DB_DATABASE=laravel
      - DB_USERNAME=laravel
      - DB_PASSWORD=secret
      - REDIS_HOST=redis

  db:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: laravel
      MYSQL_USER: laravel
      MYSQL_PASSWORD: secret
      MYSQL_ROOT_PASSWORD: rootsecret
    volumes:
      - dbdata:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine

volumes:
  dbdata:
  storage:
```

Notice that the worker and scheduler use the same Docker image as the web app but with different commands. This is a common pattern in PHP applications.

## PHP Extension Management

Different PHP projects need different extensions. Here is how to add some common ones:

```dockerfile
# PostgreSQL support
RUN apt-get update && apt-get install -y libpq-dev && \
    docker-php-ext-install pdo_pgsql

# Redis extension via PECL
RUN pecl install redis && docker-php-ext-enable redis

# MongoDB extension
RUN pecl install mongodb && docker-php-ext-enable mongodb

# ImageMagick
RUN apt-get update && apt-get install -y libmagickwand-dev && \
    pecl install imagick && docker-php-ext-enable imagick

# Xdebug for development
RUN pecl install xdebug && docker-php-ext-enable xdebug
```

## PHP Configuration for Production

Add a custom php.ini for production settings:

```ini
; php-production.ini - Production PHP configuration
upload_max_filesize = 64M
post_max_size = 64M
memory_limit = 256M
max_execution_time = 60

; OPcache settings for production
opcache.enable = 1
opcache.memory_consumption = 256
opcache.interned_strings_buffer = 16
opcache.max_accelerated_files = 10000
opcache.validate_timestamps = 0
opcache.save_comments = 1
```

Copy it into the container:

```dockerfile
# Copy custom PHP configuration
COPY php-production.ini /usr/local/etc/php/conf.d/production.ini
```

Setting `opcache.validate_timestamps = 0` disables file modification checks, which improves performance in production since code does not change at runtime.

## Symfony Projects

For Symfony projects, the structure is similar but the document root and commands differ:

```dockerfile
# Symfony-specific adjustments
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public

# Install Symfony-specific dependencies
COPY composer.json composer.lock symfony.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader

COPY . .
RUN composer dump-autoload --optimize --classmap-authoritative && \
    php bin/console cache:warmup --env=prod
```

## .dockerignore for PHP

```
# Dependencies (installed inside the container)
vendor

# Storage and cache (mounted as volumes)
storage/logs
storage/framework/cache
bootstrap/cache

# Development files
.env
.env.local
tests
phpunit.xml

# IDE and OS
.idea
.vscode
.DS_Store

# Docker files
Dockerfile
compose.yaml
.dockerignore

# Documentation
*.md
```

## Building and Testing

```bash
# Build the image
docker build -t my-php-app:latest .

# Run with compose for the full stack
docker compose up --build

# Run Laravel migrations
docker compose exec app php artisan migrate

# Test the application
curl http://localhost
curl http://localhost/api/users
```

Docker init provides a working PHP containerization setup that handles the web server, PHP extensions, and Composer dependencies. Customize the generated files based on your framework (Laravel, Symfony, or vanilla PHP), your preferred web server (Apache or Nginx), and the extensions your application requires. The pattern of splitting the Dockerfile into dependency install and code copy stages applies universally across PHP frameworks and dramatically improves build times.
