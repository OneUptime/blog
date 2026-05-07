# How to Use Overlay Storage Driver for Best Performance in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Overlay, Storage Driver, Performance, Filesystem, Linux, Container, DevOps

Description: A deep dive into configuring and optimizing the overlay storage driver in Podman for maximum container filesystem performance, including rootless setup, kernel requirements, and tuning options.

---

> The overlay storage driver is one of the fastest and most efficient general-purpose options for Podman container storage. Properly configured, it delivers near-native filesystem performance with minimal overhead.

The storage driver determines how Podman manages image layers and container filesystems. It affects every operation from pulling images to reading files inside a running container. The overlay driver uses the Linux kernel's OverlayFS to stack filesystem layers efficiently, providing copy-on-write semantics with excellent performance. This guide covers how to configure, optimize, and troubleshoot the overlay driver for both rootful and rootless Podman deployments.

---

## How OverlayFS Works

OverlayFS stacks multiple directories into a single unified view:

```text
Container View (merged)
├── /app/server          (from upper layer - container writes)
├── /usr/bin/curl        (from lower layer 2 - image layer)
├── /etc/config.yaml     (from lower layer 1 - base image)
└── /bin/sh              (from lower layer 0 - base image)

Upper Layer (read-write) ─── Container-specific changes
Lower Layer 2 (read-only) ── Application image layer
Lower Layer 1 (read-only) ── Dependencies layer
Lower Layer 0 (read-only) ── Base OS layer
```

When a container reads a file, OverlayFS finds it in the highest layer where it exists. When a container writes to a file from a lower layer, OverlayFS copies it to the upper layer first (copy-on-write). This means reads are fast because there is no data copying, and writes only incur overhead on the first modification.

---

## Verify and Enable the Overlay Driver

Check your current storage driver and switch to overlay:

```bash
# Check current driver

podman info --format '{{.Store.GraphDriverName}}'

# If not overlay, reset storage and reconfigure
podman system reset

# Configure overlay in storage.conf
# Rootful: /etc/containers/storage.conf
# Rootless: ~/.config/containers/storage.conf
```

```toml
# storage.conf
[storage]
driver = "overlay"
graphroot = "/var/lib/containers/storage"
runroot = "/run/containers/storage"

[storage.options.overlay]
# Overlay-specific options go here
```

After changing the driver, verify:

```bash
podman info --format '{{.Store.GraphDriverName}}'
# Output: overlay
```

---

## Kernel Requirements

The overlay driver requires specific kernel features:

```bash
# Check kernel version for rootless native overlay support (5.12.9+)
uname -r

# Verify OverlayFS is available
grep overlay /proc/filesystems
# Output: nodev  overlay

# Check if the overlay module is loaded
lsmod | grep overlay

# Load it if missing
sudo modprobe overlay

# Make it persistent
echo "overlay" | sudo tee /etc/modules-load.d/overlay.conf
```

For rootless Podman on kernels earlier than 5.12.9, you need fuse-overlayfs:

```bash
# Install fuse-overlayfs
# Debian/Ubuntu
sudo apt-get install -y fuse-overlayfs

# Fedora/RHEL
sudo dnf install -y fuse-overlayfs

# Verify installation
fuse-overlayfs --version

# If ~/.config/containers/storage.conf already exists,
# configure mount_program explicitly for rootless
```

```toml
[storage.options.overlay]
mount_program = "/usr/bin/fuse-overlayfs"
```

---

## Filesystem Requirements

The overlay driver requires specific filesystem features on the host:

```bash
# Check filesystem type of your storage location
df -T /var/lib/containers/storage

# XFS requires ftype=1 (d_type support)
xfs_info /var/lib/containers/storage | grep ftype
# Must show: ftype=1

# Create XFS with ftype=1 if needed
sudo mkfs.xfs -n ftype=1 /dev/sdX

# Ext4 supports overlay natively
# Btrfs and ZFS have their own overlay-like drivers
```

If your XFS filesystem has `ftype=0`, you must recreate it. There is no way to change this on an existing filesystem:

```bash
# Check and fix XFS ftype
xfs_info /mnt/data | grep ftype

# If ftype=0, backup data and recreate
sudo umount /mnt/data
sudo mkfs.xfs -n ftype=1 -f /dev/sdX
sudo mount /dev/sdX /mnt/data
# Restore data
```

---

## Enable Metacopy for Faster Copy-on-Write

Metacopy is an overlay optimization that copies only file metadata during metadata-only copy-up, deferring data copy until the file is later opened for write:

```toml
# storage.conf
[storage.options.overlay]
mountopt = "nodev,metacopy=on"
```

Verify metacopy is active:

```bash
# Check if metacopy is enabled by default in the kernel
cat /sys/module/overlay/parameters/metacopy
# "Y" means enabled by default

# Make persistent via kernel parameter
# Add to /etc/default/grub: overlay.metacopy=on
```

Metacopy reduces copy-up overhead for workloads that change metadata on large files, because data is only copied up if the file is later opened for write. This is especially useful when containers frequently change ownership or mode bits without rewriting file contents.

---

## Configure Overlay Mount Options

Fine-tune overlay mount options for your workload:

```toml
# storage.conf
[storage.options.overlay]
# Recommended mount options
mountopt = "nodev,metacopy=on"

# For volatile workloads (faster, but crash-unsafe)
# mountopt = "nodev,metacopy=on,volatile"

# For redirect_dir (for some rename operations, incompatible with metacopy)
# mountopt = "nodev,redirect_dir=on"
```

