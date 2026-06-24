# How to Set Up a PHP/Laravel Development Environment with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, PHP, Laravel, Development Environment, Docker, Xdebug, Composer

Description: Learn how to set up a PHP Laravel development environment with Xdebug and hot-reload in a Docker container managed by Portainer.

---

Running Laravel development in Docker via Portainer ensures your team uses the same PHP version, extensions, and tools. Xdebug integration enables breakpoint debugging from VS Code or PhpStorm.

Build the PHP image ahead of time and replace the bind-mount paths below with paths on your Docker host.

## Dev Environment Compose Stack

```yaml
services:
  mysql:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      MYSQL_DATABASE: laravel_dev
      MYSQL_USER: laravel
      MYSQL_PASSWORD: secret
      MYSQL_ROOT_PASSWORD: secret
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  app:
    image: laravel-dev:latest
    restart: unless-stopped
    depends_on:
      - mysql
      - redis
    extra_hosts:
      - "host.docker.internal=host-gateway"
    ports:
      - "8000:8000"    # App
    environment:
      APP_ENV: local
      DB_HOST: mysql
      DB_DATABASE: laravel_dev
      DB_USERNAME: laravel
      DB_PASSWORD: secret
      REDIS_HOST: redis
      REDIS_CLIENT: phpredis
    volumes:
      - /path/to/your/laravel-app:/app
      - /path/to/your/xdebug.ini:/usr/local/etc/php/conf.d/99-xdebug.ini:ro
    working_dir: /app
    command: php artisan serve --host=0.0.0.0 --port=8000

volumes:
  mysql_data:
```

## Development Dockerfile

```dockerfile
# Dockerfile.dev

FROM php:8.3-cli-alpine

RUN apk add --no-cache \
    git curl zip unzip libzip-dev oniguruma-dev \
    && docker-php-ext-install pdo pdo_mysql zip mbstring

# Install Xdebug and Redis support for Laravel
RUN pecl install xdebug \
    && pecl install redis \
    && docker-php-ext-enable xdebug redis

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
```

## Xdebug Configuration

Create `/path/to/your/xdebug.ini` on the Docker host:

```ini
[xdebug]
xdebug.mode=develop,debug
xdebug.start_with_request=yes
xdebug.client_host=host.docker.internal
xdebug.client_port=9003
xdebug.idekey=VSCODE
```

## VS Code PHP Debug Configuration

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Listen for Xdebug",
      "type": "php",
      "request": "launch",
      "port": 9003,
      "pathMappings": {
        "/app": "${workspaceFolder}"
      }
    }
  ]
}
```
