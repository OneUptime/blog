# How to Configure Proxmox Clustering on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Proxmox, Clustering, High Availability, Virtualization

Description: Configure a Proxmox VE cluster across multiple nodes for high availability, live VM migration, and centralized management with step-by-step instructions.

---

A Proxmox cluster connects multiple Proxmox VE nodes into a unified management plane. Once clustered, you can manage all nodes from a single web interface, migrate VMs between nodes with a few clicks, and configure high availability (HA) so VMs automatically restart on surviving nodes when a host fails.

Clustering requires careful attention to network configuration and quorum. A poorly configured cluster can be worse than no cluster - split-brain scenarios can corrupt VM data. This guide covers cluster setup, network requirements, and HA configuration correctly.

## Cluster Requirements

Before creating a cluster:

- **Minimum nodes**: 3 nodes for proper quorum. A 2-node cluster requires special corosync configuration.
- **Network latency**: Less than 5ms between nodes is strongly recommended. Corosync (the cluster communication layer) is sensitive to network latency.
- **Dedicated cluster network**: Separate the cluster communication traffic from VM traffic and management traffic when possible.
- **Same Proxmox VE version**: All nodes should run the same Proxmox VE major version.
- **Resolvable hostnames**: Each node must be able to resolve other nodes by hostname.
- **Time synchronization**: All nodes must have synchronized clocks (NTP).

For this guide, assume three nodes:
- `pve1` at `192.168.1.101` (cluster network: `10.0.1.1`)
- `pve2` at `192.168.1.102` (cluster network: `10.0.1.2`)
- `pve3` at `192.168.1.103` (cluster network: `10.0.1.3`)

## Pre-Cluster Network Configuration

### Configure Hostname Resolution

On each node, ensure all nodes resolve correctly:

```bash
# /etc/hosts on each node (add entries for all cluster members)
cat >> /etc/hosts << 'EOF'
192.168.1.101   pve1.cluster.local pve1
192.168.1.102   pve2.cluster.local pve2
192.168.1.103   pve3.cluster.local pve3
EOF

# Verify resolution works
ping -c 2 pve2
ping -c 2 pve3
```

### Verify Time Synchronization

```bash
# Check NTP status on each node
timedatectl status
# NTP service should show: active

# Verify all nodes have similar times
date

# If needed, install and configure chrony
apt-get install -y chrony
systemctl enable --now chronyd
```

### Configure Dedicated Cluster Network

Add a second network interface for cluster communication:

```bash
# Edit network interfaces on each node
nano /etc/network/interfaces
```

Add the cluster interface:

```
# Dedicated cluster communication interface
auto enp2s0
iface enp2s0 inet static
    address 10.0.1.1/24  # Change for each node: .1, .2, .3
```

Apply the configuration:

```bash
ifup enp2s0
```

## Creating the Cluster

Create the cluster on the first node (`pve1`):

```bash
# Create a new cluster named 'homelab' using the cluster network IP
# This initializes Corosync and the cluster configuration
pvecm create homelab --link0 10.0.1.1

# Verify cluster status
pvecm status
```

Expected output on `pve1`:

```
Cluster information
-------------------
Name:             homelab
Config Version:   1
Transport:        knet
Secure auth:      on

Quorum information
------------------
Date:             Mon Mar  2 10:00:00 2026
Quorum provider:  corosync_votequorum
Nodes:            1
Node ID:          0x00000001
Ring ID:          1.8
Quorate:          Yes
```

## Joining Additional Nodes

### On pve2 and pve3

Before joining, ensure there are no existing local VMs on the joining node (or migrate them off first). Joining wipes the node's cluster configuration:

```bash
# On pve2 - join the cluster using pve1's cluster network IP
pvecm add 10.0.1.1 --link0 10.0.1.2

# You'll be prompted for pve1's root password
# Enter it to authorize the join
```

Repeat on `pve3`:

```bash
# On pve3
pvecm add 10.0.1.1 --link0 10.0.1.3
```

### Verify Cluster Status

```bash
# Check from any node
pvecm status

# Expected output shows all 3 nodes:
# Nodes: 3
# Quorate: Yes

pvecm nodes
# Should list pve1, pve2, pve3

# View cluster from web interface
# All three nodes now appear in the left sidebar under the datacenter
```

## Configuring Shared Storage for Live Migration

For live VM migration (without downtime), VMs need to be on shared storage that all nodes can access simultaneously. Options include:

### NFS Shared Storage

