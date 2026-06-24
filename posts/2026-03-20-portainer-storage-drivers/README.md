# How to Configure Portainer for Different Container Storage Drivers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Storage, Overlay2, Devicemapper

Description: Configure and optimize container storage drivers in Docker environments managed by Portainer for maximum performance and compatibility.

## Introduction

Docker storage drivers control how container image layers are stored and managed. The right storage driver improves performance, reduces disk usage, and ensures compatibility with your host OS. Portainer manages containers without enforcing a specific storage driver-the driver is configured at the Docker daemon level. On fresh Docker Engine 29.0 and later installations, Docker uses the `containerd` image store by default; the classic storage drivers below apply when your host is using the legacy graph-driver backend.

## Supported Storage Drivers

| Driver | Best For | Requirements |
|--------|----------|--------------|
| overlay2 | Default classic driver, best overall compatibility | Linux; `xfs` requires `ftype=1` |
| fuse-overlayfs | Rootless Docker on hosts without rootless `overlay2` support | Linux rootless mode |
| btrfs | Btrfs-backed hosts that need snapshots and subvolumes | Docker Engine CE on SLES, Ubuntu, and Debian |
| zfs | ZFS-backed hosts with ZFS expertise | Linux; `/var/lib/docker` must be on ZFS |
| vfs | Testing and debugging only | Linux; poor performance |

## Checking Current Storage Driver

```bash
# View current storage driver

docker info | grep "Storage Driver"

# Full storage driver details
docker info | grep -A 20 "Storage Driver"

# Via Portainer: Select the environment, then go to Host > Details
```

## Configuring overlay2 (Recommended)

For classic storage drivers, overlay2 is the default and recommended driver for most Linux installations.

```bash
# If you are changing drivers on an existing host, back up /var/lib/docker first.

# Verify the backing filesystem for Docker's data root
df -T /var/lib/docker | awk 'NR==2 {print $2}'

# If the backing filesystem is xfs, verify ftype=1
sudo xfs_info /var/lib/docker | grep ftype

# Check if overlay module is loaded
lsmod | grep overlay

# Load overlay module if needed
sudo modprobe overlay

# Configure Docker to use overlay2
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "storage-driver": "overlay2"
}
EOF

# Restart Docker
sudo systemctl restart docker

# Verify
docker info | grep "Storage Driver"
```

## Configuring devicemapper (Direct-lvm)

The `devicemapper` storage driver was deprecated in Docker Engine v18.09, disabled by default in v23.0, and removed in v25.0. Do not use it for new deployments.

If you still maintain an older host that uses `devicemapper`, migrate it to `overlay2` before upgrading Docker Engine to v25.0 or later.

## Configuring btrfs Driver

Docker supports the `btrfs` storage driver with Docker Engine CE on SLES, Ubuntu, and Debian, and `/var/lib/docker` must be on a Btrfs filesystem.

```bash
# Install btrfs tools
sudo apt-get install -y btrfs-progs

# Format the Docker data partition as btrfs
sudo mkfs.btrfs /dev/sdb

# Mount it
sudo mkdir -p /var/lib/docker
sudo mount -t btrfs /dev/sdb /var/lib/docker

# Add to fstab
echo "/dev/sdb /var/lib/docker btrfs defaults 0 0" | sudo tee -a /etc/fstab

# Configure Docker
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "storage-driver": "btrfs"
}
EOF

sudo systemctl restart docker
```

## Configuring zfs Driver

Use the `zfs` driver only if you are already comfortable operating ZFS on Linux.

```bash
# Install ZFS
sudo apt-get install -y zfsutils-linux

# Create a ZFS pool for Docker and mount it at /var/lib/docker
sudo zpool create -f docker-pool -m /var/lib/docker /dev/sdb

# Configure Docker
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "storage-driver": "zfs"
}
EOF

sudo systemctl restart docker
```

## Storage Driver Tuning

```bash
# Configure custom Docker data root
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "storage-driver": "overlay2",
  "data-root": "/mnt/fast-storage/docker",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  }
}
EOF
```

## Monitoring Storage Usage in Portainer

Navigate to the selected Docker Standalone environment's `Host > Details` page to view:
- Docker root directory
- Storage driver
- Logging driver
- Available volume and network plugins

```bash
# CLI equivalent for engine details
docker info | grep -A 20 "Storage Driver"

# Disk usage summary
docker system df

# Detailed disk usage breakdown
docker system df -v

# Clean up unused resources and anonymous volumes
docker system prune -a --volumes
```

## Migrating Between Storage Drivers

```bash
# Stop running containers, if any
docker ps -q | xargs -r docker stop

# Back up images you need to keep
docker save -o /backup/my-image.tar my-image

# Back up named volumes separately; docker export does not include volume data

# Stop Docker
sudo systemctl stop docker

# Backup old data directory
sudo mv /var/lib/docker /var/lib/docker.bak

# Configure new storage driver
# ... (edit daemon.json as shown above)

# Start Docker with new driver
sudo systemctl start docker

# Re-import images
docker load < /backup/my-image.tar

# Recreate containers and restore any volume backups
```

## Conclusion

Choosing the right storage driver is crucial for Docker performance and reliability. For hosts using classic Docker storage drivers, overlay2 is recommended for most modern Linux systems. Portainer surfaces the storage backend configured on the Docker host, including the storage driver and Docker root directory. Always test storage backend changes in a non-production environment before deploying.
