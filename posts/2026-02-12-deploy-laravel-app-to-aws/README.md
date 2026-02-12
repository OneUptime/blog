# How to Deploy a Laravel App to AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Laravel, PHP, Deployment, Elastic Beanstalk

Description: Step-by-step guide to deploying Laravel PHP applications on AWS with Elastic Beanstalk, ECS, and proper configuration for queues, caching, and file storage.

---

Laravel is the most popular PHP framework, and deploying it to AWS gives you access to managed databases, caching, storage, and scaling without running your own servers. The deployment story for Laravel on AWS has gotten significantly better over the years, with several solid approaches depending on your needs.

## Preparing Your Laravel App

Make sure your Laravel app is ready for production. Update your `.env.production` or set environment variables on the server.

Key production settings in your config files:

```php
// config/app.php - ensure these are set via env vars
'env' => env('APP_ENV', 'production'),
'debug' => env('APP_DEBUG', false),
'url' => env('APP_URL', 'https://yourapp.com'),
```

Configure your database connection for RDS:

```php
// config/database.php
'pgsql' => [
    'driver' => 'pgsql',
    'host' => env('DB_HOST', '127.0.0.1'),
    'port' => env('DB_PORT', '5432'),
    'database' => env('DB_DATABASE', 'forge'),
    'username' => env('DB_USERNAME', 'forge'),
    'password' => env('DB_PASSWORD', ''),
    'charset' => 'utf8',
    'prefix' => '',
    'prefix_indexes' => true,
    'search_path' => 'public',
    'sslmode' => 'prefer',
],
```

Set up caching and sessions to use Redis (via ElastiCache):

```php
// config/cache.php
'redis' => [
    'driver' => 'redis',
    'connection' => 'cache',
    'lock_connection' => 'default',
],

// config/session.php
'driver' => env('SESSION_DRIVER', 'redis'),
'connection' => env('SESSION_CONNECTION', 'default'),
```

## Option 1: Elastic Beanstalk

Elastic Beanstalk supports PHP natively and handles most of the infrastructure setup for you.

### Configuration Files

Create the required EB configuration files. This one installs PHP extensions and sets up the document root:

```yaml
# .ebextensions/01_laravel.config
option_settings:
  aws:elasticbeanstalk:container:php:phpini:
    document_root: /public
    memory_limit: 256M
    max_execution_time: 60
  aws:elasticbeanstalk:application:environment:
    APP_ENV: production
    APP_DEBUG: "false"
    LOG_CHANNEL: stderr
```

Run Laravel-specific setup commands after deployment:

```yaml
# .platform/hooks/postdeploy/01_laravel_setup.sh
#!/bin/bash
cd /var/app/current

# Generate optimized class loader
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run database migrations
php artisan migrate --force

# Set storage permissions
chmod -R 775 storage bootstrap/cache
chown -R webapp:webapp storage bootstrap/cache
```

Make sure to give the script executable permissions:

```bash
chmod +x .platform/hooks/postdeploy/01_laravel_setup.sh
```

### Composer Configuration

Tell Elastic Beanstalk how to install Composer dependencies:

```json
{
    "scripts": {
        "post-autoload-dump": [
            "Illuminate\\Foundation\\ComposerScripts::postAutoloadDump",
            "@php artisan package:discover --ansi"
        ]
    }
}
```

### Deploy

```bash
# Install EB CLI
pip install awsebcli

# Initialize the project
eb init -p php-8.2 my-laravel-app --region us-east-1

# Create an environment with an RDS database
eb create laravel-prod \
  --instance_type t3.medium \
  --database.engine postgres \
  --database.instance db.t3.micro

# Deploy
eb deploy
```

## Option 2: Docker on ECS

For more control and reproducible environments, containerize your Laravel app.

Create a multi-stage Dockerfile:

```dockerfile
# Dockerfile
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

FROM node:20-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM php:8.2-fpm-alpine AS app

# Install PHP extensions
RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    && docker-php-ext-install \
    pdo_pgsql \
    zip \
    opcache \
    pcntl

# Configure PHP for production
COPY docker/php/php-production.ini /usr/local/etc/php/conf.d/production.ini

WORKDIR /var/www/html

# Copy application code
COPY . .
COPY --from=vendor /app/vendor ./vendor
COPY --from=frontend /app/public/build ./public/build

# Generate optimized autoloader
RUN composer dump-autoload --optimize

# Cache configuration
RUN php artisan config:cache && \
    php artisan route:cache && \
    php artisan view:cache

# Set permissions
RUN chown -R www-data:www-data storage bootstrap/cache

EXPOSE 9000

CMD ["php-fpm"]
```

You'll also need an Nginx container to serve as the web server. Create a separate Nginx config:

```nginx
# docker/nginx/default.conf
server {
    listen 80;
    server_name _;
    root /var/www/html/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

### ECS Task Definition

Run both PHP-FPM and Nginx in the same task:

```json
{
  "family": "laravel-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "php-fpm",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/laravel-app:latest",
      "essential": true,
      "secrets": [
        {
          "name": "APP_KEY",
          "valueFrom": "arn:aws:ssm:us-east-1:ACCOUNT_ID:parameter/laravel/app-key"
        },
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:ssm:us-east-1:ACCOUNT_ID:parameter/laravel/db-password"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/laravel-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "php"
        }
      }
    },
    {
      "name": "nginx",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/laravel-nginx:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 80,
          "protocol": "tcp"
        }
      ],
      "dependsOn": [
        {
          "containerName": "php-fpm",
          "condition": "START"
        }
      ]
    }
  ]
}
```

## Queue Workers

Laravel's queue system is essential for background processing. Use SQS as the queue driver and run workers as separate ECS tasks.

Configure SQS in your Laravel config:

```php
// config/queue.php
'sqs' => [
    'driver' => 'sqs',
    'key' => env('AWS_ACCESS_KEY_ID'),
    'secret' => env('AWS_SECRET_ACCESS_KEY'),
    'prefix' => env('SQS_PREFIX', 'https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID'),
    'queue' => env('SQS_QUEUE', 'laravel-jobs'),
    'suffix' => env('SQS_SUFFIX'),
    'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
],
```

Create a queue worker service:

```bash
aws ecs create-service \
  --cluster laravel-cluster \
  --service-name laravel-worker \
  --task-definition laravel-worker \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx]}"
```

## File Storage with S3

Configure Laravel's filesystem to use S3:

```php
// config/filesystems.php
's3' => [
    'driver' => 's3',
    'key' => env('AWS_ACCESS_KEY_ID'),
    'secret' => env('AWS_SECRET_ACCESS_KEY'),
    'region' => env('AWS_DEFAULT_REGION'),
    'bucket' => env('AWS_BUCKET'),
    'url' => env('AWS_URL'),
],
```

## Health Check

Add a health check endpoint:

```php
// routes/web.php
Route::get('/health', function () {
    try {
        DB::connection()->getPdo();
        return response()->json([
            'status' => 'healthy',
            'timestamp' => now()->toIso8601String(),
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'unhealthy',
            'error' => $e->getMessage(),
        ], 503);
    }
});
```

## Monitoring

Laravel logs integrate well with CloudWatch when you set `LOG_CHANNEL=stderr`. For production monitoring that goes beyond logs, consider adding [external uptime monitoring](https://oneuptime.com/blog/post/aws-monitoring-tools-comparison/view) and alerting.

## Summary

Laravel on AWS is a proven combination. Elastic Beanstalk gives you the fastest path to production with minimal configuration. ECS with Docker gives you reproducible builds and better isolation. Either way, make sure you've got your database, cache, queue, and file storage configured properly before going live. And always run your migrations as part of your deployment pipeline rather than manually.
