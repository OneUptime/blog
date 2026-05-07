# How to Use VFS Storage Driver with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Storage, VFS, Compatibility

Description: Learn how to configure and use the VFS storage driver with Podman for maximum compatibility on systems where overlay is not available.

---

> The VFS storage driver provides broad compatibility by using simple directory copies instead of filesystem-level layering, without depending on overlayfs support.

While the overlay driver is recommended for most environments, the VFS (Virtual File System) driver serves as a fallback when overlay is unavailable or impractical. VFS works by copying a parent layer into a new directory for each layer, making it slower and more disk-intensive than overlay. This guide explains when to use VFS and how to configure it properly.

---

## When to Use VFS

VFS is the right choice in specific scenarios.

```bash
# Check if your current driver is already VFS

podman info --format '{{.Store.GraphDriverName}}'

# Scenarios where VFS is appropriate:
# 1. Rootless environments where fuse-overlayfs is not available
# 2. Nested container or CI environments where overlay is unavailable or too slow
# 3. Systems where overlay cannot be used for the current workload
# 4. Testing and debugging storage issues
# 5. Situations where compatibility matters more than performance

# Check your filesystem type
df -T "$(podman info --format '{{.Store.GraphRoot}}')"
```

## Configuring VFS Driver

Set up VFS as the storage driver.

```bash
# Create storage configuration directory
mkdir -p ~/.config/containers

# If you're switching from another driver, reset storage before changing driver
# This removes all local containers, images, networks, and volumes
podman system reset --force

cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
# Use VFS storage driver
# VFS makes complete copies of each layer
# Does not rely on overlayfs support
driver = "vfs"

[storage.options.vfs]
# VFS has minimal configuration options
# No special filesystem support required
EOF

# Verify VFS is active
podman info --format '{{.Store.GraphDriverName}}'
```

## Understanding VFS Behavior

VFS creates full copies of each filesystem layer.

```bash
# Pull an image and observe VFS storage behavior
podman pull alpine:latest

# Check disk usage - VFS uses more space than overlay
podman system df

# VFS stores layer directories under vfs/dir
GRAPH_ROOT=$(podman info --format '{{.Store.GraphRoot}}')
echo "Graph root: $GRAPH_ROOT"
ls "$GRAPH_ROOT/vfs/dir/" 2>/dev/null | head -10

# Each layer directory is a complete copy of its parent plus changes
# Unlike overlay, there is no copy-on-write layer mount
du -sh "$GRAPH_ROOT/vfs/" 2>/dev/null
```

```bash
# Compare disk usage: pull two related images
podman pull alpine:3.18 2>/dev/null
podman pull alpine:3.19 2>/dev/null

# With VFS, layer contents are copied rather than mounted with copy-on-write
podman system df -v 2>/dev/null | head -15

# Check total storage used
GRAPH_ROOT=$(podman info --format '{{.Store.GraphRoot}}')
du -sh "$GRAPH_ROOT" 2>/dev/null
```

## VFS with Network-Mounted Home Directories

If your home directory is on NFS or another network filesystem, keep Podman storage on a local filesystem.

```bash
# Example: keep VFS storage on a local filesystem even if $HOME is on NFS
mkdir -p ~/.config/containers

# Reset before changing storage settings
podman system reset --force

cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
driver = "vfs"

# Podman does not support container storage on NFS.
# Point graphroot at a local filesystem instead.
graphroot = "/var/tmp/$USER-podman-storage"
runroot = "$XDG_RUNTIME_DIR/containers"

[storage.options.vfs]
# No special options needed
EOF

# On SELinux systems, label the new graphroot like the default rootless path
# sudo semanage fcontext -a -e $HOME/.local/share/containers /var/tmp/$USER-podman-storage
# sudo restorecon -R -v /var/tmp/$USER-podman-storage

# Keep graphroot and runroot on local filesystems
# Runtime data needs fast access and is ephemeral

# Verify
podman info --format '{{.Store.GraphDriverName}}'
podman info --format '{{.Store.GraphRoot}}'
```

## VFS in Nested Container Environments

VFS can be useful when running Podman inside containers.

```bash
# VFS is a useful fallback for Docker-in-Docker or Podman-in-Podman
# when overlay is unavailable or fuse-overlayfs is too slow

# Example: Running Podman inside a Podman container
podman run --rm -it \
    --security-opt label=disable \
    --device /dev/fuse \
    quay.io/podman/stable \
    podman info --format '{{.Store.GraphDriverName}}'

# If you want the inner Podman to use VFS, configure it explicitly
cat > /tmp/inner-storage.conf << 'EOF'
[storage]
driver = "vfs"
EOF

# Mount the config into the inner container
podman run --rm \
    --security-opt label=disable \
    -v /tmp/inner-storage.conf:/etc/containers/storage.conf:ro \
    quay.io/podman/stable \
    podman info --format '{{.Store.GraphDriverName}}'
```

## Managing Disk Space with VFS

VFS uses significantly more disk space, so active management is essential.

```bash
# Monitor disk usage regularly
podman system df

# Set up regular cleanup
# Remove unused images
podman image prune -a -f

# Remove stopped containers
podman container prune -f

# Remove unused volumes
podman volume prune -f

# Prune any remaining unused data
podman system prune -a -f

# Check disk usage after cleanup
podman system df
du -sh "$(podman info --format '{{.Store.GraphRoot}}')" 2>/dev/null
```

```bash
# Automate cleanup with a cron job or systemd timer
# Example cron entry (add with crontab -e):
# 0 3 * * * podman system prune -a -f > /dev/null 2>&1

# Monitor storage growth over time
echo "Current VFS storage usage:"
du -sh "$(podman info --format '{{.Store.GraphRoot}}')" 2>/dev/null
echo "Number of images: $(podman images -q | wc -l)"
echo "Number of containers: $(podman ps -aq | wc -l)"
```

## Performance Considerations

Understand and mitigate VFS performance limitations.

```bash
# VFS performance characteristics:
# - Slower image pulls (full layer copies)
# - More disk I/O during container creation
# - Higher disk usage (no layer sharing)
# - Slower container creation and startup

# Benchmark container startup with VFS
time podman run --rm alpine echo "VFS startup test"

# Benchmark image pull
time podman pull nginx:alpine 2>/dev/null

# Mitigation strategies:
# 1. Use fast storage (SSD/NVMe)
# 2. Minimize the number of cached images
# 3. Use multi-stage builds to reduce image size
# 4. Clean up regularly with podman system prune
```

## Switching Away from VFS

Migrate to a more efficient driver when possible.

```bash
# Save important images before switching
podman save --multi-image-archive -o /tmp/my-images.tar $(podman images -q)

# Reset storage before changing drivers
podman system reset --force

# Switch to overlay driver
cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
driver = "overlay"
EOF

# Restore images
podman load -i /tmp/my-images.tar

# Verify the switch
podman info --format '{{.Store.GraphDriverName}}'

# Compare disk usage after switching to overlay
podman system df
```

## Summary

The VFS storage driver is Podman's fallback when overlay or fuse-overlayfs is unavailable or impractical, especially in some rootless and nested-container environments. It trades performance and disk efficiency for compatibility by copying each parent layer into a new directory. If your home directory is on NFS, keep Podman storage on a local filesystem. When your environment supports overlay, switch to it for significantly better performance and disk usage.
