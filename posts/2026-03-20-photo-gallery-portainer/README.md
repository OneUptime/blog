# How to Self-Host a Photo Gallery (Immich/PhotoPrism) with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Self-Hosted, Immich, Photoprism, Photo Gallery, Home Lab

Description: Deploy Immich or PhotoPrism as a self-hosted Google Photos alternative using Portainer with AI-powered photo organization.

## Introduction

Self-hosted photo managers let you store, organize, and share your photo library without uploading to Google Photos or iCloud. Both Immich and PhotoPrism offer AI-powered face recognition, automatic categorization, and beautiful browsing interfaces. This guide covers deploying both using Portainer.

## Prerequisites

- Portainer installed and running
- Large storage volume for photos
- At least 6GB RAM (8GB recommended for larger libraries and ML features)
- Optionally: NVIDIA GPU for faster AI processing

## Option 1: Deploy Immich (Google Photos Alternative)

Immich is the most actively developed self-hosted Google Photos replacement with mobile apps.

```yaml
# docker-compose.yml - Immich Photo Server

version: "3.8"

networks:
  immich_network:
    driver: bridge

volumes:
  immich_postgres:
  immich_redis:
  immich_model_cache:

services:
  # PostgreSQL with the current Immich vector extension image
  immich_postgres:
    image: ghcr.io/immich-app/postgres:14-vectorchord0.4.3-pgvectors0.2.0
    container_name: immich_postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=immich
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres_secure_password
      - POSTGRES_INITDB_ARGS=--data-checksums
    volumes:
      - immich_postgres:/var/lib/postgresql/data
    networks:
      - immich_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d immich"]
      interval: 10s
      retries: 5

  # Valkey (Redis-compatible) for caching and job queues
  immich_redis:
    image: docker.io/valkey/valkey:9
    container_name: immich_redis
    restart: unless-stopped
    volumes:
      - immich_redis:/data
    networks:
      - immich_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      retries: 5

  # Immich server (API + web frontend)
  immich_server:
    image: ghcr.io/immich-app/immich-server:release
    container_name: immich_server
    restart: unless-stopped
    depends_on:
      immich_postgres:
        condition: service_healthy
      immich_redis:
        condition: service_healthy
    ports:
      - "2283:2283"
    environment:
      # Database connection
      - DB_HOSTNAME=immich_postgres
      - DB_PORT=5432
      - DB_DATABASE_NAME=immich
      - DB_USERNAME=postgres
      - DB_PASSWORD=postgres_secure_password
      # Redis connection
      - REDIS_HOSTNAME=immich_redis
    volumes:
      # Photo storage - point to your photo library
      - /mnt/photos:/data
      # Optional: uncomment to mount an existing library for External Libraries
      # - /mnt/external-photos:/mnt/external-photos:ro
      # Timezone data
      - /etc/localtime:/etc/localtime:ro
    networks:
      - immich_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.immich.rule=Host(`photos.yourdomain.com`)"
      - "traefik.http.routers.immich.entrypoints=websecure"
      - "traefik.http.routers.immich.tls.certresolver=letsencrypt"
      - "traefik.http.services.immich.loadbalancer.server.port=2283"

  # Immich machine learning (face recognition, CLIP search)
  immich_machine_learning:
    # For NVIDIA GPU acceleration in Portainer, change the tag to :release-cuda
    image: ghcr.io/immich-app/immich-machine-learning:release
    container_name: immich_machine_learning
    restart: unless-stopped
    volumes:
      - immich_model_cache:/cache
    networks:
      - immich_network
    # Uncomment for NVIDIA GPU acceleration in Portainer
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: 1
    #           capabilities: [gpu]
```

### Configure External Libraries

```bash
# Uncomment the optional bind mount above to mount your existing library read-only
# In Immich admin panel: Administration > External Libraries
# Add path: /mnt/external-photos
# Run a library scan to import without moving files
```

## Option 2: Deploy PhotoPrism

PhotoPrism is a mature, privacy-focused photo management app with advanced search.

