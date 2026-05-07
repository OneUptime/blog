# How to Use Podman for PHP Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, PHP, Laravel, Container, Development, Web Development

Description: A practical guide to using Podman for PHP development, covering Apache and Nginx setups, Composer dependency management, Laravel workflows, Xdebug debugging, and multi-container stacks with MySQL.

---

> Podman makes PHP development portable by containerizing not just your code but the entire web server, PHP runtime, and database stack, so every developer runs exactly the same environment.

PHP development has always been tightly coupled to the web server it runs on. Apache with mod_php behaves differently from Nginx with PHP-FPM. PHP versions and extensions vary across machines. MAMP, XAMPP, and similar tools help, but they each come with their own quirks. Running PHP inside containers gives you precise control over every component. Podman handles this without requiring a background daemon, and its rootless mode means you do not need administrator access.

This guide covers setting up PHP development environments with Podman, from simple scripts to full Laravel applications with databases.

---

## Choosing a PHP Base Image

The official PHP images come in three main flavors:

```bash
# CLI image - PHP without a web server, good for scripts and workers

podman pull docker.io/library/php:8.3-cli

# Apache image - PHP with Apache and mod_php built in
podman pull docker.io/library/php:8.3-apache

# FPM image - PHP-FPM for use with Nginx or other reverse proxies
podman pull docker.io/library/php:8.3-fpm
```

For web development, the Apache image is the easiest to start with. For production or more complex setups, PHP-FPM with a separate Nginx container offers better performance and flexibility.

## Running a PHP Script

```bash
# Run a PHP script from the current directory
podman run --rm \
  -v $(pwd):/app:Z \
  -w /app \
  docker.io/library/php:8.3-cli \
  php script.php

# Start an interactive PHP shell
podman run -it --rm \
  docker.io/library/php:8.3-cli \
  php -a
```

## Setting Up a PHP Development Server with Apache

Create a simple `index.php`:

```php
<?php
// index.php
header('Content-Type: application/json');

echo json_encode([
    'message' => 'Hello from PHP inside Podman',
    'php_version' => phpversion(),
    'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
    'extensions' => get_loaded_extensions(),
]);
```

Run it with the Apache image:

```bash
# Serve PHP files from the current directory
podman run -it --rm \
  -v $(pwd):/var/www/html:Z \
  -p 8080:80 \
  docker.io/library/php:8.3-apache
```

Open `http://localhost:8080` to see the output. Any changes to PHP files on your host are reflected immediately because the files are mounted directly into Apache's document root.

## Installing PHP Extensions

Most PHP projects need extensions beyond the defaults. The official images include a helper script for installing them.

```dockerfile
FROM docker.io/library/php:8.3-apache

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libicu-dev \
    libpq-dev \
    unzip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions using the built-in helper
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    gd \
    pdo_mysql \
    pdo_pgsql \
    zip \
    intl \
    opcache \
    bcmath

# Enable Apache mod_rewrite (needed by most PHP frameworks)
RUN a2enmod rewrite

WORKDIR /var/www/html
```

## Setting Up Composer

Composer is the PHP dependency manager. You can install it in your image or use the official Composer image.

```dockerfile
FROM docker.io/library/php:8.3-apache

# Install dependencies and extensions (abbreviated for clarity)
RUN apt-get update && apt-get install -y \
    libzip-dev unzip git \
    && rm -rf /var/lib/apt/lists/* \
    && docker-php-ext-install zip

# Install Composer from the official image
COPY --from=docker.io/library/composer:2 /usr/bin/composer /usr/bin/composer

RUN a2enmod rewrite

WORKDIR /var/www/html
```

Using Composer to install dependencies:

```bash
# Install dependencies inside the container
podman run --rm \
  -v $(pwd):/app:Z \
  -w /app \
  docker.io/library/composer:2 \
  composer install
```

## Developing a Laravel Application

Laravel is the most popular PHP framework. Here is a complete development setup.

Create a `Containerfile` for Laravel:

```dockerfile
FROM docker.io/library/php:8.3-apache

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpng-dev libjpeg-dev libfreetype6-dev \
    libzip-dev libicu-dev libpq-dev \
    unzip git curl \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions required by Laravel
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    gd pdo_mysql zip intl opcache bcmath

# Install the Redis extension used by Laravel's default PhpRedis client
RUN pecl install redis && docker-php-ext-enable redis

# Install Composer
COPY --from=docker.io/library/composer:2 /usr/bin/composer /usr/bin/composer

# Enable Apache rewrite module
RUN a2enmod rewrite

# Configure Apache to point to Laravel's public directory
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' \
    /etc/apache2/sites-available/*.conf \
    /etc/apache2/apache2.conf

WORKDIR /var/www/html

# Copy composer files first for dependency caching
COPY composer.json composer.lock ./
RUN composer install --no-scripts --no-autoloader

# Copy the rest of the application
COPY . .
RUN composer dump-autoload --optimize

# Set permissions for Laravel's storage and cache directories
RUN chown -R www-data:www-data storage bootstrap/cache

EXPOSE 80

CMD ["apache2-foreground"]
```

