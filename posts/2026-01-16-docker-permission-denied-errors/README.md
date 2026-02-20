# Fix Docker Permission Denied: 5 Solutions That Actually Work

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Linux, Permissions, Troubleshooting, DevOps

Description: Solve 'permission denied while trying to connect to the Docker daemon socket' and other Docker permission errors. Covers rootless mode, group fixes, and socket permissions.

---

Permission denied errors are among the most common Docker issues. They occur at different levels-Docker daemon access, volume mounts, and container file operations. Understanding where permissions fail helps you fix them correctly.

## Docker Socket Permission Denied

### The Error

```bash
$ docker ps
Got permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock
```

### Cause

Your user doesn't have permission to access the Docker socket.

### Solutions

#### Add User to Docker Group (Recommended)

```bash
# Add current user to docker group
sudo usermod -aG docker $USER

# Apply changes without logging out
newgrp docker

# Or log out and back in
# Verify membership
groups
# Should show: ... docker ...

# Test
docker ps
```

#### Fix Socket Permissions (Temporary)

```bash
# Quick fix (resets on reboot)
sudo chmod 666 /var/run/docker.sock

# Or change group ownership
sudo chown root:docker /var/run/docker.sock
```

#### Run with Sudo (Not Recommended)

```bash
# Works but not ideal for security
sudo docker ps
```

## Volume Permission Issues

### The Error

```bash
$ docker run -v $(pwd)/data:/app/data myimage
# Inside container: Permission denied: /app/data/file.txt
```

### Common Causes

1. Host directory owned by different user
2. Container runs as different UID
3. SELinux/AppArmor blocking access

### Solutions

#### Match Container User to Host User

```bash
# Run container as current user
docker run -u $(id -u):$(id -g) -v $(pwd)/data:/app/data myimage
```

#### Fix Host Directory Permissions

```bash
# Make directory writable by container user
chmod 777 ./data  # Too permissive, but works

# Better: Match container's user
# If container runs as UID 1000:
sudo chown -R 1000:1000 ./data
```

#### Use Named Volumes Instead

```bash
# Named volumes handle permissions automatically
docker volume create mydata
docker run -v mydata:/app/data myimage
```

#### SELinux: Add :z or :Z Flag

```bash
# :z allows sharing between containers
docker run -v $(pwd)/data:/app/data:z myimage

# :Z restricts to this container only
docker run -v $(pwd)/data:/app/data:Z myimage
```

### Dockerfile Solutions

```dockerfile
# Create user with matching UID
FROM ubuntu:22.04

ARG UID=1000
ARG GID=1000

RUN groupadd -g $GID appgroup && \
    useradd -u $UID -g $GID -m appuser

USER appuser
WORKDIR /home/appuser/app
```

Build with host UID:
```bash
docker build --build-arg UID=$(id -u) --build-arg GID=$(id -g) -t myimage .
```

## Container Internal Permission Errors

### The Error

```bash
# Inside container
$ touch /app/data/file.txt
touch: cannot touch '/app/data/file.txt': Permission denied
```

### Root Cause Analysis

```bash
# Check who owns the directory
docker exec mycontainer ls -la /app

# Check who the container runs as
docker exec mycontainer id
# uid=1000(appuser) gid=1000(appgroup) groups=1000(appgroup)
```

### Solutions

#### Change Ownership in Dockerfile

```dockerfile
FROM node:20

WORKDIR /app
COPY --chown=node:node . .

# Switch to non-root user
USER node
```

#### Set Permissions in Entrypoint

```bash
#!/bin/bash
# entrypoint.sh

# Fix permissions at runtime
chown -R appuser:appgroup /app/data

# Drop to regular user
exec gosu appuser "$@"
```

```dockerfile
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y gosu

COPY entrypoint.sh /
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["myapp"]
```

## Docker Compose Volume Permissions

### Common Pattern

```yaml
version: '3.8'

services:
  app:
    image: myapp
    user: "${UID}:${GID}"  # Use host user
    volumes:
      - ./data:/app/data
```

Run with:
```bash
UID=$(id -u) GID=$(id -g) docker-compose up
```

### Using .env File

```bash
# .env
UID=1000
GID=1000
```

```yaml
# docker-compose.yml
services:
  app:
    image: myapp
    user: "${UID}:${GID}"
    volumes:
      - ./data:/app/data
```

