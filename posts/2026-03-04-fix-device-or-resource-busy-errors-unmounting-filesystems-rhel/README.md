# How to Fix 'Device or Resource Busy' Errors When Unmounting Filesystems on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Filesystem, Troubleshooting, Storage, Linux

Description: Resolve 'device or resource busy' errors when trying to unmount filesystems on RHEL by identifying and stopping processes that hold open file handles.

---

When you try to unmount a filesystem on RHEL and get "device is busy" or "target is busy", it means one or more processes still have open files or their working directory set to that mount point. You need to find and stop those processes before unmounting.

## Finding What Is Using the Mount Point

Use `lsof` to list open files on the filesystem:

```bash
# List all processes with open files on the mount point
sudo lsof +D /mnt/data

# For a quicker check (does not descend into subdirectories)
sudo lsof +f -- /mnt/data
```

Use `fuser` for a more concise view:

```bash
# Show PIDs using the mount point
sudo fuser -vm /mnt/data

# Output columns: USER, PID, ACCESS, COMMAND
# ACCESS codes: c = current directory, f = open file, r = root directory, m = mmap
```

## Stopping the Offending Processes

Once you identify the processes, stop them gracefully:

```bash
# Send SIGTERM to all processes using the mount
sudo fuser -k /mnt/data

# Or send SIGTERM to specific PIDs
sudo kill -TERM 12345 12346
```

If a process does not respond to SIGTERM:

```bash
# Force kill processes on the mount point
sudo fuser -ki /mnt/data
# The -i flag asks for confirmation before each kill
```

## Handling Bind Mounts

Check if there are bind mounts or loopback mounts that reference the filesystem:

```bash
# Check for any bind mounts
findmnt --list | grep /mnt/data

# Unmount any bind mounts first
sudo umount /mnt/data/bind-target
```

## Checking for Swap Files

If a swap file lives on the filesystem, it will keep the mount busy:

```bash
# Check if swap is active on this filesystem
swapon --show | grep /mnt/data

# Disable swap on the file before unmounting
sudo swapoff /mnt/data/swapfile
```

## Lazy Unmount as a Last Resort

If you cannot stop all processes immediately, use a lazy unmount:

```bash
# Lazy unmount: detaches the filesystem from the hierarchy immediately
# Actual cleanup happens when all references are released
sudo umount -l /mnt/data
```

Note that lazy unmount does not free the underlying block device immediately. Verify with:

```bash
# Check if the device is truly free after lazy unmount
lsblk /dev/sdb1
cat /proc/mounts | grep sdb1
```

## Preventing the Issue

Before unmounting, always check for users first:

```bash
# Quick pre-unmount check script
#!/bin/bash
MOUNT="/mnt/data"
USERS=$(fuser -c "$MOUNT" 2>/dev/null)
if [ -n "$USERS" ]; then
    echo "Warning: these PIDs are using $MOUNT: $USERS"
    fuser -vc "$MOUNT"
    exit 1
else
    sudo umount "$MOUNT"
    echo "Successfully unmounted $MOUNT"
fi
```
