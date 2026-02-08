# How to Use the VOLUME Instruction in Dockerfiles

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Dockerfile, VOLUME, Storage, Containers, Persistent Data

Description: Learn how the VOLUME instruction works in Dockerfiles, when to use it, and how it interacts with Docker's volume system.

---

The VOLUME instruction in a Dockerfile creates a mount point inside the container and marks it as holding externally mounted volumes. When a container starts from an image with a VOLUME instruction, Docker automatically creates an anonymous volume for that path if no volume or bind mount is explicitly provided.

This instruction is essential for containers that generate or manage persistent data, like databases, log files, or uploaded content. However, VOLUME has some surprising behaviors that trip up many developers. This guide explains exactly what it does, how it works, and when you should (and should not) use it.

## Basic Syntax

```dockerfile
# Create a single volume mount point
VOLUME /data

# Create multiple volume mount points
VOLUME /data /logs /config

# JSON array form
VOLUME ["/data", "/logs"]
```

## What VOLUME Actually Does

When you include `VOLUME /data` in a Dockerfile, Docker does the following:

1. During the build, the path `/data` is marked as a volume mount point
2. When a container is created from the image, Docker creates an anonymous volume and mounts it at `/data`
3. Any data written to `/data` inside the container goes to the volume, not the container's writable layer
4. The volume persists even after the container is removed (unless you use `docker rm -v`)

Here is an important detail: any changes to the VOLUME path after the VOLUME instruction in the Dockerfile are discarded. This catches many people off guard.

```dockerfile
FROM ubuntu:22.04

# Mark /data as a volume
VOLUME /data

# This file will NOT appear in the volume at runtime
# Changes after VOLUME are silently discarded during build
RUN echo "hello" > /data/greeting.txt
```

The `greeting.txt` file is created during the build, but it does not appear when the container runs because the volume mount replaces the directory contents. To pre-populate volume data, write files before the VOLUME instruction:

```dockerfile
FROM ubuntu:22.04

# Write files BEFORE the VOLUME instruction
RUN mkdir -p /data && echo "hello" > /data/greeting.txt

# Now mark /data as a volume - the greeting.txt will be copied to the volume
VOLUME /data
```

When Docker creates an anonymous volume for a VOLUME mount point, it copies the contents of the directory at that path in the image into the new volume. This copy only happens when the volume is first created.

## Practical Example: Database Container

Here is how a database Dockerfile typically uses VOLUME:

```dockerfile
FROM postgres:16

# Custom initialization scripts
COPY init.sql /docker-entrypoint-initdb.d/

# The official Postgres image already declares VOLUME /var/lib/postgresql/data
# But you could add additional volumes for custom paths
VOLUME /var/lib/postgresql/data
VOLUME /var/log/postgresql
```

The VOLUME instruction ensures that database files are stored on a volume rather than in the container's writable layer. This matters for performance (volumes bypass the storage driver) and data persistence.

## Anonymous Volumes vs Named Volumes

When VOLUME creates a volume automatically, it is an anonymous volume with a random hash as its name:

```bash
# Run a container from an image with VOLUME /data
docker run -d --name mydb mydbimage

# List volumes - you'll see an anonymous volume with a long hash
docker volume ls
# DRIVER    VOLUME NAME
# local     a1b2c3d4e5f6...
```

Anonymous volumes are hard to manage and easy to lose track of. For production use, override them with named volumes:

```bash
# Use a named volume instead of the anonymous one
docker run -d --name mydb -v pgdata:/var/lib/postgresql/data mydbimage

# The named volume is much easier to manage
docker volume ls
# DRIVER    VOLUME NAME
# local     pgdata
```

With Docker Compose, you can also specify named volumes:

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

## VOLUME vs -v Flag

The VOLUME instruction in a Dockerfile and the `-v` flag at runtime serve different purposes:

**VOLUME in Dockerfile**: Declares a mount point. Docker automatically creates an anonymous volume if nothing is mounted there.

