# How to Fix 'no space left on device' Errors in Podman

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, Container, Linux, Storage, Troubleshooting

Description: A detailed guide to diagnosing and fixing 'no space left on device' errors in Podman, including storage driver configuration, pruning strategies, and overlay filesystem tuning.

---

> The "no space left on device" error in Podman can be caused by actual disk exhaustion, inode limits, storage driver misconfiguration, or accumulated container artifacts. This guide covers all the common causes and their solutions.

Few errors are as immediately disruptive as "no space left on device." In Podman, this error can strike during image pulls, container creation, builds, or even routine container operations. The frustrating part is that your disk might actually have plenty of free space. The error can be triggered by inode exhaustion, storage driver limits, overlay filesystem issues, or runaway container logs.

This guide walks through each cause systematically so you can identify and fix the problem quickly.

---

## Check Actual Disk Usage

Start with the basics. Verify that your filesystem is genuinely out of space:

```bash
df -h
```

Pay attention to the filesystem where Podman stores its data. For rootless Podman, that is typically your home directory:

```bash
df -h ~/.local/share/containers/
```

For rootful Podman, check `/var/lib/containers/`:

```bash
df -h /var/lib/containers/
```

If the filesystem shows 100% usage, you need to free space. But if there is available space, the problem lies elsewhere.

## Check Inode Usage

Every file on a Linux filesystem consumes an inode. Container images with many small files can exhaust inodes even when there is plenty of disk space:

```bash
df -i
```

If inode usage is at or near 100%, you have found the problem. The fix is to remove unused images, containers, and volumes.

## Prune Unused Podman Resources

Podman accumulates stopped containers, dangling images, and unused volumes over time. A full prune clears all of these:

```bash
# Remove all stopped containers

podman container prune -f

# Remove all unused images (not just dangling ones)
podman image prune -a -f

# Remove all unused volumes
podman volume prune -f

# Remove all unused networks
podman network prune -f
```

Or do everything at once:

```bash
podman system prune -a -f --volumes
```

Check how much space Podman is using before and after pruning:

```bash
podman system info --format '{{.Store.GraphRoot}}'
du -sh ~/.local/share/containers/storage/
```

## Storage Driver Issues

Podman uses the `overlay` storage driver by default on most systems. If your kernel does not support overlay properly (common on older kernels or certain filesystems), Podman falls back to `vfs`, which copies entire image layers instead of using overlay mounts. This consumes significantly more disk space.

Check which storage driver Podman is using:

```bash
podman info --format '{{.Store.GraphDriverName}}'
```

If it shows `vfs`, you are using far more space than necessary. Before switching to `overlay`, reset Podman's storage:

```bash
podman system reset
```

This will delete all images, containers, networks, build cache, machines, and volumes. After the reset, switch to `overlay` by editing the storage configuration.

For rootless Podman, edit `~/.config/containers/storage.conf`:

```ini
[storage]
driver = "overlay"

[storage.options.overlay]
mount_program = "/usr/bin/fuse-overlayfs"
```

Make sure `fuse-overlayfs` is installed:

```bash
# Fedora/RHEL/CentOS
sudo dnf install fuse-overlayfs

# Ubuntu/Debian
sudo apt install fuse-overlayfs
```

Then pull your images again afterward.

## Overlay Filesystem Size Limits

Some systems configure overlay filesystems with a size limit. If you use `overlay` with a backing XFS filesystem, the project quota feature may impose limits.

Check for quota settings:

```bash
podman info --format '{{.Store.GraphOptions}}'
```

If you see a size option, you can increase it in the storage configuration:

```ini
[storage.options.overlay]
size = "20G"
```

## Container Log Files Filling Disk

Container logs can grow indefinitely. A single container with verbose output can fill a disk in hours.

Check the size of container logs:

```bash
# For rootless Podman
du -sh ~/.local/share/containers/storage/overlay-containers/*/userdata/ctr.log

# For rootful Podman
sudo du -sh /var/lib/containers/storage/overlay-containers/*/userdata/ctr.log
```

Limit log size when running containers:

```bash
podman run --log-opt max-size=10m myimage
```

This limits the log file to 10 MB. When the limit is reached, the log file is truncated. Note that Podman does not support the `max-file` option for log rotation (unlike Docker). Only `max-size` is available.

To set default log limits for all containers, edit `~/.config/containers/containers.conf`:

```ini
[containers]
log_size_max = 10485760
```

## Build Cache Consuming Space

Podman build operations create intermediate layers that accumulate over time. After multiple builds, these layers can consume substantial disk space.

View build cache:

```bash
podman system df
```

This shows a breakdown of space used by images, containers, and volumes. The output looks like:

```text
TYPE           TOTAL  ACTIVE  SIZE     RECLAIMABLE
Images         45     3       12.3GB   10.1GB (82%)
Containers     5      2       1.2GB    800MB (66%)
Local Volumes  12     4       3.4GB    2.1GB (61%)
```

Remove dangling images and persistent build cache:

```bash
podman image prune -f --build-cache
```

## Temporary Files and /tmp Space

Podman uses `/tmp` or `$TMPDIR` for various temporary operations during image pulls and builds. If `/tmp` is a separate partition with limited space, operations can fail even with ample space on the main filesystem.

Check `/tmp` usage:

```bash
df -h /tmp
```

Redirect Podman's temporary directory by setting the `TMPDIR` environment variable:

```bash
export TMPDIR=/home/user/podman-tmp
mkdir -p $TMPDIR
podman pull myimage
```

## Changing the Podman Storage Location

If your home directory is on a small partition, move Podman's storage to a larger filesystem. If you want to start with empty storage, reset Podman before changing the paths:

```bash
podman system reset
```

Then edit `~/.config/containers/storage.conf`:

```ini
[storage]
driver = "overlay"
graphroot = "/mnt/large-disk/containers/storage"
runroot = "/mnt/large-disk/containers/run"
```

Then start using Podman again:

```bash
podman info --format '{{.Store.GraphRoot}}'
```

For rootful Podman, edit `/etc/containers/storage.conf` with the same options.

## Monitoring and Prevention

Set up a simple monitoring script to alert you before space runs out:

```bash
#!/bin/bash
THRESHOLD=85
USAGE=$(df -h ~/.local/share/containers/ | awk 'NR==2 {gsub(/%/,""); print $5}')

if [ "$USAGE" -gt "$THRESHOLD" ]; then
    echo "WARNING: Podman storage at ${USAGE}% capacity"
    echo "Running automatic prune..."
    podman system prune -f
fi
```

Add a regular prune to your crontab:

```bash
crontab -e
# Add this line to prune weekly
0 3 * * 0 podman system prune -f --filter "until=168h" 2>/dev/null
```

## Conclusion

The "no space left on device" error in Podman has several potential causes beyond simple disk exhaustion. Check inode usage, verify your storage driver is `overlay` and not `vfs`, prune unused resources regularly, limit container log sizes, and ensure temporary directories have adequate space. If your default storage location is on a constrained partition, move Podman's graph root to a larger filesystem. Regular use of `podman system df` and periodic pruning will prevent most space-related issues from occurring in the first place.
