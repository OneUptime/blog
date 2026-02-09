# How to Move Docker's Storage Location to an External Drive

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Storage, DevOps, Linux, Docker Daemon

Description: Learn how to relocate Docker's default data directory to an external drive to free up disk space and improve performance.

---

Docker stores all of its data, including images, containers, volumes, and build cache, in a single root directory. On most Linux systems, this defaults to `/var/lib/docker`. Over time, this directory can grow to consume tens or even hundreds of gigabytes. If your root partition is small, or if you want to take advantage of a faster or larger external drive, moving Docker's storage location becomes necessary.

This guide walks through the entire process step by step, covering both the daemon configuration method and the symbolic link method.

## Why Move Docker's Storage?

There are several practical reasons to relocate Docker's data directory:

- Your root partition is running low on disk space
- You have a faster SSD or NVMe drive mounted elsewhere
- You want to keep application data separate from system data for backup purposes
- Your organization requires data to live on encrypted or RAID-backed volumes

Before you start, check how much space Docker currently uses.

This command shows a breakdown of Docker's disk usage including images, containers, and volumes:

```bash
docker system df
```

You can also check the size of the default directory directly:

```bash
du -sh /var/lib/docker
```

## Method 1: Using the Docker Daemon Configuration File

This is the recommended approach. Docker supports a `data-root` configuration option in its daemon configuration file that tells the Docker engine where to store all of its data.

### Step 1: Stop the Docker Service

Before making any changes, stop Docker completely. This prevents data corruption during the move.

```bash
# Stop the Docker daemon
sudo systemctl stop docker

# Also stop the containerd service
sudo systemctl stop containerd
```

Verify that Docker has fully stopped:

```bash
# Confirm no Docker processes are running
sudo systemctl status docker
```

### Step 2: Prepare the External Drive

Make sure your external drive is mounted and formatted with a Linux-compatible filesystem. ext4 and xfs are both good choices.

```bash
# Check available drives and partitions
lsblk

# If the drive is not formatted, create a filesystem (replace /dev/sdb1 with your device)
sudo mkfs.ext4 /dev/sdb1

# Create a mount point
sudo mkdir -p /mnt/external-docker

# Mount the drive
sudo mount /dev/sdb1 /mnt/external-docker
```

To ensure the drive mounts automatically on boot, add an entry to `/etc/fstab`.

```bash
# Get the UUID of your drive
sudo blkid /dev/sdb1

# Add this line to /etc/fstab (replace the UUID with yours)
# UUID=your-uuid-here /mnt/external-docker ext4 defaults 0 2
echo "UUID=your-uuid-here /mnt/external-docker ext4 defaults 0 2" | sudo tee -a /etc/fstab
```

### Step 3: Copy the Existing Data

Use `rsync` to copy Docker's data to the new location. rsync preserves permissions, ownership, and special files, which is critical for Docker to function correctly.

```bash
# Copy all Docker data to the new location, preserving all attributes
sudo rsync -aP /var/lib/docker/ /mnt/external-docker/docker/
```

The `-a` flag enables archive mode (preserves permissions, symlinks, timestamps), and `-P` shows progress during the copy.

### Step 4: Configure the Docker Daemon

Create or edit the Docker daemon configuration file to point to the new location.

```bash
# Create the daemon config file if it doesn't exist
sudo mkdir -p /etc/docker

# Write the configuration with the new data-root path
sudo tee /etc/docker/daemon.json <<EOF
{
  "data-root": "/mnt/external-docker/docker"
}
EOF
```

If you already have a `daemon.json` file with other settings, add the `data-root` key to the existing JSON object. Do not create a second file.

### Step 5: Start Docker and Verify

Start the Docker service and confirm it is using the new location.

```bash
# Start Docker with the new configuration
sudo systemctl start docker

# Verify the new data root is in use
docker info | grep "Docker Root Dir"
```

The output should show your new path:

```
 Docker Root Dir: /mnt/external-docker/docker
```

Run a quick test to make sure everything works:

