# How to Copy Files In and Out of Running Docker Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Containers, DevOps, Learning Resource

Description: Master docker cp, volume mounts, and when to use each approach for moving files between your host and running containers.

Moving files between your host machine and Docker containers is a daily task for developers and operators. Whether you're extracting logs, injecting configuration, or debugging a misbehaving service, knowing the right approach saves time and prevents mistakes.

---

## The Two Main Approaches

Docker provides two primary mechanisms for file transfer:

1. **`docker cp`** - Copy files to/from a container (even stopped ones)
2. **Volume mounts** - Share directories between host and container at runtime

Each has distinct use cases, and picking the wrong one leads to frustration.

---

## Using docker cp: The Quick Extraction Tool

The `docker cp` command copies files between your local filesystem and a container. It works whether the container is running or stopped.

### Syntax

The basic syntax for docker cp is straightforward. The container path uses a colon separator, similar to SCP syntax.

```bash
# Copy from container to host
# Format: docker cp <container>:<container_path> <host_path>
docker cp <container>:<path> <host_path>

# Copy from host to container
# Format: docker cp <host_path> <container>:<container_path>
docker cp <host_path> <container>:<path>
```

### Copy a Log File Out

This example shows retrieving log files from a running container. Use `docker ps` first to find the container name or ID.

```bash
# Find your container - note the NAMES column
docker ps
CONTAINER ID   IMAGE        STATUS         NAMES
abc123def456   myapp:1.0    Up 2 hours     web-server

# Copy a single log file to your current directory
docker cp web-server:/var/log/app/error.log ./error.log

# Or copy an entire directory (note the trailing slash behavior)
docker cp web-server:/var/log/app/ ./logs/
```

### Inject a Config File

Use docker cp to update configuration in a running container without rebuilding. Remember to reload or restart the service to pick up changes.

```bash
# Update nginx config in a running container
docker cp nginx.conf web-proxy:/etc/nginx/nginx.conf

# Reload nginx to pick up changes without restarting the container
docker exec web-proxy nginx -s reload
```

### Copy from a Stopped Container

This is where `docker cp` shines. Unlike volume mounts, it works on stopped containers:

Extracting files from stopped or crashed containers is crucial for debugging. Volume mounts don't help here since the container isn't running.

```bash
# Container crashed? Still get the logs for debugging
docker cp crashed-app:/app/crash-dump.log ./

# Works even if the container never started properly
# Useful for debugging init script failures
docker cp failed-init:/var/log/startup.log ./
```

### Practical Tips

These advanced patterns handle common edge cases like preserving permissions, copying multiple files, and checking file existence.

```bash
# Preserve file ownership and permissions with tar pipe
# Docker cp doesn't always preserve permissions; tar does
docker cp web-server:/app/data - | tar -xf - -C ./backup/

# Copy multiple files using a tarball (avoids multiple docker cp calls)
tar -cf - file1.txt file2.txt | docker cp - web-server:/app/

# Check if file exists before copying to avoid errors
docker exec web-server test -f /path/to/file && docker cp web-server:/path/to/file ./
```

---

## Using Volume Mounts: The Development Workflow

Volume mounts create a live connection between host and container directories. Changes on either side reflect immediately on the other.

### Bind Mounts (Direct Host Path)

Bind mounts directly map a host directory into the container. Changes are immediately visible on both sides, making this ideal for development.

```bash
# Mount current directory into container - changes sync both ways
docker run -v $(pwd):/app myapp:dev

# Read-only mount for configs - container can't modify these files
docker run -v /etc/myapp/config.yaml:/app/config.yaml:ro myapp:prod

# Multiple mounts - separate source code from read-only config
docker run \
  -v $(pwd)/src:/app/src \           # Editable source code
  -v $(pwd)/config:/app/config:ro \  # Read-only configuration
  myapp:dev
```

### Named Volumes (Docker-Managed)

Named volumes are managed by Docker and persist independently of containers. Better for data that should survive container recreation.

```bash
# Create a named volume - Docker manages the storage location
docker volume create app-data

# Use it with a container - data persists when container is removed
docker run -v app-data:/data postgres:16

# Inspect where Docker stores it on the host filesystem
docker volume inspect app-data
```

### Docker Compose Example

This Compose configuration demonstrates mixing bind mounts for development with named volumes for performance optimization.

