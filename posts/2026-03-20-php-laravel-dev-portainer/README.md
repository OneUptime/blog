# How to Set Up a PHP/Laravel Development Environment with Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, PHP, Laravel, Development, MySQL, Redis

Description: Build a complete PHP Laravel development environment with Nginx, MySQL, Redis, and hot-reload using Docker and Portainer.

## Introduction

Laravel is PHP's most popular framework, and containerizing your Laravel development environment ensures consistency across teams. This guide covers deploying a full Laravel stack with Nginx, PHP-FPM, MySQL, Redis, and queue workers using Docker and Portainer.

## Step 1: Create the PHP-FPM Dockerfile

```dockerfile
# Dockerfile.dev - PHP-FPM for Laravel development

FROM php:8.3-fpm-alpine

# Install PHP extensions
RUN apk add --no-cache \
    # Build dependencies
    autoconf \
    g++ \
    make \
    # PHP dependencies
    libzip-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    libwebp-dev \
    freetype-dev \
    oniguruma-dev \
    icu-dev \
    postgresql-dev \
    # Utilities
    git \
    curl \
    bash \
    nodejs \
    npm

# Install PHP extensions
RUN docker-php-ext-install \
    pdo \
    pdo_mysql \
    pdo_pgsql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    zip \
    opcache

# Install GD for image processing
RUN docker-php-ext-configure gd \
    --with-freetype \
    --with-jpeg \
    --with-webp
RUN docker-php-ext-install gd

# Install Redis extension
RUN pecl install redis && docker-php-ext-enable redis

# Install Xdebug for debugging
RUN pecl install xdebug && docker-php-ext-enable xdebug

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# PHP configuration for development
RUN echo "xdebug.mode=develop,debug,coverage" >> /usr/local/etc/php/conf.d/xdebug.ini && \
    echo "xdebug.start_with_request=yes" >> /usr/local/etc/php/conf.d/xdebug.ini && \
    echo "xdebug.client_host=host.docker.internal" >> /usr/local/etc/php/conf.d/xdebug.ini && \
    echo "xdebug.client_port=9003" >> /usr/local/etc/php/conf.d/xdebug.ini
```

## Step 2: Configure Nginx

```nginx
# nginx/default.conf - Nginx configuration for Laravel
server {
    listen 80;
    server_name localhost;
    root /var/www/html/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    # Laravel front controller
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Handle favicon and robots.txt
    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    # 404 handler
    error_page 404 /index.php;

    # PHP-FPM
    location ~ \.php$ {
        fastcgi_pass app:9000;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Deny dotfiles
    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

## Step 3: Deploy Laravel Stack in Portainer

```yaml
# docker-compose.yml - Laravel Development Stack

networks:
  laravel_dev:
    driver: bridge

volumes:
  mysql_data:
  redis_data:
  composer_cache:

services:
  # Nginx web server
  nginx:
    image: nginx:alpine
    container_name: laravel_nginx
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./:/var/www/html
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf
    networks:
      - laravel_dev
    depends_on:
      - app

  # PHP-FPM application
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: laravel_app
    restart: unless-stopped
    environment:
      - XDEBUG_MODE=develop,debug,coverage
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      # Mount source code
      - ./:/var/www/html
      # Cache Composer packages
      - composer_cache:/root/.composer
    networks:
      - laravel_dev
    depends_on:
      - mysql
      - redis

  # MySQL database
  mysql:
    image: mysql:8.0
    container_name: laravel_mysql
    restart: unless-stopped
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=laravel_dev
      - MYSQL_USER=laravel
      - MYSQL_PASSWORD=laravel_password
    volumes:
      - mysql_data:/var/lib/mysql
    command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
    networks:
      - laravel_dev

  # Redis for cache and queues
  redis:
    image: redis:7-alpine
    container_name: laravel_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    networks:
      - laravel_dev

  # Laravel queue worker
  queue:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: laravel_queue
    restart: unless-stopped
    command: php artisan queue:work --sleep=3 --tries=3
    volumes:
      - ./:/var/www/html
    environment:
      - QUEUE_CONNECTION=redis
    networks:
      - laravel_dev
    depends_on:
      - redis
      - mysql

  # Laravel scheduler
  scheduler:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: laravel_scheduler
    restart: unless-stopped
    command: >
      sh -c "while true; do
        php artisan schedule:run >> /dev/null 2>&1
        sleep 60
      done"
    volumes:
      - ./:/var/www/html
    networks:
      - laravel_dev
    depends_on:
      - mysql
      - redis

  # Mailhog for email testing
  mailhog:
    image: mailhog/mailhog:latest
    container_name: laravel_mailhog
    restart: unless-stopped
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
    networks:
      - laravel_dev
```

## Step 4: Laravel .env Configuration

```ini
# .env - Laravel environment configuration
APP_NAME=Laravel
APP_ENV=local
APP_KEY=base64:YOUR_KEY_HERE
APP_DEBUG=true
APP_URL=http://localhost

LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=debug

# Database
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=laravel_dev
DB_USERNAME=laravel
DB_PASSWORD=laravel_password

# Cache
CACHE_STORE=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis

# Redis
REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379

# Mail
MAIL_MAILER=smtp
MAIL_HOST=mailhog
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_SCHEME=null
MAIL_FROM_ADDRESS=dev@laravel.local
```

## Step 5: Common Laravel Commands

```bash
# Install/update Composer dependencies
docker exec laravel_app composer install

# Generate application key
docker exec laravel_app php artisan key:generate

# Run database migrations
docker exec laravel_app php artisan migrate

# Seed database with test data
docker exec laravel_app php artisan db:seed

# Run tests
docker exec laravel_app php artisan test

# Run PHPUnit with coverage
docker exec laravel_app vendor/bin/phpunit --coverage-html coverage/

# Clear all caches
docker exec laravel_app php artisan cache:clear
docker exec laravel_app php artisan config:clear
docker exec laravel_app php artisan view:clear

# Install frontend dependencies
docker exec laravel_app npm install

# Build frontend assets
docker exec laravel_app npm run build
```

## Step 6: Configure Xdebug in VS Code

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Listen for Xdebug",
      "type": "php",
      "request": "launch",
      "port": 9003,
      "pathMappings": {
        "/var/www/html": "${workspaceFolder}"
      }
    }
  ]
}
```

## Conclusion

Your Laravel development environment is fully containerized and managed through Portainer. The Nginx + PHP-FPM setup mirrors production environments, Xdebug enables full debugging from VS Code or PHPStorm, and Mailhog intercepts all outgoing emails for testing. Portainer provides visibility into all containers, making it easy to restart the queue worker, view application logs, and monitor resource usage. When ready for production, the Dockerfile can be adapted for a production-ready image without Xdebug or debug settings.
