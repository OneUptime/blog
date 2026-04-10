# How to Configure Ceph with Podman for Persistent Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Podman, Persistent Storage, RBD, CephFS

Description: Mount Ceph RBD and CephFS volumes into Podman containers for persistent storage without requiring Docker, using rootless or rootful container configurations.

---

Podman is a daemonless container runtime that is the default on RHEL, Fedora, and CentOS. Configuring Ceph persistent storage for Podman containers follows a similar approach to Docker but has rootless-specific considerations.

## Prerequisites

- Rook-Ceph cluster accessible from the Podman host
- `ceph-common` and `ceph-fuse` packages installed
- CephX credentials available

Install required packages on RHEL/Fedora:

```bash
dnf install -y ceph-common ceph-fuse
```

## Configure Ceph Credentials on the Host

Retrieve the Ceph configuration and keyring:

```bash
# Get the cluster config
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph config generate-minimal-conf > /etc/ceph/ceph.conf

# Get the admin keyring
kubectl -n rook-ceph get secret rook-ceph-admin-keyring \
  -o jsonpath='{.data.keyring}' | base64 -d > /etc/ceph/ceph.client.admin.keyring

chmod 600 /etc/ceph/ceph.client.admin.keyring
```

## Mount Ceph RBD with Podman (Rootful)

Create and map an RBD image:

```bash
# Create the image
rbd create --size 20480 rbd/podman-volume

# Map to a block device
rbd map rbd/podman-volume

# Format
mkfs.xfs /dev/rbd0

# Mount
mkdir -p /mnt/ceph-rbd
mount /dev/rbd0 /mnt/ceph-rbd
```

Run a Podman container with the mounted volume:

```bash
podman run -d \
  --name myapp \
  --volume /mnt/ceph-rbd:/data:Z \
  --security-opt label=type:container_file_t \
  docker.io/library/postgres:15
```

The `:Z` flag sets SELinux context for the mount point.

## Mount CephFS with Podman

Mount CephFS using ceph-fuse:

```bash
mkdir -p /mnt/cephfs

ceph-fuse /mnt/cephfs \
  --name client.admin \
  --keyring /etc/ceph/ceph.client.admin.keyring

# Verify mount
mount | grep ceph-fuse
```

Run multiple Podman containers sharing CephFS:

```bash
podman run -d \
  --name app1 \
  --volume /mnt/cephfs/app1:/data:z \
  myapp:latest

podman run -d \
  --name app2 \
  --volume /mnt/cephfs/app2:/data:z \
  myapp:latest
```

## Rootless Podman with Ceph

For rootless Podman, the volume must be owned by the user running the container:

```bash
# Mount CephFS and set ownership
sudo ceph-fuse /mnt/cephfs
sudo chown -R 1000:1000 /mnt/cephfs/myuser

# Run rootless container
podman run -d \
  --user 1000:1000 \
  --volume /mnt/cephfs/myuser:/data \
  myapp:latest
```

## Systemd Integration

Create a systemd unit to ensure the RBD device is mapped before Podman starts:

```ini
[Unit]
Description=Map Ceph RBD device
Before=podman-myapp.service

[Service]
Type=oneshot
ExecStart=/usr/bin/rbd map rbd/podman-volume
ExecStop=/usr/bin/rbd unmap /dev/rbd0
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

## Summary

Podman containers use Ceph persistent storage through the same host-level RBD mapping and CephFS FUSE mount approach as Docker, with the addition of SELinux label flags (`:Z` or `:z`) for volume mounts. For rootless Podman, ensure the CephFS mount point is owned by the UID that the container process runs as.
