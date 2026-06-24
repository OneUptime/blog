# How to Self-Host a File Sync Service with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Self-Hosted, Nextcloud, File Sync, Cloud Storage

Description: Deploy Nextcloud as a self-hosted Dropbox/Google Drive alternative using Portainer with automatic SSL and mobile sync support.

## Introduction

Nextcloud is the most popular self-hosted file sync and share platform. It offers file storage, calendar, contacts, video calls, and hundreds of apps - all running on your own infrastructure. This guide covers deploying a production-ready Nextcloud instance using Portainer.

## Prerequisites

- Portainer installed and running
- At least 2GB RAM (4GB recommended)
- Sufficient storage for files
- A domain name and reverse proxy such as Traefik for automatic SSL (or remove the Traefik labels and HTTPS-specific settings for local-only access)

## Step 1: Prepare Storage

```bash
# Create Nextcloud config and app directories

sudo mkdir -p /opt/nextcloud/{config,apps}
sudo chown -R www-data:www-data /opt/nextcloud
sudo chmod -R 750 /opt/nextcloud

# Create the main data directory on your large disk
sudo mkdir -p /mnt/data/nextcloud
sudo chown -R www-data:www-data /mnt/data/nextcloud
sudo chmod -R 750 /mnt/data/nextcloud
```

## Step 2: Deploy Nextcloud Stack in Portainer

```yaml
# docker-compose.yml - Nextcloud with PostgreSQL and Redis
version: "3.8"

networks:
  nextcloud_network:
    driver: bridge

volumes:
  nextcloud_db:
  nextcloud_redis:

services:
  # PostgreSQL database
  nextcloud_db:
    image: postgres:15-alpine
    container_name: nextcloud_db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=nextcloud
      - POSTGRES_USER=nextcloud
      - POSTGRES_PASSWORD=secure_db_password
    volumes:
      - nextcloud_db:/var/lib/postgresql/data
    networks:
      - nextcloud_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nextcloud"]
      interval: 10s
      retries: 5

  # Redis for caching and file locking
  nextcloud_redis:
    image: redis:7-alpine
    container_name: nextcloud_redis
    restart: unless-stopped
    command: redis-server --requirepass redis_password_here
    volumes:
      - nextcloud_redis:/data
    networks:
      - nextcloud_network
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "redis_password_here", "ping"]
      interval: 10s
      retries: 5

  # Nextcloud application
  nextcloud:
    image: nextcloud:33-apache
    container_name: nextcloud
    restart: unless-stopped
    depends_on:
      nextcloud_db:
        condition: service_healthy
      nextcloud_redis:
        condition: service_healthy
    ports:
      - "8080:80"
    environment:
      # Database configuration
      - POSTGRES_HOST=nextcloud_db
      - POSTGRES_DB=nextcloud
      - POSTGRES_USER=nextcloud
      - POSTGRES_PASSWORD=secure_db_password

      # Admin user setup
      - NEXTCLOUD_ADMIN_USER=admin
      - NEXTCLOUD_ADMIN_PASSWORD=change_this_immediately

      # Trusted domains (your server IP and domain)
      - NEXTCLOUD_TRUSTED_DOMAINS=cloud.yourdomain.com 192.168.1.100

      # Reverse proxy settings for HTTPS deployments (adjust TRUSTED_PROXIES to your proxy network)
      - TRUSTED_PROXIES=172.16.0.0/12
      - OVERWRITEPROTOCOL=https

      # Redis configuration
      - REDIS_HOST=nextcloud_redis
      - REDIS_HOST_PORT=6379
      - REDIS_HOST_PASSWORD=redis_password_here

      # PHP settings
      - PHP_MEMORY_LIMIT=1024M
      - PHP_UPLOAD_LIMIT=10G
      - APACHE_BODY_LIMIT=10737418240

      # SMTP configuration
      - SMTP_HOST=smtp.gmail.com
      - SMTP_SECURE=ssl
      - SMTP_PORT=465
      - SMTP_NAME=your-email@gmail.com
      - SMTP_PASSWORD=your-app-password
      - MAIL_FROM_ADDRESS=nextcloud
      - MAIL_DOMAIN=yourdomain.com
    volumes:
      # Nextcloud app files
      - /opt/nextcloud/config:/var/www/html/config
      - /opt/nextcloud/apps:/var/www/html/custom_apps
      # User data storage (use large disk here)
      - /mnt/data/nextcloud:/var/www/html/data
    networks:
      - nextcloud_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.nextcloud.rule=Host(`cloud.yourdomain.com`)"
      - "traefik.http.routers.nextcloud.entrypoints=websecure"
      - "traefik.http.routers.nextcloud.tls.certresolver=letsencrypt"
      - "traefik.http.routers.nextcloud.middlewares=nextcloud-dav@docker"
      - "traefik.http.services.nextcloud.loadbalancer.server.port=80"
      # Nextcloud CalDAV/CardDAV redirects
      - "traefik.http.middlewares.nextcloud-dav.redirectregex.regex=https://(.*)/.well-known/(?:card|cal)dav"
      - "traefik.http.middlewares.nextcloud-dav.redirectregex.replacement=https://$${1}/remote.php/dav"
      - "traefik.http.middlewares.nextcloud-dav.redirectregex.permanent=true"

  # Nextcloud Cron job for background tasks
  nextcloud_cron:
    image: nextcloud:33-apache
    container_name: nextcloud_cron
    restart: unless-stopped
    depends_on:
      - nextcloud
    entrypoint: /cron.sh
    volumes:
      - /opt/nextcloud/config:/var/www/html/config
      - /opt/nextcloud/apps:/var/www/html/custom_apps
      - /mnt/data/nextcloud:/var/www/html/data
    networks:
      - nextcloud_network
```

