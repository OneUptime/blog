# How to Share Files Between Docker Containers Using Volumes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Volumes, Containers, DevOps, Data Management

Description: Learn how to share files and data between Docker containers using named volumes, shared volumes in Docker Compose, and the volumes-from flag for container-to-container data sharing.

---

Containers are ephemeral by design, but real applications need to share data. Whether it's a web server accessing uploaded files, multiple workers processing the same queue, or a logging sidecar reading application logs, Docker volumes provide the mechanism for sharing data between containers.

## Understanding Docker Volumes

Docker volumes are the preferred way to persist and share data. They're managed by Docker, independent of the container lifecycle, and can be shared between multiple containers simultaneously.

```bash
# Create a named volume
docker volume create shared-data

# List volumes
docker volume ls

# Inspect volume details
docker volume inspect shared-data
```

## Sharing a Volume Between Containers

### Basic Volume Sharing

Multiple containers can mount the same volume, giving them access to the same files.

```bash
# Create a shared volume
docker volume create app-uploads

# Container 1: Web server serving uploaded files
docker run -d --name web \
  -v app-uploads:/var/www/uploads \
  -p 80:80 \
  nginx

# Container 2: Backend processing uploads
docker run -d --name processor \
  -v app-uploads:/data/uploads \
  my-processor
```

Both containers now have access to the same files. The web server mounts them at `/var/www/uploads` while the processor accesses them at `/data/uploads`.

### Docker Compose Volume Sharing

Docker Compose makes volume sharing straightforward. Volumes defined at the top level can be used by any service.

```yaml
version: '3.8'

services:
  web:
    image: nginx
    volumes:
      - uploads:/var/www/html/uploads:ro  # Read-only access
    ports:
      - "80:80"

  api:
    image: my-api
    volumes:
      - uploads:/app/uploads  # Read-write access

  worker:
    image: my-worker
    volumes:
      - uploads:/data/uploads

volumes:
  uploads:  # Named volume shared between all services
```

## Using --volumes-from

The `--volumes-from` flag mounts all volumes from another container. This is useful for sidecar patterns.

```bash
# Main application container with volumes
docker run -d --name app \
  -v /var/log/app \
  -v /data \
  my-application

# Log collector sidecar sharing app's volumes
docker run -d --name log-collector \
  --volumes-from app:ro \
  fluent/fluentd

# Backup container also sharing volumes
docker run --rm \
  --volumes-from app:ro \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/data.tar.gz /data
```

The `:ro` suffix makes the volumes read-only in the sidecar containers, preventing accidental modifications.

## Common Sharing Patterns

### Pattern 1: Upload Handling

A web frontend accepts uploads, a processor transforms them, and a CDN serves the results.

```yaml
version: '3.8'

services:
  frontend:
    image: upload-frontend
    volumes:
      - raw-uploads:/uploads/incoming
    ports:
      - "3000:3000"

  processor:
    image: image-processor
    volumes:
      - raw-uploads:/input:ro    # Read raw files
      - processed:/output        # Write processed files

  cdn:
    image: nginx
    volumes:
      - processed:/usr/share/nginx/html:ro
    ports:
      - "80:80"

volumes:
  raw-uploads:
  processed:
```

### Pattern 2: Log Aggregation

Application containers write logs, a collector reads and ships them.

```yaml
version: '3.8'

services:
  app:
    image: my-app
    volumes:
      - app-logs:/var/log/app

  worker:
    image: my-worker
    volumes:
      - worker-logs:/var/log/worker

  log-shipper:
    image: fluent/fluentd
    volumes:
      - app-logs:/logs/app:ro
      - worker-logs:/logs/worker:ro
    depends_on:
      - app
      - worker

volumes:
  app-logs:
  worker-logs:
```

### Pattern 3: Shared Cache

Multiple application instances share a cache directory.

```yaml
version: '3.8'

services:
  api:
    image: my-api
    deploy:
      replicas: 3
    volumes:
      - cache:/app/cache

volumes:
  cache:
```

