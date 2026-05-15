# How to Plan and Deploy a GFS2 Cluster File System on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GFS2, Cluster, High Availability, Storage, Pacemaker, Linux

Description: Learn how to plan and deploy a GFS2 (Global File System 2) cluster file system on RHEL for shared storage across multiple nodes in a high-availability cluster.

---

GFS2 is a shared-disk cluster file system included with the RHEL Resilient Storage Add-On for RHEL 7, 8, and 9. It allows multiple nodes to simultaneously read and write to the same block device, making it essential for high-availability clusters that need shared storage. GFS2 requires a cluster infrastructure (Pacemaker/Corosync) and a fencing mechanism.

## Prerequisites

You need at least two RHEL nodes with:
- Shared block storage (SAN, iSCSI, or Fibre Channel)
- Pacemaker and Corosync cluster configured
- Fencing (STONITH) configured and tested

```bash
# Install required packages on all nodes

sudo dnf install -y gfs2-utils dlm lvm2-lockd

# Enable the Resilient Storage repository if needed (RHEL 9 x86_64 example)
sudo subscription-manager repos --enable=rhel-9-for-x86_64-resilientstorage-rpms

# Set use_lvmlockd = 1 in /etc/lvm/lvm.conf on all nodes
```

## Setting Up the Cluster Infrastructure

```bash
# Ensure the cluster is running on all nodes
sudo pcs cluster status

# Set the quorum policy required for GFS2
sudo pcs property set no-quorum-policy=freeze

# Enable the DLM (Distributed Lock Manager) resource
sudo pcs resource create dlm --group locking ocf:pacemaker:controld \
  op monitor interval=30s on-fail=fence

# Clone the locking resource group on all nodes
sudo pcs resource clone locking interleave=true

# Enable lvmlockd for shared LVM
sudo pcs resource create lvmlockd --group locking ocf:heartbeat:lvmlockd \
  op monitor interval=30s on-fail=fence
```

## Creating the GFS2 File System

```bash
# Create a shared volume group (on one node only)
sudo vgcreate --shared vg_shared /dev/sdb

# If LVM devices files are enabled, add the shared device on the other nodes
sudo lvmdevices --adddev /dev/sdb

# Start the VG lock on the other nodes
sudo vgchange --lockstart vg_shared

# Create a logical volume
sudo lvcreate --activate sy -L 50G -n lv_gfs2 vg_shared

# Format with GFS2
# -p is the lock protocol, -t is clustername:fsname
# -j is the number of journals (one per node that will mount)
sudo mkfs.gfs2 -p lock_dlm -t mycluster:gfs2data -j 3 /dev/vg_shared/lv_gfs2
```

## Configuring the Cluster Resource

```bash
# Create a GFS2 filesystem resource in Pacemaker
sudo pcs resource create lv_gfs2 --group shared_vg ocf:heartbeat:LVM-activate \
  lvname=lv_gfs2 \
  vgname=vg_shared \
  activation_mode=shared \
  vg_access_mode=lvmlockd

sudo pcs resource create gfs2-fs --group shared_vg ocf:heartbeat:Filesystem \
  device="/dev/vg_shared/lv_gfs2" \
  directory="/mnt/gfs2" \
  fstype="gfs2" \
  options="noatime" \
  op monitor interval=10s on-fail=fence

sudo pcs resource clone shared_vg interleave=true

# Set ordering so GFS2 mounts after DLM and lvmlockd are running
sudo pcs constraint order start locking-clone then shared_vg-clone
sudo pcs constraint colocation add shared_vg-clone with locking-clone
```

## Verifying the Deployment

```bash
# Check the mount on all nodes
mount | grep gfs2

# Check cluster resource status
sudo pcs status --full
```

Plan the number of journals at creation time since adding journals later requires additional steps. Each node that mounts the filesystem needs its own journal. Always test fencing before relying on GFS2 in production.
