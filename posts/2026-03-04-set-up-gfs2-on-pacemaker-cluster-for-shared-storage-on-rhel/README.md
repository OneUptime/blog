# How to Set Up GFS2 on a Pacemaker Cluster for Shared Storage on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GFS2, Pacemaker, Shared Storage, Clustering, DLM

Description: Configure GFS2 (Global File System 2) on a Pacemaker cluster on RHEL to allow multiple nodes to simultaneously read and write to shared block storage.

---

GFS2 is a shared-disk cluster file system that lets multiple nodes mount and write to the same block device simultaneously. It uses the Distributed Lock Manager (DLM) to coordinate access. This is useful for applications that need shared storage across cluster nodes.

## Prerequisites

You need a working Pacemaker/Corosync cluster with fencing configured, and a shared block device visible from all nodes (typically from a SAN or iSCSI target).

```bash
# Install required packages on all nodes
sudo dnf install -y gfs2-utils dlm lvm2-lockd

# Verify the shared block device is visible on all nodes
lsblk /dev/sdb
```

## Enable the DLM Resource

The DLM must be running before GFS2 can mount.

```bash
# Create a DLM resource (runs as a clone on all nodes)
sudo pcs resource create dlm ocf:pacemaker:controld \
    op monitor interval=30s on-fail=fence

sudo pcs resource clone dlm clone-max=2 clone-node-max=1
```

## Configure Clustered LVM (Optional)

If you want to use LVM on the shared device:

```bash
# Edit /etc/lvm/lvm.conf on all nodes
# Set locking_type = 1 and use_lvmlockd = 1
sudo lvmconfig --mergedconfig --type diff

# Create the lvmlockd resource
sudo pcs resource create lvmlockd ocf:heartbeat:lvmlockd \
    op monitor interval=30s on-fail=fence

sudo pcs resource clone lvmlockd clone-max=2 clone-node-max=1

# Order: DLM must start before lvmlockd
sudo pcs constraint order dlm-clone then lvmlockd-clone
sudo pcs constraint colocation add lvmlockd-clone with dlm-clone
```

## Create the GFS2 File System

```bash
# Create the GFS2 filesystem (run on one node only)
# -p lock_dlm : use the DLM for locking
# -t cluster_name:fs_name : cluster and filesystem name
# -j 2 : number of journals (one per node)
sudo mkfs.gfs2 -p lock_dlm -t mycluster:shared_gfs2 -j 2 /dev/sdb1
```

## Create the Filesystem Resource

```bash
# Add the GFS2 filesystem as a cloned resource
sudo pcs resource create shared_fs ocf:heartbeat:Filesystem \
    device="/dev/sdb1" \
    directory="/mnt/shared" \
    fstype="gfs2" \
    op monitor interval=20s on-fail=fence

sudo pcs resource clone shared_fs clone-max=2 clone-node-max=1

# Ensure proper ordering
sudo pcs constraint order lvmlockd-clone then shared_fs-clone
sudo pcs constraint colocation add shared_fs-clone with lvmlockd-clone
```

## Verify the Setup

```bash
# Check that GFS2 is mounted on both nodes
df -h /mnt/shared

# Create a test file from node1
echo "hello from node1" > /mnt/shared/testfile.txt

# Read it from node2
cat /mnt/shared/testfile.txt
```

## Monitor GFS2

```bash
# Check GFS2 lock status
sudo dlm_tool ls

# View GFS2 filesystem details
sudo gfs2_tool df /mnt/shared
```

Fencing is absolutely required with GFS2. If a node becomes unresponsive and is not fenced, it could corrupt the shared filesystem. Always verify fencing works before deploying GFS2 in production.
