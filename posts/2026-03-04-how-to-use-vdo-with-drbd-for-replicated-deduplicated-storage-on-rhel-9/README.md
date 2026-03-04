# How to Use VDO with DRBD for Replicated Deduplicated Storage on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, VDO, Storage

Description: Step-by-step guide on use vdo with drbd for replicated deduplicated storage on rhel 9 with practical examples and commands.

---

Combining VDO deduplication with DRBD replication on RHEL 9 provides space-efficient replicated storage for high-availability workloads.

## Prerequisites

- Two RHEL 9 servers with network connectivity
- Block devices available for VDO/DRBD
- Matching kernel versions on both nodes

## Install Packages

On both nodes:

```bash
sudo dnf install -y vdo kmod-kvdo drbd drbd-utils kernel-modules-extra
```

## Create VDO Volumes

On both nodes:

```bash
sudo vdo create --name=vdo-data \
  --device=/dev/sdb \
  --vdoLogicalSize=100G \
  --writePolicy=async
```

## Configure DRBD

Create the DRBD resource configuration on both nodes:

```bash
sudo tee /etc/drbd.d/vdo-repl.res <<EOF
resource vdo-repl {
  protocol C;

  disk {
    al-extents 6433;
  }

  on node1 {
    device /dev/drbd0;
    disk /dev/mapper/vdo-data;
    address 10.0.1.10:7789;
    meta-disk internal;
  }

  on node2 {
    device /dev/drbd0;
    disk /dev/mapper/vdo-data;
    address 10.0.1.20:7789;
    meta-disk internal;
  }
}
EOF
```

## Initialize DRBD

On both nodes:

```bash
sudo drbdadm create-md vdo-repl
```

Start DRBD on both nodes:

```bash
sudo systemctl enable --now drbd
sudo drbdadm up vdo-repl
```

## Set the Primary Node

On node1:

```bash
sudo drbdadm primary --force vdo-repl
```

## Create a Filesystem

On the primary node:

```bash
sudo mkfs.xfs /dev/drbd0
sudo mkdir -p /mnt/replicated
sudo mount /dev/drbd0 /mnt/replicated
```

## Verify Replication

```bash
sudo drbdadm status
cat /proc/drbd
```

## Monitor VDO Savings

```bash
sudo vdostats --human-readable
```

## Failover Procedure

On the current primary (node1):

```bash
sudo umount /mnt/replicated
sudo drbdadm secondary vdo-repl
```

On the new primary (node2):

```bash
sudo drbdadm primary vdo-repl
sudo mount /dev/drbd0 /mnt/replicated
```

## Conclusion

VDO with DRBD on RHEL 9 provides deduplicated, compressed, and replicated storage. This combination reduces storage costs while maintaining data availability across two nodes.