## Read-Only Volumes

Use read-only mounts when a container only needs to read data.

```bash
# Command line
docker run -v myvolume:/data:ro my-container

# Docker Compose
services:
  reader:
    volumes:
      - shared-data:/data:ro
```

Benefits of read-only mounts:
- Prevents accidental data modification
- Improves security by limiting container capabilities
- Makes data flow direction clear

## Permissions and Ownership

Volume permissions can be tricky when different containers run as different users.

### Setting Permissions During Volume Creation

```bash
# Create volume and set permissions with a temporary container
docker volume create shared-data
docker run --rm -v shared-data:/data alpine chown -R 1000:1000 /data
docker run --rm -v shared-data:/data alpine chmod -R 775 /data
```

### Using a Shared Group

Configure containers to use the same group ID.

```dockerfile
# Dockerfile for both containers
FROM alpine
RUN addgroup -g 1000 appgroup && \
    adduser -D -u 1001 -G appgroup appuser
USER appuser
```

### Init Container Pattern

In Docker Compose, use an init container to set up permissions.

```yaml
version: '3.8'

services:
  init:
    image: alpine
    volumes:
      - shared-data:/data
    command: sh -c "chown -R 1000:1000 /data && chmod -R 775 /data"
    # This container exits after setting permissions

  app:
    image: my-app
    volumes:
      - shared-data:/app/data
    depends_on:
      init:
        condition: service_completed_successfully

volumes:
  shared-data:
```

## Concurrent Access Considerations

When multiple containers write to the same volume:

1. **File-level locking**: Ensure your application handles concurrent file access
2. **Append-only patterns**: Safer than random writes
3. **Directory per container**: Each container writes to its own subdirectory
4. **Use a database**: For complex data sharing, consider Redis or a database

### Safe Concurrent Writing Example

```yaml
version: '3.8'

services:
  worker-1:
    image: my-worker
    environment:
      - WORKER_ID=1
    volumes:
      - work-output:/output
    # Each worker writes to /output/worker-1/

  worker-2:
    image: my-worker
    environment:
      - WORKER_ID=2
    volumes:
      - work-output:/output
    # Each worker writes to /output/worker-2/

  aggregator:
    image: my-aggregator
    volumes:
      - work-output:/input:ro

volumes:
  work-output:
```

## Volume Drivers for Advanced Sharing

Use volume drivers to share data across Docker hosts.

### NFS Volume

```bash
# Create NFS volume
docker volume create \
  --driver local \
  --opt type=nfs \
  --opt o=addr=nfs-server.local,rw \
  --opt device=:/exports/shared \
  nfs-shared
```

### Docker Compose with NFS

```yaml
version: '3.8'

services:
  app:
    image: my-app
    volumes:
      - nfs-data:/app/data

volumes:
  nfs-data:
    driver: local
    driver_opts:
      type: nfs
      o: addr=nfs-server.local,rw,soft
      device: ":/exports/shared"
```

## Debugging Shared Volumes

### Inspect Volume Contents

```bash
# List files in a volume
docker run --rm -v myvolume:/data alpine ls -la /data

# Interactive shell for exploration
docker run -it --rm -v myvolume:/data alpine sh
```

### Check Which Containers Use a Volume

```bash
# Find containers using a volume
docker ps -a --filter volume=myvolume

# Detailed volume info including mount points
docker volume inspect myvolume
```

## Summary

| Sharing Method | Use Case |
|---------------|----------|
| Named volume in Compose | Multiple services sharing data |
| `--volumes-from` | Sidecar patterns, backups |
| Read-only mount (`:ro`) | Consumer containers that shouldn't modify data |
| Volume drivers (NFS, etc.) | Sharing across Docker hosts |

Key points:
- Named volumes persist beyond container lifecycle
- Multiple containers can mount the same volume simultaneously
- Use read-only mounts for consumers that shouldn't modify data
- Consider permissions and concurrent access patterns
- For complex data sharing across hosts, use volume drivers or external storage
