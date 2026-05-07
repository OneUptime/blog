# How to Set Up a LAMP Stack with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, LAMP, Linux, Apache, MySQL, PHP

Description: Step-by-step guide to setting up a complete LAMP (Linux, Apache, MySQL, PHP) development stack using Podman containers and pods.

---

> Podman pods let you run a full LAMP stack where Apache/PHP and MySQL share a network namespace, closely mimicking how these services interact in production.

The LAMP stack (Linux, Apache, MySQL, PHP) remains a widely used platform for web applications. Running it in containers with Podman gives you an isolated, reproducible development environment that you can start and stop in seconds. This post walks through setting up a complete LAMP stack using Podman, including Apache with PHP, MySQL, and phpMyAdmin for database management.

---

## Architecture Overview

We will create three containers grouped in a Podman pod:

1. **Apache + PHP** - Serves the PHP application
2. **MySQL** - The relational database
3. **phpMyAdmin** - Web-based database management tool

All three containers share the same network namespace through the pod, meaning they can reach each other via `localhost`.

## Creating the Pod

Start by creating a pod that publishes all the ports you need:

```bash
# Create the LAMP pod with port mappings

podman pod create \
  --name lamp-stack \
  -p 8080:80 \
  -p 3306:3306 \
  -p 8081:8081
```

Port 8080 will serve the PHP application, port 3306 exposes MySQL for external tools, and port 8081 will be used for phpMyAdmin.

## Setting Up MySQL

Start the MySQL container inside the pod:

```bash
# Create a volume for MySQL data persistence
podman volume create lamp-mysql-data

# Run MySQL inside the pod
podman run -d \
  --pod lamp-stack \
  --name lamp-mysql \
  -e MYSQL_ROOT_PASSWORD=rootpassword \
  -e MYSQL_DATABASE=myapp \
  -e MYSQL_USER=appuser \
  -e MYSQL_PASSWORD=apppassword \
  -v lamp-mysql-data:/var/lib/mysql:Z \
  mysql:8

# Wait for MySQL to initialize, then verify
sleep 10
podman exec lamp-mysql mysql -u appuser -papppassword -e "SHOW DATABASES;"
```

## Building the Apache + PHP Image

Create a custom image that includes Apache, PHP, and the MySQL extension. Start by creating a project directory:

```bash
mkdir -p lamp-project/src
mkdir -p lamp-project/apache-conf
```

Create the Containerfile:

```dockerfile
# lamp-project/Containerfile
FROM php:8.3-apache

# Install PHP extensions for MySQL
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Enable Apache modules
RUN a2enmod rewrite headers

# Configure Apache to allow .htaccess overrides
RUN sed -i 's/AllowOverride None/AllowOverride All/g' \
    /etc/apache2/apache2.conf

# Set the document root
ENV APACHE_DOCUMENT_ROOT=/var/www/html

# Install additional useful tools for development
RUN apt-get update && apt-get install -y \
    unzip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Composer for PHP dependency management
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
```

Create a sample PHP application:

```php
<?php
// lamp-project/src/index.php

// Database connection settings
// Since containers are in the same pod, MySQL is on localhost
$host = '127.0.0.1';
$dbname = 'myapp';
$username = 'appuser';
$password = 'apppassword';

echo "<h1>LAMP Stack on Podman</h1>";

// Test database connection
try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    echo "<p style='color: green;'>Database connection successful.</p>";

    // Show server information
    $stmt = $pdo->query("SELECT VERSION() as version");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "<p>MySQL Version: " . htmlspecialchars($row['version']) . "</p>";
    echo "<p>PHP Version: " . phpversion() . "</p>";
    echo "<p>Server Software: " . $_SERVER['SERVER_SOFTWARE'] . "</p>";

} catch (PDOException $e) {
    echo "<p style='color: red;'>Connection failed: "
         . htmlspecialchars($e->getMessage()) . "</p>";
}
?>
```

Create a more complete application with CRUD operations:

```php
<?php
// lamp-project/src/api.php

header('Content-Type: application/json');

$host = '127.0.0.1';
$dbname = 'myapp';
$username = 'appuser';
$password = 'apppassword';

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    // Create the table if it does not exist
    $pdo->exec("CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            // List all tasks
            $stmt = $pdo->query("SELECT * FROM tasks ORDER BY created_at DESC");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'POST':
            // Create a new task
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("INSERT INTO tasks (title) VALUES (:title)");
            $stmt->execute(['title' => $data['title']]);
            echo json_encode([
                'id' => $pdo->lastInsertId(),
                'message' => 'Task created'
            ]);
            break;

        case 'PUT':
            // Toggle task completion
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare(
                "UPDATE tasks SET completed = NOT completed WHERE id = :id"
            );
            $stmt->execute(['id' => $data['id']]);
            echo json_encode(['message' => 'Task updated']);
            break;

        case 'DELETE':
            // Delete a task
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("DELETE FROM tasks WHERE id = :id");
            $stmt->execute(['id' => $data['id']]);
            echo json_encode(['message' => 'Task deleted']);
            break;
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
```

