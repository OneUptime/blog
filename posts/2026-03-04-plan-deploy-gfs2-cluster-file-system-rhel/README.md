# How to Plan and Deploy a GFS2 Cluster File System on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GFS2, Cluster, High Availability, Storage, Pacemaker, Linux

Description: Learn how to plan and deploy a GFS2 (Global File System 2) cluster file system on RHEL for shared storage across multiple nodes in a high-availability cluster.

---

GFS2 is a shared-disk cluster file system included with RHEL. It allows multiple nodes to simultaneously read and write to the same block device, making it essential for high-availability clusters that need shared storage. GFS2 requires a cluster infrastructure (Pacemaker/Corosync) and a fencing mechanism.

## Prerequisites

You need at least two RHEL nodes with:
- Shared block storage (SAN, iSCSI, or Fibre Channel)
- Pacemaker and Corosync cluster configured
- Fencing (STONITH) configured and tested

```bash
# Install required packages on all nodes
sudo dnf install -y gfs2-utils dlm lvm2-lockd

# Enable the high-availability repository if needed
sudo dnf install -y @ha
```

## Setting Up the Cluster Infrastructure

```bash
# Ensure the cluster is running on all nodes
sudo pcs cluster status

# Enable the DLM (Distributed Lock Manager) resource
sudo pcs resource create dlm systemd:dlm \
  op monitor interval=30s on-fail=fence \
  clone interleave=true ordered=true

# Enable lvmlockd for shared LVM
sudo pcs resource create lvmlockd ocf:heartbeat:lvmlockd \
  op monitor interval=30s on-fail=fence \
  clone interleave=true ordered=true

# Set ordering constraints
sudo pcs constraint order start dlm-clone then lvmlockd-clone
```

## Creating the GFS2 File System

```bash
# Create a shared volume group (on one node only)
sudo vgcreate --shared vg_shared /dev/sdb

# Start the VG lock on all nodes
sudo vgchange --lock-start vg_shared

# Create a logical volume
sudo lvcreate -L 50G -n lv_gfs2 vg_shared

# Format with GFS2
# -p is the lock protocol, -t is clustername:fsname
# -j is the number of journals (one per node that will mount)
sudo mkfs.gfs2 -p lock_dlm -t mycluster:gfs2data -j 3 /dev/vg_shared/lv_gfs2
```

## Configuring the Cluster Resource

```bash
# Create a GFS2 filesystem resource in Pacemaker
sudo pcs resource create gfs2-fs ocf:heartbeat:Filesystem \
  device="/dev/vg_shared/lv_gfs2" \
  directory="/mnt/gfs2" \
  fstype="gfs2" \
  options="noatime" \
  op monitor interval=10s on-fail=fence \
  clone interleave=true

# Set ordering so GFS2 mounts after DLM and lvmlockd are running
sudo pcs constraint order start lvmlockd-clone then gfs2-fs-clone
```

## Verifying the Deployment

```bash
# Check the mount on all nodes
mount | grep gfs2

# Verify GFS2 status
sudo gfs2_tool df /mnt/gfs2

# Check cluster resource status
sudo pcs status
```

Plan the number of journals at creation time since adding journals later requires additional steps. Each node that mounts the filesystem needs its own journal. Always test fencing before relying on GFS2 in production.