```bash
# On the NFS server (separate from cluster nodes)
apt-get install -y nfs-kernel-server
mkdir -p /exports/vm-storage
echo "/exports/vm-storage 192.168.1.0/24(rw,sync,no_subtree_check,no_root_squash)" >> /etc/exports
exportfs -ra

# Add shared storage to Proxmox cluster (run once on any node)
pvesm add nfs shared-nfs \
    --server 192.168.1.200 \
    --export /exports/vm-storage \
    --content images,backup \
    --options vers=4

# Verify storage is visible on all nodes
pvesm status
```

### Ceph (Distributed Storage)

For production clusters, Ceph provides redundant distributed storage without a single NFS server bottleneck. Proxmox includes Ceph integration:

```bash
# Install Ceph on all nodes (run on each node)
pveceph install

# Initialize Ceph on the first node
pveceph init --network 10.0.2.0/24  # Use a dedicated Ceph network if available

# Create monitors on each node
pveceph mon create  # Run on pve1, pve2, pve3

# Create OSDs (one per disk per node)
pveceph osd create /dev/sdb  # Run on each node with the appropriate disk

# Create a storage pool
pveceph pool create vm-pool --pg_num 128 --add_storages 1
```

## Configuring High Availability

With shared storage, configure HA so VMs automatically restart on surviving nodes:

### Creating an HA Group

```bash
# Create an HA group that prioritizes nodes
# VMs in this group prefer pve1, failover to pve2, then pve3
ha-manager groupadd production \
    --nodes "pve1:3,pve2:2,pve3:1" \
    --nofailback 0 \
    --restricted 0
```

### Adding VMs to HA

```bash
# Add a VM to HA management
ha-manager add vm:201 --group production --max_restart 3 --max_relocate 1

# Check HA status
ha-manager status

# View HA resources
ha-manager config
```

### HA States

HA-managed VMs have these states:

- `started`: VM should be running
- `stopped`: VM should be stopped (HA won't start it)
- `disabled`: HA ignores this VM temporarily
- `error`: HA has exhausted restart attempts

```bash
# Temporarily disable HA for a VM (for maintenance)
ha-manager set vm:201 --state disabled

# Re-enable HA management
ha-manager set vm:201 --state started
```

## Corosync Configuration

For advanced cluster configuration, the Corosync config is at `/etc/pve/corosync.conf`:

```bash
cat /etc/pve/corosync.conf
```

```
logging {
  debug: off
  to_syslog: yes
}

nodelist {
  node {
    name: pve1
    nodeid: 1
    quorum_votes: 1
    ring0_addr: 10.0.1.1
  }
  node {
    name: pve2
    nodeid: 2
    quorum_votes: 1
    ring0_addr: 10.0.1.2
  }
  node {
    name: pve3
    nodeid: 3
    quorum_votes: 1
    ring0_addr: 10.0.1.3
  }
}

quorum {
  provider: corosync_votequorum
}

totem {
  cluster_name: homelab
  config_version: 3
  interface {
    linknumber: 0
  }
  ip_version: ipv4-6
  link_mode: passive
  secauth: on
  version: 2
}
```

## Two-Node Cluster Configuration

If you only have two nodes, you need a quorum device to prevent split-brain:

```bash
# Install corosync-qdevice on both nodes
apt-get install -y corosync-qdevice

# Set up a QDevice (requires a third lightweight machine, e.g., a Raspberry Pi or VM)
# On the QDevice machine:
apt-get install -y corosync-qnetd
systemctl enable --now corosync-qnetd

# On the Proxmox nodes, add the QDevice
pvecm qdevice setup <qdevice-ip>

# Verify quorum
pvecm status | grep Quorum
```

## Live VM Migration

With shared storage configured and the cluster operational:

```bash
# Migrate a VM from pve1 to pve2 (online - no downtime required)
qm migrate 201 pve2 --online

# Migrate all VMs off a node (for maintenance)
for vmid in $(qm list --node pve1 | awk 'NR>1 {print $1}'); do
    qm migrate $vmid pve2 --online
done
```

## Removing a Node from the Cluster

```bash
# First, migrate all VMs off the node
# Then, on the node being removed:
pvecm delnode pve3

# If the node is already offline, run from a surviving node:
pvecm delnode pve3
```

## Summary

A Proxmox cluster requires careful network planning - dedicated cluster links, synchronized time, and proper hostname resolution are not optional. With those prerequisites met, the actual cluster creation is straightforward.

The real value of clustering comes from:
- Centralized web management of all nodes from one URL
- Live VM migration for maintenance without downtime
- HA automatic failover when hardware fails
- Ceph or shared NFS storage that all nodes can access simultaneously

Test your HA failover by simulating a node failure before relying on it in production.
