# How to Export a Container's Filesystem with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Filesystem, Container Export

Description: Learn how to export a Podman container's entire filesystem as a tar archive for backup, migration, analysis, and sharing.

---

> Exporting a container's filesystem captures its filesystem state as a portable tar archive.

Sometimes you need to capture a container's entire filesystem, whether for backup, migration to another system, forensic analysis, or sharing with team members. The `podman export` command creates a tar archive of the container's filesystem. This guide walks you through the process.

---

## Basic Export

Export a container's filesystem to a tar file:

```bash
# Start a container and add some data

podman run -d --name my-app nginx:latest
podman exec my-app /bin/bash -c "echo 'custom config' > /tmp/my-config.txt"

# Export the filesystem
podman export my-app > /tmp/my-app-filesystem.tar

# Check the archive size
ls -lh /tmp/my-app-filesystem.tar
```

## Using the -o Flag

Specify the output file with `-o`:

```bash
# Export with explicit output file
podman export -o /tmp/my-app-export.tar my-app

# Verify the file
file /tmp/my-app-export.tar
# Output: /tmp/my-app-export.tar: POSIX tar archive
```

## Exporting Stopped Containers

You can export both running and stopped containers:

```bash
# Stop the container
podman stop my-app

# Export still works
podman export -o /tmp/stopped-export.tar my-app
```

## Compressed Exports

Compress the export to save disk space:

```bash
# Export and compress with gzip
podman export my-app | gzip > /tmp/my-app.tar.gz

# Export and compress with bzip2
podman export my-app | bzip2 > /tmp/my-app.tar.bz2

# Export and compress with xz (best compression)
podman export my-app | xz > /tmp/my-app.tar.xz

# Compare sizes
ls -lh /tmp/my-app.tar* /tmp/my-app-filesystem.tar
```

## Examining the Export

Inspect the contents of the exported archive:

```bash
# List files in the archive
tar tf /tmp/my-app-filesystem.tar | head -20

# List with details
tar tvf /tmp/my-app-filesystem.tar | head -20

# Search for specific files
tar tf /tmp/my-app-filesystem.tar | grep nginx.conf

# Extract a single file from the archive
mkdir -p /tmp/extracted
tar xf /tmp/my-app-filesystem.tar -C /tmp/extracted/ etc/nginx/nginx.conf
```

## Extracting the Full Filesystem

Extract the complete filesystem for analysis:

```bash
# Create a directory for extraction
mkdir -p /tmp/container-fs

# Extract everything
tar xf /tmp/my-app-filesystem.tar -C /tmp/container-fs/

# Browse the filesystem
ls /tmp/container-fs/
# bin  boot  dev  etc  home  lib  ...

# Check custom files
cat /tmp/container-fs/tmp/my-config.txt
```

## Importing an Exported Filesystem

Import the filesystem as a new image:

```bash
# Import the tar as a new container image
podman import /tmp/my-app-filesystem.tar my-imported-image:v1

# Verify the image was created
podman images | grep my-imported-image

# Run a container from the imported image
podman run --rm my-imported-image:v1 cat /tmp/my-config.txt
# Output: custom config
```

## Export vs Save

Understanding the difference between export and save:

```bash
# export: Flattens the container filesystem into a single-layer tar
# - No image metadata, no layers, no history
# - Includes container runtime changes
podman export my-app > /tmp/export.tar

# save: Preserves the image with all layers and metadata
# - Includes Dockerfile history, labels, etc.
# - Does NOT include container runtime changes
podman save nginx:latest > /tmp/save.tar

# Compare the contents
echo "Export:"
tar tf /tmp/export.tar | head -5
echo ""
echo "Save:"
tar tf /tmp/save.tar | head -5
```

## Practical Use Cases

### Container Backup

```bash
# Backup script
CONTAINER="my-app"
BACKUP_DIR="/tmp/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"
podman export "$CONTAINER" | gzip > "${BACKUP_DIR}/${CONTAINER}-${TIMESTAMP}.tar.gz"
echo "Backup saved: ${BACKUP_DIR}/${CONTAINER}-${TIMESTAMP}.tar.gz"
echo "Size: $(ls -lh "${BACKUP_DIR}/${CONTAINER}-${TIMESTAMP}.tar.gz" | awk '{print $5}')"
```

### Migration Between Systems

```bash
# On source system: export
podman export -o /tmp/migrate-app.tar my-app

# Transfer to target system
# scp /tmp/migrate-app.tar user@target:/tmp/

# On target system: import and run
# podman import /tmp/migrate-app.tar migrated-app:v1
# podman run -d --name my-app migrated-app:v1 <command>
```

### Forensic Analysis

```bash
# Export a potentially compromised container
podman export -o /tmp/forensic-snapshot.tar suspicious-container

# Analyze without running the container
mkdir -p /tmp/forensic
tar xf /tmp/forensic-snapshot.tar -C /tmp/forensic/

# Check for suspicious files
find /tmp/forensic -name "*.sh" -newer /tmp/forensic/etc/hostname
find /tmp/forensic -perm -4000 -type f  # Find SUID files
```

## Cleanup

```bash
podman stop my-app 2>/dev/null
podman rm my-app 2>/dev/null
podman rmi my-imported-image:v1 2>/dev/null
rm -rf /tmp/my-app*.tar* /tmp/export.tar /tmp/save.tar /tmp/container-fs /tmp/extracted /tmp/forensic
```

## Summary

The `podman export` command creates a flat tar archive of a container's filesystem, including all runtime changes. Use it for backups, migration, and forensic analysis. Pipe through gzip or xz for compression. Remember that export differs from save: export captures the container filesystem without image metadata, while save preserves the full image with layers and history.
