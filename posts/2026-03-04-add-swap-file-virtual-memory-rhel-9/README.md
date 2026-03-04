# How to Add a Swap File to RHEL for Additional Virtual Memory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Swap File, Memory, Linux

Description: Learn how to create and configure a swap file on RHEL when you need additional virtual memory without repartitioning disks.

---

Sometimes you need more swap space and repartitioning is not an option. Maybe you are on a cloud instance with a single disk, or the system is in production and you cannot afford the downtime. A swap file is the quick and flexible answer.

## Why Use a Swap File

Swap files have some practical advantages over swap partitions:

- No need to repartition or modify LVM
- Easy to resize by creating a new file
- Can be added to a running system in minutes
- Works on any filesystem (XFS, ext4)
- Simple to remove when no longer needed

The performance difference between a swap file and a swap partition is negligible on modern kernels and storage.

## Check Current Swap

```bash
# See existing swap configuration
swapon --show
free -h
```

## Step 1: Create the Swap File

Use `dd` or `fallocate` to create the file. On XFS, use `dd` since `fallocate` may create files with holes that swap does not support:

```bash
# Create a 4 GB swap file using dd (works on all filesystems)
dd if=/dev/zero of=/swapfile bs=1M count=4096 status=progress
```

This writes 4096 blocks of 1 MB each, creating a 4 GB file filled with zeros.

Do not use `fallocate` on XFS for swap files. It can create extents that `mkswap` will reject.

## Step 2: Set Correct Permissions

The swap file must only be readable by root:

```bash
# Restrict permissions - only root should access the swap file
chmod 600 /swapfile
```

Verify:

```bash
# Confirm permissions
ls -l /swapfile
```

You should see `-rw-------` with root ownership.

## Step 3: Format as Swap

```bash
# Format the file as swap space
mkswap /swapfile
```

## Step 4: Enable the Swap File

```bash
# Activate the swap file
swapon /swapfile
```

Verify it is working:

```bash
# Confirm the swap file is active
swapon --show
free -h
```

## Step 5: Make It Persistent

Add the swap file to `/etc/fstab`:

```bash
# Add swap file entry to fstab
echo "/swapfile  none  swap  defaults  0 0" >> /etc/fstab
```

Verify the entry:

```bash
# Check fstab for the new entry
grep swapfile /etc/fstab
```

## Choosing the Right Size

As a general guideline:

| System RAM | Recommended Swap |
|-----------|-----------------|
| 2 GB or less | 2x RAM |
| 2-8 GB | Equal to RAM |
| 8-64 GB | At least 4 GB |
| 64 GB+ | At least 4 GB, depends on workload |

If the system needs to hibernate, swap must be at least equal to the amount of RAM.

## Creating Multiple Swap Files

You can have multiple swap files with different priorities:

```bash
# Create a second swap file
dd if=/dev/zero of=/swapfile2 bs=1M count=2048 status=progress
chmod 600 /swapfile2
mkswap /swapfile2
swapon -p 5 /swapfile2
```

Add to fstab with priority:

```
/swapfile   none  swap  defaults,pri=10  0 0
/swapfile2  none  swap  defaults,pri=5   0 0
```

Higher priority swap is used first.

## Resizing a Swap File

You cannot resize a swap file in place. Instead, create a new one and replace the old one:

```bash
# Disable the current swap file
swapoff /swapfile

# Create a larger replacement
dd if=/dev/zero of=/swapfile bs=1M count=8192 status=progress

# Set permissions and format
chmod 600 /swapfile
mkswap /swapfile

# Enable the new, larger swap file
swapon /swapfile
```

No fstab changes needed since the path stays the same.

## Removing a Swap File

When you no longer need the extra swap:

```bash
# Disable the swap file
swapoff /swapfile

# Remove it
rm /swapfile

# Remove the fstab entry
sed -i '/\/swapfile/d' /etc/fstab
```

## Troubleshooting

### "swapon: /swapfile: skipping - it appears to have holes"

This happens when the file was created with `fallocate` on XFS. Recreate it with `dd`:

```bash
swapoff /swapfile 2>/dev/null
rm /swapfile
dd if=/dev/zero of=/swapfile bs=1M count=4096 status=progress
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

### "swapon: /swapfile: insecure permissions"

Fix the permissions:

```bash
chmod 600 /swapfile
chown root:root /swapfile
swapon /swapfile
```

### Swap file not activating at boot

Make sure the fstab entry is correct and the filesystem containing the swap file is mounted before swap activation. For systemd, check:

```bash
# Check for swap-related boot errors
journalctl -b -u swap.target
```

## Performance Considerations

A swap file on a modern SSD performs nearly identically to a swap partition. On spinning disks, a swap partition may have a slight edge because the file could be fragmented. To check fragmentation:

```bash
# Check if the swap file is fragmented (ext4 only)
filefrag -v /swapfile
```

If you see many extents, the file is fragmented. On ext4, you can defragment with `e4defrag`. On XFS, fragmentation of a swap file is handled well by the filesystem.

## Summary

Adding a swap file on RHEL is one of the fastest ways to add virtual memory without any downtime. The process is simple: create the file with `dd`, set permissions, format with `mkswap`, enable with `swapon`, and persist in fstab. It is especially useful for cloud instances and situations where repartitioning is impractical.