**-v at runtime**: Explicitly mounts a named volume or bind mount at a path.

```bash
# The -v flag overrides the anonymous volume created by VOLUME
docker run -v /host/path:/data myimage

# Named volume
docker run -v myvolume:/data myimage

# Without -v, Docker creates an anonymous volume for paths declared with VOLUME
docker run myimage
```

The `-v` flag always takes precedence over the VOLUME instruction. If you specify a bind mount or named volume for a path declared with VOLUME, Docker uses your explicit mount instead of creating an anonymous volume.

## When to Use VOLUME

VOLUME is appropriate in these situations:

### Database Storage

Databases need persistent storage that survives container restarts and removals:

```dockerfile
FROM mysql:8.0
VOLUME /var/lib/mysql
```

### Log Directories

If your application writes logs to files, a volume keeps them accessible after the container stops:

```dockerfile
FROM nginx:alpine
VOLUME /var/log/nginx
```

### Upload Directories

Web applications that accept file uploads should store them on a volume:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
VOLUME /app/uploads
```

### Shared Data Between Containers

When multiple containers need to access the same data:

```bash
# Create a shared volume
docker volume create shared-data

# Mount it in multiple containers
docker run -v shared-data:/data container1
docker run -v shared-data:/data container2
```

## When NOT to Use VOLUME

There are cases where VOLUME causes more problems than it solves.

### Application Code

Never use VOLUME for directories containing your application code:

```dockerfile
# Bad - this prevents code updates in the image
WORKDIR /app
COPY . .
VOLUME /app  # Don't do this
```

If you declare `/app` as a volume, Docker creates an anonymous volume that shadows the application code from the image. New image builds will not update the code in running containers.

### Configuration Files

Volumes for configuration files make it harder to update configs through image rebuilds:

```dockerfile
# Bad - config changes in the image won't take effect
COPY config.yaml /etc/myapp/
VOLUME /etc/myapp  # Don't do this
```

### Temporary Data

For data that does not need to persist, use tmpfs mounts at runtime instead:

```bash
# Use tmpfs for temporary data (stored in memory, not on disk)
docker run --tmpfs /tmp myimage
```

## Volume Initialization Behavior

When Docker creates a volume for a VOLUME mount point, it copies the existing content of that directory from the image into the volume. This only happens once, when the volume is first created.

```dockerfile
FROM nginx:alpine

# Add custom HTML files
COPY index.html /usr/share/nginx/html/

# Declare the volume
VOLUME /usr/share/nginx/html
```

The first time this container runs, Docker copies `index.html` into the new volume. On subsequent runs using the same volume, the volume's contents are preserved and the image's files are not copied again.

This initialization behavior only works with Docker-managed volumes, not with bind mounts:

```bash
# Docker-managed volume: contents are initialized from the image
docker run -v webdata:/usr/share/nginx/html mynginx

# Bind mount: the host directory contents replace the container directory
docker run -v /host/html:/usr/share/nginx/html mynginx
```

## Inspecting Volumes

Check what volumes a container is using:

```bash
# List all volumes
docker volume ls

# Inspect a specific volume
docker volume inspect pgdata

# See which volumes a running container uses
docker inspect --format='{{json .Mounts}}' mycontainer | python3 -m json.tool
```

## Cleaning Up Volumes

Anonymous volumes accumulate over time and can waste significant disk space:

```bash
# Remove all unused volumes (not attached to any container)
docker volume prune

# Remove a specific volume
docker volume rm myvolume

# Remove a container and its anonymous volumes
docker rm -v mycontainer
```

## Summary

The VOLUME instruction declares a mount point in the container that Docker backs with an anonymous volume by default. It is useful for persistent data like databases and logs, but it has quirks: modifications after the VOLUME instruction in a Dockerfile are discarded, and anonymous volumes can accumulate if not managed. For production use, always override VOLUME declarations with named volumes using the `-v` flag. Use VOLUME for data that needs to persist or be shared, and avoid it for application code or configuration files.
