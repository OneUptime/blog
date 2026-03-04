# How to Plan and Deploy a GFS2 Cluster File System on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, GFS2, Cluster, Storage, Pacemaker, High Availability, Linux

Description: Learn how to plan, deploy, and configure a GFS2 cluster file system on RHEL 9 for shared storage across multiple cluster nodes.

---

GFS2 (Global File System 2) is a shared-disk cluster file system that allows multiple RHEL 9 nodes to simultaneously read and write to the same storage device. It is designed for high-availability clusters where applications need concurrent access to shared data. GFS2 requires a cluster infrastructure (Pacemaker and Corosync) and shared block storage (SAN, iSCSI, or Fibre Channel).

## Prerequisites

Before deploying GFS2, you need:

- At least 2 RHEL 9 nodes with active subscriptions
- Shared block storage accessible from all nodes (iSCSI, FC SAN, or shared virtual disk)
- Pacemaker/Corosync cluster configured and running
- Fencing configured (STONITH) - this is mandatory for GFS2
- The `gfs2-utils` and `lvm2-lockd` packages

## Planning Your GFS2 Deployment

### Determine the Number of Journals

GFS2 requires one journal per node that will mount the file system. Always create more journals than current nodes to allow for future expansion:

```text
Current nodes: 3
Recommended journals: 5 (allows adding 2 more nodes)
```

### Choose Journal Size

Default journal size is 128 MB. For write-heavy workloads, increase to 256 MB or more.

### Estimate Storage Requirements

Account for:
- Data storage needs
- Journal space: journals * journal_size
- Metadata overhead: approximately 5% of total space

## Step 1: Install Required Packages

On all cluster nodes:

```bash
sudo dnf install gfs2-utils dlm lvm2-lockd
```

## Step 2: Configure the Cluster

If not already configured, set up Pacemaker:

```bash
sudo dnf install pcs pacemaker fence-agents-all

sudo systemctl enable --now pcsd

# Set password for hacluster user
echo 'password' | sudo passwd --stdin hacluster

# Authenticate nodes (from one node)
sudo pcs host auth node1 node2 node3

# Create the cluster
sudo pcs cluster setup mycluster node1 node2 node3

# Start and enable
sudo pcs cluster start --all
sudo pcs cluster enable --all
```

## Step 3: Configure Fencing

GFS2 requires fencing. Without it, a hung node could corrupt the file system:

```bash
# Example with IPMI fencing
sudo pcs stonith create fence-node1 fence_ipmilan \
    ipaddr=10.0.0.101 login=admin passwd=password \
    lanplus=1 pcmk_host_list=node1

sudo pcs stonith create fence-node2 fence_ipmilan \
    ipaddr=10.0.0.102 login=admin passwd=password \
    lanplus=1 pcmk_host_list=node2

sudo pcs stonith create fence-node3 fence_ipmilan \
    ipaddr=10.0.0.103 login=admin passwd=password \
    lanplus=1 pcmk_host_list=node3
```

## Step 4: Configure DLM (Distributed Lock Manager)

The DLM resource must be running before GFS2 can mount:

```bash
sudo pcs resource create dlm systemd:dlm \
    op monitor interval=30s on-fail=fence \
    clone interleave=true ordered=true
```

## Step 5: Configure Shared LVM (lvmlockd)

Enable lvmlockd for cluster-aware LVM:

```bash
sudo pcs resource create lvmlockd ocf:heartbeat:lvmlockd \
    op monitor interval=30s on-fail=fence \
    clone interleave=true ordered=true

sudo pcs constraint order dlm-clone then lvmlockd-clone
sudo pcs constraint colocation add lvmlockd-clone with dlm-clone
```

## Step 6: Create the Shared Volume Group

On one node:

```bash
# Create the VG with shared lock type
sudo vgcreate --shared shared_vg /dev/sdb

# Start the VG lock on all nodes
sudo vgchange --lock-start shared_vg

# Create a logical volume
sudo lvcreate -L 50G -n gfs2_lv shared_vg
```

## Step 7: Create the GFS2 File System

```bash
sudo mkfs.gfs2 -p lock_dlm -t mycluster:mygfs2 -j 5 /dev/shared_vg/gfs2_lv
```

Parameters:

- `-p lock_dlm` - Use the DLM locking protocol
- `-t mycluster:mygfs2` - Lock table name (cluster_name:fs_name)
- `-j 5` - Number of journals

## Step 8: Configure GFS2 as a Cluster Resource

```bash
sudo pcs resource create gfs2-mount ocf:heartbeat:Filesystem \
    device="/dev/shared_vg/gfs2_lv" \
    directory="/shared" \
    fstype="gfs2" \
    options="noatime" \
    op monitor interval=20s on-fail=fence \
    clone interleave=true

sudo pcs constraint order lvmlockd-clone then gfs2-mount-clone
sudo pcs constraint colocation add gfs2-mount-clone with lvmlockd-clone
```

## Step 9: Verify the Deployment

```bash
# Check cluster status
sudo pcs status

# Verify mounts on all nodes
sudo pcs resource status gfs2-mount-clone

# Check file system
gfs2_tool df /shared
```

## Testing Shared Access

From node1:

```bash
echo "written from node1" > /shared/test.txt
```

From node2:

```bash
cat /shared/test.txt
```

## Important Design Considerations

- **Fencing is mandatory** - Never run GFS2 without STONITH
- **Journal count** - Plan for growth, adding journals later is possible but requires downtime
- **Performance** - GFS2 has higher overhead than local file systems due to distributed locking
- **Node count** - GFS2 supports up to 16 nodes, but performance degrades with many writers
- **Workload suitability** - Best for read-heavy or append-heavy workloads with moderate write contention

## Summary

Deploying GFS2 on RHEL 9 requires careful planning of cluster infrastructure, fencing, shared storage, and journal allocation. The deployment depends on a functioning Pacemaker/Corosync cluster with mandatory fencing. Follow the resource ordering constraints (DLM, then lvmlockd, then GFS2 mount) and always test shared access before putting the file system into production.
