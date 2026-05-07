# How to Configure Storage Driver for Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Storage, Filesystem, Configuration

Description: Learn how to configure and switch between storage drivers in Podman including overlay, vfs, btrfs, and zfs for optimal container performance.

---

> The storage driver determines how Podman manages container filesystem layers, directly affecting performance, disk usage, and compatibility.

Podman supports multiple storage drivers, each with different trade-offs in performance, disk efficiency, and compatibility. Choosing the right driver depends on your host filesystem, kernel version, and whether you run containers as root or rootless. This guide covers how to configure and switch between storage drivers.

---

## Understanding Available Drivers

Podman supports several storage drivers for different environments.

```bash
# Check the currently active storage driver

podman info --format '{{.Store.GraphDriverName}}'

# View detailed driver information
podman info --format json | python3 -c "
import sys, json
info = json.load(sys.stdin)
store = info.get('store', {})
print('Current Driver:', store.get('graphDriverName'))
print('Graph Root:', store.get('graphRoot'))
print('Backing Filesystem:', store.get('graphStatus', {}).get('Backing Filesystem', 'unknown'))
"

# Available drivers:
# overlay    - Most efficient, uses kernel OverlayFS (recommended)
# vfs        - Simple copy-based driver (most compatible)
# btrfs      - Native btrfs subvolume support
# zfs        - Native ZFS dataset support
# fuse-overlayfs is a mount program for the overlay driver, not a separate driver.
```

## Checking Filesystem Compatibility

Determine which driver works best with your filesystem.

```bash
# Check the filesystem type of your storage location
df -T ~/.local/share/containers/storage/ 2>/dev/null || df -T ~

# Check kernel overlay support
grep -i overlay /proc/filesystems 2>/dev/null && echo "Kernel overlay supported"

# Check if fuse-overlayfs is available (for rootless on older kernels)
which fuse-overlayfs 2>/dev/null && echo "fuse-overlayfs available"

# Check for btrfs or zfs filesystems
mount | grep -E "btrfs|zfs" 2>/dev/null || echo "No btrfs/zfs mounts found"
```

## Configuring the Overlay Driver

Set up the overlay driver for the best performance on ext4 and xfs.

```bash
# Reset storage first if you are switching from another driver
podman system reset --force

# Configure overlay driver
mkdir -p ~/.config/containers

cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
driver = "overlay"

[storage.options.overlay]
# Enable metacopy for faster layer operations
# Requires kernel 4.19+ and overlay module
mountopt = "nodev,metacopy=on"

# For rootless on older kernels, use fuse-overlayfs
# mount_program = "/usr/bin/fuse-overlayfs"
EOF

# Verify the driver is active
podman info --format '{{.Store.GraphDriverName}}'
```

## Configuring the VFS Driver

Use VFS when overlay is not available or for maximum compatibility.

```bash
# Reset storage first if you are switching from another driver
podman system reset --force

# Configure VFS driver
cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
# VFS copies entire layers instead of using overlays
# Slower and uses more disk space, but works everywhere
driver = "vfs"

[storage.options.vfs]
# No special options needed for VFS
EOF

# Verify VFS is active
podman info --format '{{.Store.GraphDriverName}}'

# Note: VFS uses significantly more disk space
podman pull alpine
podman system df
```

## Configuring the Btrfs Driver

Use the native btrfs driver on btrfs filesystems.

```bash
# Check if storage is on btrfs
df -T ~/.local/share/containers/storage/ | grep btrfs

# Reset storage first if you are switching from another driver
podman system reset --force

# Configure btrfs driver
cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
# Native btrfs subvolume support
# Only works on btrfs filesystems
driver = "btrfs"

[storage.options.btrfs]
# Use btrfs native snapshots for layers
EOF

# Verify
podman info --format '{{.Store.GraphDriverName}}'
```

## Switching Between Drivers

Safely switch from one storage driver to another.

```bash
# Step 1: Save any important images
podman save --multi-image-archive -o /tmp/saved-images.tar alpine nginx 2>/dev/null

# Step 2: Stop all containers
podman stop -a 2>/dev/null

# Step 3: Reset storage (removes all data)
podman system reset --force

# Step 4: Update the storage configuration
cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
driver = "overlay"

[storage.options.overlay]
mountopt = "nodev"
EOF

# Step 5: Verify the new driver
podman info --format '{{.Store.GraphDriverName}}'

# Step 6: Restore saved images
podman load -i /tmp/saved-images.tar 2>/dev/null

# Step 7: Clean up
rm -f /tmp/saved-images.tar
```

## Performance Comparison

Understand the performance characteristics of each driver.

```bash
# Test image pull speed with the current driver
echo "Testing with driver: $(podman info --format '{{.Store.GraphDriverName}}')"
time podman pull alpine:latest 2>/dev/null

# Check disk usage per image
podman system df -v 2>/dev/null | head -20

# Performance ranking (typical):
# 1. overlay    - Fast, efficient copy-on-write, minimal disk usage
# 2. btrfs/zfs  - Fast native snapshots on supported filesystems
# 3. overlay with fuse-overlayfs - Slightly slower than kernel overlay
# 4. vfs        - Slowest, full copies of each layer

# Test container startup time
time podman run --rm alpine echo "Container started"
```

## Troubleshooting Driver Issues

Fix common storage driver problems.

```bash
# Check for overlay-specific errors
podman --log-level=debug info 2>&1 | grep -i "storage\|driver\|overlay" | head -15

# Fix "kernel does not support overlay fs" error
# Option 1: Use fuse-overlayfs
cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
driver = "overlay"

[storage.options.overlay]
mount_program = "/usr/bin/fuse-overlayfs"
EOF

# Fix "mount program not found" error
# Install fuse-overlayfs on your system
# Fedora/RHEL: sudo dnf install fuse-overlayfs
# Ubuntu: sudo apt install fuse-overlayfs

# Fix corrupted storage
podman system reset --force
podman info --format '{{.Store.GraphDriverName}}'
podman run --rm alpine echo "Storage recovered"
```

## Summary

The storage driver is a fundamental Podman configuration that affects performance and disk usage. Use the overlay driver for most environments, overlay with fuse-overlayfs for rootless on older kernels, btrfs/zfs for native filesystem snapshots, and vfs only when nothing else works. Always run `podman system reset --force` before changing drivers, and save important images before making changes. Configure the driver in `storage.conf` under the `[storage]` section.
