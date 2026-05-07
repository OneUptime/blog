# How to Configure Storage Performance for Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Storage, Performance, DevOps, Overlay, Filesystem, Linux, Container

Description: A complete guide to configuring Podman storage for optimal performance, covering storage drivers, filesystem choices, graph root configuration, and I/O tuning techniques.

---

> Storage configuration is one of the most overlooked aspects of container performance. The wrong storage setup can make your containers ten times slower than they need to be.

Every container operation touches storage: pulling images, creating containers, writing application data, and reading configuration files. Podman stores images and container filesystems using a configurable storage driver on your host filesystem. Choosing the right storage driver, filesystem, and configuration can dramatically improve container I/O performance, startup time, and overall throughput. This guide walks through every storage-related configuration option and how to tune it for your workload.

---

## Understanding Podman Storage Architecture

Podman stores data in two primary locations:

```bash
# Check current storage configuration

podman info --format '{{.Store.GraphRoot}}'
podman info --format '{{.Store.RunRoot}}'
podman info --format '{{.Store.GraphDriverName}}'

# For rootless users, storage is typically at:
# Graph root: ~/.local/share/containers/storage
# Run root: $XDG_RUNTIME_DIR/containers
```

The **graph root** holds images and container layers (persistent). The **run root** holds runtime state like container PIDs and lock files (ephemeral). Each has different performance characteristics and optimization strategies.

---

## Choose the Right Storage Driver

Podman supports several storage drivers. The overlay driver is the best choice for most workloads:

| Driver | Performance | Compatibility | Use Case |
|--------|------------|---------------|----------|
| overlay | Excellent | Kernel 4.0+ | Default, recommended |
| overlay with fuse-overlayfs | Good | Rootless fallback | Older kernels, rootless |
| vfs | Poor | Universal | Testing, fallback only |
| btrfs | Good | Btrfs filesystem | Btrfs hosts |
| zfs | Good | ZFS filesystem | ZFS hosts |

Configure the storage driver in `storage.conf`:

```toml
# ~/.config/containers/storage.conf (rootless)
# /etc/containers/storage.conf (rootful)

[storage]
driver = "overlay"
graphroot = "/var/lib/containers/storage"
runroot = "/run/containers/storage"
```

Verify your current driver and switch if needed:

```bash
# Check current driver
podman info | grep -i graphdriver

# If switching drivers, reset storage first
podman system reset

# Then edit storage.conf and restart
```

---

## Optimize the Overlay Driver

The overlay driver has several tunable options:

```toml
# storage.conf
[storage]
driver = "overlay"

[storage.options.overlay]
# Use the kernel overlay mount implementation when supported
mount_program = ""

# Set the size of the overlay mount
# Useful for controlling disk usage per container
size = ""

# Enable metacopy for faster metadata-only file operations
# Only copies metadata, not data, on copy-up
mountopt = "nodev,metacopy=on"
```

For rootless Podman on older kernels, configure fuse-overlayfs:

```toml
[storage.options.overlay]
mount_program = "/usr/bin/fuse-overlayfs"
```

Check if your kernel supports native overlay for rootless:

```bash
# Check kernel version (5.13+ is recommended for native rootless overlay,
# especially on SELinux-enabled systems)
uname -r

# Test if native overlay works
unshare -rm sh -c 'mkdir -p /tmp/overlay/{lower,upper,work,merged} && \
  mount -t overlay overlay -o lowerdir=/tmp/overlay/lower,upperdir=/tmp/overlay/upper,workdir=/tmp/overlay/work /tmp/overlay/merged && \
  echo "Native overlay works" || echo "Need fuse-overlayfs"'
```

---

## Choose the Right Filesystem

The underlying filesystem significantly impacts container I/O performance:

```bash
# Check current filesystem
df -T /var/lib/containers/storage

# XFS with ftype=1 is optimal for overlay
mkfs.xfs -n ftype=1 /dev/sdX
mount /dev/sdX /var/lib/containers/storage

# Ext4 also works well
mkfs.ext4 /dev/sdX
mount /dev/sdX /var/lib/containers/storage
```

XFS with `ftype=1` is the recommended filesystem for the overlay driver. Without `ftype=1`, overlay operations require additional lookups:

```bash
# Verify ftype is enabled on XFS
xfs_info /var/lib/containers/storage | grep ftype
# Output should show: ftype=1
```

---

## Use SSD Storage

Moving your container storage to SSD dramatically improves performance:

```bash
# Mount SSD for container storage
mount /dev/nvme0n1p1 /fast-storage

# Configure Podman to use SSD storage
# In storage.conf:
[storage]
graphroot = "/fast-storage/containers/storage"
```

Benchmark the difference:

```bash
# Test I/O speed on current storage
fio --name=test --rw=randread --bs=4k --size=256m \
    --directory=/var/lib/containers/storage --direct=1

# Test I/O speed on SSD
fio --name=test --rw=randread --bs=4k --size=256m \
    --directory=/fast-storage --direct=1
```

---

## Configure Volume Performance

Volumes bypass the storage driver and provide direct filesystem access. Configure them for maximum performance:

```bash
# Named volume with specific mount options
podman volume create --opt device=tmpfs --opt type=tmpfs --opt o=size=1g fast-cache

# Use volumes for write-heavy workloads
podman run -v fast-cache:/app/cache \
  -v /fast-ssd/data:/app/data:Z \
  your-image

# Bind mount with specific options
podman run -v /host/path:/container/path:rw,Z,exec your-image
```

