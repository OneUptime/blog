# How to Create Named Volumes in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Volumes, Storage, DevOps

Description: Learn how to create and manage named Docker volumes in Portainer for persistent data storage that survives container restarts and recreations.

## Introduction

Named volumes are Docker's preferred mechanism for persistent data storage. Unlike bind mounts (which map to specific host paths), named volumes are managed by Docker and are portable, easy to back up, and survive container removal. Portainer provides a simple interface for creating and managing named volumes.

## Prerequisites

- Portainer installed with a connected Docker environment

## Understanding Named Volumes

Named volumes differ from other storage types:

| Storage Type | Management | Portability | Use Case |
|-------------|------------|-------------|---------|
| Named volume | Docker | High | Database data, app data |
| Bind mount | Host | Low | Config files, dev code |
| tmpfs | Memory | None | Secrets, cache |
| Anonymous volume | Docker | Low | Temporary data |

Named volumes are stored in Docker's volume directory by default:
- Linux: `/var/lib/docker/volumes/<volume-name>/_data`

## Step 1: Create a Named Volume via Portainer

1. Navigate to **Volumes** in Portainer.
2. Click **Add volume**.
3. Fill in the form:

```text
Name:   postgres-data
Driver: local
```

4. Click **Create the volume**.

## Step 2: Volume Driver Options

For the `local` driver, you can configure additional options:

```text
Name:   app-data
Driver: local
Options:
  type: none
  o:    bind
  device: /absolute/host/path/to/data
```

This uses the `local` driver to bind an existing host path into a named volume. Because it depends on a specific host path, it behaves more like a bind mount and is less portable than a regular named volume.

## Step 3: Using Named Volumes in Containers

After creating a volume, attach it to a container:

1. Navigate to **Containers > Add container**.
2. Scroll to **Volumes**.
3. Click **+ map additional volume**.
4. Under **Volume**, select the named volume from the dropdown.
5. Enter the container path.

```text
Volume:          postgres-data
Container path:  /var/lib/postgresql/data
Mode:            Read/Write
```

## Step 4: Named Volumes in Docker Compose

The most common way to use named volumes:

```yaml
# docker-compose.yml with named volumes

services:
  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=appuser
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      # Named volume for database data
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      # Named volume for Redis persistence
      - redis_data:/data
    command: redis-server --appendonly yes

  app:
    image: myorg/myapp:latest
    restart: unless-stopped
    volumes:
      # Named volume for uploaded files
      - app_uploads:/app/uploads
      # Named volume for application data
      - app_data:/app/data
    depends_on:
      - postgres
      - redis

# Volume definitions - Docker creates these automatically
volumes:
  postgres_data:     # Default: local driver
  redis_data:
  app_uploads:
  app_data:
    # Custom labels for volume metadata
    labels:
      com.example.app: myapp
      com.example.environment: production
```

## Step 5: Pre-populate a Volume with Data

Initialize a volume with data before attaching to the main container:

```bash
#!/bin/bash
# init-volume.sh
# Pre-populate a named volume with configuration data

VOLUME_NAME="app-config"

# Create the volume
docker volume create "${VOLUME_NAME}"

# Initialize with data using a temporary container
docker run --rm \
  -v "${VOLUME_NAME}:/data" \
  alpine:latest \
  sh -c "
    mkdir -p /data/config /data/logs
    cat > /data/config/app.yaml << 'EOF'
app:
  port: 8080
  log_level: info
  environment: production
EOF
    echo 'Volume initialized'
  "

echo "Volume '${VOLUME_NAME}' initialized with configuration data."
```

## Step 6: Volume Labels and Organization

Use labels to organize volumes:

```yaml
volumes:
  postgres_data:
    labels:
      com.example.service: database
      com.example.environment: production
      com.example.backup: "required"
      com.example.backup-frequency: daily
```

```bash
# Find volumes by label:
docker volume ls --filter "label=com.example.backup=required"
# These are volumes that need daily backups
```

## Step 7: Check Volume Contents

Inspect a named volume's contents:

```bash
# Browse volume contents via a temporary container:
docker run --rm \
  -v postgres_data:/volume \
  alpine:latest \
  ls -la /volume

# More detailed inspection:
docker run --rm \
  -v postgres_data:/volume \
  alpine:latest \
  sh -c "find /volume -type f | head -20"

# Get volume size:
docker run --rm \
  -v postgres_data:/volume \
  alpine:latest \
  du -sh /volume
```

In Portainer (with Swarm or Agent), you can browse volumes directly via the UI.

## Step 8: Volume Management Best Practices

```yaml
# docker-compose.yml best practices for volumes

volumes:
  # 1. Give volumes meaningful names
  # Compose prefixes the actual volume name with the project name by default
  postgres_data:
  redis_data:
  app_uploads:

  # 2. Use external volumes for data shared between stacks
  shared_config:
    external: true      # Must be created manually before deploying

  # 3. Label volumes for operational management
  database_data:
    labels:
      backup: "true"
      backup_type: "daily"
      owner: "platform-team"
```

```bash
# Create external shared volume before deploying:
docker volume create shared_config

# Pre-populate it:
docker run --rm -v shared_config:/config alpine sh -c "printf 'app.name=myapp\n' > /config/app.conf"
```

## Step 9: Verify Volume Creation

After creating:

```bash
# List all volumes:
docker volume ls

# Inspect a specific volume:
docker volume inspect postgres_data

# Output:
[
  {
    "CreatedAt": "2026-03-20T10:00:00Z",
    "Driver": "local",
    "Labels": {"com.example.service": "database"},
    "Mountpoint": "/var/lib/docker/volumes/postgres_data/_data",
    "Name": "postgres_data",
    "Options": {},
    "Scope": "local"
  }
]
```

In Portainer: **Volumes** page shows all volumes with their names, drivers, and container usage.

## Conclusion

Named volumes in Portainer provide Docker-managed persistent storage that survives container lifecycle events. Create them through the Portainer UI or define them in docker-compose.yml, and Docker handles the underlying storage management. Always use named volumes for database data, user uploads, and any application state that must persist across container restarts and recreations.
