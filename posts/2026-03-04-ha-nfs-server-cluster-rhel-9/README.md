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

Create the export directory on both nodes:

```bash
sudo mkdir -p /export/data
```

## Step 3: Configure NFS Exports

On both nodes, create the exports file:

```bash
sudo tee /etc/exports << 'EXPORTS'
/export/data *(rw,sync,no_root_squash,no_subtree_check)
EXPORTS
```

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
# Virtual IP
sudo pcs resource create NFS-VIP ocf:heartbeat:IPaddr2 \
    ip=192.168.1.100 cidr_netmask=24 \
    op monitor interval=30s

# Shared filesystem
sudo pcs resource create NFS-FS ocf:heartbeat:Filesystem \
    device=/dev/sdb directory=/export/data fstype=xfs \
    op monitor interval=20s

# NFS server
sudo pcs resource create NFS-Server systemd:nfs-server \
    op monitor interval=30s

# NFS export
sudo pcs resource create NFS-Export ocf:heartbeat:exportfs \
    clientspec="*" options="rw,sync,no_root_squash" \
    directory=/export/data fsid=1 \
    op monitor interval=30s
```

## Step 6: Group the Resources

```bash
sudo pcs resource group add NFS-Group NFS-VIP NFS-FS NFS-Server NFS-Export
```

Resources start in order: VIP, filesystem, NFS server, then exports.

## Step 7: Verify the Setup

```bash
sudo pcs status
```

Test from a client:

```bash
sudo mount 192.168.1.100:/export/data /mnt
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

Configure NFS clients with soft mount options for better failover handling:

```bash
sudo mount -o soft,timeo=50,retrans=3 192.168.1.100:/export/data /mnt
```

Or in /etc/fstab:

```
192.168.1.100:/export/data /mnt nfs soft,timeo=50,retrans=3 0 0
```

## Conclusion

A high availability NFS server on RHEL with Pacemaker ensures continuous access to shared storage. The key is proper resource ordering: VIP, filesystem, NFS server, then exports. Test failover to verify that NFS clients handle the transition smoothly.