For database workloads, use direct bind mounts instead of the overlay filesystem:

```bash
# PostgreSQL with dedicated storage
podman run -d \
  --name postgres \
  -v /ssd/pgdata:/var/lib/postgresql/data:Z \
  -e POSTGRES_PASSWORD=secret \
  postgres:16

# MongoDB with performance-tuned mount
podman run -d \
  --name mongo \
  -v /ssd/mongodata:/data/db:Z \
  --mount type=tmpfs,destination=/tmp,tmpfs-size=512m \
  mongo:7
```

---

## Use tmpfs for Ephemeral Data

For temporary or cache data that does not need persistence, use tmpfs mounts. They are backed by RAM and are orders of magnitude faster than disk:

```bash
# tmpfs mount for temporary files
podman run --tmpfs /tmp:rw,size=256m,exec your-image

# tmpfs for application cache
podman run \
  --tmpfs /app/cache:rw,size=512m \
  --tmpfs /tmp:rw,size=128m \
  your-image

# Read-only root with tmpfs for writable paths
podman run --read-only \
  --tmpfs /tmp:rw,size=64m \
  --tmpfs /var/log:rw,size=32m \
  --tmpfs /run:rw,size=16m \
  your-image
```

---

## Manage Storage Cleanup

Accumulated images and layers consume disk space and fragment the filesystem, degrading performance over time:

```bash
# Remove unused images, containers, and volumes
podman system prune -a --volumes

# Remove only dangling images
podman image prune

# Set up automatic cleanup
# Add to crontab: 0 2 * * * podman system prune -a -f --volumes

# Check storage usage
podman system df
podman system df -v  # Verbose with per-image breakdown
```

Configure image pull behavior in `containers.conf`:

```toml
# ~/.config/containers/containers.conf
[engine]
# Image pull policy
pull_policy = "missing"
```

---

## Tune I/O Scheduling

Configure I/O scheduling for container workloads:

```bash
# Set I/O weight for a container (relative priority)
podman run --blkio-weight=500 your-image

# Limit I/O bandwidth
podman run \
  --device-read-bps /dev/sda:100mb \
  --device-write-bps /dev/sda:50mb \
  your-image

# Limit I/O operations per second
podman run \
  --device-read-iops /dev/sda:1000 \
  --device-write-iops /dev/sda:500 \
  your-image
```

At the system level, choose an appropriate I/O scheduler:

```bash
# Check current scheduler
cat /sys/block/sda/queue/scheduler

# For SSDs, use none/noop
echo none > /sys/block/sda/queue/scheduler

# For HDDs, use mq-deadline
echo mq-deadline > /sys/block/sda/queue/scheduler
```

---

## Storage Configuration for Rootless Podman

Rootless Podman has additional storage considerations:

```toml
# ~/.config/containers/storage.conf
[storage]
driver = "overlay"
graphroot = "/home/user/.local/share/containers/storage"
runroot = "/run/user/1000/containers"

[storage.options]
# Additional storage options can be set here

[storage.options.overlay]
# Use native overlay on kernel 5.13+ when supported
mount_program = ""
# Fallback for older kernels
# mount_program = "/usr/bin/fuse-overlayfs"
```

Ensure subuid and subgid ranges are configured:

```bash
# Check subuid/subgid configuration
cat /etc/subuid
cat /etc/subgid

# Add mappings if missing (run as root)
usermod --add-subuids 100000-165535 --add-subgids 100000-165535 username

# Verify the new mappings take effect
podman system migrate
```

---

## Benchmark Your Configuration

Use this script to benchmark storage performance:

```bash
#!/bin/bash
# benchmark-storage.sh

echo "=== Podman Storage Benchmark ==="
echo "Driver: $(podman info --format '{{.Store.GraphDriverName}}')"
echo "Root: $(podman info --format '{{.Store.GraphRoot}}')"
echo ""

# Test image pull speed
echo "--- Image Pull ---"
podman rmi alpine:latest 2>/dev/null
time podman pull alpine:latest

# Test container creation speed
echo "--- Container Create ---"
time podman create --name bench-test alpine:latest echo done
podman rm bench-test

# Test file write performance inside container
echo "--- Write Performance ---"
podman run --rm alpine:latest sh -c \
  'dd if=/dev/zero of=/tmp/test bs=1M count=100 2>&1 | tail -1'

# Test file read performance inside container
echo "--- Read Performance ---"
podman run --rm alpine:latest sh -c \
  'dd if=/dev/zero of=/tmp/test bs=1M count=100 2>/dev/null && \
   dd if=/tmp/test of=/dev/null bs=1M 2>&1 | tail -1'

echo "=== Benchmark Complete ==="
```

---

## Conclusion

Storage performance tuning is foundational to container performance. Start by using the overlay driver on XFS with `ftype=1` or ext4. Move your graph root to SSD storage if possible. Use volumes for write-heavy workloads and tmpfs for ephemeral data. Keep your storage clean with regular pruning. For rootless deployments, ensure your kernel supports native overlay or install fuse-overlayfs as a fallback. These configurations together ensure that storage is never the bottleneck in your container infrastructure.
