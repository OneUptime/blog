# How to Containerize a PHP Symfony Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, PHP, Symfony, Containerization, Nginx, DevOps, Production

Description: Build optimized Docker images for Symfony applications with proper environment handling, Messenger workers, and production caching.

---

Symfony is a robust PHP framework built for enterprise applications. Its explicit configuration, dependency injection, and component architecture make it well-suited for containerization. But Symfony has specific requirements around environment variables, cache warmup, and the Messenger component that need careful handling in Docker. This guide covers all of these.

## Project Structure

Organize Docker configuration files alongside your Symfony project:

```
my-symfony-app/
  config/
  public/
  src/
  docker/
    nginx/
      default.conf
    php/
      php-fpm.conf
      production.ini
    supervisor/
      supervisord.conf
  Dockerfile
  docker-compose.yml
```

## The Multi-Stage Dockerfile

This Dockerfile handles Composer dependencies, frontend assets, and builds an optimized production image:

```dockerfile
# Dockerfile - Symfony production build

# === Stage 1: Composer dependencies ===
FROM composer:2 AS composer

WORKDIR /app

COPY composer.json composer.lock symfony.lock ./

# Install production dependencies
RUN composer install \
    --no-dev \
    --no-scripts \
    --no-autoloader \
    --prefer-dist \
    --no-interaction

COPY . .

# Run post-install scripts and generate optimized autoloader
RUN composer dump-autoload --optimize --classmap-authoritative --no-dev

# === Stage 2: Frontend assets (if using Webpack Encore or AssetMapper) ===
FROM node:20-alpine AS frontend

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY webpack.config.js ./
COPY assets ./assets

RUN yarn build

# === Stage 3: Production image ===
FROM php:8.3-fpm-alpine

# Install system dependencies and PHP extensions
RUN apk add --no-cache \
    nginx \
    curl \
    supervisor \
    icu-dev \
    libzip-dev \
    postgresql-dev \
    linux-headers \
    && docker-php-ext-install -j$(nproc) \
        intl zip pdo pdo_pgsql pdo_mysql opcache \
    && rm -rf /var/cache/apk/*

# Install APCu for Symfony cache
RUN apk add --no-cache --virtual .build-deps autoconf g++ make \
    && pecl install apcu redis \
    && docker-php-ext-enable apcu redis \
    && apk del .build-deps

# PHP production configuration
COPY docker/php/production.ini /usr/local/etc/php/conf.d/production.ini
COPY docker/php/php-fpm.conf /usr/local/etc/php-fpm.d/www.conf

# Nginx configuration
COPY docker/nginx/default.conf /etc/nginx/http.d/default.conf

# Supervisor configuration
COPY docker/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy application code
WORKDIR /var/www/html
COPY --from=composer /app /var/www/html
COPY --from=frontend /app/public/build /var/www/html/public/build

# Create required directories
RUN mkdir -p var/cache var/log \
    && chown -R www-data:www-data var/

# Warm up the Symfony cache for production
# APP_ENV must be set for cache warmup to work correctly
ENV APP_ENV=prod
ENV APP_DEBUG=0

RUN php bin/console cache:warmup --env=prod

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=20s \
  CMD curl -f http://localhost/health || exit 1

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
```

## Nginx Configuration

```nginx
# docker/nginx/default.conf - Nginx for Symfony
server {
    listen 80;
    server_name _;
    root /var/www/html/public;

    server_tokens off;
    client_max_body_size 50M;

    location / {
        # Try to serve the file directly, otherwise pass to Symfony front controller
        try_files $uri /index.php$is_args$args;
    }

    # Symfony front controller
    location ~ ^/index\.php(/|$) {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_split_path_info ^(.+\.php)(/.*)$;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT $document_root;

        # Performance settings
        fastcgi_buffer_size 16k;
        fastcgi_buffers 16 16k;
        fastcgi_read_timeout 300;

        # Prevent exposing the front controller as a resource
        internal;
    }

    # Block all other PHP files
    location ~ \.php$ {
        return 404;
    }

    # Cache static assets
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Block dotfiles
    location ~ /\. {
        deny all;
    }
}
```

## PHP Configuration for Symfony

```ini
; docker/php/production.ini - PHP settings optimized for Symfony
[PHP]
display_errors = Off
log_errors = On
error_reporting = E_ALL & ~E_DEPRECATED & ~E_STRICT
memory_limit = 256M
max_execution_time = 30
upload_max_filesize = 50M
post_max_size = 50M
realpath_cache_size = 4096K
realpath_cache_ttl = 600

[opcache]
opcache.enable = 1
opcache.memory_consumption = 256
opcache.interned_strings_buffer = 32
opcache.max_accelerated_files = 20000
opcache.validate_timestamps = 0
opcache.save_comments = 1
opcache.preload = /var/www/html/config/preload.php
opcache.preload_user = www-data

[apcu]
apc.enabled = 1
apc.shm_size = 128M
apc.enable_cli = 0
```

