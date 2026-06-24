# How to Deploy Nextcloud via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Nextcloud, Cloud Storage, Self-Hosted, Privacy

Description: Deploy Nextcloud via Portainer with PostgreSQL, Redis, and an Nginx frontend for a complete self-hosted Google Drive and Docs alternative.

## Introduction

Nextcloud is the leading self-hosted cloud platform providing file storage, calendar, contacts, collaboration, and hundreds of apps. Deploying via Portainer with PostgreSQL and Redis gives you a production-grade installation with good performance.

## Deploy as a Stack

```yaml
version: "3.8"

services:
  nextcloud:
    image: nextcloud:33-apache
    container_name: nextcloud
    environment:
      POSTGRES_HOST: nextcloud-db
      POSTGRES_DB: nextcloud
      POSTGRES_USER: nextcloud
      POSTGRES_PASSWORD: nc_db_password
      NEXTCLOUD_ADMIN_USER: admin
      NEXTCLOUD_ADMIN_PASSWORD: admin_password
      NEXTCLOUD_TRUSTED_DOMAINS: cloud.example.com 192.168.1.100
      REDIS_HOST: nextcloud-redis
      REDIS_HOST_PASSWORD: redis_password
      NEXTCLOUD_UPDATE: 1
    volumes:
      # Nextcloud application files
      - nextcloud_app:/var/www/html
      # User data storage (store on large disk)
      - nextcloud_data:/var/www/html/data
      # Custom PHP configuration
      - ./php.ini:/usr/local/etc/php/conf.d/nextcloud-custom.ini:ro
    ports:
      - "8080:80"
    depends_on:
      - nextcloud-db
      - nextcloud-redis
    restart: unless-stopped

  nextcloud-db:
    image: postgres:16-alpine
    container_name: nextcloud-db
    environment:
      POSTGRES_DB: nextcloud
      POSTGRES_USER: nextcloud
      POSTGRES_PASSWORD: nc_db_password
    volumes:
      - nextcloud_db:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nextcloud"]
      interval: 10s
      timeout: 5s
      retries: 5

  nextcloud-redis:
    image: redis:7-alpine
    container_name: nextcloud-redis
    command: redis-server --requirepass redis_password
    restart: unless-stopped

  # Nextcloud cron job for background tasks
  nextcloud-cron:
    image: nextcloud:33-apache
    container_name: nextcloud-cron
    volumes:
      - nextcloud_app:/var/www/html
      - nextcloud_data:/var/www/html/data
    entrypoint: /cron.sh
    depends_on:
      - nextcloud-db
      - nextcloud-redis
    restart: unless-stopped

volumes:
  nextcloud_app:
  nextcloud_data:
  nextcloud_db:
```

## PHP Configuration

Create `php.ini`:

```ini
; Nextcloud recommended PHP settings
upload_max_filesize = 16G
post_max_size = 16G
memory_limit = 512M
max_execution_time = 300
max_input_time = 300
output_buffering = 0
```

## Running Nextcloud CLI Commands

```bash
# Access Nextcloud container and run occ commands

docker exec -it --user www-data nextcloud php occ status

# Add missing database indexes
docker exec -u www-data nextcloud php occ db:add-missing-indices

# Scan user files
docker exec -u www-data nextcloud php occ files:scan --all

# View the merged runtime config
docker exec -u www-data nextcloud php occ config:list system
```

## Essential Apps to Install

```bash
# Install useful Nextcloud apps via CLI
docker exec -u www-data nextcloud php occ app:install calendar
docker exec -u www-data nextcloud php occ app:install contacts
docker exec -u www-data nextcloud php occ app:install notes
docker exec -u www-data nextcloud php occ app:install tasks
docker exec -u www-data nextcloud php occ app:install onlyoffice  # Document editing
```

## Nextcloud with Traefik

```yaml
services:
  nextcloud:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.nextcloud.rule=Host(`cloud.example.com`)"
      - "traefik.http.routers.nextcloud.entrypoints=websecure"
      - "traefik.http.routers.nextcloud.tls.certresolver=letsencrypt"
      - "traefik.http.routers.nextcloud.middlewares=nextcloud-redirect@docker"
      - "traefik.http.middlewares.nextcloud-redirect.redirectregex.regex=https://(.*)/.well-known/(card|cal)dav"
      - "traefik.http.middlewares.nextcloud-redirect.redirectregex.replacement=https://$${1}/remote.php/dav/"
      - "traefik.http.middlewares.nextcloud-redirect.redirectregex.permanent=true"
```

## Conclusion

Nextcloud deployed via Portainer with PostgreSQL and Redis provides a self-hosted collaboration platform that you control. The background cron container ensures Nextcloud's housekeeping tasks run reliably. With the OnlyOffice or Collabora Office app plus a compatible document server, you get real-time collaborative document editing - all self-hosted.
