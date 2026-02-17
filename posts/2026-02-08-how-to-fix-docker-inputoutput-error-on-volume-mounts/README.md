# How to Fix Docker 'Input/Output Error' on Volume Mounts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, volume mounts, input output error, troubleshooting, storage, linux, containers

Description: Learn how to diagnose and fix the Docker Input/Output error on volume mounts caused by filesystem corruption, NFS issues, and storage driver problems.

---

You spin up a container, mount a volume, and everything looks fine. Then out of nowhere, your application starts throwing "Input/Output Error" messages. The container is still running, the volume is still attached, but reads and writes fail silently or blow up with cryptic I/O errors. This problem catches experienced Docker users off guard because it usually points to something deeper than a misconfigured container.

Let's walk through the common causes and fixes for Docker volume mount I/O errors.

## Understanding the Error

When Docker reports an "Input/Output Error" on a volume mount, it means the underlying filesystem or storage driver failed to complete a read or write operation. Docker itself is not generating this error. It passes through from the kernel or the filesystem layer beneath the container.

The error typically looks like this in your application logs:

```
OSError: [Errno 5] Input/output error: '/data/myfile.txt'
```

Or when you try to list files inside the container:

```bash
# Attempting to list files on a mounted volume
ls /data/
ls: reading directory '/data/': Input/output error
```

## Cause 1: Corrupted Filesystem on the Host

The most common reason for I/O errors on volume mounts is filesystem corruption on the host machine. This happens after unexpected shutdowns, power failures, or disk hardware issues.

Check the host filesystem health first:

```bash
# Check the filesystem for errors (unmount first if possible)
# Replace /dev/sda1 with your actual device
sudo umount /dev/sda1
sudo fsck -y /dev/sda1
```

If you cannot unmount the filesystem because it is in use, schedule a check on next reboot:

```bash
# Schedule filesystem check on next boot
sudo touch /forcefsck
sudo reboot
```

Check the kernel logs for disk errors:

```bash
# Search kernel messages for disk-related errors
dmesg | grep -i "error"
dmesg | grep -i "I/O"
dmesg | grep -i "ext4"  # or your filesystem type
```

If you see messages like `EXT4-fs error` or `Buffer I/O error on device`, the disk itself may be failing.

## Cause 2: NFS Volume Mount Issues

If your Docker volume points to an NFS share, I/O errors frequently indicate that the NFS server has become unreachable or the mount went stale.

Check whether the NFS mount is still healthy:

```bash
# Verify the NFS mount status
mount | grep nfs

# Test if the NFS share is accessible
showmount -e nfs-server-ip
```

Remount the NFS share if it has gone stale:

```bash
# Unmount the stale NFS share
sudo umount -f /mnt/nfs-data

# Remount with fresh options
sudo mount -t nfs -o soft,timeo=10,retrans=3 nfs-server-ip:/export/data /mnt/nfs-data
```

When using NFS mounts with Docker, add the `soft` and `timeo` options to prevent containers from hanging indefinitely when the NFS server disappears:

```yaml
# docker-compose.yml with NFS volume configuration
version: "3.8"
services:
  app:
    image: myapp:latest
    volumes:
      - nfs-data:/data

volumes:
  nfs-data:
    driver: local
    driver_opts:
      type: nfs
      o: addr=192.168.1.100,soft,timeo=10,retrans=3,rw
      device: ":/export/data"
```

## Cause 3: Docker Storage Driver Corruption

Docker's storage driver (overlay2, devicemapper, btrfs) can become corrupted, especially after disk-full situations or abrupt shutdowns.

Check which storage driver Docker is using:

```bash
# Display Docker system information including storage driver
docker info | grep "Storage Driver"
```

If you are using overlay2 (the default on most systems), verify that the overlay mounts are intact:

```bash
# Check overlay mount points
mount | grep overlay

# Inspect a specific container's mount
docker inspect <container_id> | grep -A 10 "GraphDriver"
```

If the storage driver is corrupted, the most reliable fix involves cleaning up Docker's data directory:

```bash
# Stop all containers
docker stop $(docker ps -aq)

# Remove all containers
docker rm $(docker ps -aq)

# Prune unused data
docker system prune -a --volumes

# If the problem persists, restart Docker daemon
sudo systemctl restart docker
```

## Cause 4: Disk Full on the Host

A completely full disk will trigger I/O errors on volume mounts. Docker will not always give you a clear "disk full" message.

Check available disk space:

```bash
# Check disk usage on all mounted filesystems
df -h

# Check Docker's disk usage specifically
docker system df

# Find large files in Docker's data directory
sudo du -sh /var/lib/docker/*
```

Free up space by cleaning unused Docker resources:

```bash
# Remove dangling images
docker image prune -f

# Remove stopped containers
docker container prune -f

# Remove unused volumes (be careful with this one)
docker volume prune -f

# Nuclear option: remove everything unused
docker system prune -a --volumes -f
```

## Cause 5: Bind Mount Permission and SELinux Issues

On systems running SELinux (CentOS, RHEL, Fedora), bind mounts can trigger I/O errors if the SELinux context is wrong.

Check for SELinux denials:

```bash
# Look for SELinux denials related to Docker
sudo ausearch -m avc -ts recent | grep docker
```

Fix this by adding the `:z` or `:Z` suffix to your volume mount:

```bash
# The :z flag relabels the volume for shared access between containers
docker run -v /host/data:/container/data:z myimage

# The :Z flag relabels the volume for private access (single container)
docker run -v /host/data:/container/data:Z myimage
```

In a Docker Compose file:

```yaml
# docker-compose.yml with SELinux-compatible volume mount
services:
  app:
    image: myapp:latest
    volumes:
      - /host/data:/container/data:z
```

## Cause 6: Inode Exhaustion

Sometimes the disk has free space but has run out of inodes, which causes I/O errors on file creation.

```bash
# Check inode usage - look for 100% IUse%
df -i

# If inodes are exhausted, find directories with the most files
sudo find /var/lib/docker -xdev -printf '%h\n' | sort | uniq -c | sort -rn | head -20
```

This often happens when Docker creates millions of small files through build caches or log files. Clean up old containers and images to reclaim inodes.

## Prevention and Monitoring

Set up proactive monitoring to catch these issues before they cause downtime.

Create a simple health check script:

```bash
#!/bin/bash
# docker-volume-health.sh - Check volume mount health

MOUNT_PATH="/data"
TEST_FILE="${MOUNT_PATH}/.health_check"

# Attempt to write a test file
if echo "health_check_$(date +%s)" > "$TEST_FILE" 2>/dev/null; then
    # Verify the file can be read back
    if cat "$TEST_FILE" > /dev/null 2>&1; then
        rm -f "$TEST_FILE"
        echo "Volume mount is healthy"
        exit 0
    fi
fi

echo "ALERT: Volume mount I/O error detected on ${MOUNT_PATH}"
exit 1
```

Add disk monitoring to catch full-disk situations early:

```bash
# Add to crontab: check disk space every 5 minutes
# Alert when usage exceeds 85%
*/5 * * * * df -h / | awk 'NR==2 {gsub(/%/,"",$5); if($5 > 85) print "DISK WARNING: "$5"% used"}' | logger -t disk-check
```

## Quick Reference Table

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Sudden I/O errors after reboot | Filesystem corruption | Run fsck |
| Intermittent I/O errors on NFS | Stale NFS mount | Remount with soft,timeo options |
| I/O errors after disk full event | Storage driver corruption | Prune and restart Docker |
| I/O errors on bind mounts (RHEL) | SELinux context | Add :z or :Z suffix |
| Cannot create new files | Inode exhaustion | Clean up small files, prune Docker |

## Wrapping Up

Docker I/O errors on volume mounts almost always trace back to something outside Docker itself: a failing disk, a stale NFS mount, a corrupted filesystem, or SELinux policies. Start your investigation with `dmesg` and `df -h` on the host machine. These two commands will point you in the right direction more often than not. If you are running NFS volumes in production, switch to the `soft` mount option to prevent containers from hanging when the NFS server goes down. And keep an eye on disk space and inode usage with regular monitoring. Catching these problems early saves you from debugging cryptic I/O errors at 3 AM.