```yaml
# docker-compose.yml - PhotoPrism
version: "3.8"

networks:
  photoprism_network:
    driver: bridge

volumes:
  photoprism_db:

services:
  # MariaDB database
  photoprism_db:
    image: mariadb:11
    container_name: photoprism_db
    restart: unless-stopped
    command: >
      mariadbd
      --innodb-buffer-pool-size=512M
      --transaction-isolation=READ-COMMITTED
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci
      --max-connections=512
      --innodb-rollback-on-timeout=OFF
      --innodb-lock-wait-timeout=120
    environment:
      - MARIADB_ROOT_PASSWORD=root_password
      - MARIADB_AUTO_UPGRADE=1
      - MARIADB_INITDB_SKIP_TZINFO=1
      - MARIADB_DATABASE=photoprism
      - MARIADB_USER=photoprism
      - MARIADB_PASSWORD=photoprism_password
    volumes:
      - photoprism_db:/var/lib/mysql
    networks:
      - photoprism_network
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 30s
      timeout: 5s
      retries: 3

  # PhotoPrism application
  photoprism:
    image: photoprism/photoprism:latest
    container_name: photoprism
    restart: unless-stopped
    depends_on:
      photoprism_db:
        condition: service_healthy
    ports:
      - "2342:2342"
    environment:
      # Admin password
      - PHOTOPRISM_ADMIN_USER=admin
      - PHOTOPRISM_ADMIN_PASSWORD=secure_admin_password

      # Site configuration
      - PHOTOPRISM_SITE_URL=http://your-server-ip:2342/
      - PHOTOPRISM_SITE_TITLE=My Photos
      - PHOTOPRISM_SITE_CAPTION=My Personal Gallery

      # Database connection
      - PHOTOPRISM_DATABASE_DRIVER=mysql
      - PHOTOPRISM_DATABASE_SERVER=photoprism_db:3306
      - PHOTOPRISM_DATABASE_NAME=photoprism
      - PHOTOPRISM_DATABASE_USER=photoprism
      - PHOTOPRISM_DATABASE_PASSWORD=photoprism_password

      # Storage paths
      - PHOTOPRISM_ORIGINALS_PATH=/photoprism/originals
      - PHOTOPRISM_IMPORT_PATH=/photoprism/import
      - PHOTOPRISM_STORAGE_PATH=/photoprism/storage

      # Disable authentication for local-only access
      # - PHOTOPRISM_AUTH_MODE=public

      # Install TensorFlow support for AI features on first startup
      - PHOTOPRISM_INIT=tensorflow

      # NSFW detection
      - PHOTOPRISM_DETECT_NSFW=false

      # Workers
      - PHOTOPRISM_WORKERS=2
    volumes:
      # Your photo library
      - /mnt/photos:/photoprism/originals
      # Import folder for new photos
      - /mnt/photoprism-import:/photoprism/import
      # Storage for thumbnails and sidecar files
      - /opt/photoprism/storage:/photoprism/storage
    networks:
      - photoprism_network
    # For Intel VAAPI/QSV acceleration (optional)
    # devices:
    #   - /dev/dri:/dev/dri
```

## Step 3: Set Up Mobile Sync with Immich

### iOS / Android
1. Install Immich app from App Store or Play Store
2. Set server URL: `https://photos.yourdomain.com`
3. Log in with your credentials
4. Open the backup screen, select the albums to sync, and tap **Enable Backup**

### Immich CLI for Bulk Import

```bash
# Install Immich CLI
npm install -g @immich/cli

# Authenticate
immich login https://photos.yourdomain.com/api your-api-key

# Upload existing photos
immich upload /path/to/photos --recursive --album-name "Imported Photos"
```

## Step 4: Set Up Automated Backups

```bash
#!/bin/bash
# backup-photos.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/photos"
mkdir -p "$BACKUP_DIR"

# Backup Immich database
docker exec -t immich_postgres pg_dump --clean --if-exists --dbname=immich --username=postgres | \
  gzip > "$BACKUP_DIR/immich_db_$DATE.sql.gz"

# Note: Photos themselves are in /mnt/photos - back up that directory separately
# using rsync to NAS or cloud storage

echo "Photo DB backup completed: $DATE"
```

## Performance Tuning

```yaml
# Adjust based on your hardware
environment:
  # Number of workers for indexing
  - PHOTOPRISM_WORKERS=4
  # RAM-based thumbnail caching
  - PHOTOPRISM_THUMB_UNCACHED=true
  # JPEG quality for thumbnails
  - PHOTOPRISM_JPEG_QUALITY=95
```

## Conclusion

You now have a powerful self-hosted photo gallery running in Portainer. Immich provides the most Google Photos-like experience with excellent mobile apps and active development. PhotoPrism offers a more mature platform with advanced search capabilities. Both solutions keep your memories private and accessible from anywhere. Use Portainer to monitor resource usage, update images, and manage your photo library infrastructure.
