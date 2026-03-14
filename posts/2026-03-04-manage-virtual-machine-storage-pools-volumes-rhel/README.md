# How to Manage Virtual Machine Storage Pools and Volumes on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, Storage, Libvirt, Virtual Machines, Virtualization, Linux

Description: Learn how to create and manage libvirt storage pools and volumes on RHEL for organizing and provisioning virtual machine disk storage.

---

libvirt uses storage pools to manage the locations where virtual machine disk images are stored. A pool is a collection of storage volumes. RHEL supports directory-based, LVM, NFS, iSCSI, and other pool types.

## Listing Storage Pools

```bash
# List all storage pools and their state
sudo virsh pool-list --all

# Show details of a specific pool
sudo virsh pool-info default
```

## Creating a Directory-Based Storage Pool

```bash
# Create a new directory for the pool
sudo mkdir -p /data/vm-images

# Define a new directory-based pool
sudo virsh pool-define-as new-pool dir - - - - /data/vm-images

# Build the pool (creates the directory structure)
sudo virsh pool-build new-pool

# Start the pool
sudo virsh pool-start new-pool

# Set it to auto-start
sudo virsh pool-autostart new-pool

# Verify
sudo virsh pool-list --all
```

## Creating an LVM-Based Storage Pool

```bash
# Create a volume group first (if not existing)
sudo vgcreate vg_vms /dev/sdb

# Define an LVM storage pool
sudo virsh pool-define-as lvm-pool logical - - /dev/sdb vg_vms /dev/vg_vms

# Start and auto-start the pool
sudo virsh pool-start lvm-pool
sudo virsh pool-autostart lvm-pool
```

## Creating an NFS Storage Pool

```bash
# Define an NFS-based pool
sudo virsh pool-define-as nfs-pool netfs \
  --source-host nfs-server.example.com \
  --source-path /exports/vm-images \
  --target /mnt/nfs-vm-images

sudo virsh pool-start nfs-pool
sudo virsh pool-autostart nfs-pool
```

## Managing Volumes

```bash
# Create a new volume in a pool
sudo virsh vol-create-as new-pool vm-disk1.qcow2 20G --format qcow2

# List volumes in a pool
sudo virsh vol-list new-pool

# Show volume information
sudo virsh vol-info vm-disk1.qcow2 --pool new-pool

# Resize a volume
sudo virsh vol-resize vm-disk1.qcow2 --pool new-pool 40G

# Delete a volume
sudo virsh vol-delete vm-disk1.qcow2 --pool new-pool

# Clone a volume
sudo virsh vol-clone vm-disk1.qcow2 vm-disk1-clone.qcow2 --pool new-pool
```

## Refreshing a Pool

If files are added outside of libvirt (e.g., manually copied):

```bash
# Refresh the pool to detect new files
sudo virsh pool-refresh new-pool
```

## Deleting a Storage Pool

```bash
# Stop the pool first
sudo virsh pool-destroy new-pool

# Undefine the pool (removes the definition but not the data)
sudo virsh pool-undefine new-pool

# To also remove the underlying directory/data:
sudo rm -rf /data/vm-images
```

Organize your VM storage into logical pools by purpose (e.g., production, testing, ISOs). This makes it easier to manage disk space and apply different storage policies to different workloads.
