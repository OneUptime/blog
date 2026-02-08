# How to Containerize a PHP Laravel Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, PHP, Laravel, Containerization, Nginx, DevOps, Web Development

Description: Build and deploy Laravel applications with Docker using multi-stage builds, queue workers, schedulers, and production optimizations.

---

Laravel is the most popular PHP framework, and containerizing it properly requires more than just a Dockerfile. A production Laravel setup includes the web server, queue workers, a task scheduler, and supporting services like Redis and a database. This guide builds a complete Docker setup for Laravel that handles all these pieces.

## Project Structure

A typical Laravel Docker setup includes several configuration files:

```
my-laravel-app/
  app/
  config/
  routes/
  docker/
    nginx/
      default.conf
    php/
      php-fpm.conf
      production.ini
  Dockerfile
  docker-compose.yml
  docker-compose.prod.yml
```

## The Optimized Dockerfile

This multi-stage Dockerfile installs Composer dependencies, builds front-end assets, and creates a lean production image:

```dockerfile
# Dockerfile - Production Laravel application

# === Stage 1: Composer dependencies ===
FROM composer:2 AS composer

WORKDIR /app

# Copy only dependency files first for layer caching
COPY composer.json composer.lock ./

# Install production dependencies
RUN composer install \
    --no-dev \
    --no-scripts \
    --no-autoloader \
    --prefer-dist \
    --no-interaction

# Copy full source code
COPY . .

# Generate optimized autoloader with all source available
RUN composer dump-autoload --optimize --no-dev

# === Stage 2: Frontend assets ===
FROM node:20-alpine AS frontend

WORKDIR /app

COPY package.json package-lock.json vite.config.js ./
RUN npm ci

COPY resources ./resources
COPY public ./public

# Build production assets with Vite
RUN npm run build

# === Stage 3: Production image ===
FROM php:8.3-fpm-alpine

# Install system dependencies and PHP extensions
RUN apk add --no-cache \
    nginx \
    curl \
    supervisor \
    freetype-dev \
    libjpeg-turbo-dev \
    libpng-dev \
    libzip-dev \
    icu-dev \
    postgresql-dev \
    oniguruma-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        gd zip intl mbstring pdo pdo_mysql pdo_pgsql opcache bcmath \
    && rm -rf /var/cache/apk/*

# Install Redis PHP extension
RUN apk add --no-cache --virtual .build-deps autoconf g++ make \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del .build-deps

# PHP configuration
COPY docker/php/production.ini /usr/local/etc/php/conf.d/production.ini
COPY docker/php/php-fpm.conf /usr/local/etc/php-fpm.d/www.conf

# Nginx configuration
COPY docker/nginx/default.conf /etc/nginx/http.d/default.conf

# Supervisor configuration (manages Nginx, PHP-FPM, and queue workers)
COPY docker/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy the application from previous stages
WORKDIR /var/www/html
COPY --from=composer /app /var/www/html
COPY --from=frontend /app/public/build /var/www/html/public/build

# Set storage and cache permissions
RUN mkdir -p storage/framework/{sessions,views,cache} \
    && mkdir -p storage/logs \
    && mkdir -p bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

# Optimize Laravel for production
RUN php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=30s \
  CMD curl -f http://localhost/health || exit 1

# Entrypoint script for migrations and startup
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
```

## Nginx Configuration for Laravel

```nginx
# docker/nginx/default.conf - Nginx configuration for Laravel
server {
    listen 80;
    server_name _;
    root /var/www/html/public;
    index index.php;

    server_tokens off;

    # Increase client body size for file uploads
    client_max_body_size 50M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # PHP-FPM processing
    location ~ \.php$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_buffer_size 16k;
        fastcgi_buffers 16 16k;
        fastcgi_read_timeout 300;
    }

    # Block dotfiles (except .well-known for SSL)
    location ~ /\.(?!well-known) {
        deny all;
    }

    # Cache static assets
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
}
```

## Supervisor Configuration

Supervisor manages multiple processes inside the container: Nginx, PHP-FPM, and the Laravel queue worker.

```ini
; docker/supervisor/supervisord.conf
[supervisord]
nodaemon=true
logfile=/dev/null
logfile_maxbytes=0
pidfile=/var/run/supervisord.pid

[program:nginx]
command=nginx -g "daemon off;"
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:php-fpm]
command=php-fpm -F
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:laravel-worker]
command=php /var/www/html/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
numprocs=2
process_name=%(program_name)s_%(process_num)02d
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
```

## Entrypoint Script

The entrypoint script runs migrations and other setup tasks before starting the application:

