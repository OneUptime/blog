# How to Use Docker Compose tmpfs Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, tmpfs, Performance, In-Memory Storage, Container Configuration, DevOps

Description: Use Docker Compose tmpfs mounts to create fast, ephemeral in-memory filesystems for caches, temp files, and session data.

---

Not every piece of data needs to survive a container restart. Temporary files, session data, cache directories, and lock files are all throwaway by nature. Writing them to disk wastes I/O bandwidth and adds unnecessary wear on storage. Docker Compose's `tmpfs` configuration mounts a RAM-backed filesystem inside your container, giving you blazing-fast ephemeral storage that disappears when the container stops.

## What Is tmpfs?

tmpfs is a Linux filesystem that lives entirely in memory (and swap, if configured). Files stored in tmpfs are never written to disk. Reads and writes happen at memory speed, which is orders of magnitude faster than even the fastest SSDs.

In Docker, a tmpfs mount creates a temporary filesystem at a specified path inside the container. The data only exists for the lifetime of the container. When the container stops, the data is gone.

## Basic tmpfs Configuration

The simplest form mounts a tmpfs at a single path.

```yaml
# Mount a tmpfs at /tmp inside the container
version: "3.8"

services:
  app:
    image: my-app:latest
    tmpfs:
      - /tmp
```

You can mount multiple tmpfs filesystems.

```yaml
# Multiple tmpfs mounts
services:
  app:
    image: my-app:latest
    tmpfs:
      - /tmp
      - /run
      - /var/cache
```

## Configuring tmpfs Options

The extended format lets you control the size and mount options for each tmpfs.

```yaml
# tmpfs with size limits and options
services:
  app:
    image: my-app:latest
    tmpfs:
      - type: tmpfs
        target: /tmp
        tmpfs:
          size: 100000000  # 100MB in bytes

  # Alternative short syntax with options
  app2:
    image: my-app:latest
    tmpfs:
      - /tmp:size=100m,mode=1777
```

The short syntax after the colon accepts standard Linux mount options:

- `size` - Maximum size of the tmpfs (e.g., `100m`, `1g`)
- `mode` - File permission mode (e.g., `1777` for /tmp)
- `uid` - Owner user ID
- `gid` - Owner group ID
- `noexec` - Prevent execution of binaries
- `nosuid` - Ignore setuid/setgid bits

```yaml
# Secure tmpfs with restricted permissions
services:
  app:
    image: my-app:latest
    tmpfs:
      - /tmp:size=50m,mode=1777
      - /run:size=10m,mode=755
      - /var/cache/app:size=200m,mode=750,uid=1000,gid=1000
```

## Using the Long-Form volumes Syntax

For more complex configurations, use the `volumes` section with a tmpfs type.

```yaml
# Long-form tmpfs configuration under volumes
version: "3.8"

services:
  app:
    image: my-app:latest
    volumes:
      - type: tmpfs
        target: /tmp
        tmpfs:
          size: 104857600  # 100MB
          mode: 1777
      - type: tmpfs
        target: /app/cache
        tmpfs:
          size: 536870912  # 512MB
```

## Practical Use Cases

### Application Temp Files

Most applications write temporary files that do not need persistence. Pointing `/tmp` at tmpfs speeds things up and ensures cleanup.

```yaml
# Application with tmpfs for temp files
services:
  api:
    image: my-api:latest
    tmpfs:
      - /tmp:size=100m,mode=1777
    environment:
      TMPDIR: /tmp
```

### Web Server Cache

Nginx and other web servers cache compiled templates, fastcgi responses, and proxy data in temporary directories.

```yaml
# Nginx with in-memory cache directories
services:
  nginx:
    image: nginx:alpine
    tmpfs:
      - /var/cache/nginx:size=256m
      - /tmp:size=50m
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
```

### PHP Session Storage

PHP sessions are typically stored on disk, but tmpfs makes them much faster.

```yaml
# PHP application with in-memory session storage
services:
  php:
    image: php:8.3-fpm
    tmpfs:
      - /tmp:size=50m,mode=1777
      - /var/lib/php/sessions:size=100m,mode=1733
    environment:
      PHP_SESSION_SAVE_PATH: /var/lib/php/sessions
```

### Read-Only Containers with Writable tmpfs

Security-hardened containers run with a read-only root filesystem. tmpfs provides the necessary writable areas.

