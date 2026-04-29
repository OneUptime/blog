# How to Deploy Label Studio for Data Annotation via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Label Studio, Machine Learning, Data Annotation, Docker

Description: Deploy Label Studio as a data annotation platform for training machine learning models using Portainer.

## Introduction

Deploy Label Studio as a data annotation platform for training machine learning models using Portainer. This guide provides comprehensive instructions for deploying and integrating this tool into your workflow.

## Prerequisites

- Portainer installed with Docker
- Sufficient RAM and disk space for your datasets and uploaded media
- Basic understanding of Docker and containerization

## Step 1: Deploy via Portainer Stack

Create a new stack in Portainer with this docker-compose.yml:

```yaml
services:
  nginx:
    image: heartexlabs/label-studio:1.23.0
    container_name: label-studio
    restart: unless-stopped
    ports:
      - "8080:8085"
    depends_on:
      - app
    volumes:
      - label-studio-data:/label-studio/data:rw
    command: nginx

  app:
    image: heartexlabs/label-studio:1.23.0
    container_name: label-studio-app
    restart: unless-stopped
    expose:
      - "8000"
    depends_on:
      - postgres
    environment:
      - DJANGO_DB=default
      - POSTGRE_NAME=labelstudio
      - POSTGRE_USER=labelstudio
      - POSTGRE_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRE_PORT=5432
      - POSTGRE_HOST=postgres
      - JSON_LOG=1
    volumes:
      - label-studio-data:/label-studio/data:rw
    command: label-studio-uwsgi

  postgres:
    image: postgres:17-alpine
    container_name: label-studio-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=labelstudio
      - POSTGRES_USER=labelstudio
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  label-studio-data:
    name: label-studio-data
  postgres-data:
    name: label-studio-postgres-data
```

## Step 2: Configure Environment Variables

In Portainer's stack editor, configure:

```bash
POSTGRES_PASSWORD=secure-database-password
```

## Step 3: Initialize the Application

After deployment, Label Studio waits for PostgreSQL, runs database migrations, and initializes itself automatically. If you do not create the first account from the server, open `http://<your-server>:8080` and complete the sign-up flow in the browser. To create the initial owner account from the server instead, run:

```bash
# Optional: create the initial owner account from the container
docker exec -it label-studio-app \
  label-studio init -q --username admin@example.com --password 'change-this-password'

# Verify installation
curl -fsS http://localhost:8080/health/
```

## Step 4: Configure Storage

Set up persistent storage for uploaded files and annotation data:

```yaml
# Configure the Label Studio data volume with a specific host path
volumes:
  label-studio-data:
    name: label-studio-data
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /data/label-studio
```

```bash
# Create the directory and allow the non-root Label Studio container to write to it
sudo mkdir -p /data/label-studio
sudo chgrp 0 /data/label-studio
sudo chmod 0775 /data/label-studio
```

## Step 5: Set Up Authentication

Configure user authentication and access control:

```yaml
# Environment variables for auth configuration
services:
  app:
    environment:
      - LABEL_STUDIO_DISABLE_SIGNUP_WITHOUT_LINK=true
      - LABEL_STUDIO_USERNAME=admin@example.com
      - LABEL_STUDIO_PASSWORD=change-this-password
      - LABEL_STUDIO_USER_TOKEN=replace-with-a-long-random-token
```

## Step 6: Configure Backups

Set up automated backups via Portainer:

```bash
#!/bin/bash
# backup.sh
set -euo pipefail

BACKUP_DIR="/backups/label-studio"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Backup database
docker exec label-studio-postgres \
  pg_dump -U labelstudio labelstudio | gzip > "$BACKUP_DIR/db-$DATE.sql.gz"

# Backup uploaded files and exports
docker run --rm \
  -v label-studio-data:/source:ro \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/data-$DATE.tar.gz" -C /source .

echo "Backup complete"
```

## Step 7: Monitor Performance

Track application health through Portainer:

1. Go to **Containers** and select `label-studio`, `label-studio-app`, or `label-studio-postgres`
2. Click **Stats** to view real-time CPU, memory, network, and disk usage
3. Review container logs after large imports, authentication changes, or upgrades

## Step 8: Update and Maintenance

Update to new versions via Portainer:

1. Back up the PostgreSQL database and the `label-studio-data` volume
2. Edit the stack in Portainer
3. Update the Label Studio image tags to the new version
4. Click **Update the stack** and monitor the `label-studio` and `label-studio-app` logs during the rollout

## Conclusion

Deploying Label Studio via Portainer provides a production-ready, manageable service that integrates into your existing container infrastructure. Portainer's stack management simplifies updates, configuration management, and troubleshooting while providing a unified interface for your data annotation platform.
