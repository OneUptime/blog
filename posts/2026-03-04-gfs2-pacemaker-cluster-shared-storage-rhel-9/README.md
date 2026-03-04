# How to Set Up GFS2 on a Pacemaker Cluster for Shared Storage on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GFS2, Pacemaker, Shared Storage, Cluster, High Availability, Linux

Description: Learn how to set up GFS2 on a Pacemaker cluster on RHEL 9 for shared concurrent access to storage from multiple nodes.

---

GFS2 (Global File System 2) is a cluster filesystem on RHEL 9 that allows multiple nodes to mount and access the same storage concurrently. Combined with Pacemaker and DLM (Distributed Lock Manager), GFS2 provides a shared filesystem for active-active cluster configurations.

## Prerequisites

- A RHEL 9 Pacemaker cluster with at least two nodes
- STONITH fencing configured (required for GFS2)
- Shared block storage accessible from all nodes (iSCSI, SAN, or shared disk)

## Understanding GFS2

GFS2 uses DLM for distributed locking, ensuring data consistency when multiple nodes access the same files. Key components:

- **DLM** - Distributed Lock Manager for coordinating access
- **clvmd/lvmlockd** - Cluster-aware LVM for shared volume groups
- **GFS2** - The cluster filesystem itself

## Step 1: Install Required Packages

On all nodes:

```bash
sudo dnf install gfs2-utils dlm lvm2-lockd -y
```

## Step 2: Configure DLM

Create the DLM resource as a clone (runs on all nodes):

```bash
sudo pcs resource create dlm ocf:pacemaker:controld \
    op monitor interval=30s

sudo pcs resource clone dlm clone-max=2 clone-node-max=1
```

## Step 3: Configure lvmlockd

Create the lvmlockd resource:

```bash
sudo pcs resource create lvmlockd ocf:heartbeat:lvmlockd \
    op monitor interval=30s

sudo pcs resource clone lvmlockd clone-max=2 clone-node-max=1
```

Order lvmlockd after DLM:

```bash
sudo pcs constraint order dlm-clone then lvmlockd-clone
sudo pcs constraint colocation add lvmlockd-clone with dlm-clone
```

## Step 4: Create Shared LVM Volume Group

Enable shared locking in LVM:

```bash
sudo lvmconfig --type diff
```

On all nodes, set `use_lvmlockd = 1` in `/etc/lvm/lvm.conf`:

```bash
sudo sed -i 's/use_lvmlockd = 0/use_lvmlockd = 1/' /etc/lvm/lvm.conf
```

From one node, create the shared volume group:

```bash
sudo vgcreate --shared shared-vg /dev/sdb
```

On the other nodes, start the lock for the VG:

```bash
sudo vgchange --lock-start shared-vg
```

Create a logical volume:

```bash
sudo lvcreate -L 10G -n shared-lv shared-vg
```

## Step 5: Create the GFS2 Filesystem

From one node:

```bash
sudo mkfs.gfs2 -p lock_dlm -t my-cluster:shared-gfs2 -j 2 /dev/shared-vg/shared-lv
```

Parameters:

- `-p lock_dlm` - Use DLM for locking
- `-t my-cluster:shared-gfs2` - Lock table name (cluster-name:fs-name)
- `-j 2` - Number of journals (one per node that will mount)

## Step 6: Create the GFS2 Filesystem Resource

```bash
sudo pcs resource create SharedGFS2 ocf:heartbeat:Filesystem \
    device=/dev/shared-vg/shared-lv \
    directory=/mnt/shared \
    fstype=gfs2 \
    options="noatime" \
    op monitor interval=20s

sudo pcs resource clone SharedGFS2 clone-max=2 clone-node-max=1
```

Order after lvmlockd:

```bash
sudo pcs constraint order lvmlockd-clone then SharedGFS2-clone
sudo pcs constraint colocation add SharedGFS2-clone with lvmlockd-clone
```

## Step 7: Verify the Setup

```bash
sudo pcs status
```

Check that the filesystem is mounted on all nodes:

```bash
df -h /mnt/shared
mount | grep gfs2
```

## Step 8: Test Concurrent Access

On node1:

```bash
echo "Written from node1" > /mnt/shared/test.txt
```

On node2:

```bash
cat /mnt/shared/test.txt
echo "Written from node2" >> /mnt/shared/test.txt
```

Both nodes can read and write simultaneously.

## Managing GFS2

### Adding Journals

If adding a new node, add a journal:

```bash
sudo gfs2_jadd -j 1 /mnt/shared
```

### Checking the Filesystem

Unmount GFS2 on all nodes before running fsck:

```bash
sudo pcs resource disable SharedGFS2-clone
sudo fsck.gfs2 -y /dev/shared-vg/shared-lv
sudo pcs resource enable SharedGFS2-clone
```

### Growing the Filesystem

Expand the LV and grow GFS2 online:

```bash
sudo lvextend -L +5G /dev/shared-vg/shared-lv
sudo gfs2_grow /mnt/shared
```

## Monitoring GFS2

Check GFS2 lock status:

```bash
sudo dlm_tool status
```

View filesystem statistics:

```bash
gfs2_tool df /mnt/shared
```

## Conclusion

GFS2 on a Pacemaker cluster provides concurrent shared storage access on RHEL 9. The DLM ensures data consistency, and Pacemaker manages the lifecycle of all components. Always configure STONITH fencing before using GFS2, as fencing is required to prevent data corruption when a node becomes unresponsive.