## Step 3: Post-Deployment Optimization

```bash
# Run Nextcloud maintenance commands
docker exec -u www-data nextcloud php occ maintenance:mode --on

# Add missing indices
docker exec -u www-data nextcloud php occ db:add-missing-indices

# Convert database columns
docker exec -u www-data nextcloud php occ db:convert-filecache-bigint

# Turn off maintenance mode
docker exec -u www-data nextcloud php occ maintenance:mode --off

# Set background job to cron
docker exec -u www-data nextcloud php occ background:cron
```

## Step 4: Configure Nextcloud for Performance

```bash
# Enable APCu for memory caching
docker exec -u www-data nextcloud php occ config:system:set \
  memcache.local --value='\OC\Memcache\APCu'

# Configure Redis for file locking
docker exec -u www-data nextcloud php occ config:system:set \
  memcache.locking --value='\OC\Memcache\Redis'

# Set default phone region
docker exec -u www-data nextcloud php occ config:system:set \
  default_phone_region --value='US'
```

## Step 5: Set Up Mobile Sync

### iOS (Files App Integration)
1. Install Nextcloud app from App Store
2. Enter your server URL: `https://cloud.yourdomain.com`
3. Log in with your credentials
4. Enable **Files** > **Auto Upload** for photos

### Android
1. Install Nextcloud app from Google Play
2. Enter server URL and credentials
3. Configure auto-upload under **Settings** > **Auto Upload**

## Step 6: Set Up External Storage

```bash
# Mount external S3 storage in Nextcloud
docker exec -u www-data nextcloud php occ app:enable files_external

# Add S3 storage via config
docker exec -u www-data nextcloud php occ files_external:create \
  /S3-Storage \
  amazons3 \
  builtin::builtin \
  --user admin \
  --config bucket=my-nextcloud-bucket \
  --config region=us-east-1 \
  --config key=ACCESS_KEY_ID \
  --config secret=SECRET_ACCESS_KEY
```

## Backup Strategy

```bash
#!/bin/bash
# backup-nextcloud.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/nextcloud"
mkdir -p "$BACKUP_DIR"

# Enable maintenance mode
docker exec -u www-data nextcloud php occ maintenance:mode --on

# Backup database
docker exec nextcloud_db pg_dump -U nextcloud nextcloud | \
  gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Backup config and custom apps
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" /opt/nextcloud/config
tar -czf "$BACKUP_DIR/apps_$DATE.tar.gz" /opt/nextcloud/apps

# Backup user data
tar -czf "$BACKUP_DIR/data_$DATE.tar.gz" /mnt/data/nextcloud

# Disable maintenance mode
docker exec -u www-data nextcloud php occ maintenance:mode --off

# Rotate backups (keep 14 days)
find "$BACKUP_DIR" -mtime +14 -delete
echo "Nextcloud backup completed: $DATE"
```

## Conclusion

You now have a fully functional self-hosted cloud storage platform powered by Nextcloud and Portainer. Your files sync seamlessly across desktop and mobile devices while remaining entirely under your control. The PostgreSQL database and Redis cache ensure excellent performance even with many users. Remember to keep Nextcloud updated via Portainer's image update feature and maintain regular backups of both the database and user data.
