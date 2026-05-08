# How to Unmount a Container's Filesystem in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Filesystem, Container Mount

Description: Learn how to safely unmount a Podman container's filesystem from the host using podman unmount, including handling busy mounts and cleanup procedures.

---

> Properly unmounting container filesystems prevents resource leaks and ensures containers can be cleanly removed.

After mounting a container's filesystem for debugging or analysis, you must unmount it when finished. Failing to unmount can prevent container removal and cause resource leaks. This guide covers unmounting in all scenarios, including handling errors and forced unmounts.

---

## Basic Unmount

Unmount a previously mounted container filesystem:

```bash
# Set up: create and mount a container

sudo podman run -d --name my-app nginx:latest
sudo podman mount my-app
CONTAINER_ID=$(sudo podman inspect my-app --format '{{.Id}}')

# Unmount the filesystem
sudo podman unmount my-app

# Verify it was unmounted
sudo podman mount --no-trunc | grep "$CONTAINER_ID" || echo "Successfully unmounted"
```

## The unmount Command Aliases

Podman accepts several aliases for the unmount command:

```bash
# All of these are equivalent
sudo podman unmount my-app
sudo podman umount my-app

# Using container ID instead of name
CONTAINER_ID=$(sudo podman ps -q --filter name=my-app)
sudo podman unmount "$CONTAINER_ID"
```

## Unmounting in Rootless Mode

For rootless containers, use `podman unshare`:

```bash
# Set up a rootless container
podman run -d --name rootless-app alpine sleep 3600

# Mount within the user namespace
podman unshare podman mount rootless-app

# Unmount within the user namespace
podman unshare podman unmount rootless-app
```

## Checking What Is Currently Mounted

Before unmounting, check current mounts:

```bash
# List all mounted containers (rootful)
sudo podman mount --no-trunc

# List mounted containers (rootless)
podman unshare podman mount --no-trunc 2>/dev/null

# Check if a specific container is mounted
CONTAINER_ID=$(sudo podman inspect my-app --format '{{.Id}}')
if sudo podman mount --no-trunc 2>/dev/null | grep -q "$CONTAINER_ID"; then
    echo "my-app is mounted"
else
    echo "my-app is not mounted"
fi
```

## Unmounting All Containers

Unmount all mounted container filesystems at once:

```bash
# Unmount all (rootful)
sudo podman unmount --all

# Unmount all (rootless)
podman unshare podman unmount --all
```

## Handling Busy Mounts

If a process is using files in the mount, unmount may fail:

```bash
# Simulate a busy mount
MOUNT_POINT=$(sudo podman mount my-app)

# This process is using the mount (simulated)
# tail -f "$MOUNT_POINT/etc/nginx/nginx.conf" &
# BUSY_PID=$!

# Unmount might fail if something is accessing the files
sudo podman unmount my-app

# If it fails, find what is using the mount
# sudo lsof +D "$MOUNT_POINT" 2>/dev/null | head -10

# Or use fuser
# sudo fuser -m "$MOUNT_POINT" 2>/dev/null

# Kill the blocking process and try again
# kill $BUSY_PID
# sudo podman unmount my-app
```

## Force Unmount

When a normal unmount fails, use the force flag:

```bash
# Force unmount
sudo podman unmount --force my-app
```

Use force unmount carefully, as it can cause issues if processes are still reading from the mount.

## Unmount Before Container Removal

Always unmount before removing a container:

```bash
# Proper cleanup sequence
sudo podman stop my-app

# Unmount if mounted
sudo podman unmount my-app 2>/dev/null

# Now remove the container
sudo podman rm my-app
```

If you try to remove a mounted container:

```bash
# This may fail or give a warning
sudo podman rm my-app
# Error: container is mounted, unmount first

# Unmount and then remove
sudo podman unmount my-app
sudo podman rm my-app
```

## Cleanup Script

A comprehensive cleanup script that handles unmounting:

```bash
#!/bin/bash
# Clean up all stopped and mounted containers

echo "Checking for mounted containers..."
MOUNTED=$(sudo podman mount --no-trunc 2>/dev/null)

if [ -n "$MOUNTED" ]; then
    echo "Found mounted containers:"
    echo "$MOUNTED"
    echo ""
    echo "Unmounting all..."
    sudo podman unmount --all
    echo "Done."
else
    echo "No mounted containers found."
fi

echo ""
echo "Checking for stopped containers..."
STOPPED=$(sudo podman ps -a --filter status=exited --format '{{.Names}}')
if [ -n "$STOPPED" ]; then
    echo "Stopped containers:"
    echo "$STOPPED"
fi
```

## Verifying Successful Unmount

After unmounting, verify the cleanup was complete:

```bash
# Check mount status
sudo podman mount --no-trunc 2>/dev/null

# Check that the mount point is no longer accessible
# (The path may still exist but won't have container contents)

# Verify container can be managed normally
sudo podman inspect my-app --format '{{.State.Status}}' 2>/dev/null
```

## Common Errors and Solutions

```bash
# Error: "container is not mounted"
# Solution: Container was already unmounted or never mounted
sudo podman unmount my-app 2>/dev/null || echo "Already unmounted"

# Error: "device or resource busy"
# Solution: Close any terminals or processes using the mount
CONTAINER_ID=$(sudo podman inspect my-app --format '{{.Id}}')
MOUNT_POINT=$(sudo podman mount --no-trunc | awk -v id="$CONTAINER_ID" '$1 == id {print $2}')
sudo lsof +D "$MOUNT_POINT" 2>/dev/null
# Then kill those processes and retry

# Error: "no such container"
# Solution: Check the container name/ID
sudo podman ps -a --format '{{.Names}}' | grep my-app
```

## Cleanup

```bash
sudo podman unmount my-app 2>/dev/null
podman unshare podman unmount rootless-app 2>/dev/null
sudo podman stop my-app 2>/dev/null
sudo podman rm my-app 2>/dev/null
podman stop rootless-app 2>/dev/null
podman rm rootless-app 2>/dev/null
```

## Summary

Always unmount container filesystems with `podman unmount` when you are done accessing them. Use `podman unmount --all` for bulk cleanup and `--force` when mounts are stuck. Check for busy mounts with `lsof` if unmounting fails. Make unmounting part of your standard container cleanup workflow to prevent resource leaks and removal failures.
