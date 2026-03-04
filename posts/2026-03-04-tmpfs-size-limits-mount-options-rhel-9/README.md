# How to Configure tmpfs Size Limits and Mount Options on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, tmpfs, Configuration, Linux

Description: Learn how to properly configure tmpfs size limits and mount options on RHEL to control memory usage and security of RAM-based filesystems.

---

tmpfs is powerful but needs careful configuration. An unbounded tmpfs can consume all available RAM and crash your system. Incorrectly configured permissions can create security holes. This guide covers how to set size limits, inode limits, permissions, and security options for tmpfs on RHEL.

## Default tmpfs Behavior

Without a size limit, tmpfs defaults to 50% of RAM:

```bash
# Check default tmpfs sizes
df -h -t tmpfs
```

For a system with 16 GB RAM, default tmpfs mounts get an 8 GB limit. This is usually fine for system directories like `/dev/shm`, but custom tmpfs mounts should have explicit limits.

## Setting Size Limits

### Absolute Size

```bash
# Mount with a fixed 2 GB limit
mount -t tmpfs -o size=2G tmpfs /mnt/ramdisk
```

### Percentage of RAM

```bash
# Mount with a limit of 25% of RAM
mount -t tmpfs -o size=25% tmpfs /mnt/ramdisk
```

### Inode Limits

By default, tmpfs calculates inode count from the size. You can override this:

```bash
# Mount with a specific inode limit (max number of files)
mount -t tmpfs -o size=2G,nr_inodes=100000 tmpfs /mnt/ramdisk
```

To set unlimited inodes (not recommended for shared systems):

```bash
# Unlimited inodes
mount -t tmpfs -o size=2G,nr_inodes=0 tmpfs /mnt/ramdisk
```

## Configuring System tmpfs Mounts

### /dev/shm

The shared memory tmpfs is used by POSIX shared memory and semaphores. Configure it in fstab:

```bash
tmpfs  /dev/shm  tmpfs  defaults,size=4G,noexec,nosuid,nodev  0 0
```

### /tmp

RHEL can mount `/tmp` as tmpfs. Enable it:

```bash
# Enable tmpfs for /tmp
systemctl enable tmp.mount
```

Configure the size by overriding the unit:

```bash
# Create override directory
mkdir -p /etc/systemd/system/tmp.mount.d

# Set custom size and options
cat > /etc/systemd/system/tmp.mount.d/override.conf << 'EOF'
[Mount]
Options=mode=1777,strictatime,nosuid,nodev,size=4G
EOF

# Reload and remount
systemctl daemon-reload
systemctl restart tmp.mount
```

### /run

The `/run` tmpfs is managed by systemd. To change its size:

```bash
# Edit the runtime directory configuration
mkdir -p /etc/systemd/system/run-user-1000.mount.d
```

Or use the `RuntimeDirectorySize` setting in `logind.conf`:

```bash
# Set user runtime directory size
vi /etc/systemd/logind.conf
```

Set:

```bash
RuntimeDirectorySize=512M
```

## Security Mount Options

Apply these options to harden tmpfs mounts:

```bash
# Secure tmpfs configuration
mount -t tmpfs -o size=2G,mode=1777,noexec,nosuid,nodev tmpfs /mnt/ramdisk
```

| Option | Purpose |
|--------|---------|
| `noexec` | Prevents executing binaries from tmpfs |
| `nosuid` | Ignores SUID/SGID bits on files |
| `nodev` | Prevents device file creation |
| `mode=1777` | Sticky bit - users can only delete their own files |
| `mode=0700` | Only owner can access |

### Recommended Security Settings by Use Case

For `/tmp`:

```bash
tmpfs  /tmp  tmpfs  defaults,size=4G,mode=1777,noexec,nosuid,nodev  0 0
```

For `/dev/shm`:

```bash
tmpfs  /dev/shm  tmpfs  defaults,size=4G,noexec,nosuid,nodev  0 0
```

For application-specific tmpfs:

```bash
tmpfs  /var/lib/app/cache  tmpfs  defaults,size=1G,mode=0750,uid=appuser,gid=appgroup,noexec,nosuid,nodev  0 0
```

## Ownership and Permissions

Set ownership at mount time:

```bash
# Mount owned by a specific user and group
mount -t tmpfs -o size=1G,uid=1000,gid=1000,mode=0750 tmpfs /mnt/userdata
```

Or by name:

```bash
# Mount owned by the 'webserver' user
mount -t tmpfs -o size=1G,uid=apache,gid=apache,mode=0750 tmpfs /var/cache/webapp
```

## Monitoring tmpfs Usage

Keep an eye on tmpfs to prevent memory exhaustion:

```bash
# Check all tmpfs usage
df -h -t tmpfs

# Check specific mount
df -h /mnt/ramdisk

# Check system memory impact
free -h
```

For alerting:

```bash
#!/bin/bash
# /usr/local/bin/tmpfs-monitor.sh
THRESHOLD=80

df -h -t tmpfs --output=target,pcent | tail -n +2 | while read -r MOUNT PERCENT; do
    PERCENT_NUM=${PERCENT%\%}
    if [ "$PERCENT_NUM" -ge "$THRESHOLD" ] 2>/dev/null; then
        logger -p user.warning "TMPFS ALERT: $MOUNT at ${PERCENT} capacity"
    fi
done
```

## Resizing Live tmpfs

One of tmpfs's nice features - you can resize without unmounting:

```bash
# Grow tmpfs from 2 GB to 4 GB
mount -o remount,size=4G /mnt/ramdisk

# Shrink tmpfs (only works if data fits in new size)
mount -o remount,size=1G /mnt/ramdisk
```

Verify:

```bash
df -h /mnt/ramdisk
```

## Combining Options in fstab

A complete fstab example for multiple tmpfs mounts:

```bash
# System temp directory
tmpfs  /tmp        tmpfs  defaults,size=4G,mode=1777,noexec,nosuid,nodev  0 0

# Shared memory
tmpfs  /dev/shm    tmpfs  defaults,size=4G,noexec,nosuid,nodev  0 0

# Application cache
tmpfs  /var/cache/app  tmpfs  defaults,size=1G,mode=0750,uid=app,gid=app,noexec,nosuid,nodev  0 0

# Build directory
tmpfs  /tmp/build  tmpfs  defaults,size=8G,mode=1777,nosuid,nodev  0 0
```

## What Happens When tmpfs Is Full

When a tmpfs reaches its size limit:

- Write operations fail with ENOSPC (No space left on device)
- Applications see the same error as a full disk
- No data is corrupted
- Deleting files immediately frees space

Unlike a full disk, tmpfs recovery is instant once files are deleted.

## Summary

Configuring tmpfs on RHEL requires setting explicit size limits, applying security mount options (noexec, nosuid, nodev), and setting appropriate ownership. Always specify a size to prevent runaway memory consumption. Use security options to harden system tmpfs mounts like /tmp and /dev/shm. Monitor usage with `df` and set up alerts before tmpfs mounts fill up.
