# How to Configure CephFS for Proxmox Container Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Proxmox, CephFS, LXC, Container, Shared Storage

Description: Configure CephFS as a shared storage backend for Proxmox LXC containers, enabling container rootfs and bind mounts to be stored on a distributed filesystem.

---

Proxmox supports CephFS as a storage backend for container templates, ISO images, backups, snippets, and shared data volumes. Unlike RBD which provides block devices, CephFS provides a POSIX filesystem that can be shared across multiple Proxmox nodes simultaneously, making it ideal for shared data accessible by all nodes. Note that container rootfs storage requires Ceph RBD, not CephFS.

## Use Cases for CephFS in Proxmox

- Shared configuration directories accessible by multiple containers via bind mounts
- Container templates and ISO images available on all Proxmox nodes
- Shared media storage accessible by all LXC instances via bind mounts
- Backup staging area with high capacity

## Step 1: Enable CephFS on Your Ceph Cluster

```bash
# Deploy the CephFS MDS
ceph fs volume create cephfs

# Verify MDS health
ceph fs status cephfs
ceph mds stat
```

## Step 2: Create Ceph User for Proxmox CephFS

```bash
ceph auth get-or-create client.proxmox-fs \
  mon 'allow r' \
  mds 'allow r, allow rw path=/' \
  osd 'allow rw tag cephfs data=cephfs, allow rw tag cephfs metadata=cephfs' \
  -o /etc/ceph/ceph.client.proxmox-fs.keyring

# Copy to all Proxmox nodes
for pve_node in pve1 pve2 pve3; do
  scp /etc/ceph/ceph.client.proxmox-fs.keyring root@${pve_node}:/etc/ceph/
done
```

## Step 3: Install CephFS Client on Proxmox Nodes

```bash
# On each Proxmox node
apt update
apt install -y ceph-common

# Verify kernel CephFS support
grep -i ceph /boot/config-$(uname -r) | grep -i "=y\|=m"
```

## Step 4: Add CephFS Storage to Proxmox

```bash
# Via CLI on a Proxmox node
pvesm add cephfs pve-cephfs \
  --monhost "mon1:6789,mon2:6789,mon3:6789" \
  --username proxmox-fs \
  --path /mnt/pve/cephfs \
  --content vztmpl,iso,backup,snippets

# Verify storage is mounted
pvesm status | grep pve-cephfs
df -h /mnt/pve/cephfs
```

Or via the Proxmox GUI:
1. Datacenter -> Storage -> Add -> CephFS
2. Set Monitor hosts, Username, Path, and Content types

## Step 5: Create an LXC Container Using a Template from CephFS

```bash
# Create a container using a template stored on CephFS
# Note: rootfs must be on local or RBD storage, not CephFS
pct create 200 pve-cephfs:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname cephfs-ct \
  --memory 512 \
  --cores 2 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --rootfs local-lvm:8

# Start the container
pct start 200
pct status 200
```

## Step 6: Adding Shared Bind Mounts

For shared directories accessible by multiple containers:

```bash
# Create a directory in CephFS for shared data
mkdir -p /mnt/pve/cephfs/shared/app-data

# Add a bind mount to a running container
pct set 200 -mp0 /mnt/pve/cephfs/shared/app-data,mp=/shared

# Or add during creation
pct create 201 ... --mp0 /mnt/pve/cephfs/shared/app-data,mp=/shared
```

## Verifying CephFS Storage and Bind Mounts

```bash
# Verify CephFS is mounted and accessible
df -h /mnt/pve/cephfs
ls /mnt/pve/cephfs/

# Check the container's bind mount configuration
pct config 200 | grep mp
```

## Summary

CephFS in Proxmox provides a flexible shared filesystem for storing container templates, ISO images, backups, snippets, and shared data. After deploying MDS, creating a Proxmox CephFS auth user, and adding the storage via `pvesm add cephfs`, all Proxmox nodes can access the same templates and backups, and containers can share bind-mounted CephFS directories across nodes. Note that container rootfs requires Ceph RBD (block storage), not CephFS. CephFS directories are accessible from all Proxmox nodes simultaneously, making shared datasets and configuration directories straightforward to manage across a datacenter cluster.
