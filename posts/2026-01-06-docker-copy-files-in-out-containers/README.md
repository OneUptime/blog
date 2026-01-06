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

```bash
# Copy from container to host
docker cp <container>:<path> <host_path>

# Copy from host to container
docker cp <host_path> <container>:<path>
```

### Copy a Log File Out

```bash
# Find your container
docker ps
CONTAINER ID   IMAGE        STATUS         NAMES
abc123def456   myapp:1.0    Up 2 hours     web-server

# Copy the log file to your current directory
docker cp web-server:/var/log/app/error.log ./error.log

# Or copy an entire directory
docker cp web-server:/var/log/app/ ./logs/
```

### Inject a Config File

```bash
# Update nginx config in a running container
docker cp nginx.conf web-proxy:/etc/nginx/nginx.conf

# Reload nginx to pick up changes
docker exec web-proxy nginx -s reload
```

### Copy from a Stopped Container

This is where `docker cp` shines. Unlike volume mounts, it works on stopped containers:

```bash
# Container crashed? Still get the logs
docker cp crashed-app:/app/crash-dump.log ./

# Works even if the container never started properly
docker cp failed-init:/var/log/startup.log ./
```

### Practical Tips

```bash
# Preserve file ownership and permissions with tar
docker cp web-server:/app/data - | tar -xf - -C ./backup/

# Copy multiple files using a tarball
tar -cf - file1.txt file2.txt | docker cp - web-server:/app/

# Check if file exists before copying
docker exec web-server test -f /path/to/file && docker cp web-server:/path/to/file ./
```

---

## Using Volume Mounts: The Development Workflow

Volume mounts create a live connection between host and container directories. Changes on either side reflect immediately on the other.

### Bind Mounts (Direct Host Path)

```bash
# Mount current directory into container
docker run -v $(pwd):/app myapp:dev

# Read-only mount for configs
docker run -v /etc/myapp/config.yaml:/app/config.yaml:ro myapp:prod

# Multiple mounts
docker run \
  -v $(pwd)/src:/app/src \
  -v $(pwd)/config:/app/config:ro \
  myapp:dev
```

### Named Volumes (Docker-Managed)

```bash
# Create a named volume
docker volume create app-data

# Use it with a container
docker run -v app-data:/data postgres:16

# Inspect where Docker stores it
docker volume inspect app-data
```

### Docker Compose Example

```yaml
services:
  api:
    image: node:22
    volumes:
      # Bind mount for development
      - ./src:/app/src
      # Named volume for node_modules (faster on macOS/Windows)
      - node_modules:/app/node_modules
      # Read-only config
      - ./config.json:/app/config.json:ro
    working_dir: /app
    command: npm run dev

volumes:
  node_modules:
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

```bash
# Create a temporary container from an image to inspect its contents
docker create --name temp-inspect myapp:1.0
docker cp temp-inspect:/app/package.json ./
docker rm temp-inspect
```

### Pattern: Backup a Named Volume

Named volumes aren't directly accessible, so use a helper container:

```bash
# Backup
docker run --rm \
  -v myapp-data:/source:ro \
  -v $(pwd):/backup \
  alpine tar czf /backup/myapp-data-backup.tar.gz -C /source .

# Restore
docker run --rm \
  -v myapp-data:/target \
  -v $(pwd):/backup:ro \
  alpine tar xzf /backup/myapp-data-backup.tar.gz -C /target
```

### Gotcha: Permissions

Files copied with `docker cp` inherit the UID/GID from the container, which might not match your host user:

```bash
# Fix ownership after copying out
docker cp web-server:/app/data ./data
sudo chown -R $(whoami):$(whoami) ./data

# Or run docker cp as root equivalent
docker cp --archive web-server:/app/data ./data
```

### Gotcha: Symlinks

`docker cp` follows symlinks by default. If you need the actual symlink:

```bash
# Use tar to preserve symlinks
docker exec web-server tar -chf - /app/link-dir | tar -xf - -C ./
```

### Gotcha: macOS/Windows Volume Performance

Bind mounts on Docker Desktop can be slow. Use named volumes for dependencies:

```yaml
# Slow: node_modules on bind mount
volumes:
  - ./:/app

# Fast: node_modules in named volume
volumes:
  - ./:/app
  - node_modules:/app/node_modules
```

---

## Quick Reference

```bash
# Copy file out
docker cp container:/path/file ./file

# Copy file in
docker cp ./file container:/path/file

# Copy directory out
docker cp container:/path/dir ./dir

# Copy directory in
docker cp ./dir container:/path/

# Copy from stopped container
docker cp stopped-container:/logs ./logs

# List files in container (to know what to copy)
docker exec container ls -la /path/

# Check file size before copying
docker exec container du -sh /path/file
```

---

## Summary

- **`docker cp`** is your go-to for one-off transfers, especially from stopped or crashed containers
- **Volume mounts** are essential for development workflows and persistent data
- Combine both: use volumes for live development, `docker cp` for extracting artifacts from builds or debugging issues
- Always consider permissions when copying files between different UID namespaces

Master these two tools and file management in Docker becomes second nature.
