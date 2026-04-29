# How to Deploy MinIO for ML Model Storage via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, MinIO, Machine Learning, S3, Docker

Description: Deploy MinIO as S3-compatible object storage for machine learning model artifacts and datasets using Portainer.

## Introduction

Deploy MinIO as S3-compatible object storage for machine learning model artifacts and datasets using Portainer. This guide provides comprehensive instructions for deploying and integrating this tool into your workflow.

## Prerequisites

- Portainer installed with Docker
- At least 4 GB RAM
- Sufficient disk space for model artifacts and datasets
- Basic understanding of Docker and containerization

## Step 1: Deploy via Portainer Stack

Create a new stack in Portainer with this docker-compose.yml:

```yaml
version: "3.8"

services:
  minio:
    image: quay.io/minio/minio:latest
    container_name: minio
    restart: always
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio-data:/data
    environment:
      - MINIO_ROOT_USER=${MINIO_ROOT_USER}
      - MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
    networks:
      - minio-net

volumes:
  minio-data:

networks:
  minio-net:
    driver: bridge
```

Port `9000` serves the S3-compatible API and port `9001` serves the web console.

## Step 2: Configure Environment Variables

In Portainer's stack editor, configure the root credentials. `MINIO_ROOT_PASSWORD` must be at least 8 characters:

```bash
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=secure-password-here
```

These set the initial root account used to administer the server. Replace the defaults before exposing MinIO outside your private network.

## Step 3: Initialize the Application

After deployment, verify the server is running and create your first bucket for ML artifacts:

```bash
# Verify the health endpoint
curl http://localhost:9000/minio/health/live

# Install the MinIO client (mc) on your workstation, then add an alias
mc alias set local http://localhost:9000 minioadmin secure-password-here

# Create a bucket for model artifacts
mc mb local/ml-models

# Create a bucket for datasets
mc mb local/ml-datasets

# Verify
mc ls local
```

You can also create buckets through the web console at `http://localhost:9001`.

## Step 4: Configure Storage

For production workloads, back the data volume with a dedicated host path so model artifacts persist on a known disk:

```yaml
# Configure volume with specific host path
volumes:
  minio-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /data/minio
```

```bash
# Create the directory and grant ownership to the MinIO container user
sudo mkdir -p /data/minio
sudo chown 1000:1000 /data/minio
```

The official MinIO image runs as UID/GID `1000:1000` by default.

## Step 5: Set Up Authentication

Avoid using the root account for application access. Create a service account with a scoped policy and use its access key from your ML pipeline:

```bash
# Create a dedicated user for ML workloads
mc admin user add local ml-pipeline a-strong-secret-key

# Attach the built-in readwrite policy (or a custom one) to that user
mc admin policy attach local readwrite --user ml-pipeline

# Generate a service account (access key + secret key) for that user
mc admin user svcacct add local ml-pipeline
```

Use the returned access key and secret key as the S3 credentials in your training and serving code.

## Step 6: Configure Backups

Set up automated backups via a scheduled container or cron job. `mc mirror` performs an incremental sync to a second location:

```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/backups/minio"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Mirror buckets to a local backup directory
mc mirror --overwrite local/ml-models $BACKUP_DIR/ml-models-$DATE
mc mirror --overwrite local/ml-datasets $BACKUP_DIR/ml-datasets-$DATE

# Optionally archive the snapshot
tar czf $BACKUP_DIR/minio-$DATE.tar.gz -C $BACKUP_DIR ml-models-$DATE ml-datasets-$DATE

echo "Backup complete"
```

For point-in-time recovery, enable bucket versioning with `mc version enable local/ml-models` so overwritten objects can be restored.

## Step 7: Monitor Performance

Track MinIO metrics through Portainer and the built-in Prometheus endpoint:

1. Go to **Containers** > select the `minio` container
2. Click **Stats** to view real-time CPU, memory, and network usage
3. Scrape `http://<host>:9000/minio/v2/metrics/cluster` from Prometheus for detailed cluster, bucket, and request metrics

## Step 8: Update and Maintenance

Update MinIO to a new release via Portainer:

1. Edit the stack in Portainer
2. Pin `quay.io/minio/minio` to a specific tag (avoid `latest` for production)
3. Click **Update the stack** with the *Re-pull image* option enabled
4. Monitor container logs during the rolling update

## Conclusion

Deploying MinIO via Portainer gives ML teams a self-hosted, S3-compatible object store for model artifacts and datasets that integrates with frameworks like MLflow, Kubeflow, and PyTorch out of the box. Portainer's stack management simplifies upgrades, credential rotation, and troubleshooting while keeping your data inside your own infrastructure.
