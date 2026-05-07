# How to Run Nextcloud in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Nextcloud, Cloud Storage, Self-Hosted, File Sync

Description: Learn how to run Nextcloud in a Podman container for self-hosted file storage, sharing, and collaboration with persistent data.

---

> Nextcloud in Podman gives you a self-hosted cloud storage and collaboration platform that can run in a rootless container with full data ownership.

Nextcloud is a self-hosted productivity platform that provides file storage, sharing, calendars, contacts, and more. Running it in a Podman container lets you deploy your own private cloud with full control over your data. This guide covers setting up Nextcloud with a database backend, persistent storage, and administrative configuration.

---

## Pulling the Nextcloud Image

Download the official Nextcloud image.

```bash
# Pull the latest Nextcloud image

podman pull docker.io/library/nextcloud:latest

# Verify the image
podman images | grep nextcloud
```

## Running a Basic Nextcloud Container

Start Nextcloud with the built-in SQLite database for quick testing.

```bash
# Run Nextcloud in detached mode
podman run -d \
  --name my-nextcloud \
  -p 8080:80 \
  nextcloud:latest

# Check the container is running
podman ps

# Wait for Nextcloud to initialize
sleep 10

# Access Nextcloud
echo "Open http://localhost:8080 in your browser"
echo "Complete the setup wizard to create your admin account"
```

## Running Nextcloud with MariaDB

Set up Nextcloud with MariaDB for better performance.

```bash
# Create a pod for Nextcloud and MariaDB
podman pod create \
  --name nextcloud-pod \
  -p 8081:80

# Create volumes for persistent data
podman volume create nc-db-data
podman volume create nc-data

# Run MariaDB in the pod
podman run -d \
  --pod nextcloud-pod \
  --name nc-mariadb \
  -e MARIADB_ROOT_PASSWORD=root-secret \
  -e MARIADB_DATABASE=nextcloud \
  -e MARIADB_USER=nextcloud \
  -e MARIADB_PASSWORD=nc-secret \
  -v nc-db-data:/var/lib/mysql:Z \
  mariadb:11

# Wait for MariaDB to initialize
sleep 15

# Run Nextcloud connected to MariaDB
podman run -d \
  --pod nextcloud-pod \
  --name nc-app \
  -e MYSQL_DATABASE=nextcloud \
  -e MYSQL_USER=nextcloud \
  -e MYSQL_PASSWORD=nc-secret \
  -e MYSQL_HOST=127.0.0.1 \
  -e NEXTCLOUD_ADMIN_USER=admin \
  -e NEXTCLOUD_ADMIN_PASSWORD=admin-secret \
  -e NEXTCLOUD_TRUSTED_DOMAINS=localhost \
  -v nc-data:/var/www/html:Z \
  nextcloud:latest

# Wait for Nextcloud to complete installation
sleep 20

# Verify Nextcloud is running
curl -s -o /dev/null -w "%{http_code}" http://localhost:8081
```

## Persistent Storage with External Data

Mount separate volumes for user data and configuration.

```bash
# Create separate volumes for different data types
podman volume create nc-html
podman volume create nc-custom-apps
podman volume create nc-config
podman volume create nc-user-data

# Run Nextcloud with granular volume mounts
podman run -d \
  --name nc-granular \
  -p 8082:80 \
  -e SQLITE_DATABASE=nextcloud \
  -e NEXTCLOUD_ADMIN_USER=admin \
  -e NEXTCLOUD_ADMIN_PASSWORD=admin-secret \
  -v nc-html:/var/www/html:Z \
  -v nc-custom-apps:/var/www/html/custom_apps:Z \
  -v nc-config:/var/www/html/config:Z \
  -v nc-user-data:/var/www/html/data:Z \
  nextcloud:latest
```

## Configuring Nextcloud with Environment Variables

Automate the installation with environment variables.

