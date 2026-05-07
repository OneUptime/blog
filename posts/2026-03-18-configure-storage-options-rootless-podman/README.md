# How to Configure Storage Options for Rootless Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Storage, Rootless, Security

Description: Learn how to configure storage options specifically for rootless Podman to optimize performance and handle user namespace limitations.

---

> Rootless Podman requires special storage configuration to handle user namespace mapping, permission constraints, and the unique challenges of running containers without root privileges.

Running containers without root privileges is one of Podman's key advantages, but it introduces storage-related challenges. User namespace remapping, permission handling, and filesystem compatibility all require careful configuration. This guide covers the storage options specific to rootless Podman.

---

## Understanding Rootless Storage

Rootless Podman stores data in user-owned directories.

```bash
# Verify you are running rootless Podman

podman info --format '{{.Host.Security.Rootless}}'

# Check rootless storage paths
podman info --format '{{.Store.GraphRoot}}'
podman info --format '{{.Store.RunRoot}}'

# Default rootless storage locations:
# graphroot: ~/.local/share/containers/storage
# runroot: $XDG_RUNTIME_DIR/containers (usually /run/user/$(id -u)/containers)

# Check user namespace mapping
cat /etc/subuid | grep $(whoami)
cat /etc/subgid | grep $(whoami)
```

## Configuring User-Level Storage

Set up storage.conf for your rootless environment.

```bash
# Create user configuration directory
mkdir -p ~/.config/containers

# Create optimized rootless storage configuration
cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
# Overlay is the recommended driver for rootless
driver = "overlay"

# User-owned storage locations
graphroot = "$HOME/.local/share/containers/storage"
runroot = "$XDG_RUNTIME_DIR/containers"

[storage.options]
# Pull options for rootless
pull_options = {enable_partial_images = "true", use_hard_links = "false", ostree_repos=""}

[storage.options.overlay]
# Mount options optimized for rootless
mountopt = "nodev,metacopy=on"

# Use only in single-UID environments without subordinate ID ranges.
# This squashes image UIDs/GIDs to the user's UID/GID.
# ignore_chown_errors = "true"

# Use fuse-overlayfs if kernel overlay is not available
# mount_program = "/usr/bin/fuse-overlayfs"
EOF

# Verify the configuration
podman info --format '{{.Store.GraphDriverName}}'
```

## Setting Up User Namespace Mappings

Configure subordinate UID/GID mappings for rootless containers.

```bash
# Check current subordinate ID mappings
echo "SubUID mappings:"
cat /etc/subuid | grep $(whoami)

echo "SubGID mappings:"
cat /etc/subgid | grep $(whoami)

# If mappings are missing, add them (requires root)
# sudo usermod --add-subuids 100000-165535 $(whoami)
# sudo usermod --add-subgids 100000-165535 $(whoami)

# Verify the mapping range
# 65536 subordinate IDs is the common recommended range for broad image compatibility
podman info --format '{{.Host.IDMappings.UIDMap}}'
podman info --format '{{.Host.IDMappings.GIDMap}}'

# After changing subuid/subgid, reset storage
# podman system migrate
```

## Handling Permission Issues

Configure storage to work around rootless permission constraints.

```bash
# Enable ignore_chown_errors only for single-UID rootless environments
cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
driver = "overlay"

[storage.options.overlay]
# Use this only when subordinate UID/GID mappings are unavailable.
# It lets pulls proceed by storing all image files as the user's UID/GID,
# which removes UID/GID separation inside the image.
ignore_chown_errors = "true"

# Force a permission mask on overlay layers
# This ensures consistent permissions in rootless mode
# force_mask = "0755"

mountopt = "nodev,metacopy=on"
EOF

# Test that permission handling works
podman run --rm alpine sh -c '
    touch /tmp/test-file
    ls -la /tmp/test-file
    echo "Permission test passed"
'
```

## Optimizing Rootless Storage Performance

Tune storage for better performance in rootless mode.

```bash
# Performance-optimized rootless configuration
cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
driver = "overlay"

[storage.options]
# Enable partial image pulls for faster downloads
pull_options = {enable_partial_images = "true", use_hard_links = "false", ostree_repos=""}

# Use additionalimagestores for read-only shared images
# This allows multiple users to share base images
# additionalimagestores = ["/shared/containers/storage"]

[storage.options.overlay]
mountopt = "nodev,metacopy=on"
EOF

# Test pull performance
time podman pull alpine:latest 2>/dev/null

# Test container startup performance
time podman run --rm alpine echo "Performance test"
```

## Moving Rootless Storage to a Faster Disk

Relocate storage for better I/O performance.

```bash
# Check current storage disk performance
GRAPH_ROOT=$(podman info --format '{{.Store.GraphRoot}}')
echo "Current storage: $GRAPH_ROOT"
df -h "$GRAPH_ROOT"

# Move storage to a faster disk (e.g., SSD)
NEW_PATH="/fast-ssd/$(whoami)/containers/storage"
mkdir -p "$NEW_PATH"

# Reset existing storage before changing storage.conf
podman system reset --force

# Update configuration
cat > ~/.config/containers/storage.conf << EOF
[storage]
driver = "overlay"

# Point to faster storage
graphroot = "$NEW_PATH"

# Keep runtime data on tmpfs for speed
runroot = "$XDG_RUNTIME_DIR/containers"

[storage.options.overlay]
mountopt = "nodev,metacopy=on"
EOF

# Verify
podman info --format '{{.Store.GraphRoot}}'
```

## Managing Rootless Storage Space

Monitor and clean up rootless storage.

```bash
# Check storage usage
podman system df

# Detailed view
podman system df -v

# Clean up unused resources
podman system prune -f

# Remove all unused images including tagged ones
podman image prune -a -f

# Check actual disk usage
du -sh "$(podman info --format '{{.Store.GraphRoot}}')"

# Monitor the runtime directory
du -sh "$(podman info --format '{{.Store.RunRoot}}')" 2>/dev/null

# Set up automatic cleanup (add to crontab)
# crontab -e
# 0 2 * * 0 podman system prune -a -f > /dev/null 2>&1
```

## Troubleshooting Rootless Storage

Fix common rootless storage issues.

```bash
# Issue: "permission denied" on storage operations
# Check subuid/subgid mappings
cat /etc/subuid | grep $(whoami)
cat /etc/subgid | grep $(whoami)

# Issue: "overlay not supported" in rootless mode
# Use fuse-overlayfs or check kernel version
uname -r
which fuse-overlayfs 2>/dev/null

# Issue: Storage corruption after system crash
podman system reset --force
podman info --format '{{.Store.GraphDriverName}}'

# General debugging
podman --log-level=debug info 2>&1 | grep -i "storage\|rootless\|overlay" | head -15

# Verify everything works after fixes
podman run --rm alpine echo "Rootless storage OK"
```

## Summary

Rootless Podman requires careful storage configuration to handle user namespace mapping and permission constraints. Ensure subordinate UID/GID mappings are configured in `/etc/subuid` and `/etc/subgid`, use `ignore_chown_errors` only in single-UID environments where subordinate ID mappings are unavailable, and use `metacopy=on` where your overlay implementation supports it. Place `graphroot` on a fast filesystem while keeping `runroot` on tmpfs. Regular cleanup with `podman system prune` prevents storage bloat in rootless environments.
