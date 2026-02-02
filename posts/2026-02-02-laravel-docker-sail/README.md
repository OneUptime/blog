# How to Use Docker with Laravel (Sail)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PHP, Laravel, Docker, Sail, DevOps

Description: Learn how to use Laravel Sail for Docker-based development, including setup, customization, running services, and production deployment patterns.

---

Setting up a local PHP development environment used to be painful. You'd install PHP, configure extensions, set up MySQL, Redis, maybe Mailhog for testing emails - and then your coworker would have slightly different versions and everything would break. Laravel Sail solves this by wrapping your entire development environment in Docker containers.

Sail is Laravel's official Docker development environment. It's not a replacement for Docker Compose - it's a nice wrapper around it with sensible defaults for Laravel projects. You get PHP, MySQL, Redis, and other services pre-configured and ready to go.

## Installing Sail

If you're starting a new Laravel project, Sail is included by default:

```bash
# Create a new Laravel project with Sail
curl -s "https://laravel.build/myapp" | bash

# Move into the project directory
cd myapp

# Start Sail (this pulls Docker images on first run)
./vendor/bin/sail up
```

For existing projects, add Sail via Composer:

```bash
# Install Sail as a dev dependency
composer require laravel/sail --dev

# Publish the docker-compose.yml file
php artisan sail:install

# You'll be prompted to choose services - pick what you need
# Options: mysql, pgsql, mariadb, redis, memcached, meilisearch, minio, mailpit, selenium
```

## Essential Sail Commands

Here's a reference table of commands you'll use daily:

| Command | Description |
|---------|-------------|
| `sail up` | Start all containers in the foreground |
| `sail up -d` | Start containers in detached mode (background) |
| `sail down` | Stop all containers |
| `sail restart` | Restart all containers |
| `sail ps` | List running containers |
| `sail shell` | Open a shell inside the app container |
| `sail root-shell` | Open a root shell inside the app container |
| `sail php` | Run PHP commands |
| `sail artisan` | Run Artisan commands |
| `sail composer` | Run Composer commands |
| `sail npm` | Run NPM commands |
| `sail test` | Run PHPUnit tests |
| `sail tinker` | Start Laravel Tinker REPL |

Set up a bash alias to make your life easier:

```bash
# Add to your ~/.bashrc or ~/.zshrc
alias sail='[ -f sail ] && sh sail || sh vendor/bin/sail'

# Now you can just run:
sail up -d
sail artisan migrate
sail npm run dev
```

## Running Database Migrations and Artisan Commands

Once Sail is running, you run Laravel commands through Sail instead of directly:

```bash
# Run migrations
sail artisan migrate

# Create a new model with migration, factory, and controller
sail artisan make:model Post -mfc

# Seed the database
sail artisan db:seed

# Clear all caches
sail artisan optimize:clear

# Run the queue worker
sail artisan queue:work
```

## Customizing docker-compose.yml

Sail publishes a `docker-compose.yml` file to your project root. Here's how to customize it:

```yaml
# docker-compose.yml
version: '3'
services:
    laravel.test:
        # Build configuration for the main app container
        build:
            context: ./vendor/laravel/sail/runtimes/8.3
            dockerfile: Dockerfile
            args:
                WWWGROUP: '${WWWGROUP}'
        image: sail-8.3/app
        extra_hosts:
            - 'host.docker.internal:host-gateway'
        ports:
            # Map container port 80 to host port defined in .env (default 80)
            - '${APP_PORT:-80}:80'
            # Vite dev server port
            - '${VITE_PORT:-5173}:${VITE_PORT:-5173}'
        environment:
            WWWUSER: '${WWWUSER}'
            LARAVEL_SAIL: 1
            # Enable Xdebug mode - set in your .env file
            XDEBUG_MODE: '${SAIL_XDEBUG_MODE:-off}'
            XDEBUG_CONFIG: '${SAIL_XDEBUG_CONFIG:-client_host=host.docker.internal}'
        volumes:
            # Mount your project directory into the container
            - '.:/var/www/html'
        networks:
            - sail
        depends_on:
            - mysql
            - redis

    mysql:
        image: 'mysql/mysql-server:8.0'
        ports:
            # Expose MySQL on port 3306 (configurable via .env)
            - '${FORWARD_DB_PORT:-3306}:3306'
        environment:
            MYSQL_ROOT_PASSWORD: '${DB_PASSWORD}'
            MYSQL_ROOT_HOST: '%'
            MYSQL_DATABASE: '${DB_DATABASE}'
            MYSQL_USER: '${DB_USERNAME}'
            MYSQL_PASSWORD: '${DB_PASSWORD}'
        volumes:
            # Persist database data between container restarts
            - 'sail-mysql:/var/lib/mysql'
        networks:
            - sail
        healthcheck:
            test: ["CMD", "mysqladmin", "ping", "-p${DB_PASSWORD}"]
            retries: 3
            timeout: 5s

    redis:
        image: 'redis:alpine'
        ports:
            - '${FORWARD_REDIS_PORT:-6379}:6379'
        volumes:
            - 'sail-redis:/data'
        networks:
            - sail
        healthcheck:
            test: ["CMD", "redis-cli", "ping"]
            retries: 3
            timeout: 5s

networks:
    sail:
        driver: bridge

volumes:
    sail-mysql:
        driver: local
    sail-redis:
        driver: local
```

