# How to Configure S3-Compatible Storage for Portainer Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, S3, MinIO, Object Storage, Backup

Description: Configure S3-compatible object storage (MinIO, Ceph, or AWS S3) for Portainer-managed applications and use it for container backups and data persistence.

## Introduction

S3-compatible object storage is a common pattern for cloud-native application data. Portainer workloads can leverage S3-compatible storage through MinIO (self-hosted), Ceph RadosGW, or AWS S3 for backups, static assets, and application data. This guide covers deploying MinIO via Portainer and connecting applications to it.

## Part 1: Deploy MinIO via Portainer

```yaml
# minio-stack.yml - Deploy as Portainer stack

version: '3.8'

services:
  minio:
    image: quay.io/minio/minio:latest
    container_name: minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"    # S3 API
      - "9001:9001"    # Console UI
    environment:
      MINIO_ROOT_USER: "${MINIO_ROOT_USER:-minioadmin}"
      MINIO_ROOT_PASSWORD: "${MINIO_ROOT_PASSWORD:-minioadmin123}"
    volumes:
      - minio-data:/data
    networks:
      - storage-network

  minio-createbuckets:
    image: quay.io/minio/mc:latest
    depends_on:
      - minio
    restart: on-failure
    environment:
      MC_HOST_myminio: http://${MINIO_ROOT_USER:-minioadmin}:${MINIO_ROOT_PASSWORD:-minioadmin123}@minio:9000
    entrypoint: >
      /bin/sh -c "
      mc ready myminio;
      mc mb --ignore-existing myminio/backups;
      mc mb --ignore-existing myminio/app-uploads;
      mc mb --ignore-existing myminio/logs;
      exit 0;
      "
    networks:
      - storage-network

volumes:
  minio-data:

networks:
  storage-network:
    name: storage-network
```

## Part 2: Configure Applications to Use S3

### Application Stack with S3 Integration

```yaml
# app-stack.yml
version: '3.8'

services:
  app:
    image: myapp:latest
    restart: unless-stopped
    environment:
      # Example S3 configuration - actual variable names vary by application
      S3_ENDPOINT: http://minio:9000
      S3_ACCESS_KEY: "${S3_ACCESS_KEY}"
      S3_SECRET_KEY: "${S3_SECRET_KEY}"
      S3_BUCKET: app-uploads
      S3_REGION: us-east-1
      S3_USE_SSL: "false"
      S3_FORCE_PATH_STYLE: "true"  # Required for MinIO
    networks:
      - app-network
      - storage-network

  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: "${DB_PASSWORD}"
    volumes:
      - db-data:/var/lib/postgresql/data
    networks:
      - app-network

networks:
  app-network:
  storage-network:
    external: true  # Created by the MinIO stack above

volumes:
  db-data:
```

## Part 3: Using MinIO Client (mc) for Operations

```bash
# Install MinIO client
curl https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc
chmod +x /usr/local/bin/mc

# Configure mc alias
mc alias set portainer-minio \
  http://minio.example.com:9000 \
  your-access-key \
  your-secret-key

# List buckets
mc ls portainer-minio

# Create a bucket
mc mb portainer-minio/portainer-backups

# Upload files
mc cp /tmp/portainer-backup.tar.gz portainer-minio/portainer-backups/

# Set lifecycle policy (auto-delete after 30 days)
mc ilm rule add portainer-minio/portainer-backups \
  --expire-days 30
```

## Part 4: Portainer Configuration Backup to S3

