# How to Copy Files from a Stopped Container in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, File Management, Container Recovery

Description: Learn how to extract files from stopped or exited Podman containers using podman cp, podman mount, and podman export techniques.

---

> Stopped containers still hold their data, and Podman provides several ways to extract files from them without restarting.

When a container stops or crashes, its filesystem is still preserved until the container is removed. This means you can extract log files, configuration data, and application output from exited containers. This guide shows you multiple techniques for accessing files in stopped containers.

---

## Using podman cp on Stopped Containers

The `podman cp` command works on stopped containers just like running ones:

```bash
# Create a container that generates data and then stops

podman run --name crash-app alpine /bin/sh -c "echo 'important data' > /tmp/output.txt; echo 'error log' > /tmp/error.log; exit 1"

# Verify the container has exited
podman ps -a --filter name=crash-app
# Status should show "Exited (1)"

# Copy files from the stopped container
podman cp crash-app:/tmp/output.txt /tmp/recovered-output.txt
podman cp crash-app:/tmp/error.log /tmp/recovered-error.log

# View the recovered files
cat /tmp/recovered-output.txt
# Output: important data
cat /tmp/recovered-error.log
# Output: error log
```

## Copying Directories from Stopped Containers

Copy entire directory trees:

```bash
# Create a container with multiple files
podman run --name data-container alpine /bin/sh -c "
    mkdir -p /app/logs /app/data
    echo 'log entry 1' > /app/logs/app.log
    echo 'log entry 2' > /app/logs/error.log
    echo '{\"key\": \"value\"}' > /app/data/config.json
"

# Copy the entire /app directory
podman cp data-container:/app /tmp/recovered-app/

# Browse the recovered data
find /tmp/recovered-app -type f -exec echo "Found: {}" \; -exec cat {} \; -exec echo "" \;
```

## Using podman export on Stopped Containers

Export the entire filesystem for thorough analysis:

```bash
# Export the stopped container's filesystem
podman export data-container > /tmp/container-filesystem.tar

# Extract specific files
mkdir -p /tmp/extracted
tar xf /tmp/container-filesystem.tar -C /tmp/extracted/ app/logs/app.log app/data/config.json

# Or extract everything
mkdir -p /tmp/full-extract
tar xf /tmp/container-filesystem.tar -C /tmp/full-extract/
ls /tmp/full-extract/app/
```

## Using podman mount (Rootful Mode)

In rootful mode, you can mount the container's filesystem directly:

```bash
# Mount the stopped container's filesystem (requires root)
# sudo podman mount data-container
# Returns: /var/lib/containers/storage/overlay/.../merged

# Access files directly through the mount point
# MOUNT_PATH=$(sudo podman mount data-container)
# cat ${MOUNT_PATH}/app/logs/app.log

# Unmount when done
# sudo podman unmount data-container
```

## Recovering Logs from Crashed Containers

A common scenario is extracting logs from a container that crashed:

```bash
# Simulate a crashing container
podman run --name web-crash nginx:latest /bin/sh -c "
    echo 'Starting server...' > /var/log/nginx/startup.log
    echo 'Error: config invalid' >> /var/log/nginx/startup.log
    exit 1
"

# Container has exited, but we can still get the logs
podman cp web-crash:/var/log/nginx/startup.log /tmp/crash-log.txt
cat /tmp/crash-log.txt

# Also check the container logs (stdout/stderr)
podman logs web-crash
```

## Finding Files in Stopped Containers

You cannot run `find` inside a stopped container, but you can use export to search:

```bash
# List all files in a stopped container
podman export data-container | tar tf - | grep -i "config"

# Find large files
podman export data-container | tar tvf - | sort -k3 -n -r | head -10

# Search for files matching a pattern
podman export data-container | tar tf - | grep "\.log$"
```

## Recovering from Multiple Stopped Containers

```bash
# List all stopped containers
podman ps -a --filter status=exited --format "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}"

# Bulk recovery of log files
mkdir -p /tmp/recovered-logs

for container in $(podman ps -a --filter status=exited --format '{{.Names}}'); do
    echo "Recovering from: $container"
    mkdir -p "/tmp/recovered-logs/$container"

    # Try to copy common log locations
    podman cp "$container":/var/log/ "/tmp/recovered-logs/$container/" 2>/dev/null
    podman cp "$container":/tmp/ "/tmp/recovered-logs/$container/tmp/" 2>/dev/null
done

echo "Recovered files:"
find /tmp/recovered-logs -type f | head -20
```

## Creating a Backup Before Removal

Always extract needed data before removing a container:

```bash
# Backup before removing
CONTAINER="crash-app"
BACKUP_DIR="/tmp/container-backups"

mkdir -p "$BACKUP_DIR"
podman export "$CONTAINER" | gzip > "${BACKUP_DIR}/${CONTAINER}-$(date +%Y%m%d).tar.gz"
echo "Backup created: ${BACKUP_DIR}/${CONTAINER}-$(date +%Y%m%d).tar.gz"

# Now it is safe to remove
podman rm "$CONTAINER"
```

## Temporary Start for Complex Recovery

If you need to run commands on the data, temporarily start the container:

```bash
# Commit the stopped container and run commands from the new image

podman commit data-container recovery-image:latest
podman run --rm -it recovery-image:latest /bin/sh -c "find /app -type f -name '*.log' -exec cat {} \;"

# Clean up the temporary image
podman rmi recovery-image:latest
```

## Cleanup

```bash
podman rm crash-app data-container web-crash 2>/dev/null
rm -rf /tmp/recovered-* /tmp/container-*.tar* /tmp/extracted /tmp/full-extract /tmp/crash-log.txt
```

## Summary

Stopped Podman containers retain their filesystem data until removed. Use `podman cp` for targeted file extraction, `podman export` for full filesystem access, and `podman mount` (rootful) for direct filesystem browsing. Always recover important data before running `podman rm`. These techniques are essential for post-mortem analysis of crashed containers.
