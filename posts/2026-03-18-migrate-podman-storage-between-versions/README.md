# How to Migrate Podman Storage Between Versions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Storage Migration, Upgrade

Description: Learn how to safely migrate Podman storage when upgrading between major versions to avoid data loss and storage incompatibilities.

---

> A Podman version upgrade without proper storage migration planning can leave you with inaccessible images and broken containers.

When upgrading Podman across major versions, changes in container metadata, runtime configuration, or rootless user namespace mappings can affect existing containers. The `podman system migrate` command helps migrate existing containers to the current Podman version, but a well-planned migration strategy is essential for production environments. This guide covers the complete migration workflow from preparation to verification.

---

## Understanding Storage Migration

Podman uses layered storage managed by the containers/storage library. Major version changes can alter the storage format.

```bash
# Check your current storage driver and configuration

podman info --format 'Driver: {{.Store.GraphDriverName}}'
podman info --format 'GraphRoot: {{.Store.GraphRoot}}'
podman info --format 'RunRoot: {{.Store.RunRoot}}'

# Check the current Podman version before upgrading
podman version --format '{{.Client.Version}}'
```

## Pre-Migration Checklist

Before upgrading Podman, prepare your environment.

```bash
#!/bin/bash
# pre-migration-check.sh - Verify readiness for Podman storage migration

echo "=== Pre-Migration Checklist ==="

# Check current version
echo "Current Version: $(podman version --format '{{.Client.Version}}')"

# Check for running containers (must be stopped before migration)
RUNNING=$(podman ps -q | wc -l | tr -d ' ')
echo "Running containers: $RUNNING"
if [ "$RUNNING" -gt 0 ]; then
    echo "WARNING: Stop all running containers before migrating"
    podman ps --format "table {{.Names}}\t{{.Status}}"
fi

# Check for running pods
PODS=$(podman pod ps --filter status=running -q | wc -l | tr -d ' ')
echo "Running pods: $PODS"

# Show current storage usage
echo ""
echo "=== Current Storage Usage ==="
podman system df

# List all images for backup reference
echo ""
echo "=== Images to Preserve ==="
podman images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}"
```

## Exporting Images Before Migration

Save critical images before upgrading.

```bash
#!/bin/bash
# export-images.sh - Export all images before migration

EXPORT_DIR="/var/backup/podman-migration-$(date +%Y%m%d)"
mkdir -p "$EXPORT_DIR"

# Export each tagged image
podman images --format '{{.Repository}}:{{.Tag}}' | grep -v '<none>' | while read -r image; do
    SAFE_NAME=$(echo "$image" | tr '/:' '__')
    echo "Exporting: $image -> ${SAFE_NAME}.tar"
    podman save -o "${EXPORT_DIR}/${SAFE_NAME}.tar" "$image"
done

# Save image list for reference
podman images --format '{{.Repository}}:{{.Tag}}' > "${EXPORT_DIR}/image-list.txt"

echo "Images exported to: $EXPORT_DIR"
ls -lh "$EXPORT_DIR"
```

## Running podman system migrate

After upgrading the Podman binary, run the migrate command.

```bash
# Stop all containers and pods first
podman stop -a 2>/dev/null
podman pod stop -a 2>/dev/null

# Run the migration command
podman system migrate

# Verify the migration was successful
podman info --format 'Driver: {{.Store.GraphDriverName}}'
podman images
podman ps -a
```

The migrate command performs these operations:
- Migrates existing containers to the latest Podman version when needed
- Stops running containers and the rootless pause process so namespace changes can take effect
- Updates container runtime configuration, such as moving containers to a new OCI runtime when `--new-runtime` is used

## Migrating Storage Drivers

If you need to switch storage drivers during migration, export the data you need first. Podman requires `podman system reset` before changing storage configuration fields such as `driver`; the reset removes local pods, containers, images, networks, volumes, and the configured storage directories.

