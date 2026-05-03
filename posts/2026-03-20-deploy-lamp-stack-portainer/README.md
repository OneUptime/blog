# How to Deploy a LAMP Stack via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, LAMP, PHP, Apache, MySQL, Docker Compose, Self-Hosting

Description: Learn how to deploy a full LAMP stack (Linux, Apache, MySQL, PHP) via Portainer using Docker Compose, with persistent database storage and PHP configuration.

---

The LAMP stack (Linux, Apache, MySQL, PHP) is the foundation of millions of web applications including WordPress, Drupal, and many custom PHP apps. Portainer makes deploying and managing the multi-container stack straightforward.

## Compose Stack

```yaml
version: "3.8"

services:
  mysql:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: rootpass      # Change this
      MYSQL_DATABASE: myapp
      MYSQL_USER: myapp
      MYSQL_PASSWORD: myapppass          # Change this
    volumes:
      - mysql_data:/var/lib/mysql

  php-apache:
    # Build a custom image based on php:8.2-apache with PDO MySQL installed
    image: lamp-php-apache:latest
    build:
      context: .
      dockerfile: Dockerfile.php
    restart: unless-stopped
    depends_on:
      - mysql
    ports:
      - "8090:80"
    volumes:
      # Mount your PHP application code
      - ./app:/var/www/html

volumes:
  mysql_data:
```

## Custom PHP Dockerfile

Create `Dockerfile.php` to add MySQL extension support:

```dockerfile
FROM php:8.2-apache

# Install PDO MySQL and other common extensions

RUN docker-php-ext-install pdo pdo_mysql mysqli

# Enable Apache mod_rewrite for clean URLs
RUN a2enmod rewrite

# Set document root permissions
RUN chown -R www-data:www-data /var/www/html
```

## Testing the Connection

Create a simple `app/index.php` to verify the database connection:

```php
<?php
// Test PHP-MySQL connectivity
$pdo = new PDO(
    'mysql:host=mysql;dbname=myapp',
    'myapp',
    'myapppass'
);

$stmt = $pdo->query('SELECT VERSION() AS version');
$row = $stmt->fetch();
echo "Connected to MySQL " . $row['version'];
```

## Deploying

1. In Portainer go to **Stacks > Add Stack**.
2. Name it `lamp`.
3. Paste the YAML and click **Deploy the stack**.
4. Open `http://<host>:8090` to see your PHP application.

## Monitoring

Use OneUptime to monitor `http://<host>:8090` for HTTP 200. Alert on any downtime to catch Apache crashes or MySQL connection failures before users do.
