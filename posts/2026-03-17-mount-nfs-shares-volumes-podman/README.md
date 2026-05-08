# How to Mount NFS Shares as Volumes in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, NFS, Volumes, Networking, Storage

Description: Learn how to mount NFS shares as Podman volumes for shared storage across containers and hosts.

---

> NFS volumes in Podman enable containers to access shared network storage, making it easy to share data across multiple containers and hosts.

NFS (Network File System) mounts let containers access remote storage over the network. Podman supports NFS volumes through the local volume driver with NFS-specific options. This is useful for shared storage in multi-host environments.

---

## Prerequisites

```bash
# Install NFS client utilities

# On Fedora/RHEL
sudo dnf install nfs-utils -y

# On Ubuntu/Debian
sudo apt install nfs-common -y

# Verify the NFS server is reachable
showmount -e 192.168.1.100
```

The Podman volume examples below use rootful Podman because local driver mount options require root privileges.

## Creating an NFS Volume

```bash
# Create a named volume backed by an NFS share
sudo podman volume create --driver local \
  --opt type=nfs \
  --opt device=192.168.1.100:/exports/shared \
  --opt o=addr=192.168.1.100,rw,nfsvers=4.2 \
  nfs-shared

# Verify the volume was created
sudo podman volume inspect nfs-shared
```

## Using NFS Volumes in Containers

```bash
# Run a container with the NFS volume
sudo podman run -d --name webapp \
  -v nfs-shared:/app/data \
  -p 8080:80 \
  docker.io/library/nginx:latest

# Verify the NFS mount is accessible
sudo podman exec webapp ls -la /app/data
sudo podman exec webapp df -h /app/data
```

## NFS Mount Options

```bash
# Create with common NFS mount options
sudo podman volume create --driver local \
  --opt type=nfs \
  --opt device=192.168.1.100:/exports/data \
  --opt o=addr=192.168.1.100,rw,nfsvers=4.2,soft,timeo=30,retrans=3 \
  nfs-data

# Read-only NFS mount
sudo podman volume create --driver local \
  --opt type=nfs \
  --opt device=192.168.1.100:/exports/config \
  --opt o=addr=192.168.1.100,ro,nfsvers=4.2 \
  nfs-config
```

## NFS with NFSv3

```bash
# NFSv3 with UDP transport
sudo podman volume create --driver local \
  --opt type=nfs \
  --opt device=192.168.1.100:/exports/legacy \
  --opt o=addr=192.168.1.100,rw,nfsvers=3,proto=udp \
  nfs-legacy
```

## Using NFS Directly with Bind Mounts

An alternative approach is to mount NFS on the host first:

```bash
# Mount NFS on the host
sudo mkdir -p /mnt/nfs-share
sudo mount -t nfs 192.168.1.100:/exports/shared /mnt/nfs-share

# Bind mount the NFS directory into the container
podman run -d --name webapp \
  -v /mnt/nfs-share:/app/data:z \
  docker.io/library/nginx:latest

# Add to /etc/fstab for persistence
echo "192.168.1.100:/exports/shared /mnt/nfs-share nfs defaults 0 0" | sudo tee -a /etc/fstab
```

## Sharing NFS Volumes Across Multiple Containers

```bash
# Multiple containers can share the same NFS volume
sudo podman run -d --name writer \
  -v nfs-shared:/data \
  docker.io/library/alpine:latest \
  sh -c "while true; do date >> /data/log.txt; sleep 5; done"

sudo podman run -d --name reader \
  -v nfs-shared:/data:ro \
  docker.io/library/alpine:latest \
  sh -c "while true; do cat /data/log.txt; sleep 10; done"
```

## Troubleshooting NFS Volumes

```bash
# Check if the NFS server is reachable
ping -c 3 192.168.1.100

# Verify NFS exports
showmount -e 192.168.1.100

# Test manual NFS mount
sudo mkdir -p /mnt/test
sudo mount -t nfs -o nfsvers=4.2 192.168.1.100:/exports/shared /mnt/test

# Check for mount errors in container
sudo podman logs webapp 2>&1 | grep -i "mount\|nfs\|error"

# On the NFS server, verify the NFS service is listening on port 2049
sudo ss -tlnp | grep 2049
```

## Summary

Mount NFS shares as Podman volumes using the local driver with `type=nfs`, `device` for the NFS server path, and `o` for mount options including the server address and NFS version. This enables shared network storage across multiple containers and hosts. Tune NFS mount options like `timeo` and `retrans` carefully, use `soft` only when responsiveness is more important than data integrity, and ensure NFS client utilities are installed on the host.