```bash
# Pull and run a test container
docker run --rm hello-world
```

### Step 6: Clean Up the Old Directory

Once you have confirmed that Docker is working correctly with the new location, you can remove the old data to free up space on your root partition.

```bash
# Remove the old Docker data directory
sudo rm -rf /var/lib/docker
```

Some administrators prefer to keep the old directory for a few days as a safety net before deleting it. That is a sensible precaution.

## Method 2: Using a Symbolic Link

If you prefer not to modify the daemon configuration, you can use a symbolic link. This approach tricks Docker into using the new location without changing any configuration.

```bash
# Stop Docker
sudo systemctl stop docker
sudo systemctl stop containerd

# Move the data to the new location
sudo mv /var/lib/docker /mnt/external-docker/docker

# Create a symbolic link from the old path to the new location
sudo ln -s /mnt/external-docker/docker /var/lib/docker

# Start Docker
sudo systemctl start docker

# Verify it works
docker info | grep "Docker Root Dir"
```

The symbolic link method works, but the daemon configuration method is cleaner and more maintainable. The symlink can cause confusion during troubleshooting, and some system updates may not respect the link.

## Method 3: Using a Bind Mount in systemd

Another option is to use a systemd bind mount. This mounts the external drive directly over `/var/lib/docker`.

Create a systemd mount unit file:

```bash
# Create the mount unit (the filename must match the mount path)
sudo tee /etc/systemd/system/var-lib-docker.mount <<EOF
[Unit]
Description=Mount Docker data directory
Before=docker.service

[Mount]
What=/dev/sdb1
Where=/var/lib/docker
Type=ext4
Options=defaults

[Install]
WantedBy=multi-user.target
EOF
```

Enable and start the mount:

```bash
# Reload systemd to pick up the new unit file
sudo systemctl daemon-reload

# Enable the mount to start on boot
sudo systemctl enable var-lib-docker.mount

# Start the mount
sudo systemctl start var-lib-docker.mount

# Start Docker
sudo systemctl start docker
```

## Handling Docker Desktop on macOS and Windows

If you are using Docker Desktop rather than Docker Engine on Linux, the process is different. Docker Desktop runs inside a virtual machine, so the storage location is the VM disk image file.

On macOS, open Docker Desktop, go to Settings, then Resources, then Disk image location. Change the path to your external drive.

On Windows, the setting is in the same place. Navigate to Settings, Resources, and update the disk image location.

## Troubleshooting Common Issues

**Docker fails to start after the move**: Check the permissions on the new directory. Docker needs root ownership.

```bash
# Fix ownership if needed
sudo chown -R root:root /mnt/external-docker/docker
```

**Permission denied errors**: Make sure the mount options do not include `noexec` or `nosuid`, as Docker requires execute permissions.

```bash
# Check mount options
mount | grep external-docker
```

**Containers lost after move**: Verify the rsync completed without errors. Check that no files were skipped.

**Slow performance on USB drives**: USB 2.0 drives will be significantly slower than internal storage. Use USB 3.0 or Thunderbolt connections for acceptable performance. Better yet, use an internal SATA or NVMe drive.

## Performance Considerations

The choice of filesystem and drive type matters significantly for Docker performance. Here is a quick comparison:

- **NVMe SSD**: Best performance for build cache and layer operations
- **SATA SSD**: Good performance, sufficient for most workloads
- **HDD**: Acceptable for storage, but slow builds and image pulls
- **USB external**: Only suitable for development or archival, not production

The filesystem choice also affects Docker's storage drivers. ext4 works well with the overlay2 driver, which is the default on modern Docker installations. XFS is another solid choice, particularly on Red Hat-based systems.

## Summary

Moving Docker's storage location is straightforward when you follow the right steps. The daemon configuration method using `data-root` is the cleanest approach. Always stop Docker before moving data, use rsync to preserve file attributes, and verify everything works before removing old data. For production systems, make sure your external drive is reliable, fast, and configured to mount automatically on boot.
