# How to Use --volumes-from to Share Volumes in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Volumes, Storage, Data Sharing

Description: Learn how to use the --volumes-from flag in Podman to inherit all volume mounts from another container, enabling easy data sharing and sidecar patterns.

---

> The --volumes-from flag lets a container inherit all volume mounts from another container, making it simple to create sidecars, debug containers, and backup jobs.

When one container needs access to all the same volumes as another, specifying each volume individually is tedious and error-prone. The `--volumes-from` flag copies all volume mount definitions from a source container to a new one. This guide covers how to use it effectively.

---

## Basic Usage

```bash
# Start a container with volumes

podman run -d --name webapp \
    -v appdata:/app/data \
    -v applogs:/app/logs \
    -v appconfig:/app/config \
    myapp:latest

# Start a second container that inherits all volumes from webapp
podman run --rm --volumes-from webapp \
    alpine:latest \
    ls /app/data /app/logs /app/config
```

The second container has access to all three volumes at the same mount points as the original container.

## Read-Only Inheritance

Add `:ro` to mount all inherited volumes as read-only:

```bash
# Inherit volumes in read-only mode
podman run --rm --volumes-from webapp:ro \
    alpine:latest \
    cat /app/config/settings.yaml
```

## Sidecar Pattern for Log Collection

```bash
# Main application container with a log volume
podman run -d --name app \
    -v app-logs:/var/log/app \
    myapp:latest

# Log collection sidecar inherits the log volume
podman run -d --name log-collector \
    --volumes-from app:ro \
    cr.fluentbit.io/fluent/fluent-bit:latest \
    -i tail -p path=/var/log/app/*.log -o stdout
```

## Debugging a Running Container's Data

```bash
# Start a debug container with access to all volumes of a running container
podman run --rm -it \
    --volumes-from webapp \
    alpine:latest \
    sh

# Inside the debug container, you can:
# - Browse the data directories
# - Check file permissions
# - Examine log files
# - Verify configuration
```

## Backup Pattern

```bash
# Application container with data volumes
podman run -d --name database \
    -v db-data:/var/lib/db \
    -v db-config:/etc/db \
    database:latest

# Backup container inherits all volumes and creates an archive
podman run --rm \
    --volumes-from database:ro \
    -v /backup:/backup \
    alpine:latest \
    sh -c "tar czf /backup/db-backup-$(date +%Y%m%d).tar.gz /var/lib/db /etc/db"
```

## Chaining --volumes-from

You can chain volume inheritance across multiple containers:

```bash
# Container A has volume V1
podman run -d --name container-a \
    -v vol1:/data1 \
    alpine:latest sleep 3600

# Container B has V1 (from A) plus V2
podman run -d --name container-b \
    --volumes-from container-a \
    -v vol2:/data2 \
    alpine:latest sleep 3600

# Container C has V1 (from A) and V2 (from B)
podman run --rm \
    --volumes-from container-b \
    alpine:latest \
    ls /data1 /data2
```

## Combining --volumes-from with Additional Volumes

```bash
# Inherit volumes and add new ones
podman run -d --name backup-agent \
    --volumes-from webapp:ro \
    -v backup-output:/backup \
    alpine:latest \
    sh -c "tar czf /backup/data.tar.gz /app/data && sleep 3600"
```

## Using with Stopped Containers

The source container does not need to be running. You can inherit volumes from stopped containers:

```bash
# Stop the source container
podman stop webapp

# Still works - volumes-from references the container's config, not its state
podman run --rm \
    --volumes-from webapp \
    alpine:latest \
    ls /app/data
```

## Data Container Pattern

Create a container solely to hold volume definitions:

```bash
# Create a data container (does not need to run)
podman create --name data-container \
    -v pgdata:/var/lib/postgresql/data \
    -v pgconfig:/etc/postgresql \
    -v pgbackup:/backup \
    alpine:latest

# Use --volumes-from with the data container
podman run -d --name postgres \
    --volumes-from data-container \
    -e POSTGRES_PASSWORD=secret \
    postgres:16

# Backup container also uses the same volumes
podman run --rm \
    --volumes-from data-container:ro \
    -v /host/backups:/external-backup \
    alpine:latest \
    tar czf /external-backup/pg-$(date +%Y%m%d).tar.gz /var/lib/postgresql/data
```

## Inspecting Inherited Volumes

```bash
# See all mounts on a container that used --volumes-from
podman inspect backup-agent --format '{{range .Mounts}}{{.Type}}: {{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'
```

## Limitations and Considerations

```bash
# 1. The source container must exist (running or stopped)
podman run --volumes-from nonexistent alpine:latest
# Error: no container with name or ID "nonexistent" found

# 2. Volume mount points are fixed to the source container's paths
# You cannot remap mount points with --volumes-from

# 3. If the source container is removed, --volumes-from references break
# The volumes themselves persist, but you need to mount them explicitly

# 4. --volumes-from copies the mount configuration, not the data
# Both containers access the same underlying storage
```

## Practical CI/CD Example

```bash
# Build container creates artifacts
podman run --name builder \
    -v build-artifacts:/output \
    golang:1.26 \
    sh -c "go build -o /output/myapp ./cmd/server"

# Test container accesses the build output
podman run --rm \
    --volumes-from builder:ro \
    myapp-tests:latest \
    /output/myapp --run-tests

# Deploy container packages the artifact
podman run --rm \
    --volumes-from builder:ro \
    -v deploy-package:/package \
    alpine:latest \
    cp /output/myapp /package/

# Clean up
podman rm builder
```

## Summary

The `--volumes-from` flag inherits all volume mounts from a source container, preserving the original mount paths. Add `:ro` for read-only access. This is ideal for sidecar patterns, debugging, backups, and data container workflows. The source container can be running or stopped but must exist. Use it to avoid repeating long lists of volume mounts across related containers.