```yaml
# Read-only container with tmpfs for writable paths
services:
  secure-app:
    image: my-app:latest
    read_only: true
    tmpfs:
      - /tmp:size=50m,mode=1777
      - /run:size=10m
      - /var/log/app:size=100m
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
```

This is a strong security pattern. The application cannot modify its own binaries, configuration, or libraries because the root filesystem is read-only. Only the explicitly listed tmpfs paths are writable.

### Database Temp Space

Databases use temporary storage for sort operations, hash joins, and other intermediate results.

```yaml
# PostgreSQL with in-memory temp tablespace
services:
  postgres:
    image: postgres:16
    tmpfs:
      - /dev/shm:size=512m
      - /tmp:size=256m
    shm_size: "512m"
    volumes:
      - pgdata:/var/lib/postgresql/data
    command:
      - "postgres"
      - "-c"
      - "temp_tablespaces=pg_default"
      - "-c"
      - "work_mem=64MB"
```

### CI/CD Build Caches

Build processes generate lots of temporary files. Using tmpfs speeds up builds and avoids filling up disk.

```yaml
# CI build container with tmpfs for build artifacts
services:
  builder:
    build: .
    tmpfs:
      - /tmp:size=2g
      - /app/build:size=1g
      - /root/.cache:size=500m
    environment:
      TMPDIR: /tmp
```

## tmpfs vs Docker Volumes vs Bind Mounts

Each storage type serves a different purpose.

| Feature | tmpfs | Volume | Bind Mount |
|---|---|---|---|
| Persists after stop | No | Yes | Yes |
| Storage location | RAM | Docker managed | Host filesystem |
| Speed | Fastest (RAM) | Fast (disk) | Fast (disk) |
| Sharable between containers | No | Yes | Yes |
| Size limited by | RAM | Disk | Disk |
| Good for | Temp files, caches | Database data, persistent state | Source code, config |

Use tmpfs when the data is temporary and speed matters. Use volumes when data must survive restarts. Use bind mounts when you need to share specific files between host and container.

## Monitoring tmpfs Usage

Keep an eye on tmpfs usage to make sure you are not running out of space.

```bash
# Check tmpfs usage inside a container
docker exec my-container df -h /tmp

# Monitor all tmpfs mounts
docker exec my-container df -h -t tmpfs

# Watch usage over time
watch -n 5 'docker exec my-container df -h /tmp'
```

If a tmpfs fills up, writes to that filesystem will fail with "No space left on device" errors. Size your tmpfs allocations based on expected usage plus a safety margin.

## Memory Accounting

tmpfs uses your host's RAM. A 1GB tmpfs mount that is full consumes 1GB of memory. Docker's memory limits apply to this usage.

```yaml
# Memory limit includes tmpfs usage
services:
  app:
    image: my-app:latest
    tmpfs:
      - /tmp:size=500m
    deploy:
      resources:
        limits:
          memory: 2g  # Includes the 500m tmpfs allocation
```

If you set a memory limit, make sure it accounts for both the application's memory needs and the maximum size of all tmpfs mounts. A container that exceeds its memory limit (including tmpfs) will be killed by the OOM killer.

## Full Production Example

Here is a hardened production configuration combining tmpfs with other security and performance settings.

```yaml
# Production stack with strategic tmpfs usage
version: "3.8"

services:
  nginx:
    image: nginx:alpine
    read_only: true
    tmpfs:
      - /tmp:size=50m
      - /var/cache/nginx:size=256m
      - /run:size=10m
    ports:
      - "80:80"

  api:
    build: ./api
    read_only: true
    tmpfs:
      - /tmp:size=100m,mode=1777
      - /app/.cache:size=200m
    cap_drop:
      - ALL

  postgres:
    image: postgres:16
    tmpfs:
      - /tmp:size=256m
      - /run/postgresql:size=10m
    shm_size: "256m"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    read_only: true
    tmpfs:
      - /tmp:size=10m
    volumes:
      - redis-data:/data

volumes:
  pgdata:
  redis-data:
```

tmpfs mounts are a simple optimization that pays off immediately. They speed up temporary file operations, enable read-only containers, and prevent ephemeral data from cluttering your persistent storage. Add them to every service that writes temporary data, and your containers will run faster and cleaner.
