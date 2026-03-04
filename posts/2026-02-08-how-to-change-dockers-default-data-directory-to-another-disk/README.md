# How to Change Docker's Default Data Directory to Another Disk

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Storage, Linux, DevOps, Containers, Disk Management, Configuration, Data Migration

Description: How to move Docker's data directory from the default /var/lib/docker to another disk or partition, with step-by-step migration and verification instructions.

---

Docker stores everything under `/var/lib/docker` by default: images, containers, volumes, networks, and build cache. On servers where the root partition is small, this directory can quickly consume all available space. Moving Docker's data to a larger or faster disk is a common operation. This guide covers the safe way to do it without losing any data.

## Why Move Docker's Data Directory?

- **Root partition is too small**: Cloud instances often have small root disks (8-30 GB). Docker images alone can eat through this.
- **Performance**: Moving Docker data to an SSD or NVMe drive improves build times and container I/O.
- **Separation of concerns**: Keeping Docker data on a dedicated partition makes backups, monitoring, and capacity planning easier.
- **Disk quotas**: Putting Docker on its own disk prevents container data from affecting the rest of the system.

## Understanding Docker's Data Layout

Before moving anything, understand what lives under `/var/lib/docker`.

```bash
# View the top-level directory structure
sudo ls -la /var/lib/docker/

# Check how much space Docker is using
sudo du -sh /var/lib/docker/
```

Typical directories:

| Directory    | Purpose                                |
|-------------|----------------------------------------|
| `overlay2/` | Image layers and container filesystems |
| `containers/` | Container metadata and logs          |
| `volumes/`  | Named and anonymous volumes            |
| `image/`    | Image metadata                         |
| `network/`  | Network configuration                  |
| `buildkit/` | Build cache                            |
| `tmp/`      | Temporary files during operations      |

The `overlay2/` directory is usually the largest, containing all image layers.

## Method 1: Using daemon.json (Recommended)

This is the cleanest approach. You tell Docker to use a new directory via its configuration file.

### Step 1: Prepare the New Disk

If the new disk is not already formatted and mounted, set it up first.

```bash
# Identify your new disk (example: /dev/sdb)
lsblk

# Create a partition (skip if already partitioned)
sudo fdisk /dev/sdb
# In fdisk: n (new), p (primary), 1, Enter, Enter, w (write)

# Format the partition with ext4 (or xfs)
sudo mkfs.ext4 /dev/sdb1

# Create the mount point
sudo mkdir -p /mnt/docker-data

# Mount the disk
sudo mount /dev/sdb1 /mnt/docker-data
```

Add the mount to `/etc/fstab` for persistence across reboots.

```bash
# Get the UUID of the new partition
sudo blkid /dev/sdb1

# Add to fstab (replace UUID with your actual UUID)
echo "UUID=your-uuid-here /mnt/docker-data ext4 defaults,noatime 0 2" | sudo tee -a /etc/fstab

# Verify fstab is correct (this will catch errors before reboot)
sudo mount -a
```

The `noatime` option disables access time updates, which improves write performance for Docker's workload pattern.

### Step 2: Stop Docker

```bash
# Stop all running containers first (optional but safer)
docker stop $(docker ps -q) 2>/dev/null

# Stop Docker and containerd
sudo systemctl stop docker
sudo systemctl stop docker.socket
sudo systemctl stop containerd
```

### Step 3: Copy Existing Data

Use `rsync` to copy the existing Docker data. This preserves permissions, ownership, and symlinks.

```bash
# Copy all Docker data to the new location
sudo rsync -aP /var/lib/docker/ /mnt/docker-data/
```

The `-a` flag enables archive mode (preserves everything), and `-P` shows progress.

For large data directories, this can take a while. Use `tmux` or `screen` to prevent SSH disconnections from interrupting the copy.

```bash
# Check the copy completed correctly by comparing sizes
sudo du -sh /var/lib/docker/
sudo du -sh /mnt/docker-data/
```

The sizes should be approximately equal.

### Step 4: Configure Docker to Use the New Location

Edit (or create) the Docker daemon configuration file.

```bash
# Update daemon.json with the new data root
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "data-root": "/mnt/docker-data",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
```

If you already have a `daemon.json` with other settings, add the `"data-root"` key to the existing file rather than overwriting it.

### Step 5: Start Docker

```bash
# Reload systemd and start Docker
sudo systemctl daemon-reload
sudo systemctl start docker
```

### Step 6: Verify the Change

```bash
# Confirm Docker is using the new data root
docker info | grep "Docker Root Dir"
```

The output should show `/mnt/docker-data`.

Run a quick test.

```bash
# Verify containers and images are intact
docker images
docker ps -a

# Run a test container
docker run hello-world
```

### Step 7: Clean Up the Old Data

Once you have verified everything works, remove the old data to reclaim disk space.

```bash
# Remove the old Docker data directory
sudo rm -rf /var/lib/docker
```

Alternatively, keep it for a few days as a backup before deleting.

```bash
# Rename it as a temporary backup
sudo mv /var/lib/docker /var/lib/docker.old

# Delete it after you're confident the migration worked
# sudo rm -rf /var/lib/docker.old
```

## Method 2: Using a Bind Mount

Instead of changing Docker's config, you can mount the new disk directly at `/var/lib/docker`.

### Step 1: Stop Docker

```bash
sudo systemctl stop docker
sudo systemctl stop docker.socket
sudo systemctl stop containerd
```

### Step 2: Move Data and Create Mount

