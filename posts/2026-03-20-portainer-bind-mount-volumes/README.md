# How to Create Bind Mount Volumes in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Volumes, Storage, DevOps

Description: Learn how to configure bind mount volumes in Portainer to mount host directories and files directly into Docker containers.

## Introduction

Bind mounts map a host directory or file directly into a container. Unlike named volumes, bind mounts give you precise control over exactly which host path is mounted. They're ideal for config files, development code, log directories, and any data where the host path matters.

## Prerequisites

- Portainer installed with a connected Docker environment
- Create the host directory or file you want to mount before creating the container for predictable results

## Named Volume vs. Bind Mount

| Aspect | Named Volume | Bind Mount |
|--------|-------------|------------|
| Path control | Docker manages | Explicit host path |
| Portability | High | Low (host-path dependent) |
| Pre-existing path | Not required | Create first for predictable results |
| Use case | Databases, app data | Config files, dev code |

## Step 1: Create the Host Path

Create the host path before creating the bind mount, especially if you're mounting individual files:

```bash
# Create the host directories:

mkdir -p /data/nginx/conf.d
mkdir -p /data/nginx/html
mkdir -p /data/nginx/logs
mkdir -p /data/myapp/logs
mkdir -p /data/myapp/uploads
mkdir -p /etc/myapp

# If you bind-mount individual files, create those files too and populate
# them with valid content (for example /data/nginx/nginx.conf or
# /etc/myapp/config.yaml).

# Set ownership if needed:
chown -R 1000:1000 /data/myapp/
# Or for www-data (nginx, apache):
chown -R www-data:www-data /data/nginx/
```

## Step 2: Configure Bind Mount in Portainer

1. Navigate to **Containers > Add container**.
2. Set the container name and image.
3. Scroll to **Advanced container settings** and open the **Volumes** section.
4. Click **+ map additional volume**.
5. Under **Mapping type**, select **Bind** (not a named volume).
6. Fill in:

```text
Container path: /etc/nginx/conf.d
Mapping type:   Bind
Host path:      /data/nginx/conf.d
Read/Write:     Read only  ← Config files should be read-only
```

Or:

```text
Container path: /app/logs
Mapping type:   Bind
Host path:      /data/myapp/logs
Read/Write:     Read/Write  ← Logs need write access
```

## Step 3: Bind Mounts in Docker Compose

```yaml
# docker-compose.yml with bind mounts

services:
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      # Bind mount: config file (read-only)
      - /data/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      # Bind mount: config directory (read-only)
      - /data/nginx/conf.d:/etc/nginx/conf.d:ro
      # Bind mount: static files (read-only)
      - /data/nginx/html:/usr/share/nginx/html:ro
      # Bind mount: logs (read-write)
      - /data/nginx/logs:/var/log/nginx:rw

  app:
    image: myorg/myapp:latest
    restart: unless-stopped
    volumes:
      # Config file mount
      - /etc/myapp/config.yaml:/app/config.yaml:ro
      # Log directory
      - /data/myapp/logs:/app/logs:rw
      # Upload directory
      - /data/myapp/uploads:/app/uploads:rw
```

## Step 4: Common Bind Mount Patterns

### Configuration Files

```yaml
services:
  postgres:
    image: postgres:15-alpine
    command:
      - postgres
      - -c
      - config_file=/etc/postgresql/postgresql.conf
      - -c
      - hba_file=/etc/postgresql/pg_hba.conf
    volumes:
      # Custom PostgreSQL config
      - /etc/postgres/postgresql.conf:/etc/postgresql/postgresql.conf:ro
      # pg_hba.conf for auth settings
      - /etc/postgres/pg_hba.conf:/etc/postgresql/pg_hba.conf:ro
      # SSL certificates
      - /etc/ssl/postgres:/etc/ssl/certs:ro
      # Data (named volume is better here, but bind mount works):
      - /data/postgres:/var/lib/postgresql/data:rw
```

### Development Code Mounting

For local development, mount source code for live reloading:

```yaml
# Development docker-compose.yml
services:
  dev-app:
    image: node:20-alpine
    working_dir: /app
    volumes:
      # Mount entire source code for development
      - ./src:/app/src:rw
      # Mount package.json but NOT node_modules (performance)
      - ./package.json:/app/package.json:ro
      # Use named volume for node_modules (avoid host/container mismatch)
      - node_modules:/app/node_modules
    command: npm run dev   # Assumes nodemon or similar hot-reload
    ports:
      - "3000:3000"

volumes:
  node_modules:  # Named volume for dependencies
```

### Log Collection

```yaml
services:
  app:
    image: myapp:latest
    volumes:
      # Bind logs to host for collection by Filebeat/Fluentd
      - /var/log/myapp:/app/logs:rw

  # Log collector reads from host path
  filebeat:
    image: elastic/filebeat:8.12
    volumes:
      - /var/log/myapp:/logs:ro   # Same host path, read-only
      - /etc/filebeat/filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
```

### SSL/TLS Certificates

```yaml
services:
  nginx:
    image: nginx:alpine
    volumes:
      # Mount Let's Encrypt certificates
      - /etc/letsencrypt/live/example.com/fullchain.pem:/etc/ssl/certs/cert.pem:ro
      - /etc/letsencrypt/live/example.com/privkey.pem:/etc/ssl/private/key.pem:ro
```

## Step 5: Bind Mount Permissions

File permissions on bind mounts can be tricky:

```bash
# The file/directory is accessible in the container using the SAME numeric UID/GID as the host
# If the container runs as UID 1000 and the host directory is owned by root → Permission denied

# Fix: Set correct ownership on host
chown -R 1000:1000 /data/myapp/

# Or use ACL:
setfacl -R -m u:1000:rwX /data/myapp/

# Or in the container, run an init script to fix permissions:
# (in entrypoint.sh, run as root first, then drop to app user)
```

In Docker Compose, use `user` to specify the container UID:

```yaml
services:
  app:
    image: myapp:latest
    user: "1000:1000"   # Run as this UID
    volumes:
      - /data/myapp:/app/data   # /data/myapp must be writable by UID 1000
```

## Step 6: Read-Only Container Filesystem with Bind Mounts

For maximum security, make the container filesystem read-only and only bind-mount writable directories:

```yaml
services:
  secure-app:
    image: myapp:latest
    read_only: true          # Container filesystem is read-only
    tmpfs:
      - /tmp                 # Allow writes to /tmp (in memory)
      - /run                 # Allow writes to /run (in memory)
    volumes:
      - /data/myapp/logs:/app/logs:rw   # Explicit writable bind mount
      - /etc/myapp:/app/config:ro       # Read-only config
```

## Step 7: Verify Bind Mounts

```bash
# Verify the bind mount is working:
docker exec my-container ls -la /etc/nginx/conf.d/
# Should show files from /data/nginx/conf.d on the host

# Check mount info:
docker inspect my-container | jq '.[].Mounts'
# Output shows Type: "bind" and Source: "/data/nginx/conf.d"
```

In Portainer: container details → **Inspect** tab → `Mounts` section.

## Conclusion

Bind mounts in Portainer provide direct access to host files and directories from containers. They're ideal for config files, development code, SSL certificates, and log directories where the host path matters. Create the host path first for predictable results, set appropriate file permissions, and use read-only mounts for config files to prevent accidental modification by the container.