## Adding Custom Services

Need to add a service that Sail doesn't include by default? Just add it to your docker-compose.yml:

```yaml
# Add Elasticsearch for full-text search
services:
    # ... existing services ...

    elasticsearch:
        image: 'elasticsearch:8.11.0'
        environment:
            - discovery.type=single-node
            - xpack.security.enabled=false
            - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
        ports:
            - '${FORWARD_ELASTICSEARCH_PORT:-9200}:9200'
        volumes:
            - 'sail-elasticsearch:/usr/share/elasticsearch/data'
        networks:
            - sail

volumes:
    # ... existing volumes ...
    sail-elasticsearch:
        driver: local
```

Then update your `.env` file:

```bash
# .env
ELASTICSEARCH_HOST=elasticsearch
ELASTICSEARCH_PORT=9200
```

## Setting Up Xdebug for Step Debugging

Xdebug is included in Sail but disabled by default. Enable it in your `.env`:

```bash
# .env - Enable step debugging
SAIL_XDEBUG_MODE=develop,debug

# Optional: custom Xdebug configuration
SAIL_XDEBUG_CONFIG="client_host=host.docker.internal start_with_request=yes"
```

Configure your IDE (VS Code example with PHP Debug extension):

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

Restart Sail after changing Xdebug settings:

```bash
sail down && sail up -d
```

## Publishing and Customizing Sail's Dockerfile

Need to install additional PHP extensions or system packages? Publish Sail's Dockerfiles:

```bash
# Publish the Dockerfile to your project
sail artisan sail:publish

# This creates docker/8.3/Dockerfile (version depends on your PHP version)
```

Now customize the Dockerfile:

```dockerfile
# docker/8.3/Dockerfile

# Add PHP extensions
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libwebp-dev \
    && docker-php-ext-configure gd --with-jpeg --with-webp \
    && docker-php-ext-install gd

# Install additional tools
RUN apt-get install -y \
    vim \
    htop

# Install PHP extensions via PECL
RUN pecl install mongodb && docker-php-ext-enable mongodb
```

Update your docker-compose.yml to use the custom Dockerfile:

```yaml
laravel.test:
    build:
        context: ./docker/8.3
        dockerfile: Dockerfile
```

Rebuild the container:

```bash
sail build --no-cache
sail up -d
```

## Production Deployment Patterns

Sail is designed for local development, not production. For production, create a separate Dockerfile:

```dockerfile
# Dockerfile.production
FROM php:8.3-fpm-alpine

# Install production dependencies only
RUN apk add --no-cache \
    nginx \
    supervisor \
    && docker-php-ext-install pdo_mysql opcache

# Copy application files
COPY --chown=www-data:www-data . /var/www/html

# Install Composer dependencies without dev packages
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Configure PHP for production
COPY docker/php.ini /usr/local/etc/php/conf.d/custom.ini

# Set proper permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 80
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
```

Create a production docker-compose file:

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
    app:
        build:
            context: .
            dockerfile: Dockerfile.production
        restart: unless-stopped
        environment:
            APP_ENV: production
            APP_DEBUG: false
        depends_on:
            - mysql
            - redis

    mysql:
        image: mysql:8.0
        restart: unless-stopped
        environment:
            MYSQL_DATABASE: ${DB_DATABASE}
            MYSQL_USER: ${DB_USERNAME}
            MYSQL_PASSWORD: ${DB_PASSWORD}
            MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
        volumes:
            - mysql-data:/var/lib/mysql

    redis:
        image: redis:alpine
        restart: unless-stopped

volumes:
    mysql-data:
```

## Quick Troubleshooting

Common issues and fixes:

| Problem | Solution |
|---------|----------|
| Port already in use | Change `APP_PORT` in .env (e.g., `APP_PORT=8080`) |
| MySQL connection refused | Wait for healthcheck to pass, or check `sail ps` |
| Permission errors | Run `sail root-shell` then `chown -R sail:sail /var/www/html/storage` |
| Slow performance on macOS | Use mutagen or docker-sync for file syncing |
| Container won't start | Check logs with `sail logs` or `docker-compose logs` |

## Wrapping Up

Sail removes the friction of setting up a development environment. You get consistent, reproducible environments across your team without spending hours configuring PHP, databases, and caching layers. Start with the defaults, and customize as your project grows.

The key thing to remember: Sail is for development. When you go to production, build proper Docker images optimized for your deployment target. Use Sail's docker-compose.yml as a reference, but create production-specific configurations that are secure and performant.
