# How to Deploy a Laravel + MySQL Stack via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Laravel, MySQL, PHP, Docker Compose, Web Framework

Description: Deploy a Laravel web application with MySQL using Docker Compose through Portainer, covering Artisan migrations, queue workers, Redis caching, and Nginx with PHP-FPM.

## Introduction

Laravel is PHP's most popular web framework with an elegant syntax and a rich ecosystem. Deploying Laravel with MySQL via Portainer gives you a complete production stack with Nginx serving static assets, PHP-FPM processing PHP requests, Redis for caching and sessions, and Laravel Horizon or queue workers for background jobs.

## Prerequisites

- Portainer CE or BE with Docker Engine 20.10+
- A Laravel project (or create one with `composer create-project laravel/laravel`)
- Basic knowledge of Laravel and PHP

## Step 1: Prepare the Laravel Dockerfile

```dockerfile
# Dockerfile

FROM php:8.3-fpm-alpine AS base

# Install system dependencies and PHP extensions
RUN apk add --no-cache \
    nginx \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    libxml2-dev \
    oniguruma-dev \
    curl && \
    docker-php-ext-configure gd --with-freetype --with-jpeg && \
    docker-php-ext-install \
        pdo_mysql \
        bcmath \
        gd \
        zip \
        mbstring \
        xml \
        opcache

# Install Redis extension
RUN pecl install redis && docker-php-ext-enable redis

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy application
COPY . .

# Install dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Set permissions
RUN chown -R www-data:www-data storage bootstrap/cache && \
    chmod -R 775 storage bootstrap/cache

EXPOSE 9000

CMD ["php-fpm"]
```

## Step 2: Create the Docker Compose Stack in Portainer

Navigate to **Stacks** → **Add Stack** and name it `laravel-app`.

If you use the relative `./public` and `./nginx/laravel.conf` bind mounts shown below, deploy the stack from a Git repository with relative path volumes enabled in Portainer Business Edition, or replace them with absolute paths on the Docker host:

```yaml
version: "3.8"

services:
  # MySQL database
  mysql:
    image: mysql:8.0
    container_name: laravel-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-rootpassword}
      MYSQL_DATABASE: ${MYSQL_DB:-laravel}
      MYSQL_USER: ${MYSQL_USER:-laraveluser}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-laravelpassword}
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - laravel-net
    healthcheck:
      test: ["CMD-SHELL", "mysqladmin ping -h localhost -u root -p\"$$MYSQL_ROOT_PASSWORD\" --silent"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s

  # Redis for cache, sessions, and queues
  redis:
    image: redis:7-alpine
    container_name: laravel-redis
    restart: unless-stopped
    volumes:
      - redis_data:/data
    networks:
      - laravel-net

  # PHP-FPM application container
  app:
    image: ${LARAVEL_IMAGE:-laravel-app:latest}
    container_name: laravel-app
    restart: unless-stopped
    working_dir: /var/www/html
    environment:
      APP_ENV: production
      APP_DEBUG: "false"
      APP_KEY: ${APP_KEY}
      APP_URL: ${APP_URL:-http://localhost}

      DB_CONNECTION: mysql
      DB_HOST: mysql
      DB_PORT: "3306"
      DB_DATABASE: ${MYSQL_DB:-laravel}
      DB_USERNAME: ${MYSQL_USER:-laraveluser}
      DB_PASSWORD: ${MYSQL_PASSWORD:-laravelpassword}

      CACHE_STORE: redis
      SESSION_DRIVER: redis
      QUEUE_CONNECTION: redis

      REDIS_HOST: redis
      REDIS_PORT: "6379"

      LOG_CHANNEL: stderr
    volumes:
      - app_storage:/var/www/html/storage
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - laravel-net

  # Nginx web server
  nginx:
    image: nginx:alpine
    container_name: laravel-nginx
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./public:/var/www/html/public:ro
      - ./nginx/laravel.conf:/etc/nginx/conf.d/default.conf:ro
      - app_storage:/var/www/html/storage:ro
    depends_on:
      - app
    networks:
      - laravel-net

  # Laravel queue worker
  queue:
    image: ${LARAVEL_IMAGE:-laravel-app:latest}
    container_name: laravel-queue
    restart: unless-stopped
    command: php artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
    environment:
      APP_ENV: production
      APP_KEY: ${APP_KEY}
      DB_CONNECTION: mysql
      DB_HOST: mysql
      DB_PORT: "3306"
      DB_DATABASE: ${MYSQL_DB:-laravel}
      DB_USERNAME: ${MYSQL_USER:-laraveluser}
      DB_PASSWORD: ${MYSQL_PASSWORD:-laravelpassword}
      CACHE_STORE: redis
      QUEUE_CONNECTION: redis
      REDIS_HOST: redis
      REDIS_PORT: "6379"
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - laravel-net

  # Laravel scheduler (runs every minute)
  scheduler:
    image: ${LARAVEL_IMAGE:-laravel-app:latest}
    container_name: laravel-scheduler
    restart: unless-stopped
    command: sh -c "while true; do php artisan schedule:run --verbose --no-interaction; sleep 60; done"
    environment:
      APP_ENV: production
      APP_KEY: ${APP_KEY}
      DB_CONNECTION: mysql
      DB_HOST: mysql
      DB_PORT: "3306"
      DB_DATABASE: ${MYSQL_DB:-laravel}
      DB_USERNAME: ${MYSQL_USER:-laraveluser}
      DB_PASSWORD: ${MYSQL_PASSWORD:-laravelpassword}
      CACHE_STORE: redis
      QUEUE_CONNECTION: redis
      REDIS_HOST: redis
      REDIS_PORT: "6379"
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - laravel-net

volumes:
  mysql_data:
  redis_data:
  app_storage:

networks:
  laravel-net:
    driver: bridge
```