```bash
#!/bin/bash
# backup-portainer-to-s3.sh
# Run this script on a schedule to back up Portainer's /data volume to S3

set -euo pipefail

S3_BUCKET="portainer-minio/portainer-backups"
PORTAINER_CONTAINER="portainer"
PORTAINER_VOLUME="portainer_data" # Adjust if your Portainer data volume uses a different name.
BACKUP_DATE=$(date +%Y-%m-%d-%H%M%S)
BACKUP_FILE="portainer-backup-$BACKUP_DATE.tar.gz"
LOCAL_BACKUP="/tmp/$BACKUP_FILE"

echo "Creating Portainer backup..."

# Stop Portainer briefly for a consistent backup
docker stop "$PORTAINER_CONTAINER"

# Archive the Portainer data volume. This captures Portainer configuration
# and stack files, not the application data stored in other containers' volumes.
docker run --rm \
  -v "$PORTAINER_VOLUME":/data \
  -v /tmp:/backup \
  alpine tar czf "/backup/$BACKUP_FILE" -C /data .

# Start Portainer again
docker start "$PORTAINER_CONTAINER"

# Upload to MinIO/S3
mc cp "$LOCAL_BACKUP" "$S3_BUCKET/$BACKUP_FILE"

# Verify upload
mc stat "$S3_BUCKET/$BACKUP_FILE"

# Clean up local file
rm "$LOCAL_BACKUP"

echo "Backup uploaded: $BACKUP_FILE"
```

## Part 5: S3 Configuration for Common Applications

### WordPress Media Storage

```yaml
# Use S3-compatible storage for WordPress uploads
services:
  wordpress:
    image: wordpress:latest
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_USER: "${DB_USER}"
      WORDPRESS_DB_PASSWORD: "${DB_PASSWORD}"
      WORDPRESS_DB_NAME: "${DB_NAME:-wordpress}"
      # Install the WP Offload Media plugin and configure supported settings via wp-config.php:
      WORDPRESS_CONFIG_EXTRA: |
        define('AS3CF_SETTINGS', serialize(array(
            'provider' => 'aws',
            'access-key-id' => '${S3_ACCESS_KEY}',
            'secret-access-key' => '${S3_SECRET_KEY}',
            'bucket' => 'wordpress-media',
            'region' => 'us-east-1',
        )));
```

With WP Offload Media, MinIO-compatible endpoints are configured through the plugin's `as3cf_aws_s3_client_args` and related filters (for example in the WP Offload Media Tweaks plugin), not through an `endpoint` key inside `AS3CF_SETTINGS`.

### Database Backup to S3

```bash
# Automated PostgreSQL backup to MinIO
docker exec -e PGPASSWORD=dbpassword your-postgres-container \
  pg_dump -U postgres myapp | gzip | \
  mc pipe portainer-minio/db-backups/$(date +%Y%m%d).sql.gz
```

## MinIO High Availability

```yaml
# MinIO distributed mode requires 4 or more drives/directories.
# Production deployments typically place a load balancer or reverse proxy in front of the cluster.
services:
  minio1:
    image: quay.io/minio/minio
    hostname: minio1
    command: server http://minio{1...4}/data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: password123
    volumes:
      - minio1-data:/data
    networks:
      - minio-ha
  minio2:
    image: quay.io/minio/minio
    hostname: minio2
    command: server http://minio{1...4}/data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: password123
    volumes:
      - minio2-data:/data
    networks:
      - minio-ha
  minio3:
    image: quay.io/minio/minio
    hostname: minio3
    command: server http://minio{1...4}/data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: password123
    volumes:
      - minio3-data:/data
    networks:
      - minio-ha
  minio4:
    image: quay.io/minio/minio
    hostname: minio4
    command: server http://minio{1...4}/data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: password123
    volumes:
      - minio4-data:/data
    networks:
      - minio-ha

volumes:
  minio1-data:
  minio2-data:
  minio3-data:
  minio4-data:

networks:
  minio-ha:
```

## Conclusion

S3-compatible storage via MinIO integrated with Portainer provides scalable, cloud-native object storage for self-hosted environments. Applications can store files, images, and backups using the same S3 API they would use with AWS, enabling easy migration between environments. Portainer configuration backups to S3 simplify disaster recovery, while application data in volumes or bind mounts still needs its own backup plan.
