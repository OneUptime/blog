# How to Run Magento in Docker for E-Commerce

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Magento, E-Commerce, PHP, MySQL, Elasticsearch, Nginx, Containers, DevOps

Description: A practical guide to running Magento 2 in Docker containers with MySQL, Elasticsearch, and Nginx for local development and production e-commerce deployments.

---

Magento is one of the most feature-rich e-commerce platforms available. It powers hundreds of thousands of online stores worldwide. But setting it up locally has always been painful. PHP version conflicts, Elasticsearch requirements, MySQL tuning, Nginx configuration - the list goes on. Docker solves all of these problems by packaging each service into its own isolated container.

This guide walks you through running a full Magento 2 stack in Docker, from initial setup to production-ready configuration.

## Prerequisites

Before you begin, make sure you have the following installed on your machine:

- Docker Engine 20.10 or later
- Docker Compose v2
- At least 6GB of RAM allocated to Docker (Magento is resource-hungry)
- A Magento account at marketplace.magento.com for authentication keys

You can verify your Docker installation with these commands.

```bash
# Check Docker version and ensure the daemon is running
docker --version
docker compose version
```

## Project Structure

Start by creating a clean project directory with the necessary configuration files.

```bash
# Create the project directory and navigate into it
mkdir magento-docker && cd magento-docker

# Create directories for custom configuration
mkdir -p config/nginx config/php
```

## Docker Compose Configuration

The Magento stack requires several services working together: the PHP application, a web server, a database, a search engine, and a cache layer. Here is the full Docker Compose file.

```yaml
# docker-compose.yml - Full Magento 2 stack
version: "3.8"

services:
  # Nginx serves as the reverse proxy and static file server
  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
    volumes:
      - magento-data:/var/www/html
      - ./config/nginx/default.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - php-fpm
    networks:
      - magento-network

  # PHP-FPM runs the Magento application code
  php-fpm:
    image: magento/magento-cloud-docker-php:8.2-fpm
    volumes:
      - magento-data:/var/www/html
      - ./config/php/php.ini:/usr/local/etc/php/conf.d/custom.ini
    environment:
      - PHP_MEMORY_LIMIT=2G
      - MAGENTO_RUN_MODE=developer
    depends_on:
      mysql:
        condition: service_healthy
      elasticsearch:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - magento-network

  # MySQL stores all Magento data including products, orders, and customers
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: magento_root
      MYSQL_DATABASE: magento
      MYSQL_USER: magento
      MYSQL_PASSWORD: magento_pass
    volumes:
      - mysql-data:/var/lib/mysql
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - magento-network

  # Elasticsearch powers Magento's catalog search functionality
  elasticsearch:
    image: elasticsearch:7.17.15
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    volumes:
      - es-data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 10
    networks:
      - magento-network

  # Redis handles session storage and page caching
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - magento-network

volumes:
  magento-data:
  mysql-data:
  es-data:
  redis-data:

networks:
  magento-network:
    driver: bridge
```

## Nginx Configuration

Magento needs specific Nginx rules for URL rewrites and static file handling. Create the configuration file.

```nginx
# config/nginx/default.conf - Nginx config for Magento 2
upstream fastcgi_backend {
    server php-fpm:9000;
}

server {
    listen 80;
    server_name localhost;

    set $MAGE_ROOT /var/www/html;
    set $MAGE_MODE developer;

    root $MAGE_ROOT/pub;
    index index.php;

    # Handle static files directly
    location /static/ {
        expires max;
        log_not_found off;
        add_header Cache-Control "public";

        location ~* \.(ico|jpg|jpeg|png|gif|svg|js|css|swf|eot|ttf|otf|woff|woff2|html|json)$ {
            expires +1y;
            add_header Cache-Control "public";
        }
    }

    # Route media files
    location /media/ {
        try_files $uri $uri/ /get.php$is_args$args;
    }

    # Pass PHP requests to PHP-FPM
    location ~ \.php$ {
        fastcgi_pass fastcgi_backend;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_buffer_size 128k;
        fastcgi_buffers 4 256k;
        fastcgi_busy_buffers_size 256k;
    }

    # Default location block
    location / {
        try_files $uri $uri/ /index.php$is_args$args;
    }
}
```

## PHP Configuration

Magento requires generous PHP resource limits. Create a custom PHP configuration.

```ini
; config/php/php.ini - Custom PHP settings for Magento
memory_limit = 2G
max_execution_time = 1800
max_input_time = 600
upload_max_filesize = 64M
post_max_size = 64M
zlib.output_compression = On
realpath_cache_size = 10M
realpath_cache_ttl = 7200
opcache.enable = 1
opcache.memory_consumption = 512
opcache.max_accelerated_files = 60000
opcache.validate_timestamps = 1
```

## Starting the Stack

Bring up all the services with Docker Compose.

