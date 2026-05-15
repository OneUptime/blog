# How to Configure a High Availability NFS Server Cluster on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, NFS, High Availability, Pacemaker, Cluster, Storage, Linux

Description: Learn how to set up a high availability NFS server on RHEL using Pacemaker for automatic failover of NFS exports.

---

A highly available NFS server on RHEL uses Pacemaker to manage a virtual IP, shared storage, and NFS services. When the active server fails, all components fail over to the standby node, providing continuous NFS access to clients.

## Prerequisites

- Two RHEL servers with a running Pacemaker cluster
- STONITH fencing configured
- Shared storage accessible from both nodes (iSCSI, SAN, or DRBD)

## Step 1: Install NFS on Both Nodes

On both nodes:

```bash
sudo dnf install nfs-utils -y
```

Do not enable the NFS server with systemd. Pacemaker will manage it.

```bash
sudo systemctl disable nfs-server
sudo systemctl stop nfs-server
```

## Step 2: Prepare Shared Storage

The shared filesystem must be accessible from both nodes but mounted on only one at a time. Using iSCSI as an example:

On both nodes, discover and log in to the iSCSI target:

```bash
sudo iscsiadm -m discovery -t sendtargets -p iscsi-server
sudo iscsiadm -m node --login
```

Create a filesystem on the shared device (once only):

```bash
sudo mkfs.xfs /dev/sdb
```

Create the shared filesystem mount point on both nodes:

```bash
sudo mkdir -p /export
```

## Step 3: Configure NFS Exports

On one node, mount the shared filesystem, create the export directory and the shared NFS state directory, then unmount it:

```bash
sudo mount /dev/sdb /export
sudo mkdir -p /export/data /export/.nfsinfo
sudo umount /export
```

Do not add the clustered export to `/etc/exports`. Pacemaker will manage the export with the `exportfs` resource.

## Step 4: Configure Firewall

On both nodes:

```bash
sudo firewall-cmd --permanent --add-service=nfs
sudo firewall-cmd --permanent --add-service=mountd
sudo firewall-cmd --permanent --add-service=rpc-bind
sudo firewall-cmd --reload
```

## Step 5: Create Cluster Resources

Create the resources in the correct order:

```bash
# Shared filesystem
sudo pcs resource create NFS-FS ocf:heartbeat:Filesystem \
    device=/dev/sdb directory=/export fstype=xfs \
    op monitor interval=20s \
    --group NFS-Group

# NFS server
sudo pcs resource create NFS-Server ocf:heartbeat:nfsserver \
    nfs_shared_infodir=/export/.nfsinfo nfs_no_notify=true \
    op monitor interval=30s \
    --group NFS-Group

# NFSv4 pseudo-root
sudo pcs resource create NFS-Root ocf:heartbeat:exportfs \
    clientspec="*" options="ro,sync,no_root_squash" \
    directory=/export fsid=0 \
    op monitor interval=30s \
    --group NFS-Group

# NFS data export
sudo pcs resource create NFS-Data ocf:heartbeat:exportfs \
    clientspec="*" options="rw,sync,no_root_squash" \
    directory=/export/data fsid=1 \
    op monitor interval=30s \
    --group NFS-Group

# Virtual IP
sudo pcs resource create NFS-VIP ocf:heartbeat:IPaddr2 \
    ip=192.168.1.100 cidr_netmask=24 \
    op monitor interval=30s \
    --group NFS-Group

# NFSv3 notification
sudo pcs resource create NFS-Notify ocf:heartbeat:nfsnotify \
    source_host=192.168.1.100 \
    op monitor interval=30s \
    --group NFS-Group
```

## Step 6: Group the Resources

The `--group NFS-Group` option adds each resource to the group as it is created. Resources start in order: filesystem, NFS server, exports, VIP, then NFS notifications.

## Step 7: Verify the Setup

```bash
sudo pcs status
```

Test from a client:

```bash
sudo mount -o vers=4 192.168.1.100:/data /mnt
ls /mnt
```

## Step 8: Test Failover

On the active node:

```bash
sudo pcs node standby node1
```

From the NFS client, verify access continues (may see a brief pause):

```bash
ls /mnt
```

Bring the node back:

```bash
sudo pcs node unstandby node1
```

## NFS Client Configuration for HA

Configure NFS clients with hard mounts so I/O waits for the server to recover instead of returning errors to applications:

```bash
sudo mount -o vers=4,hard 192.168.1.100:/data /mnt
```

Or in /etc/fstab:

```bash
192.168.1.100:/data /mnt nfs vers=4,hard 0 0
```

## Conclusion

A high availability NFS server on RHEL with Pacemaker ensures continuous access to shared storage. The key is proper resource ordering: filesystem, NFS server, exports, VIP, then NFS notifications. Test failover to verify that NFS clients handle the transition smoothly.