```bash
# Run Nextcloud with full automatic configuration
podman pod create \
  --name nc-configured-pod \
  -p 8084:80

podman volume create nc-configured-db-data
podman volume create nc-configured-data

podman run -d \
  --pod nc-configured-pod \
  --name nc-configured-db \
  -e MARIADB_ROOT_PASSWORD=root-secret \
  -e MARIADB_DATABASE=nextcloud \
  -e MARIADB_USER=nextcloud \
  -e MARIADB_PASSWORD=nc-secret \
  -v nc-configured-db-data:/var/lib/mysql:Z \
  mariadb:11

sleep 15

podman run -d \
  --pod nc-configured-pod \
  --name nc-configured \
  -e MYSQL_DATABASE=nextcloud \
  -e MYSQL_USER=nextcloud \
  -e MYSQL_PASSWORD=nc-secret \
  -e MYSQL_HOST=127.0.0.1 \
  -e NEXTCLOUD_ADMIN_USER=admin \
  -e NEXTCLOUD_ADMIN_PASSWORD=admin-secret \
  -e NEXTCLOUD_TRUSTED_DOMAINS="localhost nextcloud.local" \
  -e SMTP_HOST=smtp.example.com \
  -e SMTP_PORT=587 \
  -e SMTP_SECURE=tls \
  -e SMTP_NAME=nextcloud@example.com \
  -e SMTP_PASSWORD=mail-secret \
  -e MAIL_FROM_ADDRESS=nextcloud \
  -e MAIL_DOMAIN=example.com \
  -v nc-configured-data:/var/www/html:Z \
  nextcloud:latest
```

## Using the Nextcloud OCC Command

Manage Nextcloud from the command line using the occ tool.

```bash
# Check Nextcloud status
podman exec -u www-data nc-app php occ status

# List installed apps
podman exec -u www-data nc-app php occ app:list

# Enable an app
podman exec -u www-data nc-app php occ app:enable calendar

# Add a trusted domain
podman exec -u www-data nc-app php occ config:system:set \
  trusted_domains 2 --value=nextcloud.local

# Run a files scan
podman exec -u www-data nc-app php occ files:scan --all

# Check system configuration
podman exec -u www-data nc-app php occ config:list system

# Set maintenance mode
podman exec -u www-data nc-app php occ maintenance:mode --on

# Turn off maintenance mode
podman exec -u www-data nc-app php occ maintenance:mode --off
```

## Running Nextcloud with Redis Cache

Add Redis caching for improved performance.

```bash
# Create a pod with Nextcloud, MariaDB, and Redis
podman pod create --name nc-full-pod -p 8083:80

podman volume create nc-full-db-data
podman volume create nc-full-data

# Run Redis in the pod
podman run -d \
  --pod nc-full-pod \
  --name nc-redis \
  redis:7 redis-server --requirepass redis-secret

# Run MariaDB in the pod
podman run -d \
  --pod nc-full-pod \
  --name nc-full-db \
  -e MARIADB_ROOT_PASSWORD=root-secret \
  -e MARIADB_DATABASE=nextcloud \
  -e MARIADB_USER=nextcloud \
  -e MARIADB_PASSWORD=nc-secret \
  -v nc-full-db-data:/var/lib/mysql:Z \
  mariadb:11

sleep 15

# Run Nextcloud with Redis caching enabled
podman run -d \
  --pod nc-full-pod \
  --name nc-full-app \
  -e MYSQL_DATABASE=nextcloud \
  -e MYSQL_USER=nextcloud \
  -e MYSQL_PASSWORD=nc-secret \
  -e MYSQL_HOST=127.0.0.1 \
  -e REDIS_HOST=127.0.0.1 \
  -e REDIS_HOST_PASSWORD=redis-secret \
  -e NEXTCLOUD_ADMIN_USER=admin \
  -e NEXTCLOUD_ADMIN_PASSWORD=admin-secret \
  -v nc-full-data:/var/www/html:Z \
  nextcloud:latest
```

## Managing the Containers

Common management operations.

```bash
# View Nextcloud logs
podman logs nc-app

# Stop the pod
podman pod stop nextcloud-pod

# Start the pod
podman pod start nextcloud-pod

# Remove pods and containers
podman pod rm -f nextcloud-pod nc-configured-pod nc-full-pod
podman rm -f my-nextcloud nc-granular

# Clean up volumes
podman volume rm nc-db-data nc-data nc-html nc-custom-apps nc-config nc-user-data nc-configured-db-data nc-configured-data nc-full-db-data nc-full-data
```

## Summary

Running Nextcloud in a Podman container gives you a self-hosted cloud platform with complete data ownership. Podman pods simplify the networking between Nextcloud, its database, and optional Redis cache. Named volumes ensure your files, configuration, and database persist across container restarts. The occ command-line tool provides full administrative control, and environment variables automate the initial setup. Podman's rootless execution adds security to your self-hosted cloud infrastructure.