Podman's `compose` subcommand uses an external compose provider, so make sure `podman-compose` or Docker Compose is installed before running these commands.

Create a `compose.yaml` for Laravel with MySQL and Redis:

```yaml
services:
  app:
    build: .
    ports:
      - "8080:80"
    volumes:
      - .:/var/www/html:Z
    environment:
      DB_CONNECTION: mysql
      DB_HOST: db
      DB_PORT: 3306
      DB_DATABASE: laravel
      DB_USERNAME: laravel
      DB_PASSWORD: secret
      CACHE_STORE: redis
      REDIS_CLIENT: phpredis
      REDIS_HOST: redis
    depends_on:
      - db
      - redis

  db:
    image: docker.io/library/mysql:8.0
    environment:
      MYSQL_DATABASE: laravel
      MYSQL_USER: laravel
      MYSQL_PASSWORD: secret
      MYSQL_ROOT_PASSWORD: rootsecret
    ports:
      - "3306:3306"
    volumes:
      - mysqldata:/var/lib/mysql

  redis:
    image: docker.io/library/redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  mysqldata:
```

Start the stack and initialize Laravel once MySQL has finished initializing:

```bash
# Start all services
podman compose up -d

# Install PHP dependencies inside the running container
podman compose exec app composer install

# Run Laravel migrations
podman compose exec app php artisan migrate

# Generate the application key
podman compose exec app php artisan key:generate

# Clear and rebuild caches
podman compose exec app php artisan config:clear
podman compose exec app php artisan cache:clear

# View logs
podman compose logs -f app
```

## Using PHP-FPM with Nginx

For a more production-like setup, use PHP-FPM with Nginx as separate containers:

Create `Containerfile.fpm`:

```dockerfile
FROM docker.io/library/php:8.3-fpm

RUN apt-get update && apt-get install -y \
    libpng-dev libjpeg-dev libfreetype6-dev \
    libzip-dev libicu-dev \
    unzip git \
    && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    gd pdo_mysql zip intl opcache bcmath

COPY --from=docker.io/library/composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
```

```yaml
services:
  nginx:
    image: docker.io/library/nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - .:/var/www/html:z
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:Z
    depends_on:
      - php

  php:
    build:
      context: .
      dockerfile: Containerfile.fpm
    volumes:
      - .:/var/www/html:z
    environment:
      DB_CONNECTION: mysql
      DB_HOST: db
      DB_PORT: 3306
      DB_DATABASE: myapp
      DB_USERNAME: myapp
      DB_PASSWORD: secret
    depends_on:
      - db

  db:
    image: docker.io/library/mysql:8.0
    environment:
      MYSQL_DATABASE: myapp
      MYSQL_USER: myapp
      MYSQL_PASSWORD: secret
      MYSQL_ROOT_PASSWORD: rootsecret
    volumes:
      - mysqldata:/var/lib/mysql

volumes:
  mysqldata:
```

Create `nginx.conf`:

```nginx
server {
    listen 80;
    server_name localhost;
    root /var/www/html/public;
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass php:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

## Debugging with Xdebug

Xdebug is the standard PHP debugger. Add it to your development image:

```dockerfile
FROM docker.io/library/php:8.3-apache

# Install Xdebug
RUN pecl install xdebug && docker-php-ext-enable xdebug

# Configure Xdebug for remote debugging
RUN echo "xdebug.mode=debug" >> /usr/local/etc/php/conf.d/xdebug.ini \
    && echo "xdebug.start_with_request=yes" >> /usr/local/etc/php/conf.d/xdebug.ini \
    && echo "xdebug.client_host=host.containers.internal" >> /usr/local/etc/php/conf.d/xdebug.ini \
    && echo "xdebug.client_port=9003" >> /usr/local/etc/php/conf.d/xdebug.ini
```

The `host.containers.internal` hostname resolves to the host machine from inside a Podman container. Configure your IDE to listen on port 9003, and Xdebug will connect to it automatically when a request hits the server.

## Running Tests

```bash
# Run PHPUnit tests
podman run --rm \
  -v $(pwd):/app:Z \
  -w /app \
  docker.io/library/php:8.3-cli \
  vendor/bin/phpunit

# Run PHPUnit with coverage using a custom image that includes Xdebug or PCOV
podman run --rm \
  -v $(pwd):/app:Z \
  -w /app \
  my-php-dev \
  vendor/bin/phpunit --coverage-text

# Run Laravel tests
podman compose exec app php artisan test --verbose
```

## Conclusion

Podman handles PHP development well by containerizing the full stack: web server, PHP runtime, extensions, and database. The Apache image is the fastest way to get started, while PHP-FPM with Nginx gives you a setup that mirrors production. The most important details to get right are installing the correct PHP extensions for your project, mounting your source code into the right directory, and configuring Xdebug's `client_host` to point back to your host machine. Once those are in place, the development experience is smooth and consistent across every machine on the team.