```bash
# Start all containers in the background
docker compose up -d

# Watch the logs to make sure everything starts correctly
docker compose logs -f
```

Wait for all health checks to pass. You can check the status with this command.

```bash
# Verify all services are healthy and running
docker compose ps
```

## Installing Magento

Once the containers are running, install Magento inside the PHP container. You will need your Magento Marketplace authentication keys for this step.

```bash
# Open a shell inside the PHP-FPM container
docker compose exec php-fpm bash

# Install Magento via Composer (run inside the container)
composer create-project --repository-url=https://repo.magento.com/ \
  magento/project-community-edition=2.4.7 /var/www/html

# Run the Magento setup installer
bin/magento setup:install \
  --base-url=http://localhost \
  --db-host=mysql \
  --db-name=magento \
  --db-user=magento \
  --db-password=magento_pass \
  --admin-firstname=Admin \
  --admin-lastname=User \
  --admin-email=admin@example.com \
  --admin-user=admin \
  --admin-password=Admin123! \
  --language=en_US \
  --currency=USD \
  --timezone=America/New_York \
  --search-engine=elasticsearch7 \
  --elasticsearch-host=elasticsearch \
  --elasticsearch-port=9200 \
  --session-save=redis \
  --session-save-redis-host=redis \
  --session-save-redis-port=6379 \
  --session-save-redis-db=0 \
  --cache-backend=redis \
  --cache-backend-redis-server=redis \
  --cache-backend-redis-port=6379 \
  --cache-backend-redis-db=1
```

## Configuring Redis for Caching

After installation, configure Magento to use Redis for both full-page cache and session storage.

```bash
# Set Redis as the full-page cache backend (run inside the container)
bin/magento setup:config:set \
  --page-cache=redis \
  --page-cache-redis-server=redis \
  --page-cache-redis-port=6379 \
  --page-cache-redis-db=2

# Flush all caches to apply the new configuration
bin/magento cache:flush
```

## Running Cron Jobs

Magento relies on cron jobs for indexing, email sending, and other background tasks. Set up a dedicated cron container or run cron manually.

```bash
# Run Magento cron from the host machine
docker compose exec php-fpm bin/magento cron:run

# Or set up a cron job on your host to run it every minute
# Add this to your crontab with 'crontab -e':
# * * * * * cd /path/to/magento-docker && docker compose exec -T php-fpm bin/magento cron:run
```

## Performance Tuning

For better performance, compile Magento's dependency injection and deploy static content.

```bash
# Compile dependency injection (speeds up class loading)
docker compose exec php-fpm bin/magento setup:di:compile

# Deploy static view files
docker compose exec php-fpm bin/magento setup:static-content:deploy -f

# Reindex all indexers
docker compose exec php-fpm bin/magento indexer:reindex

# Flush the cache after compilation
docker compose exec php-fpm bin/magento cache:flush
```

## Useful Management Commands

Here are some commands you will use regularly when managing your Magento Docker setup.

```bash
# Check Magento system status
docker compose exec php-fpm bin/magento info:adminuri

# Switch to production mode for better performance
docker compose exec php-fpm bin/magento deploy:mode:set production

# Enable a module
docker compose exec php-fpm bin/magento module:enable Vendor_Module

# Upgrade the database schema after installing extensions
docker compose exec php-fpm bin/magento setup:upgrade

# Back up the database
docker compose exec mysql mysqldump -u magento -pmagento_pass magento > backup.sql
```

## Troubleshooting

If Magento shows a blank page or 500 errors, check the logs.

```bash
# Check Magento exception logs
docker compose exec php-fpm tail -f /var/www/html/var/log/exception.log

# Check Nginx error logs
docker compose logs nginx

# Check PHP-FPM logs for memory or timeout issues
docker compose logs php-fpm

# If Elasticsearch is not connecting, verify it is healthy
curl http://localhost:9200/_cluster/health?pretty
```

A common issue is insufficient memory. Make sure Docker Desktop has at least 6GB of RAM allocated in its settings. Magento is a large application and will struggle with anything less.

## Stopping and Cleaning Up

When you are done developing, you can stop or completely remove the stack.

```bash
# Stop all containers but keep data
docker compose stop

# Remove containers but keep volumes (preserves your database and files)
docker compose down

# Remove everything including all data volumes
docker compose down -v
```

## Summary

Running Magento in Docker gives you a reproducible, isolated development environment that closely mirrors production. The stack we built includes Nginx for web serving, PHP-FPM for application processing, MySQL for data storage, Elasticsearch for catalog search, and Redis for caching and sessions. Every team member can spin up the exact same environment in minutes, eliminating "works on my machine" problems entirely.

For production deployments, you should add TLS termination, increase resource limits, enable MySQL replication, and use a container orchestrator like Kubernetes or Docker Swarm.
