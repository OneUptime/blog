# How to Deploy a LAMP Stack via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, LAMP, Apache, MySQL, PHP, Docker Compose, Web Development

Description: Deploy a complete LAMP (Linux, Apache, MySQL, PHP) stack using Docker Compose through Portainer, with persistent storage, PHP configuration, and phpMyAdmin for database management.

## Introduction

The LAMP stack (Linux, Apache, MySQL, PHP) is one of the most widely deployed web application environments. Using Portainer and Docker Compose, you can spin up a complete, isolated LAMP environment in minutes with persistent data volumes and a web-based database manager. This guide walks through deploying LAMP via Portainer Stacks.

## Prerequisites

- Portainer BE installed and running
- Docker Engine 20.10+
- At least 1 GB of available RAM

## Step 1: Open Stacks in Portainer

Navigate to your Portainer environment and go to **Stacks** → **Add Stack** → **Git Repository**. Name the stack `lamp`, point Portainer at the repository that contains your compose file and supporting `www`, `apache`, `mysql/init`, and `docker/php` directories, and enable **Relative path volumes**.

## Step 2: Write the Docker Compose File

Store the following compose file in your repository and point Portainer at it:

```yaml
version: "3.8"

services:
  # Apache + PHP web server
  web:
    image: php:8.2-apache
    container_name: lamp-web
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - ./www:/var/www/html          # Application files
      - ./apache/vhost.conf:/etc/apache2/sites-available/000-default.conf
    environment:
      MYSQL_HOST: db
      MYSQL_DATABASE: lampapp
      MYSQL_USER: lampuser
      MYSQL_PASSWORD: lamppassword
    depends_on:
      - db
    networks:
      - lamp-net

  # MySQL database
  db:
    image: mysql:8.0
    container_name: lamp-db
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_ROOT_HOST: "%"
      MYSQL_DATABASE: lampapp
      MYSQL_USER: lampuser
      MYSQL_PASSWORD: lamppassword
    volumes:
      - db_data:/var/lib/mysql
      - ./mysql/init:/docker-entrypoint-initdb.d  # SQL init scripts
    networks:
      - lamp-net

  # phpMyAdmin for database management
  phpmyadmin:
    image: phpmyadmin/phpmyadmin:latest
    container_name: lamp-phpmyadmin
    restart: unless-stopped
    ports:
      - "8081:80"
    environment:
      PMA_HOST: db
      PMA_PORT: 3306
      PMA_USER: root
      PMA_PASSWORD: rootpassword
    depends_on:
      - db
    networks:
      - lamp-net

volumes:
  db_data:
    driver: local

networks:
  lamp-net:
    driver: bridge
```

## Step 3: Configure PHP Extensions

The base `php:8.2-apache` image does not include `pdo_mysql`, which the test app below needs. Update the `web` service to use a custom Dockerfile or another image that already includes the required extensions. If Portainer is connected to a remote Docker environment, build this image outside Portainer and replace the `build:` block with an `image:` reference, because Portainer does not execute Compose `build:` steps for remote environments:

```yaml
# Update the web service from Step 2

  web:
    build:
      context: ./docker/php
      dockerfile: Dockerfile
    # rest of config...
```

```dockerfile
# docker/php/Dockerfile
FROM php:8.2-apache

# Install common PHP extensions
RUN docker-php-ext-install pdo_mysql mysqli

# Install additional extensions via pecl
RUN pecl install redis-6.3.0 && docker-php-ext-enable redis

# Enable Apache modules and the default SSL site
RUN a2enmod rewrite headers ssl && a2ensite default-ssl

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- \
    --install-dir=/usr/local/bin --filename=composer
```

## Step 4: Create Apache Virtual Host Config

```apache
# apache/vhost.conf
<VirtualHost *:80>
    ServerAdmin webmaster@localhost
    DocumentRoot /var/www/html

    <Directory /var/www/html>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Enable .htaccess rewrites (required for frameworks like Laravel)
    <IfModule mod_rewrite.c>
        RewriteEngine On
    </IfModule>

    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
```

## Step 5: Create a Test PHP Application

```php
<?php
// www/index.php - test connectivity to MySQL

$host = getenv('MYSQL_HOST') ?: 'db';
$dbname = getenv('MYSQL_DATABASE') ?: 'lampapp';
$user = getenv('MYSQL_USER') ?: 'lampuser';
$password = getenv('MYSQL_PASSWORD') ?: 'lamppassword';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "<h1>LAMP Stack Running</h1>";
    echo "<p>Connected to MySQL successfully!</p>";
    echo "<p>PHP Version: " . phpversion() . "</p>";
} catch (PDOException $e) {
    echo "<h1>Connection failed: " . $e->getMessage() . "</h1>";
}
?>
```

## Step 6: Deploy and Verify

```bash
# After clicking Deploy in Portainer:

# Verify containers are running
docker ps | grep lamp

# Test the web application
curl http://localhost:8080

# Access phpMyAdmin at http://localhost:8081
# Login: root / rootpassword

# Check PHP info
curl http://localhost:8080/phpinfo.php  # if you created one

# View MySQL logs from Portainer:
# Containers → lamp-db → Logs

# Connect to MySQL CLI
docker exec -it lamp-db mysql -u lampuser -plamppassword lampapp
```

## Step 7: Set Environment Variables via Portainer UI

Instead of hardcoding credentials, use Portainer's environment variable feature before the first deployment:

1. In the Stack editor, add **Environment Variables**:
   - `MYSQL_ROOT_PASSWORD` → `your-root-password`
   - `MYSQL_PASSWORD` → `your-app-password`

2. Reference them in the compose file:

```yaml
  web:
    environment:
      MYSQL_HOST: db
      MYSQL_DATABASE: lampapp
      MYSQL_USER: lampuser
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}

  db:
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_ROOT_HOST: "%"
      MYSQL_DATABASE: lampapp
      MYSQL_USER: lampuser
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
```

These variables are only used when the MySQL data directory is initialized. If `db_data` already contains a database, changing them later in Portainer will not rotate existing MySQL credentials.

## Step 8: Enable HTTPS with a Self-Signed Certificate

If you're using the custom image from Step 3, you can add HTTPS with a self-signed certificate:

```yaml
  # Add to the web service
  web:
    ports:
      - "8080:80"
      - "8443:443"
    volumes:
      - ./ssl:/etc/apache2/ssl  # Place cert.pem and key.pem here
      - ./apache/ssl-vhost.conf:/etc/apache2/sites-available/default-ssl.conf
```

```apache
# apache/ssl-vhost.conf
<VirtualHost *:443>
    DocumentRoot /var/www/html
    SSLEngine on
    SSLCertificateFile /etc/apache2/ssl/cert.pem
    SSLCertificateKeyFile /etc/apache2/ssl/key.pem

    <Directory /var/www/html>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

## Conclusion

Deploying a LAMP stack via Portainer gives you a self-contained, reproducible development or production environment with MySQL data persisted in named volumes. phpMyAdmin is included for easy database administration through the browser. For production deployments, move credentials to Portainer's environment variable store or Docker secrets, configure proper SSL certificates, and restrict phpMyAdmin's network access. The containerized LAMP stack is easily updated by redeploying the stack with updated image tags.