## Permission Denied When Building

### The Error

```bash
$ docker build -t myimage .
COPY failed: permission denied
```

### Solutions

#### Check .dockerignore

```bash
# Ensure needed files aren't ignored
cat .dockerignore
```

#### Fix Source File Permissions

```bash
# Make files readable
chmod -R a+r ./src

# Check for files owned by root
ls -la
sudo chown -R $USER:$USER .
```

## Specific Service Permissions

### PostgreSQL

```bash
# PostgreSQL runs as postgres user (UID 999 or 70)
# Create volume with correct ownership
docker run -d \
  -v pgdata:/var/lib/postgresql/data \
  postgres:15

# For bind mounts, fix ownership
mkdir -p ./pgdata
sudo chown -R 999:999 ./pgdata
docker run -d -v $(pwd)/pgdata:/var/lib/postgresql/data postgres:15
```

### Nginx

```dockerfile
FROM nginx:alpine

# Nginx runs as nginx user
COPY --chown=nginx:nginx ./html /usr/share/nginx/html
```

### Elasticsearch

```bash
# Elasticsearch needs specific permissions
sudo chown -R 1000:1000 ./esdata
sudo chmod -R 775 ./esdata

docker run -d \
  -v $(pwd)/esdata:/usr/share/elasticsearch/data \
  -e "discovery.type=single-node" \
  elasticsearch:8.11.0
```

## Debug Permission Issues

### Check Effective Permissions

```bash
# See what user container runs as
docker inspect --format='{{.Config.User}}' mycontainer

# Check file ownership inside container
docker exec mycontainer ls -lan /app

# Check process owner
docker exec mycontainer ps aux
```

### Trace Permission Errors

```bash
# Run with strace to see exact permission failure
docker run --cap-add SYS_PTRACE myimage strace mycommand

# Check audit logs (Linux)
sudo ausearch -m AVC -ts recent
```

### Test Permissions

```bash
# Test write access
docker exec mycontainer touch /app/data/test.txt && echo "Write OK" || echo "Write FAILED"

# Test read access
docker exec mycontainer cat /app/data/config.txt && echo "Read OK" || echo "Read FAILED"
```

## Best Practices

### 1. Use Non-Root Users in Containers

```dockerfile
FROM node:20

# Create non-root user
RUN useradd -m appuser
USER appuser

WORKDIR /home/appuser/app
COPY --chown=appuser:appuser . .
```

### 2. Use Named Volumes for Data

```yaml
services:
  db:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data  # Named volume

volumes:
  pgdata:  # Docker manages permissions
```

### 3. Match UIDs When Using Bind Mounts

```yaml
services:
  app:
    build:
      context: .
      args:
        UID: ${UID:-1000}
        GID: ${GID:-1000}
    volumes:
      - ./data:/app/data
```

### 4. Use Init Containers for Permission Setup

```yaml
services:
  init-permissions:
    image: busybox
    user: root
    volumes:
      - shared-data:/data
    command: chown -R 1000:1000 /data

  app:
    image: myapp
    depends_on:
      init-permissions:
        condition: service_completed_successfully
    volumes:
      - shared-data:/app/data

volumes:
  shared-data:
```

## Quick Reference

| Error | Likely Cause | Quick Fix |
|-------|--------------|-----------|
| Cannot connect to Docker daemon | User not in docker group | `sudo usermod -aG docker $USER` |
| Permission denied on volume | UID mismatch | `docker run -u $(id -u):$(id -g)` |
| Cannot write to mounted dir | Host permissions | `sudo chown -R 1000:1000 ./data` |
| COPY failed in build | File not readable | `chmod -R a+r ./src` |
| SELinux denial | Missing context | Add `:z` to volume mount |

## Summary

| Solution | When to Use |
|----------|-------------|
| Add user to docker group | Docker socket access |
| Run with `-u $(id -u):$(id -g)` | Match host user |
| Named volumes | Persistent data storage |
| `chown` in Dockerfile | Set file ownership |
| `:z` or `:Z` volume flag | SELinux systems |
| Init container | Complex permission setup |

Permission issues in Docker usually stem from UID/GID mismatches between host and container. Named volumes avoid most problems. For bind mounts, either match the container user to host user or run the container as root initially to fix permissions before switching to a non-root user.

