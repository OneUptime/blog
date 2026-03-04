# How to Fix 'No Space Left on Device' Error on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Disk Space, Troubleshooting, File Systems, Storage

Description: Fix 'No space left on device' errors on RHEL by identifying what is consuming disk space and reclaiming it, including inode exhaustion scenarios.

---

"No space left on device" can mean either the disk is full or the filesystem has run out of inodes. This guide covers both scenarios.

## Check Disk Space Usage

```bash
# View disk usage for all mounted filesystems
df -h

# Identify the full filesystem
# Look for "Use%" at 100%

# Find the largest directories on the full filesystem
sudo du -sh /* 2>/dev/null | sort -rh | head -10

# Drill deeper into the largest directory
sudo du -sh /var/* | sort -rh | head -10
```

## Quick Space Recovery

```bash
# Clean the DNF package cache
sudo dnf clean all

# Remove old kernels (keep current and one previous)
sudo dnf remove --oldinstallonly --setopt installonly_limit=2 kernel

# Clear systemd journal logs older than 7 days
sudo journalctl --vacuum-time=7d

# Find and list large files (over 100MB)
sudo find / -xdev -type f -size +100M -exec ls -lh {} \; 2>/dev/null

# Remove old log files
sudo find /var/log -name "*.gz" -mtime +30 -delete
sudo find /var/log -name "*.old" -mtime +30 -delete
```

## Check for Deleted But Open Files

A common issue is that files were deleted but processes still hold them open, so the space is not reclaimed.

```bash
# Find deleted files still held open
sudo lsof +L1

# Identify the process and file size
sudo lsof +L1 | grep deleted

# Restart the service to release the space
sudo systemctl restart <service-name>

# Or truncate the file descriptor directly (use with caution)
# sudo truncate -s 0 /proc/<pid>/fd/<fd_number>
```

## Check for Inode Exhaustion

```bash
# Check inode usage
df -i

# If inodes are at 100%, you have too many small files
# Find directories with the most files
sudo find / -xdev -printf '%h\n' | sort | uniq -c | sort -rn | head -20

# Common culprits: /tmp, /var/spool, session files
# Remove the offending small files
sudo find /tmp -type f -mtime +7 -delete
```

## Extend the Filesystem (LVM)

If you have available space in the volume group:

```bash
# Check available space in the volume group
sudo vgs

# Extend the logical volume
sudo lvextend -L +5G /dev/mapper/rhel-root

# Grow the filesystem
# For XFS:
sudo xfs_growfs /
# For ext4:
sudo resize2fs /dev/mapper/rhel-root
```

Start by identifying what is consuming space with `df -h` and `du -sh`, then clean up accordingly.
