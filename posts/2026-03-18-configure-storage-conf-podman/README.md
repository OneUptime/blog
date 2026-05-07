# How to Configure storage.conf for Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Configuration, Storage

Description: Learn how to configure storage.conf to control where and how Podman stores container images, layers, and runtime data.

---

> storage.conf is the configuration file that controls Podman's storage backend, defining where images and containers are stored and which filesystem driver to use.

Podman relies on `storage.conf` to manage its storage subsystem, which handles container images, layers, and writable container filesystems. Properly configuring this file is essential for performance, disk space management, and multi-user environments. This guide walks through the key settings and how to customize them.

---

## Understanding storage.conf

The storage.conf file controls the containers/storage library used by Podman.

```bash
# Check the current storage configuration

podman info --format '{{.Store.GraphDriverName}}'
podman info --format '{{.Store.GraphRoot}}'
podman info --format '{{.Store.RunRoot}}'

# Find storage.conf locations
# Vendor defaults
ls -la /usr/share/containers/storage.conf 2>/dev/null

# System-wide overrides
ls -la /etc/containers/storage.conf 2>/dev/null

# User-level overrides (rootless)
ls -la ~/.config/containers/storage.conf 2>/dev/null
```

## File Structure and Key Sections

The storage.conf file has three main sections.

```bash
# Create a user-level storage configuration
mkdir -p ~/.config/containers

cat > ~/.config/containers/storage.conf << 'EOF'
# Podman storage configuration

[storage]
# Storage driver to use (overlay, vfs, btrfs, zfs)
driver = "overlay"

# Primary storage location for images and containers
graphroot = "$HOME/.local/share/containers/storage"

# Runtime storage for active containers
runroot = "$XDG_RUNTIME_DIR/containers"

[storage.options]
# Driver-specific options go here

[storage.options.overlay]
# Overlay driver specific settings
# mount_program = "/usr/bin/fuse-overlayfs"
EOF
```

## Configuring the Storage Driver

Choose the right storage driver for your environment.

```bash
# Check the active storage driver
podman info --format '{{.Store.GraphDriverName}}'

# View driver status
podman info --format json | python3 -c "
import sys, json
info = json.load(sys.stdin)
store = info.get('store', {})
print('Driver:', store.get('graphDriverName'))
print('Graph Root:', store.get('graphRoot'))
print('Run Root:', store.get('runRoot'))
print('Image Count:', store.get('imageStore', {}).get('number', 0))
"
```

```bash
# Configure overlay driver (recommended for most systems)
cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
driver = "overlay"

[storage.options.overlay]
# Use fuse-overlayfs for rootless when kernel overlay is not available
# mount_program = "/usr/bin/fuse-overlayfs"

# Enable metacopy for faster layer operations
# mountopt = "nodev,metacopy=on"
EOF
```

## Configuring Storage Paths

Set custom paths for image and container storage.

```bash
# Configure custom storage locations
cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
driver = "overlay"

# Store images and layers in a custom location
# Useful when home directory has limited space
graphroot = "$HOME/.local/share/containers/storage"

# Runtime data (ephemeral, lost on reboot)
runroot = "$XDG_RUNTIME_DIR/containers"

[storage.options.overlay]
# Optional: overlay-specific mount options
# mountopt = "nodev"
EOF

# Verify the storage paths
podman info --format '{{.Store.GraphRoot}}'
podman info --format '{{.Store.RunRoot}}'
```

## Managing Storage Space

Monitor and manage Podman's disk usage.

```bash
# Check current storage usage
podman system df

# Detailed storage breakdown
podman system df -v

# View image storage location and size
du -sh ~/.local/share/containers/storage/ 2>/dev/null

# Clean up unused images and containers
podman system prune -f

# Remove all unused images (including tagged)
podman image prune -a -f

# Check storage after cleanup
podman system df
```

## Rootless vs Root Storage Paths

Understand the different default paths for root and rootless users.

```bash
# Rootless (normal user) defaults:
# graphroot: ~/.local/share/containers/storage
# runroot: $XDG_RUNTIME_DIR/containers

# Root defaults:
# graphroot: /var/lib/containers/storage
# runroot: /run/containers/storage

# Check your current paths
echo "Graph root: $(podman info --format '{{.Store.GraphRoot}}')"
echo "Run root: $(podman info --format '{{.Store.RunRoot}}')"

# View the actual directory structure
ls -la "$(podman info --format '{{.Store.GraphRoot}}')" 2>/dev/null | head -10
```

## Validating Storage Configuration

Ensure your storage configuration is correct and functional.

```bash
# Validate the configuration
podman info > /dev/null 2>&1 && echo "Storage config is valid" || echo "Storage config has errors"

# Run a test to verify storage is working
podman pull alpine:latest
podman run --rm alpine echo "Storage working correctly"

# Check for any storage inconsistencies
podman system check 2>/dev/null || echo "Run 'podman system reset' if storage is corrupted"

# View debug information about storage initialization
podman --log-level=debug info 2>&1 | grep -i "storage\|graph\|overlay" | head -15
```

## Summary

The `storage.conf` file controls Podman's storage subsystem, defining the filesystem driver, storage locations, and driver-specific options. Choose the overlay driver for most environments, configure custom `graphroot` paths when disk space is limited, and monitor usage with `podman system df`. User-level configuration at `~/.config/containers/storage.conf` overrides system defaults, and changing the storage driver requires clearing existing storage with `podman system reset` before the new driver takes effect.