```yaml
services:
  api:
    image: node:22
    volumes:
      # Bind mount for development - edit code on host, see changes in container
      - ./src:/app/src
      # Named volume for node_modules (faster on macOS/Windows)
      # Avoids slow filesystem translation for thousands of small files
      - node_modules:/app/node_modules
      # Read-only config prevents accidental modification
      - ./config.json:/app/config.json:ro
    working_dir: /app
    command: npm run dev

volumes:
  node_modules:  # Declare the named volume
```

---

## When to Use Each Approach

### Use docker cp When:

| Scenario | Why |
|----------|-----|
| Extracting crash dumps or logs from failed containers | Works on stopped containers |
| One-time file injection (certificates, patches) | No need to restart container |
| Debugging production containers | Doesn't require volume configuration |
| Copying files for forensic analysis | Preserves original container state |

### Use Volume Mounts When:

| Scenario | Why |
|----------|-----|
| Development with hot reload | Live sync without manual copying |
| Persistent data (databases, uploads) | Survives container recreation |
| Sharing config across multiple containers | Single source of truth |
| Build artifacts need to persist | Host filesystem is durable |

---

## Common Patterns and Gotchas

### Pattern: Extract Then Analyze

Sometimes you need to inspect an image's contents without running it. Create a temporary container, extract files, and clean up.

```bash
# Create a temporary container from an image to inspect its contents
# --name gives it a memorable name for the cp command
docker create --name temp-inspect myapp:1.0

# Extract files for analysis
docker cp temp-inspect:/app/package.json ./

# Clean up the temporary container
docker rm temp-inspect
```

### Pattern: Backup a Named Volume

Named volumes aren't directly accessible, so use a helper container:

Since named volumes live in Docker's storage, mount the volume into an Alpine container to create a tarball backup.

```bash
# Backup - mount volume read-only and create tarball
docker run --rm \
  -v myapp-data:/source:ro \         # Mount the volume to backup
  -v $(pwd):/backup \                # Mount host directory for output
  alpine tar czf /backup/myapp-data-backup.tar.gz -C /source .

# Restore - extract tarball into the volume
docker run --rm \
  -v myapp-data:/target \            # Mount the volume to restore to
  -v $(pwd):/backup:ro \             # Mount backup directory read-only
  alpine tar xzf /backup/myapp-data-backup.tar.gz -C /target
```

### Gotcha: Permissions

Files copied with `docker cp` inherit the UID/GID from the container, which might not match your host user:

Container files often have different ownership than your host user. Fix permissions after copying to avoid access issues.

```bash
# Fix ownership after copying out - container may use different UID
docker cp web-server:/app/data ./data
sudo chown -R $(whoami):$(whoami) ./data

# Or use --archive flag to attempt permission preservation
docker cp --archive web-server:/app/data ./data
```

### Gotcha: Symlinks

`docker cp` follows symlinks by default. If you need the actual symlink:

To preserve symlinks rather than copying their targets, use tar which handles symlinks correctly.

```bash
# Use tar to preserve symlinks instead of following them
# The -h flag makes tar follow symlinks; omit it to preserve them
docker exec web-server tar -chf - /app/link-dir | tar -xf - -C ./
```

### Gotcha: macOS/Windows Volume Performance

Bind mounts on Docker Desktop can be slow. Use named volumes for dependencies:

Docker Desktop's filesystem translation layer is slow for many small files. Using a named volume for node_modules dramatically improves npm install and require() performance.

```yaml
# Slow: node_modules on bind mount - every file access goes through translation
volumes:
  - ./:/app

# Fast: node_modules in named volume - stays in Linux VM filesystem
volumes:
  - ./:/app
  - node_modules:/app/node_modules  # This masks the bind-mounted node_modules
```

---

## Quick Reference

Common docker cp commands for daily use. Remember: container path always uses colon syntax.

```bash
# Copy file out of container to host
docker cp container:/path/file ./file

# Copy file from host into container
docker cp ./file container:/path/file

# Copy directory out (creates dir locally)
docker cp container:/path/dir ./dir

# Copy directory in (copies contents into path)
docker cp ./dir container:/path/

# Copy from stopped container (same syntax, just works)
docker cp stopped-container:/logs ./logs

# List files in container (to know what to copy)
docker exec container ls -la /path/

# Check file size before copying large files
docker exec container du -sh /path/file
```

---

## Summary

- **`docker cp`** is your go-to for one-off transfers, especially from stopped or crashed containers
- **Volume mounts** are essential for development workflows and persistent data
- Combine both: use volumes for live development, `docker cp` for extracting artifacts from builds or debugging issues
- Always consider permissions when copying files between different UID namespaces

Master these two tools and file management in Docker becomes second nature.
