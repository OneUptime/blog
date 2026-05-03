# How to Deploy Duplicati for Backup Management via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Duplicati, Backup, Docker, Self-Hosted

Description: Deploy Duplicati backup solution using Portainer to automate encrypted backups to cloud storage providers.

## Introduction

Duplicati is a free, open-source backup client that stores encrypted, incremental, compressed backups on cloud storage services (S3, Backblaze B2, Google Drive, SFTP, etc.) and local destinations. It runs as a web-based daemon that you access via a browser.

## Prerequisites

- Portainer installed with Docker
- A backup destination (S3 bucket, B2 bucket, SFTP server, etc.)

## Step 1: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack**:

```yaml
# docker-compose.yml - Duplicati

version: "3.8"

services:
  duplicati:
    image: lscr.io/linuxserver/duplicati:latest
    container_name: duplicati
    restart: unless-stopped
    ports:
      - "8200:8200"
    volumes:
      - duplicati_config:/config
      - /var/lib/docker/volumes:/source:ro    # Back up Docker volumes (read-only)
      - /opt/backups:/backups                 # Local backup destination (optional)
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=UTC
      - DUPLICATI__WEBSERVICE_PASSWORD=${DUPLICATI_PASSWORD}
    networks:
      - duplicati_net

volumes:
  duplicati_config:

networks:
  duplicati_net:
    driver: bridge
```

## Step 2: Set Environment Variables in Portainer

```text
DUPLICATI_PASSWORD=your-web-ui-password
```

## Step 3: Access the Web UI

Open `http://<host>:8200` in your browser. Enter the password you set in `DUPLICATI_PASSWORD`.

## Step 4: Create a Backup Job

1. Click **Add backup** > **Configure a new backup**
2. Give your backup a name and set an encryption passphrase
3. Choose a destination (e.g., S3):
   - Bucket name: `my-backup-bucket`
   - AWS Access Key ID / Secret Access Key
   - Folder path: `duplicati/myserver`
4. Select source folders (e.g., `/source/important_volume/_data`)
5. Set a schedule (e.g., daily at 2:00 AM)
6. Click **Save**

## Step 5: Back Up to S3-Compatible Storage

For Amazon S3:

```text
Destination URL format:
s3://my-bucket/backups/?auth-username=AKIAXXXXXX&auth-password=YOUR_SECRET&s3-location-constraint=us-east-1
```

For S3-compatible destinations (MinIO, etc.), add `s3-server-name`:

```text
s3://my-bucket/backups/?auth-username=ACCESS_KEY&auth-password=SECRET_KEY&s3-server-name=minio.example.com
```

For Backblaze B2:
```text
b2://bucket-name/path?auth-username=ACCOUNT_ID&auth-password=APPLICATION_KEY
```

## Step 6: Test Restore

1. In the Duplicati web UI, click **Restore**
2. Select the backup job and a restore point
3. Choose files to restore
4. Select a destination (original location or a different path)
5. Click **Restore**

## Step 7: Monitor Backup Status via CLI

```bash
# Check Duplicati process inside the container
docker exec duplicati duplicati-cli help

# List backups via CLI (requires server to be running)
docker exec duplicati duplicati-cli list \
  "s3://my-bucket/backups/" \
  --auth-username=AKIAXXXXXX \
  --auth-password=YOUR_SECRET \
  --s3-location-constraint=us-east-1 \
  --encryption-module=aes \
  --passphrase="your-encryption-passphrase"
```

## Conclusion

Duplicati uses block-level deduplication and AES-256 encryption before uploading to the destination - your backup provider never sees unencrypted data. The `PUID`/`PGID` environment variables ensure the container runs as a non-root user with appropriate file permissions. Mount source directories as read-only (`ro`) to prevent accidental modification during backup.