## Step 3: Nginx Configuration for Laravel

```nginx
# nginx/laravel.conf
server {
    listen 80;
    server_name localhost;
    root /var/www/html/public;
    index index.php;

    client_max_body_size 20M;

    # Handle Laravel's index.php routing
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Serve Laravel public storage files from the shared storage volume
    location ^~ /storage/ {
        alias /var/www/html/storage/app/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }

    # PHP-FPM handling
    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_pass app:9000;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_buffer_size 128k;
        fastcgi_buffers 4 256k;
    }

    # Static file caching
    location ~* \.(css|js|png|jpg|gif|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Step 4: Run Artisan Commands via Portainer

Run these from the Docker host, or open the `laravel-app` container console in Portainer and run the `php artisan ...` portion directly:

```bash
# Run database migrations (first deployment)
docker exec laravel-app php artisan migrate --force

# Seed the database
docker exec laravel-app php artisan db:seed --force

# Generate app key (if not set)
docker exec laravel-app php artisan key:generate --show
# Copy the output to APP_KEY env variable

# Clear and rebuild caches
docker exec laravel-app php artisan config:cache
docker exec laravel-app php artisan route:cache
docker exec laravel-app php artisan view:cache

# Restart queue workers after a deploy
docker exec laravel-app php artisan queue:restart

# Tinker (interactive shell)
docker exec -it laravel-app php artisan tinker
```

## Step 5: Set Environment Variables in Portainer

In the Stack **Environment Variables** section, set:

| Key | Value |
|-----|-------|
| `APP_KEY` | Output of `php artisan key:generate --show` |
| `MYSQL_ROOT_PASSWORD` | Your secure root password |
| `MYSQL_PASSWORD` | Your app database password |
| `APP_URL` | `https://yourdomain.com` |
| `LARAVEL_IMAGE` | `your-registry/laravel-app:latest` |

## Conclusion

Deploying Laravel with MySQL via Portainer provides a complete production PHP application stack with Nginx + PHP-FPM for optimal performance, Redis for caching and session management, queue workers for background jobs, and a scheduler container for cron tasks. The MySQL health check ensures the application only starts after the database is ready. For production, always generate a unique `APP_KEY`, enable `APP_DEBUG=false`, configure proper file storage permissions on the `app_storage` volume, and use a CDN or S3 for media file storage rather than local disk.