```bash
#!/bin/sh
# docker/entrypoint.sh - Laravel container startup script

set -e

echo "Starting Laravel application..."

# Wait for database to be ready
echo "Waiting for database..."
until php artisan db:monitor --max=1 > /dev/null 2>&1; do
    sleep 2
done
echo "Database is ready."

# Run database migrations
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    echo "Running migrations..."
    php artisan migrate --force
fi

# Clear and rebuild caches
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Create storage symlink
php artisan storage:link 2>/dev/null || true

echo "Application ready."

# Execute the CMD
exec "$@"
```

## PHP Production Configuration

```ini
; docker/php/production.ini
[PHP]
display_errors = Off
log_errors = On
error_reporting = E_ALL & ~E_DEPRECATED & ~E_STRICT
memory_limit = 256M
max_execution_time = 60
upload_max_filesize = 50M
post_max_size = 50M

[opcache]
opcache.enable = 1
opcache.memory_consumption = 256
opcache.interned_strings_buffer = 32
opcache.max_accelerated_files = 20000
opcache.validate_timestamps = 0
opcache.save_comments = 1
opcache.fast_shutdown = 1
opcache.jit = tracing
opcache.jit_buffer_size = 64M

[session]
session.save_handler = redis
session.save_path = "tcp://redis:6379"
```

## Docker Compose for Development

```yaml
# docker-compose.yml - Laravel development environment
version: "3.9"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:80"
    volumes:
      - .:/var/www/html
      - vendor:/var/www/html/vendor
    environment:
      APP_ENV: local
      APP_DEBUG: "true"
      DB_CONNECTION: pgsql
      DB_HOST: postgres
      DB_PORT: 5432
      DB_DATABASE: laravel
      DB_USERNAME: laravel
      DB_PASSWORD: secret
      REDIS_HOST: redis
      CACHE_DRIVER: redis
      SESSION_DRIVER: redis
      QUEUE_CONNECTION: redis
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: laravel
      POSTGRES_USER: laravel
      POSTGRES_PASSWORD: secret
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "laravel"]
      interval: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      retries: 5

  mailpit:
    image: axllent/mailpit
    ports:
      - "8025:8025"
      - "1025:1025"

volumes:
  pgdata:
  vendor:
```

## Docker Compose for Production

```yaml
# docker-compose.prod.yml - Laravel production deployment
version: "3.9"

services:
  app:
    image: mylaravel:${VERSION:-latest}
    restart: unless-stopped
    ports:
      - "8080:80"
    environment:
      APP_ENV: production
      APP_DEBUG: "false"
      APP_KEY: ${APP_KEY}
      DB_CONNECTION: pgsql
      DB_HOST: ${DB_HOST}
      DB_DATABASE: ${DB_NAME}
      DB_USERNAME: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: redis
      CACHE_DRIVER: redis
      SESSION_DRIVER: redis
      QUEUE_CONNECTION: redis
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 1G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 30s

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      retries: 5

  # Separate container for the scheduler
  scheduler:
    image: mylaravel:${VERSION:-latest}
    restart: unless-stopped
    command: >
      sh -c "while true; do php /var/www/html/artisan schedule:run --verbose --no-interaction; sleep 60; done"
    environment:
      APP_ENV: production
      DB_HOST: ${DB_HOST}
      DB_DATABASE: ${DB_NAME}
      DB_USERNAME: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: redis

volumes:
  redis-data:
```

## Build and Deploy

Build the production image:

```bash
# Build the Laravel production image
docker build -t mylaravel:1.0 .

# Check the image size
docker images mylaravel
```

Deploy:

```bash
# Start the production stack
docker compose -f docker-compose.prod.yml up -d

# Check logs
docker compose -f docker-compose.prod.yml logs -f app

# Run artisan commands inside the container
docker compose -f docker-compose.prod.yml exec app php artisan tinker
```

## Common Laravel Docker Issues

1. **Storage permissions**: Always set `chown -R www-data:www-data storage bootstrap/cache` in your Dockerfile.

2. **Missing APP_KEY**: Generate one with `php artisan key:generate --show` and add it to your environment.

3. **OPcache with validate_timestamps=0**: This means PHP never checks if files changed. Perfect for production containers where files are immutable. But during development, set it to 1 or disable OPcache entirely.

4. **Queue workers need graceful shutdown**: Set `--max-time=3600` so workers restart periodically and pick up new code after deployments.

A properly containerized Laravel application gives you consistent deployments, easy scaling of queue workers, and clear separation between the web server, application logic, and background processing. Start with this template and adjust the resource limits and worker counts based on your traffic patterns.
