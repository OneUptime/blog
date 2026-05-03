# How to Deploy a Laravel + MySQL Stack via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Laravel, MySQL, PHP, Docker Compose, Web Framework

Description: Learn how to deploy a Laravel application with MySQL via Portainer, including queue workers, scheduler, and production configuration with Nginx and PHP-FPM.

---

Laravel with MySQL is the dominant PHP web framework stack. A proper containerized Laravel deployment separates the web server (Nginx), PHP processor (PHP-FPM), queue worker, and database into individual services.

## Compose Stack

```yaml
services:
  mysql:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: rootpass       # Change this
      MYSQL_DATABASE: laravel
      MYSQL_USER: laravel
      MYSQL_PASSWORD: laravelpass         # Change this
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    # Used for caching, sessions, and queues

  php-fpm:
    image: php:8.3-fpm-alpine
    restart: unless-stopped
    depends_on:
      - mysql
      - redis
    environment:
      DB_CONNECTION: mysql
      DB_HOST: mysql
      DB_PORT: 3306
      DB_DATABASE: laravel
      DB_USERNAME: laravel
      DB_PASSWORD: laravelpass
      REDIS_HOST: redis
      APP_KEY: base64:changeme=           # Run: php artisan key:generate
      APP_ENV: production
      APP_DEBUG: "false"
    volumes:
      - ./app:/var/www/html
    working_dir: /var/www/html
    # Install required extensions + Composer, run migrations, then start PHP-FPM.
    # For real deployments, bake these steps into a custom Dockerfile instead.
    command: >
      sh -c "apk add --no-cache git unzip curl &&
             docker-php-ext-install pdo_mysql &&
             curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer &&
             composer install --no-dev --no-interaction &&
             php artisan migrate --force &&
             php artisan config:cache &&
             exec php-fpm"

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    depends_on:
      - php-fpm
    ports:
      - "8091:80"
    volumes:
      - ./app:/var/www/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro

  worker:
    image: php:8.3-fpm-alpine
    restart: unless-stopped
    depends_on:
      - mysql
      - redis
    environment:
      # Same env vars as php-fpm
      DB_HOST: mysql
      REDIS_HOST: redis
    volumes:
      - ./app:/var/www/html
    working_dir: /var/www/html
    # Install pdo_mysql, then process queue jobs continuously.
    # The vendor directory is shared with php-fpm via the bind mount.
    command: >
      sh -c "docker-php-ext-install pdo_mysql &&
             exec php artisan queue:work --tries=3"

volumes:
  mysql_data:
```

## Nginx Configuration for Laravel

```nginx
# nginx.conf

server {
    listen 80;
    root /var/www/html/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass php-fpm:9000;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

## Monitoring

Use OneUptime to monitor `http://<host>:8091` for HTTP 200. For deeper health checks, create a `/health` route in Laravel that verifies database connectivity and cache availability.
