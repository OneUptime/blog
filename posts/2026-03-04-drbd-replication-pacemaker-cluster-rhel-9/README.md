# How to Configure DRBD-Based Replication in a RHEL Pacemaker Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DRBD, Replication, Pacemaker, High Availability, Storage, Cluster, Linux

Description: Learn how to configure DRBD for real-time block device replication in a RHEL Pacemaker cluster for high availability storage.

---

DRBD (Distributed Replicated Block Device) provides real-time, synchronous block-level replication between two RHEL servers. Combined with Pacemaker, DRBD creates a highly available storage solution without requiring shared physical storage.

## Prerequisites

- Two RHEL servers with a running Pacemaker cluster
- A dedicated partition or disk on each server for DRBD
- Network connectivity between nodes (preferably a dedicated replication network)

## Step 1: Install DRBD

On both nodes:

```bash
sudo dnf install drbd drbd-utils kmod-drbd -y
```

Load the DRBD kernel module:

```bash
sudo modprobe drbd
echo drbd | sudo tee /etc/modules-load.d/drbd.conf
```

## Step 2: Prepare the Disk

On both nodes, prepare a partition for DRBD (do not format it):

```bash
# Verify the partition exists
lsblk /dev/sdb1
```

## Step 3: Configure DRBD

Create the DRBD resource configuration on both nodes:

```bash
sudo tee /etc/drbd.d/data.res << 'CONF'
resource data {
    protocol C;

    disk {
        on-io-error detach;
    }

    net {
        cram-hmac-alg sha256;
        shared-secret "MyDRBDSecret";
    }

    on node1 {
        device /dev/drbd0;
        disk /dev/sdb1;
        address 10.0.1.11:7789;
        meta-disk internal;
    }

    on node2 {
        device /dev/drbd0;
        disk /dev/sdb1;
        address 10.0.1.12:7789;
        meta-disk internal;
    }
}
CONF
```

Protocol C means synchronous replication (write is confirmed only after both nodes acknowledge).

## Step 4: Initialize DRBD

On both nodes:

```bash
sudo drbdadm create-md data
```

Start DRBD on both nodes:

```bash
sudo drbdadm up data
```

## Step 5: Perform Initial Synchronization

On one node (node1), force it to be the primary:

```bash
sudo drbdadm primary --force data
```

Monitor synchronization progress:

```bash
sudo drbdadm status data
```

Or:

```bash
cat /proc/drbd
```

Wait for synchronization to complete (shows "UpToDate" on both nodes).

## Step 6: Create a Filesystem

On the primary node (node1):

```bash
sudo mkfs.xfs /dev/drbd0
```

## Step 7: Configure Firewall

On both nodes:

```bash
sudo firewall-cmd --permanent --add-port=7789/tcp
sudo firewall-cmd --reload
```

## Step 8: Stop DRBD (Pacemaker Will Manage It)

On both nodes:

```bash
sudo drbdadm down data
sudo systemctl disable drbd
```

## Step 9: Create Pacemaker Resources

Create the DRBD resource as a promotable clone:

```bash
sudo pcs resource create DRBDData ocf:linbit:drbd \
    drbd_resource=data \
    op monitor interval=30s role=Promoted \
    op monitor interval=60s role=Unpromoted

sudo pcs resource promotable DRBDData \
    promoted-max=1 promoted-node-max=1 \
    clone-max=2 clone-node-max=1 \
    notify=true
```

Create a filesystem resource:

```bash
sudo pcs resource create DRBDFs ocf:heartbeat:Filesystem \
    device=/dev/drbd0 directory=/mnt/data fstype=xfs \
    op monitor interval=20s
```

Create a VIP:

```bash
sudo pcs resource create DRBDVIP ocf:heartbeat:IPaddr2 \
    ip=192.168.1.100 cidr_netmask=24
```

## Step 10: Configure Constraints

The filesystem and VIP must run on the DRBD primary:

```bash
sudo pcs constraint colocation add DRBDFs with Promoted DRBDData-clone INFINITY
sudo pcs constraint colocation add DRBDVIP with DRBDFs INFINITY

sudo pcs constraint order promote DRBDData-clone then start DRBDFs
sudo pcs constraint order DRBDFs then DRBDVIP
```

## Step 11: Verify the Setup

```bash
sudo pcs status
```

Check DRBD status:

```bash
sudo drbdadm status data
```

## Step 12: Test Failover

```bash
sudo pcs node standby node1
sudo pcs status
```

DRBD promotes node2, mounts the filesystem, and assigns the VIP.

Bring node1 back:

```bash
sudo pcs node unstandby node1
```

## Conclusion

DRBD with Pacemaker on RHEL provides synchronized block-level replication without shared storage hardware. Use protocol C for synchronous replication and configure a promotable clone resource for automatic primary/secondary management. Test failover to ensure seamless transitions.
