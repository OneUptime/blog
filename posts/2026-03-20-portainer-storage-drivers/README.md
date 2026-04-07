# How to Configure Portainer for Different Container Storage Drivers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Storage, Overlay2, Devicemapper

Description: Configure and optimize container storage drivers in Docker environments managed by Portainer for maximum performance and compatibility.

## Introduction

Docker storage drivers control how container image layers are stored and managed. The right storage driver improves performance, reduces disk usage, and ensures compatibility with your host OS. Portainer manages containers without enforcing a specific storage driver-the driver is configured at the Docker daemon level.

## Supported Storage Drivers

| Driver | Best For | OS Support |
|--------|----------|------------|
| overlay2 | Default, best performance | Linux (ext4, xfs) |
| fuse-overlayfs | Rootless containers | Linux |
| devicemapper | Legacy RHEL/CentOS | Linux |
| btrfs | Btrfs filesystems | Linux |
| zfs | ZFS filesystems | Linux |
| vfs | Testing only | All |

## Checking Current Storage Driver

```bash
# View current storage driver

docker info | grep "Storage Driver"

# Full storage driver details
docker info | grep -A 20 "Storage Driver"

# Via Portainer: Go to Home > Local Environment > Info
```

## Configuring overlay2 (Recommended)

overlay2 is the default and recommended driver for most Linux installations.

```bash
# Verify your filesystem supports overlay2
df -T / | awk '{print $2}'
# Should be ext4 or xfs

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

For production environments on RHEL/CentOS without overlay2 support:

```bash
# Create a dedicated partition or use a raw block device
# Assuming /dev/sdb is your dedicated device

# Install lvm2
sudo yum install -y lvm2

# Configure Direct-lvm
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "storage-driver": "devicemapper",
  "storage-opts": [
    "dm.directlvm_device=/dev/sdb",
    "dm.thinp_percent=95",
    "dm.thinp_metapercent=1",
    "dm.thinp_autoextend_threshold=80",
    "dm.thinp_autoextend_percent=20",
    "dm.directlvm_device_force=true"
  ]
}
EOF

sudo systemctl restart docker
```

## Configuring btrfs Driver

```bash
# Install btrfs tools
sudo apt-get install -y btrfs-progs

# Format the Docker data partition as btrfs
sudo mkfs.btrfs /dev/sdb

# Mount it
sudo mkdir -p /var/lib/docker
sudo mount /dev/sdb /var/lib/docker

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

```bash
# Install ZFS
sudo apt-get install -y zfsutils-linux

# Create a ZFS pool for Docker
sudo zpool create -f docker-pool /dev/sdb

# Create a dataset
sudo zfs create -o mountpoint=/var/lib/docker docker-pool/docker

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

Navigate to Portainer's Host page to view:
- Volume sizes and usage
- Image layer disk usage
- Container filesystem changes

```bash
# CLI equivalent for monitoring
docker system df

# Detailed breakdown
docker system df -v

# Clean up unused resources
docker system prune -a --volumes
```

## Migrating Between Storage Drivers

```bash
# Stop all containers
docker stop $(docker ps -q)

# Export important data
docker save my-image > /backup/my-image.tar
docker export my-container > /backup/my-container.tar

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
```

## Conclusion

Choosing the right storage driver is crucial for Docker performance and reliability. overlay2 is recommended for most modern Linux systems. Portainer works seamlessly with all Docker storage drivers, providing visibility into volume and image storage usage. Always test storage driver changes in a non-production environment before deploying.
