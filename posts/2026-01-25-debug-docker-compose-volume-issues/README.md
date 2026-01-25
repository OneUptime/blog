# How to Debug Docker Compose Volume Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Docker Compose, Volumes, Troubleshooting, Storage

Description: Diagnose and fix common Docker Compose volume problems including data not persisting, permission errors, volume conflicts, and path resolution issues that cause application failures.

---

Volume issues in Docker Compose manifest as missing data, permission errors, or containers failing to start. This guide covers systematic debugging for the most common volume-related problems.

## Understanding Volume Types in Compose

Docker Compose supports three volume types with different behaviors.

```yaml
version: '3.8'

services:
  app:
    image: myapp:latest
    volumes:
      # 1. Named volume - managed by Docker, persists data
      - app_data:/app/data

      # 2. Bind mount - maps host directory to container
      - ./config:/app/config

      # 3. Anonymous volume - created without name
      - /app/cache

      # 4. tmpfs mount - stored in memory only
      - type: tmpfs
        target: /app/temp

volumes:
  app_data:
```

## Symptom: Data Not Persisting

Data disappears when containers restart or are recreated.

### Check Volume Configuration

```bash
# View volumes defined in compose file
docker compose config | grep -A10 volumes:

# List volumes created by compose
docker volume ls --filter "label=com.docker.compose.project=$(basename $PWD)"

# Inspect specific volume
docker volume inspect myproject_app_data
```

### Common Causes

**Anonymous volumes are recreated each time:**

```yaml
# Wrong: Anonymous volume doesn't persist across container recreation
services:
  db:
    image: postgres:15
    volumes:
      - /var/lib/postgresql/data  # Anonymous volume!
```

```yaml
# Correct: Named volume persists data
services:
  db:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:  # Named volume defined here
```

**Volume not used at all:**

```bash
# Check if container is actually using the volume
docker inspect mycontainer --format '{{json .Mounts}}' | jq

# If Mounts array is empty, volume wasn't mounted
# Verify the volume path matches where your app writes data
```

## Symptom: Permission Denied

Container cannot read or write to mounted volume.

### Diagnose Permission Issues

```bash
# Check file ownership inside container
docker compose exec app ls -la /app/data

# Check what user the container runs as
docker compose exec app id

# Check host directory permissions
ls -la ./config

# View SELinux labels (if applicable)
ls -laZ ./config
```

### Fix Permission Mismatches

```yaml
# Option 1: Run container as specific user
services:
  app:
    image: myapp:latest
    user: "1000:1000"
    volumes:
      - ./data:/app/data
```

```bash
# Option 2: Fix host permissions to match container user
sudo chown -R 1000:1000 ./data

# Option 3: Use permissive permissions (less secure)
chmod -R 777 ./data
```

### SELinux Context Issues

```yaml
# For SELinux-enabled hosts, add :z or :Z suffix
services:
  app:
    image: myapp:latest
    volumes:
      - ./data:/app/data:z     # Shared label (multiple containers can access)
      - ./config:/app/config:Z  # Private label (only this container)
```

## Symptom: Bind Mount Path Not Found

Container fails to start because the source path does not exist.

```bash
# Error message
Error response from daemon: Bind mount failed: stat /path/to/source: no such file or directory
```

### Verify Paths

```bash
# Check if path exists on host
ls -la ./config

# Docker Compose resolves paths relative to compose file location
# Verify your working directory
pwd

# View resolved paths in config
docker compose config
```

### Path Resolution Rules

```yaml
# Relative paths are relative to docker-compose.yml location
services:
  app:
    volumes:
      - ./data:/app/data        # ./data relative to compose file
      - ../shared:/app/shared   # Parent directory

# Absolute paths work from anywhere
services:
  app:
    volumes:
      - /home/user/data:/app/data

# Environment variables for flexibility
services:
  app:
    volumes:
      - ${DATA_PATH:-./data}:/app/data
```

### macOS and Windows Path Issues

```yaml
# Docker Desktop requires paths under shared folders
# Default: /Users, /Volumes, /tmp on macOS
# Default: C:\Users on Windows

# Paths outside shared folders fail silently or cause errors
services:
  app:
    volumes:
      # This may fail if /data is not in shared folders
      - /data/myapp:/app/data

      # Use home directory which is typically shared
      - ~/myapp/data:/app/data
```

