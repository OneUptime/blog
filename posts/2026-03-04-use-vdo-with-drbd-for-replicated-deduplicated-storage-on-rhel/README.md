# How to Use VDO with DRBD for Replicated Deduplicated Storage on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VDO, DRBD, Storage, Deduplication, Replication

Description: Combine VDO deduplication and compression with DRBD block-level replication on RHEL to create storage that is both space-efficient and highly available.

---

VDO (Virtual Data Optimizer) provides inline deduplication and compression, while DRBD provides synchronous block-level replication between servers. Layering VDO on top of DRBD gives you replicated, deduplicated storage.

## Architecture

The stack is: Physical Disk -> DRBD (replication) -> VDO (deduplication) -> Filesystem. VDO sits on top of the DRBD device so both replicas benefit from deduplication.

## Install Packages on Both Nodes

```bash
# Install VDO and DRBD
sudo dnf install -y vdo kmod-kvdo lvm2
sudo dnf install -y https://www.elrepo.org/elrepo-release-9.el9.elrepo.noarch.rpm
sudo dnf install -y kmod-drbd9x drbd9x-utils --enablerepo=elrepo
```

## Configure DRBD

Create the DRBD resource configuration on both nodes:

```bash
# /etc/drbd.d/data.res
sudo tee /etc/drbd.d/data.res << 'CONF'
resource data {
    protocol C;

    disk {
        # Align with VDO block size
        al-extents 6433;
    }

    on node1 {
        device /dev/drbd0;
        disk /dev/sdb;
        address 192.168.1.10:7789;
        meta-disk internal;
    }

    on node2 {
        device /dev/drbd0;
        disk /dev/sdb;
        address 192.168.1.11:7789;
        meta-disk internal;
    }
}
CONF
```

Initialize and start DRBD:

```bash
# Create metadata (on both nodes)
sudo drbdadm create-md data

# Start DRBD (on both nodes)
sudo drbdadm up data

# Make node1 the primary (on node1 only, first time)
sudo drbdadm primary --force data

# Verify sync status
sudo drbdadm status data
```

## Create VDO on Top of DRBD

On the primary node:

```bash
# Create a VDO volume on the DRBD device
sudo vdo create \
  --name=vdo-data \
  --device=/dev/drbd0 \
  --vdoLogicalSize=100G \
  --writePolicy=auto

# Create a filesystem on the VDO volume
sudo mkfs.xfs -K /dev/mapper/vdo-data

# Mount it
sudo mkdir -p /mnt/replicated-data
sudo mount /dev/mapper/vdo-data /mnt/replicated-data
```

## Verify the Stack

```bash
# Check DRBD replication status
sudo drbdadm status data

# Check VDO statistics (dedup and compression ratios)
sudo vdostats --human-readable

# Check the mounted filesystem
df -h /mnt/replicated-data
```

## Failover Procedure

If node1 fails, promote node2:

```bash
# On node2: promote to primary
sudo drbdadm primary data

# Start VDO
sudo vdo start --name=vdo-data

# Mount the filesystem
sudo mount /dev/mapper/vdo-data /mnt/replicated-data
```

This combination is useful for environments that need both data reduction and high availability, such as backup servers or virtual machine storage.