```bash
# View current storage configuration
cat /etc/containers/storage.conf

# For rootless users, check the user-level config
cat ~/.config/containers/storage.conf 2>/dev/null

# To switch from vfs to overlay (example)
# First, reset the current storage before changing the driver
podman system reset --force

# Then edit the storage configuration
mkdir -p ~/.config/containers
cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
driver = "overlay"

[storage.options.overlay]
mount_program = "/usr/bin/fuse-overlayfs"
EOF

# Reimport saved images after the reset
for tarfile in /var/backup/podman-migration-*/*.tar; do
    podman load -i "$tarfile"
done
```

## Handling Migration Errors

Common migration errors and their solutions.

```bash
# Error: "layer not known" - indicates corrupted storage
# Solution: Reset storage and reimport images
podman system reset --force
# Then reimport from backup:
for tarfile in /var/backup/podman-migration-*/*.tar; do
    podman load -i "$tarfile"
done

# Error: "storage driver mismatch"
# Solution: Ensure storage.conf matches the expected driver
podman info --format '{{.Store.GraphDriverName}}'

# Error: "permission denied on migrate"
# Solution: Check ownership of storage directories
ls -la $(podman info --format '{{.Store.GraphRoot}}')
```

## Post-Migration Verification

After migration, verify that everything is working correctly.

```bash
#!/bin/bash
# post-migration-verify.sh - Verify Podman migration success

echo "=== Post-Migration Verification ==="

# Check new Podman version
echo "New Version: $(podman version --format '{{.Client.Version}}')"

# Check storage driver
echo "Storage Driver: $(podman info --format '{{.Store.GraphDriverName}}')"

# Verify images are accessible
echo ""
echo "=== Image Check ==="
IMAGE_COUNT=$(podman images -q | wc -l | tr -d ' ')
echo "Total images: $IMAGE_COUNT"

# Test pulling a new image
echo "Testing image pull..."
podman pull docker.io/library/alpine:latest

# Test running a container
echo "Testing container run..."
podman run --rm alpine echo "Migration verification passed"

# Check for any errors in storage
echo ""
echo "=== Storage Status ==="
podman system df
```

## Migrating Volumes Between Hosts

When moving to a new host with a different Podman version, migrate volumes explicitly.

```bash
# On the source host: export volume data
VOLUME_NAME="my-data"
podman volume export "$VOLUME_NAME" > "volume-${VOLUME_NAME}.tar"

# Transfer the tar file to the new host
scp "volume-${VOLUME_NAME}.tar" user@newhost:/tmp/

# On the destination host: create and import the volume
podman volume create "$VOLUME_NAME"
podman volume import "$VOLUME_NAME" "/tmp/volume-${VOLUME_NAME}.tar"

# Verify the volume contents
podman run --rm -v "${VOLUME_NAME}:/data:ro" alpine ls -la /data
```

## Automating the Full Migration Workflow

Combine all steps into a single migration script.

```bash
#!/bin/bash
# full-migration.sh - Complete Podman storage migration workflow
set -e

BACKUP_DIR="/var/backup/podman-migration-$(date +%Y%m%d)"

echo "Step 1: Stopping all containers..."
podman stop -a 2>/dev/null || true
podman pod stop -a 2>/dev/null || true

echo "Step 2: Exporting images..."
mkdir -p "$BACKUP_DIR"
podman images --format '{{.Repository}}:{{.Tag}}' | grep -v '<none>' | while read -r img; do
    SAFE=$(echo "$img" | tr '/:' '__')
    podman save -o "${BACKUP_DIR}/${SAFE}.tar" "$img"
done

echo "Step 3: Running migration..."
podman system migrate

echo "Step 4: Verifying migration..."
podman run --rm docker.io/library/alpine:latest echo "Migration successful"

echo "=== Migration Complete ==="
```

## Summary

Migrating Podman storage between versions requires careful planning, especially in production environments. Always export your images and volume data before upgrading, run `podman system migrate` after the upgrade, and verify the results with test containers. If migration fails, having backups allows you to reset and reimport your data cleanly. For major version jumps, test the migration process in a staging environment first.