```bash
# Move Docker data to the new disk temporarily
sudo mv /var/lib/docker /var/lib/docker.backup
sudo rsync -aP /var/lib/docker.backup/ /mnt/docker-data/

# Mount the new disk at /var/lib/docker
sudo mount /dev/sdb1 /var/lib/docker

# Add to fstab
echo "UUID=your-uuid-here /var/lib/docker ext4 defaults,noatime 0 2" | sudo tee -a /etc/fstab
```

### Step 3: Start Docker

```bash
sudo systemctl start docker
```

Docker sees the same path (`/var/lib/docker`) but the data is actually on the new disk. No configuration changes needed.

### Verify

```bash
# Docker Root Dir will still show /var/lib/docker
docker info | grep "Docker Root Dir"

# But the actual storage is on the new disk
df -h /var/lib/docker
```

## Method 3: Using a Symlink (Not Recommended)

A symbolic link is the simplest approach but can cause issues with some Docker operations.

```bash
# Stop Docker
sudo systemctl stop docker

# Move data to the new location
sudo mv /var/lib/docker /mnt/docker-data/docker

# Create a symlink
sudo ln -s /mnt/docker-data/docker /var/lib/docker

# Start Docker
sudo systemctl start docker
```

This works in most cases but can break if Docker resolves symlinks differently or if security contexts (SELinux, AppArmor) do not follow symlinks. Use Method 1 or 2 instead.

## Choosing the Right Filesystem

The filesystem on your new disk affects Docker's performance and features.

| Filesystem | Pros | Cons |
|-----------|------|------|
| ext4 | Universally supported, stable, good performance | No built-in compression |
| XFS | Great for large files, high throughput | Cannot shrink partitions |
| Btrfs | Snapshots, compression, native Docker driver | More complex, metadata overhead |
| ZFS | Snapshots, checksums, excellent for data integrity | Higher memory usage |

For most production workloads, **ext4 with noatime** or **XFS** is the safest choice.

## LVM Setup for Flexible Storage

If you want the ability to resize Docker's storage later, use LVM.

```bash
# Create a physical volume
sudo pvcreate /dev/sdb

# Create a volume group
sudo vgcreate docker-vg /dev/sdb

# Create a logical volume using 80% of available space
sudo lvcreate -l 80%FREE -n docker-lv docker-vg

# Format the logical volume
sudo mkfs.ext4 /dev/docker-vg/docker-lv

# Mount it
sudo mkdir -p /mnt/docker-data
sudo mount /dev/docker-vg/docker-lv /mnt/docker-data

# Add to fstab
echo "/dev/docker-vg/docker-lv /mnt/docker-data ext4 defaults,noatime 0 2" | sudo tee -a /etc/fstab
```

Later, if you need more space:

```bash
# Add another disk to the volume group
sudo pvcreate /dev/sdc
sudo vgextend docker-vg /dev/sdc

# Extend the logical volume
sudo lvextend -l +100%FREE /dev/docker-vg/docker-lv

# Resize the filesystem
sudo resize2fs /dev/docker-vg/docker-lv
```

## Monitoring Disk Usage

After moving Docker's data, set up monitoring to track disk usage.

```bash
# Check Docker disk usage
docker system df

# Detailed breakdown
docker system df -v

# Check the mount point
df -h /mnt/docker-data
```

Set up a simple alert script.

```bash
# Alert when Docker disk usage exceeds 80%
cat <<'SCRIPT' > /usr/local/bin/docker-disk-alert.sh
#!/bin/bash
THRESHOLD=80
USAGE=$(df /mnt/docker-data | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$USAGE" -gt "$THRESHOLD" ]; then
  echo "Docker disk usage at ${USAGE}% on $(hostname)" | \
    mail -s "Docker Disk Alert" admin@example.com
fi
SCRIPT

chmod +x /usr/local/bin/docker-disk-alert.sh

# Run every hour via cron
(crontab -l 2>/dev/null; echo "0 * * * * /usr/local/bin/docker-disk-alert.sh") | crontab -
```

## Troubleshooting

### Docker fails to start after moving data

Check permissions on the new directory.

```bash
# Docker data should be owned by root
sudo chown -R root:root /mnt/docker-data
sudo chmod 711 /mnt/docker-data
```

### SELinux denials

On RHEL-based systems, SELinux may block Docker from accessing the new location.

```bash
# Restore SELinux context for Docker data
sudo restorecon -R /mnt/docker-data

# Or set the correct context manually
sudo semanage fcontext -a -t container_var_lib_t "/mnt/docker-data(/.*)?"
sudo restorecon -R /mnt/docker-data
```

### Images and containers missing after migration

The copy may have been incomplete. Compare the old and new directories.

```bash
# Check if key subdirectories exist
ls /mnt/docker-data/overlay2
ls /mnt/docker-data/image
ls /mnt/docker-data/volumes
```

If anything is missing, copy from the backup (if you kept one).

### Performance is worse on the new disk

Check the disk I/O performance.

```bash
# Simple write test
dd if=/dev/zero of=/mnt/docker-data/test bs=1M count=1024 oflag=dsync
rm /mnt/docker-data/test
```

If the new disk is slower than expected, check that you are using the right mount options and that the disk is healthy.

```bash
# Check for disk errors
sudo smartctl -a /dev/sdb
```

## Summary

Moving Docker's data directory is a common operation that prevents disk space problems and can improve performance. The recommended approach is to use the `data-root` setting in `daemon.json` after copying the data with `rsync`. The bind mount method is a good alternative that avoids configuration changes. Whichever method you choose, the process is the same: stop Docker, copy data, update configuration (or mount), start Docker, verify, then clean up the old data.