The `opcache.preload` setting is a significant performance optimization for Symfony. It preloads commonly used classes into memory when PHP-FPM starts.

## Entrypoint Script

```bash
#!/bin/sh
# docker/entrypoint.sh - Symfony container startup

set -e

echo "Starting Symfony application..."

# Wait for database
if [ -n "$DATABASE_URL" ]; then
    echo "Waiting for database..."
    # Extract host and port from DATABASE_URL
    until php bin/console dbal:run-sql "SELECT 1" > /dev/null 2>&1; do
        sleep 2
    done
    echo "Database is ready."
fi

# Run migrations in production
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    echo "Running database migrations..."
    php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration
fi

# Ensure cache is warm
php bin/console cache:warmup --env=prod 2>/dev/null || true

# Fix permissions on var directory
chown -R www-data:www-data var/

echo "Application ready."

exec "$@"
```

## Handling Symfony Messenger Workers

Symfony Messenger handles async message processing. Run workers alongside the main application:

```ini
; docker/supervisor/supervisord.conf
[supervisord]
nodaemon=true
logfile=/dev/null
logfile_maxbytes=0

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

; Messenger worker for the async transport
[program:messenger-async]
command=php /var/www/html/bin/console messenger:consume async --time-limit=3600 --memory-limit=128M
autostart=true
autorestart=true
numprocs=2
process_name=%(program_name)s_%(process_num)02d
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

; Messenger worker for the failed transport (retries)
[program:messenger-failed]
command=php /var/www/html/bin/console messenger:consume failed --time-limit=3600 --memory-limit=128M
autostart=true
autorestart=true
numprocs=1
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
```

The `--time-limit=3600` flag restarts workers every hour, which helps them pick up code changes after deployments and prevents memory leaks.

## Docker Compose for Development

```yaml
# docker-compose.yml - Symfony development environment
version: "3.9"

services:
  app:
    build:
      context: .
      target: composer  # Use the composer stage for development
    ports:
      - "8080:80"
    volumes:
      - .:/var/www/html
      - vendor:/var/www/html/vendor
    environment:
      APP_ENV: dev
      APP_DEBUG: 1
      DATABASE_URL: postgresql://symfony:secret@postgres:5432/symfony?serverVersion=16
      MESSENGER_TRANSPORT_DSN: doctrine://default?auto_setup=0
      MAILER_DSN: smtp://mailpit:1025
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: symfony
      POSTGRES_USER: symfony
      POSTGRES_PASSWORD: secret
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "symfony"]
      interval: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

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
# docker-compose.prod.yml - Symfony production
version: "3.9"

services:
  app:
    image: mysymfonyapp:${VERSION:-latest}
    restart: unless-stopped
    ports:
      - "8080:80"
    environment:
      APP_ENV: prod
      APP_DEBUG: 0
      APP_SECRET: ${APP_SECRET}
      DATABASE_URL: ${DATABASE_URL}
      MESSENGER_TRANSPORT_DSN: ${MESSENGER_TRANSPORT_DSN}
      REDIS_URL: redis://redis:6379
      RUN_MIGRATIONS: "true"
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
    command: redis-server --appendonly yes --maxmemory 256mb
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

## Creating a Health Check Endpoint

Add a health check controller to your Symfony application:

```php
<?php
// src/Controller/HealthController.php
namespace App\Controller;

use Doctrine\DBAL\Connection;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

class HealthController
{
    #[Route('/health', methods: ['GET'])]
    public function health(Connection $connection): JsonResponse
    {
        $checks = [];

        // Check database connectivity
        try {
            $connection->executeQuery('SELECT 1');
            $checks['database'] = 'ok';
        } catch (\Exception $e) {
            $checks['database'] = 'failed';
        }

        $healthy = !in_array('failed', $checks, true);

        return new JsonResponse(
            ['status' => $healthy ? 'UP' : 'DOWN', 'checks' => $checks],
            $healthy ? 200 : 503
        );
    }
}
```

## Build and Deploy

```bash
# Build the production image
docker build -t mysymfonyapp:1.0 .

# Start the production environment
docker compose -f docker-compose.prod.yml up -d

# Run Symfony commands in the container
docker compose -f docker-compose.prod.yml exec app php bin/console about
docker compose -f docker-compose.prod.yml exec app php bin/console debug:router
```

Containerizing Symfony follows the same principles as any PHP application, with extra attention to cache warmup, the Messenger worker lifecycle, and Symfony's environment handling. The multi-stage build keeps the image lean, and Supervisor manages the multiple processes that a production Symfony application requires.
