# How to Configure Volume Driver Options in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Volumes, Driver, Storage, Configuration

Description: Learn how to configure volume driver options in Podman to customize storage behavior for named volumes.

---

> Volume driver options let you fine-tune how Podman creates and manages named volumes, including filesystem type, mount options, and device specifications.

Podman's default local volume driver supports a range of options that control how volumes are created and mounted. These options are especially useful when you need specific filesystem types, NFS mounts, or tmpfs configurations.

---

## Default Local Driver Options

The local driver accepts three main mount-related options: `type`, `device`, and `o` (mount options). Current Podman versions also support `copy` and `nocopy` for local volumes. Mount options other than ownership-related options require root privileges:

```bash
# Create a volume with specific driver options

sudo podman volume create --driver local \
  --opt type=tmpfs \
  --opt o=size=500m,noexec \
  --opt device=tmpfs \
  fast-cache

# Inspect the volume to see configured options
sudo podman volume inspect fast-cache
```

## Creating a tmpfs Volume

```bash
# Create a tmpfs-backed volume with size limit
sudo podman volume create --driver local \
  --opt type=tmpfs \
  --opt device=tmpfs \
  --opt o=size=256m,nodev,nosuid \
  temp-storage

# Use the volume
sudo podman run -d --name app \
  -v temp-storage:/app/cache \
  docker.io/library/node:20
```

## Creating an NFS Volume

```bash
# Create a volume backed by an NFS share
sudo podman volume create --driver local \
  --opt type=nfs \
  --opt device=192.168.1.100:/exports/data \
  --opt o=addr=192.168.1.100,rw,nfsvers=4 \
  nfs-data

# Use the NFS volume in a container
sudo podman run -d --name webapp \
  -v nfs-data:/app/data \
  docker.io/library/nginx:latest
```

## Creating a Bind-Mount Volume

```bash
# Create a named volume that points to a host directory
sudo podman volume create --driver local \
  --opt type=none \
  --opt device=/home/user/project-data \
  --opt o=bind \
  project-vol

# This provides a named volume interface to a host directory
sudo podman run -d --name devapp \
  -v project-vol:/app/data \
  docker.io/library/node:20
```

## Configuring ext4 Volume on a Block Device

```bash
# Create a volume on a specific block device
sudo podman volume create --driver local \
  --opt type=ext4 \
  --opt device=/dev/sdb1 \
  block-storage

# Mount with specific filesystem options
sudo podman volume create --driver local \
  --opt type=ext4 \
  --opt device=/dev/sdb1 \
  --opt o=noatime,data=ordered \
  optimized-storage
```

## Viewing Volume Configuration

```bash
# Inspect volume driver options
sudo podman volume inspect fast-cache --format '{{ .Options }}'

# List all volumes with their drivers
sudo podman volume ls --format "{{ .Name }}\t{{ .Driver }}"

# Get detailed JSON output
sudo podman volume inspect fast-cache --format '{{ json .Options }}'
```

## Common Mount Options Reference

```bash
# Read-write with no access time updates
sudo podman volume create --driver local \
  --opt type=tmpfs \
  --opt device=tmpfs \
  --opt o=rw,noatime \
  my-vol-noatime

# No executable files allowed
sudo podman volume create --driver local \
  --opt type=tmpfs \
  --opt device=tmpfs \
  --opt o=noexec \
  my-vol-noexec

# No setuid bits honored
sudo podman volume create --driver local \
  --opt type=tmpfs \
  --opt device=tmpfs \
  --opt o=nosuid \
  my-vol-nosuid

# Combine multiple options
sudo podman volume create --driver local \
  --opt type=tmpfs \
  --opt device=tmpfs \
  --opt o=size=1g,noexec,nosuid,nodev \
  secure-tmp
```

## Using Driver Options with --mount

```bash
# Create the volume with driver options first
sudo podman volume create --driver local \
  --opt type=tmpfs \
  --opt device=tmpfs \
  --opt o=size=100m \
  mydata

# Mount the pre-created volume with --mount
sudo podman run -d --name mount-app \
  --mount type=volume,source=mydata,target=/data \
  docker.io/library/alpine:latest tail -f /dev/null
```

## Summary

Podman volume driver options give you control over the storage backend for named volumes. The local driver supports `type`, `device`, and `o` (mount options) parameters to configure tmpfs volumes, NFS mounts, bind-mount volumes, and block device volumes. Use `podman volume inspect` to verify configuration and combine mount options for security and performance tuning.
