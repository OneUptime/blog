# How to Change Container Storage Location in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Storage, Configuration, Disk Management

Description: Learn how to change the default container storage location in Podman to use a different disk, partition, or directory for images and containers.

---

> Moving Podman's storage to a dedicated disk or partition prevents container images from filling up your root filesystem and improves I/O performance.

By default, Podman stores container images and data in your home directory (rootless) or `/var/lib/containers` (root). When disk space is limited or you want better I/O performance, moving storage to a separate disk or partition is the solution. This guide covers how to safely relocate Podman's storage.

---

## Checking Current Storage Location

Start by understanding where Podman currently stores data.

```bash
# View current storage paths

podman info --format '{{.Store.GraphRoot}}'
podman info --format '{{.Store.RunRoot}}'

# Check disk usage of current storage
du -sh "$(podman info --format '{{.Store.GraphRoot}}')" 2>/dev/null

# View overall storage statistics
podman system df

# Detailed breakdown by image and container
podman system df -v
```

## Preparing the New Storage Location

Set up the target directory with proper permissions.

```bash
# Example: Use a separate partition or disk mounted at /data
# For rootless Podman, use a directory you own
NEW_STORAGE="/data/containers/storage"

# Create the directory structure
sudo mkdir -p "$NEW_STORAGE"

# For rootless Podman, set ownership to your user
sudo chown -R $(id -u):$(id -g) "$NEW_STORAGE"

# Set proper permissions
chmod 700 "$NEW_STORAGE"

# Verify the target filesystem has enough space
df -h "$NEW_STORAGE"

# On SELinux systems, label the new storage path like the default location
# Rootless:
# sudo semanage fcontext -a -e "$HOME/.local/share/containers" /data/containers
# sudo restorecon -R -v /data/containers
# Root:
# sudo semanage fcontext -a -e /var/lib/containers /data/containers
# sudo restorecon -R -v /data/containers
```

## Stopping All Containers

Before changing storage, stop and clean up all running containers.

```bash
# Stop all running containers
podman stop -a

# List all containers to confirm none are running
podman ps -a

# Optional: Export important containers before migration
# podman export my-container > /tmp/my-container.tar

# Optional: Save important images
# podman save -o /tmp/my-image.tar my-image:latest
```

## Configuring the New Storage Path

Update storage.conf to point to the new location.

```bash
# If you plan to reset storage instead of copying it, run
# podman system reset --force before changing storage.conf

# Create or update user-level storage configuration
mkdir -p ~/.config/containers

cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
# Use overlay driver for best performance
driver = "overlay"

# New storage location for images and container layers
# Change this path to your desired location
graphroot = "/data/containers/storage"

# Runtime data (temporary, cleared on reboot)
# Keep this on a fast local filesystem
runroot = "$XDG_RUNTIME_DIR/containers"

[storage.options.overlay]
# Overlay-specific options
# mountopt = "nodev,metacopy=on"
EOF
```

## Resetting Podman Storage

Reset storage before changing the storage configuration if you want to start cleanly.

```bash
# Reset Podman to clear the current storage location
# WARNING: This removes all containers, images, and volumes
podman system reset --force

# After updating storage.conf, verify the new storage path is in use
podman info --format '{{.Store.GraphRoot}}'

# Confirm the new directory is being used
ls -la /data/containers/storage/ 2>/dev/null
```

## Migrating Existing Images

Re-pull or restore images in the new storage location.

```bash
# Re-pull commonly used images
podman pull alpine:latest
podman pull nginx:latest
podman pull postgres:latest

# Or restore from previously saved tarballs
# podman load -i /tmp/my-image.tar

# Verify images are stored in the new location
podman images
du -sh /data/containers/storage/

# Confirm the old storage is no longer in use
du -sh ~/.local/share/containers/storage/ 2>/dev/null || echo "Old storage cleared"
```

## Configuring Root Storage Location

For root Podman, edit the system-wide storage.conf.

```bash
# Reset root storage before changing storage.conf
sudo podman system reset --force

# Edit the system-wide storage configuration
sudo tee /etc/containers/storage.conf > /dev/null << 'EOF'
[storage]
driver = "overlay"

# Move root storage to a dedicated partition
graphroot = "/data/containers/storage"
runroot = "/run/containers/storage"

[storage.options.overlay]
mountopt = "nodev,metacopy=on"
EOF

# Verify the new root storage path
sudo podman info --format '{{.Store.GraphRoot}}'
```

## Using Symbolic Links as an Alternative

A symlink approach avoids configuration changes.

```bash
# Stop all containers first
podman stop -a

# Move existing storage to new location
CURRENT="$HOME/.local/share/containers/storage"
NEW="/data/containers/storage"

# Copy existing data while Podman is stopped
mkdir -p "$(dirname "$NEW")"
mkdir -p "$NEW"
cp -a "$CURRENT"/. "$NEW"/

# Move old directory aside and create symlink
mv "$CURRENT" "${CURRENT}.bak"
ln -s "$NEW" "$CURRENT"

# Verify the symlink
ls -la "$CURRENT"

# Test that Podman works with the symlink
podman pull alpine
podman run --rm alpine echo "Storage via symlink works"
```

## Verifying the Migration

Confirm everything works with the new storage location.

```bash
# Check storage info
podman info --format json | python3 -c "
import sys, json
info = json.load(sys.stdin)
store = info.get('store', {})
print('Graph Root:', store.get('graphRoot'))
print('Run Root:', store.get('runRoot'))
print('Driver:', store.get('graphDriverName'))
print('Images:', store.get('imageStore', {}).get('number', 0))
"

# Run a full test
podman pull alpine
podman run --rm alpine echo "New storage location verified"
podman system df

# Monitor disk usage on the new location
df -h /data/containers/storage/
```

## Summary

Changing Podman's storage location involves updating `graphroot` in `storage.conf` and, when starting cleanly, resetting the current storage with `podman system reset` before changing the configuration. Always back up important images before migration, and verify the new location has sufficient space and proper permissions. For rootless Podman, edit `~/.config/containers/storage.conf`; for root Podman, edit `/etc/containers/storage.conf`. Symbolic links offer a simpler alternative when you prefer not to modify configuration files.
