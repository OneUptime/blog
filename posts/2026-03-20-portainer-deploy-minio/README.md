# How to Deploy Minio (S3-Compatible Storage) via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, MinIO, S3, Object Storage, Self-Hosted

Description: Deploy MinIO via Portainer as an S3-compatible object storage server for storing backups, media files, and application assets with a familiar AWS S3 API.

## Introduction

MinIO is a high-performance, S3-compatible object storage system. Applications that support AWS S3 work with MinIO without code changes, making it an excellent self-hosted alternative for storing backups, media files, and application data. Deploy via Portainer with persistent storage in minutes.

## Deploy as a Stack

```yaml
version: "3.8"

services:
  minio:
    image: minio/minio:latest
    container_name: minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin          # Change this!
      MINIO_ROOT_PASSWORD: minio_secure_password  # Change this!
      MINIO_VOLUMES: /data
      # Optional: Set domain for virtual-hosted-style buckets
      # MINIO_DOMAIN: s3.example.com
    volumes:
      # Persistent storage for objects
      - minio_data:/data
    ports:
      - "9000:9000"    # S3 API
      - "9001:9001"    # MinIO Console (Web UI)
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 30s
      timeout: 20s
      retries: 3

volumes:
  minio_data:
    driver: local
```

## Accessing MinIO

- **Console UI**: `http://<host>:9001`
- **S3 API endpoint**: `http://<host>:9000`

Log in with the `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD` you set.

## Creating Buckets and Policies

Via MinIO Console:

1. Click **Buckets > Create Bucket**
2. Name: `backups`
3. Enable **Versioning** for important data
4. Set **Retention Policy** if needed

Via MinIO CLI (mc):

```bash
# Install mc and configure

mc alias set local http://localhost:9000 minioadmin minio_secure_password

# Create buckets
mc mb local/backups
mc mb local/media
mc mb local/uploads

# Set bucket policy (public read for media)
mc anonymous set download local/media

# List buckets
mc ls local
```

## Connecting Applications to MinIO

Any S3-compatible application can use MinIO:

```yaml
# Application environment variables for S3/MinIO connection
environment:
  S3_ENDPOINT: http://minio:9000
  S3_ACCESS_KEY: minioadmin
  S3_SECRET_KEY: minio_secure_password
  S3_BUCKET: myapp-uploads
  S3_REGION: us-east-1    # Match the region configured on your MinIO server
  S3_FORCE_PATH_STYLE: "true"  # Set this when your application needs path-style requests
```

## Example: Backing Up PostgreSQL to MinIO

```bash
#!/bin/bash
# Backup PostgreSQL database to MinIO

DB_BACKUP=/tmp/db-backup-$(date +%Y%m%d).sql.gz

# Create backup
docker exec postgres pg_dumpall -U postgres | gzip > $DB_BACKUP

# Upload to MinIO
mc cp "$DB_BACKUP" local/backups/

# Clean up local file
rm "$DB_BACKUP"
```

## Using MinIO with AWS SDK

```python
import boto3
from botocore.config import Config

# Connect to MinIO using boto3 (S3-compatible)
s3_client = boto3.client(
    's3',
    endpoint_url='http://minio:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minio_secure_password',
    region_name='us-east-1',
    config=Config(
        signature_version='s3v4',
        s3={'addressing_style': 'path'}
    )
)

# Upload a file
s3_client.upload_file('/path/to/file.txt', 'my-bucket', 'file.txt')

# List objects
response = s3_client.list_objects_v2(Bucket='my-bucket')
for obj in response.get('Contents', []):
    print(obj['Key'])
```

## MinIO Distributed Mode

For production, each node in a distributed MinIO deployment must use the same `command` value, sequential hostnames, and its own storage volumes, for example:

```yaml
version: "3.8"

services:
  minio1:
    image: minio/minio:latest
    hostname: minio1
    command: server --console-address ":9001" http://minio{1...4}/data{1...2}
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minio_secure_password
    volumes:
      - minio1_data1:/data1
      - minio1_data2:/data2
    networks:
      - minio-network

  # Define minio2, minio3, and minio4 similarly with hostnames minio2, minio3, and minio4

networks:
  minio-network:

volumes:
  minio1_data1:
  minio1_data2:
```

## Conclusion

MinIO deployed via Portainer provides a powerful, self-hosted S3-compatible object storage solution. Applications using AWS S3 SDKs work without modification, making it easy to replace cloud storage with self-hosted storage. The web console simplifies bucket management, and the S3-compatible API enables broad ecosystem compatibility.