## Building and Running Apache + PHP

Build the image and start the container:

```bash
# Build the Apache + PHP image
cd lamp-project
podman build -t lamp-php -f Containerfile .

# Run Apache + PHP inside the pod
podman run -d \
  --pod lamp-stack \
  --name lamp-apache \
  -v ./src:/var/www/html:Z \
  lamp-php
```

Visit `http://localhost:8080` to see the PHP application. The page should display a successful database connection message along with version information.

## Adding phpMyAdmin

phpMyAdmin provides a web interface for managing your MySQL databases:

```bash
# Run phpMyAdmin inside the pod
podman run -d \
  --pod lamp-stack \
  --name lamp-phpmyadmin \
  -e PMA_HOST=127.0.0.1 \
  -e PMA_PORT=3306 \
  -e APACHE_PORT=8081 \
  phpmyadmin:latest
```

Access phpMyAdmin at `http://localhost:8081` and log in with the MySQL credentials (`appuser` / `apppassword`).

## Adding an .htaccess File for Clean URLs

Create an `.htaccess` file for Apache URL rewriting:

```apache
# lamp-project/src/.htaccess
RewriteEngine On

# Redirect everything except existing files to index.php
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php?route=$1 [QSA,L]

# Security headers
Header set X-Content-Type-Options "nosniff"
Header set X-Frame-Options "DENY"
Header set X-XSS-Protection "1; mode=block"
```

## Creating a Management Script

Wrap all of these commands into a script for easy management:

```bash
#!/bin/bash
# lamp.sh - Manage the LAMP stack

ACTION=${1:-help}

start() {
    echo "Starting LAMP stack..."

    # Create the pod
    podman pod create \
      --name lamp-stack \
      -p 8080:80 \
      -p 3306:3306 \
      -p 8081:8081 \
      2>/dev/null

    # Start MySQL
    podman run -d --pod lamp-stack --name lamp-mysql \
      -e MYSQL_ROOT_PASSWORD=rootpassword \
      -e MYSQL_DATABASE=myapp \
      -e MYSQL_USER=appuser \
      -e MYSQL_PASSWORD=apppassword \
      -v lamp-mysql-data:/var/lib/mysql:Z \
      mysql:8

    # Wait for MySQL
    echo "Waiting for MySQL..."
    sleep 10

    # Start Apache + PHP
    podman run -d --pod lamp-stack --name lamp-apache \
      -v ./src:/var/www/html:Z \
      lamp-php

    # Start phpMyAdmin
    podman run -d --pod lamp-stack --name lamp-phpmyadmin \
      -e PMA_HOST=127.0.0.1 \
      -e PMA_PORT=3306 \
      -e APACHE_PORT=8081 \
      phpmyadmin:latest

    echo "LAMP stack is running:"
    echo "  Application: http://localhost:8080"
    echo "  phpMyAdmin:  http://localhost:8081"
    echo "  MySQL:       localhost:3306"
}

stop() {
    echo "Stopping LAMP stack..."
    podman pod stop lamp-stack
    podman pod rm lamp-stack
    echo "LAMP stack stopped."
}

logs() {
    podman logs -f lamp-apache
}

case "$ACTION" in
  start) start ;;
  stop) stop ;;
  logs) logs ;;
  restart) stop; start ;;
  *) echo "Usage: $0 {start|stop|restart|logs}" ;;
esac
```

Make the script executable:

```bash
chmod +x lamp.sh
```

## Testing the API

With the stack running, test the CRUD API:

```bash
# Create a task
curl -X POST http://localhost:8080/api.php \
  -H "Content-Type: application/json" \
  -d '{"title": "Set up Podman LAMP stack"}'

# List all tasks
curl http://localhost:8080/api.php

# Toggle task completion
curl -X PUT http://localhost:8080/api.php \
  -H "Content-Type: application/json" \
  -d '{"id": 1}'

# Delete a task
curl -X DELETE http://localhost:8080/api.php \
  -H "Content-Type: application/json" \
  -d '{"id": 1}'
```

## Conclusion

Running a LAMP stack with Podman pods gives you an isolated development environment where Apache, PHP, and MySQL communicate over localhost, just as they often do in traditional server setups. The pod abstraction groups the containers together and shares the network namespace, making the setup simple and predictable. Named volumes persist your database data, and phpMyAdmin provides a visual interface for database management. The management script lets you start, stop, and restart the entire stack with a single command.
