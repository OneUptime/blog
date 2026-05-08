# How to Mount a Container's Filesystem to the Host in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Filesystem, Container Mount

Description: Learn how to mount a Podman container's filesystem directly to the host using podman mount for direct file access, debugging, and analysis.

---

> Mounting a container's filesystem gives you direct host-level access to its root filesystem files without running commands inside the container.

While `podman cp` and `podman exec` let you interact with container files, sometimes you need direct filesystem access from the host. The `podman mount` command exposes a container's root filesystem as a regular directory on the host. This is powerful for debugging, forensic analysis, and bulk file operations.

---

## Understanding podman mount

The `podman mount` command mounts the container's root filesystem to a directory on the host:

```bash
# In rootful mode (requires sudo)

sudo podman run -d --name my-app nginx:latest

# Mount the container's filesystem
MOUNT_POINT=$(sudo podman mount my-app)
echo "Mounted at: $MOUNT_POINT"
# Output: /var/lib/containers/storage/overlay/.../merged
```

## Rootful vs Rootless Considerations

```bash
# Rootful mode: mount works directly
sudo podman mount my-app

# Rootless mode: requires entering the user namespace
# Option 1: Use podman unshare
podman unshare podman mount my-app

# Option 2: Use podman unshare for a shell session
podman unshare bash -c '
    MOUNT=$(podman mount my-app)
    echo "Mounted at: $MOUNT"
    ls "$MOUNT"
'
```

## Browsing the Mounted Filesystem

Once mounted, you can use standard file tools:

```bash
# Mount the container
MOUNT_POINT=$(sudo podman mount my-app)

# Browse like any regular directory
ls "$MOUNT_POINT"
# bin  boot  dev  etc  home  lib  ...

# Read configuration files
cat "$MOUNT_POINT/etc/nginx/nginx.conf"

# Search for files
find "$MOUNT_POINT/etc" -name "*.conf" -type f

# Check file permissions
ls -la "$MOUNT_POINT/var/log/nginx/"

# Get directory sizes
du -sh "$MOUNT_POINT/usr/" "$MOUNT_POINT/var/" "$MOUNT_POINT/etc/"
```

## Modifying Files Through the Mount

You can also write to the mounted filesystem:

```bash
MOUNT_POINT=$(sudo podman mount my-app)

# Edit a configuration file
echo "# Custom configuration" | sudo tee "$MOUNT_POINT/etc/nginx/conf.d/custom.conf"

# Create new files
sudo mkdir -p "$MOUNT_POINT/app/data"
echo '{"setting": "value"}' | sudo tee "$MOUNT_POINT/app/data/config.json"

# Verify from inside the container
sudo podman exec my-app cat /app/data/config.json
```

## Mounting Stopped Containers

Mount works on stopped containers too:

```bash
# Stop the container
sudo podman stop my-app

# Mount still works
MOUNT_POINT=$(sudo podman mount my-app)
ls "$MOUNT_POINT/var/log/nginx/"

# This is useful for post-mortem analysis
cat "$MOUNT_POINT/var/log/nginx/error.log" 2>/dev/null
```

## Practical Use Cases

### Forensic Analysis

```bash
MOUNT_POINT=$(sudo podman mount my-app)

# Check for recently modified files
find "$MOUNT_POINT" -mmin -60 -type f 2>/dev/null | head -20

# Look for suspicious files
find "$MOUNT_POINT" -perm -4000 -type f  # SUID files
find "$MOUNT_POINT" -name "*.sh" -newer "$MOUNT_POINT/etc/hostname"

# Check cron jobs
cat "$MOUNT_POINT/etc/crontab" 2>/dev/null
ls "$MOUNT_POINT/etc/cron.d/" 2>/dev/null
```

### Bulk File Operations

```bash
MOUNT_POINT=$(sudo podman mount my-app)

# Copy all logs to the host
cp -r "$MOUNT_POINT/var/log/" /tmp/container-logs/

# Backup specific directories
tar czf /tmp/nginx-config-backup.tar.gz -C "$MOUNT_POINT" etc/nginx/

# Compare files with another container
MOUNT_2=$(sudo podman mount another-container 2>/dev/null)
if [ -n "$MOUNT_2" ]; then
    diff "$MOUNT_POINT/etc/nginx/nginx.conf" "$MOUNT_2/etc/nginx/nginx.conf"
fi
```

### Debugging Application Issues

```bash
MOUNT_POINT=$(sudo podman mount my-app)

# Check application logs
tail -50 "$MOUNT_POINT/var/log/nginx/error.log" 2>/dev/null

# Inspect temp files
ls -la "$MOUNT_POINT/tmp/"

# Check /proc-like information (for running containers)
# Note: /proc and /sys inside the mount may not reflect the container's runtime state
```

## Listing All Mounts

Check which containers are currently mounted:

```bash
# List all mounted containers
sudo podman mount --no-trunc

# This shows container IDs and their mount points
```

## Using podman unshare for Rootless Access

For rootless Podman, `podman unshare` is the key:

```bash
# Create a rootless container
podman run -d --name rootless-app alpine sleep 3600

# Access the mount within the user namespace
podman unshare bash -c '
    MOUNT=$(podman mount rootless-app)
    echo "Files in container:"
    ls "$MOUNT"
    echo ""
    echo "Config files:"
    find "$MOUNT/etc" -name "*.conf" 2>/dev/null | head -10
    podman unmount rootless-app
'
```

## Safety Considerations

```bash
# Always unmount when done
sudo podman unmount my-app

# Do not modify system files that the running container depends on
# Changes to files like /etc/resolv.conf might break the container

# Be careful with file ownership - host and container UIDs may differ
ls -ln "$MOUNT_POINT/etc/passwd" 2>/dev/null
```

## Cleanup

```bash
# Unmount first
sudo podman unmount my-app 2>/dev/null
podman unshare podman unmount rootless-app 2>/dev/null

# Then remove containers
sudo podman stop my-app 2>/dev/null
sudo podman rm my-app 2>/dev/null
podman stop rootless-app 2>/dev/null
podman rm rootless-app 2>/dev/null
rm -rf /tmp/container-logs /tmp/nginx-config-backup.tar.gz
```

## Summary

The `podman mount` command provides direct host-level access to a container's filesystem. Use `sudo podman mount` for rootful containers or `podman unshare` for rootless. This is the most powerful way to interact with container files for debugging, forensic analysis, and bulk operations. Always unmount with `podman unmount` when you are finished.