## Symptom: Volume Conflicts

Multiple services or projects compete for the same volume.

```bash
# Error
Error response from daemon: volume name already in use
```

### Check Volume Ownership

```bash
# List all volumes with labels
docker volume ls --format "{{.Name}}\t{{.Labels}}"

# Inspect volume to see which project created it
docker volume inspect myproject_pgdata

# Look for com.docker.compose.project label
```

### Resolve Naming Conflicts

```yaml
# Use project-specific volume names
services:
  db:
    volumes:
      - ${COMPOSE_PROJECT_NAME:-myapp}_pgdata:/var/lib/postgresql/data

volumes:
  ${COMPOSE_PROJECT_NAME:-myapp}_pgdata:

# Or use external volumes with explicit names
volumes:
  pgdata:
    name: production_pgdata
    external: true
```

```bash
# Create external volume manually
docker volume create production_pgdata

# Then reference it
```

## Symptom: Volume Data Corrupted

Application data is incomplete or corrupted after restart.

### Check Container Shutdown Behavior

```yaml
# Ensure graceful shutdown for database containers
services:
  db:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data
    stop_grace_period: 30s  # Allow time for clean shutdown
```

### Verify Volume Contents

```bash
# Create a temporary container to inspect volume contents
docker run --rm -v myproject_pgdata:/data alpine ls -la /data

# Check for lock files or incomplete writes
docker run --rm -v myproject_pgdata:/data alpine find /data -name "*.lock"

# Copy data out for inspection
docker run --rm -v myproject_pgdata:/data -v $(pwd)/backup:/backup alpine \
  cp -r /data /backup/
```

### Debug with Volume Backup

```yaml
# docker-compose.yml with backup service
services:
  db:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data

  backup:
    image: alpine
    profiles:
      - backup
    volumes:
      - pgdata:/data:ro
      - ./backups:/backup
    command: sh -c "tar czf /backup/pgdata-$(date +%Y%m%d).tar.gz -C /data ."

volumes:
  pgdata:
```

```bash
# Run backup
docker compose --profile backup run --rm backup
```

## Debugging Commands Reference

```bash
# List all volumes
docker volume ls

# Inspect volume details
docker volume inspect volume_name

# View compose volume configuration
docker compose config --volumes

# Check container mounts
docker compose ps -q | xargs -I {} docker inspect {} --format '{{.Name}}:{{range .Mounts}}
  Type: {{.Type}}
  Source: {{.Source}}
  Destination: {{.Destination}}
  Mode: {{.Mode}}
{{end}}'

# Test volume accessibility
docker compose exec service_name touch /mounted/path/testfile
docker compose exec service_name rm /mounted/path/testfile

# View volume usage (requires container to be running)
docker compose exec service_name df -h /mounted/path
```

## Volume Cleanup

```bash
# Remove volumes when tearing down stack
docker compose down -v

# Remove only unused volumes
docker volume prune

# Remove specific volume (container must be stopped/removed first)
docker volume rm myproject_pgdata

# Force remove volume (dangerous!)
docker volume rm -f myproject_pgdata
```

## Best Practices

```yaml
# docker-compose.yml with robust volume configuration
version: '3.8'

services:
  db:
    image: postgres:15
    volumes:
      # Named volume for persistent data
      - pgdata:/var/lib/postgresql/data
    # Clean shutdown
    stop_grace_period: 30s
    # Defined user for consistent permissions
    environment:
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
    secrets:
      - db_password

  app:
    image: myapp:latest
    # Match container user with host user for bind mounts
    user: "${UID:-1000}:${GID:-1000}"
    volumes:
      # Bind mount for source code (development)
      - ./src:/app/src:cached
      # Named volume for app data
      - app_data:/app/data
      # tmpfs for temporary files
      - type: tmpfs
        target: /app/tmp
    depends_on:
      - db

volumes:
  pgdata:
    # Add labels for identification
    labels:
      - "backup=daily"
      - "service=database"
  app_data:

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

---

Volume issues typically stem from four root causes: incorrect path resolution, permission mismatches, naming conflicts, or data not being written to mounted paths. Start debugging by verifying the volume exists and is mounted with `docker inspect`, check permissions inside the container, and ensure paths are correctly resolved relative to your compose file location. For persistent data, always use named volumes rather than anonymous volumes.