The `volatile` option maps to `fsync=volatile`, omitting sync calls to the upper filesystem and improving write performance at the cost of crash consistency. Use it for ephemeral workloads like CI/CD builds:

```bash
# Run a build container with volatile overlay
podman --storage-opt "overlay.mountopt=nodev,metacopy=on,volatile" run --rm \
  build-image make build
```

---

## Optimize Layer Management

The number and size of layers affect overlay performance. Optimize your image layers:

```bash
# Check layer count for an image
podman image inspect --format '{{len .RootFS.Layers}}' your-image

# View layer sizes
podman history --format "{{.Size}}\t{{.CreatedBy}}" your-image

# Squash layers to reduce overhead
podman build --squash -t your-image:optimized .
```

Fewer layers mean faster container creation and less overhead for file lookups. However, this trades off against build cache efficiency:

```bash
# Compare performance: many layers vs squashed
echo "--- Many Layers ---"
time podman create --name test1 your-image:many-layers true
podman rm test1

echo "--- Squashed ---"
time podman create --name test2 your-image:squashed true
podman rm test2
```

---

## Rootless Overlay Configuration

Rootless Podman has specific overlay requirements:

```toml
# ~/.config/containers/storage.conf
[storage]
driver = "overlay"
graphroot = "/home/user/.local/share/containers/storage"

[storage.options.overlay]
# For Podman 3.1+ on kernel 5.12.9+: native overlay (best performance)
# Omit mount_program to use native overlay

# For older kernels or when native overlay is unavailable: fuse-overlayfs
# mount_program = "/usr/bin/fuse-overlayfs"
```

Ensure subuid/subgid are configured:

```bash
# Check configuration
grep $(whoami) /etc/subuid /etc/subgid

# Add if missing
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $(whoami)

# Apply changes
podman system migrate
```

Compare rootless overlay performance:

```bash
# Benchmark native overlay vs fuse-overlayfs
echo "--- Native Overlay ---"
# Remove or comment out mount_program in storage.conf
time podman run --rm alpine:latest dd if=/dev/zero of=/tmp/test bs=1M count=100

echo "--- fuse-overlayfs ---"
# Set mount_program = "/usr/bin/fuse-overlayfs" in storage.conf
podman system reset
time podman run --rm alpine:latest dd if=/dev/zero of=/tmp/test bs=1M count=100
```

Native overlay generally outperforms fuse-overlayfs for I/O-heavy workloads.

---

## Troubleshoot Overlay Issues

Common overlay problems and solutions:

```bash
# Error: "overlay is not supported over <filesystem>"
# Solution: Use XFS with ftype=1 or ext4
df -T /var/lib/containers/storage

# Error: "kernel does not support overlay fs"
# Solution: Load the overlay module
sudo modprobe overlay

# Error: "fuse-overlayfs not found"
# Solution: Install fuse-overlayfs
sudo apt-get install -y fuse-overlayfs

# Error: "mounting overlay: permission denied"
# Solution: Check kernel version for rootless support
uname -r  # Need 5.12.9+ for rootless native overlay

# General troubleshooting: reset and reconfigure
podman system reset
# Edit storage.conf
podman info | grep -A5 graphDriver
```

Check for common misconfigurations:

```bash
#!/bin/bash
# overlay-check.sh - Verify overlay configuration

echo "=== Overlay Driver Health Check ==="

# Kernel version
KERNEL=$(uname -r)
echo "Kernel: $KERNEL"

# OverlayFS support
if grep -q overlay /proc/filesystems; then
  echo "OverlayFS: Supported"
else
  echo "OverlayFS: NOT supported - load overlay module"
fi

# Storage filesystem
GRAPH=$(podman info --format '{{.Store.GraphRoot}}')
FS_TYPE=$(df -T "$GRAPH" | tail -1 | awk '{print $2}')
echo "Filesystem: $FS_TYPE"

if [ "$FS_TYPE" = "xfs" ]; then
  FTYPE=$(xfs_info "$GRAPH" 2>/dev/null | grep ftype | awk -F= '{print $2}')
  echo "XFS ftype: $FTYPE"
  [ "$FTYPE" != "1" ] && echo "WARNING: XFS ftype must be 1 for overlay"
fi

# Current driver
DRIVER=$(podman info --format '{{.Store.GraphDriverName}}')
echo "Current driver: $DRIVER"

# Metacopy
if [ -f /sys/module/overlay/parameters/metacopy ]; then
  MC=$(cat /sys/module/overlay/parameters/metacopy)
  echo "Metacopy: $MC"
fi

echo "=== Check Complete ==="
```

---

## Conclusion

The overlay storage driver is the preferred general-purpose choice for Podman container storage. For rootful Podman, it works out of the box on modern kernels with XFS (ftype=1) or ext4 filesystems. For rootless Podman, Podman 3.1+ on kernel 5.12.9+ enables native overlay support with near-rootful performance, while fuse-overlayfs serves as a capable fallback for older kernels. Enable metacopy for metadata-heavy copy-up workloads, use the volatile mount option for ephemeral workloads, and minimize layer count in your images. With proper configuration, the overlay driver delivers filesystem performance that is nearly indistinguishable from native host filesystem access.
