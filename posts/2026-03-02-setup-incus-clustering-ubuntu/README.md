# How to Set Up Incus Clustering on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Incus, Clustering, High Availability, Containers

Description: Configure an Incus cluster across multiple Ubuntu servers to enable high availability, live migration, and distributed container management.

---

A single Incus server is powerful, but clustering multiple servers together enables live migration of containers between hosts, high availability for critical workloads, and better resource utilization across your infrastructure. Incus clustering uses a distributed SQLite database (dqlite) to keep cluster state consistent across all members.

## Cluster Architecture

An Incus cluster consists of:

- **Cluster members** - Incus servers joined into a shared management plane
- **Shared storage** - Ceph or NFS for storage that persists independently of any single host
- **Cluster database** - dqlite, automatically replicated across at least 3 members
- **Shared network** - containers on any node can communicate if using overlay networking

For this guide, we set up a 3-node cluster. You need at least 3 nodes for the distributed database to maintain quorum.

## Prerequisites

Three Ubuntu servers with:
- Network connectivity between them (call them node1, node2, node3)
- Incus installed on all three (not yet initialized)
- Matching time (NTP synchronized)
- Open ports between nodes: 8443 (Incus API) and any storage-specific ports

```bash
# On all three nodes: install Incus
sudo apt-get install -y incus incus-tools

# On all three nodes: synchronize time
sudo apt-get install -y chrony
sudo systemctl enable --now chrony
timedatectl status
```

## Initialize the First Node (Bootstrap Node)

The first node initializes the cluster and subsequent nodes join it.

```bash
# On node1 only
sudo incus admin init
```

When prompted, answer:

```text
Would you like to use clustering? (yes/no) [default=no]: yes
What IP address or DNS name should be used to reach this server? [default=192.168.1.10]: 192.168.1.10
Are you joining an existing cluster? (yes/no) [default=no]: no
What member name should be used to identify this server in the cluster? [default=node1]: node1
Setup password authentication on the cluster? (yes/no) [default=no]: yes
Trust password for new clients: <enter a strong password>
Again: <repeat password>
Do you want to configure a new storage pool? (yes/no) [default=yes]: yes
Name of the new storage pool [default=default]: local
Name of the storage backend to use [dir, btrfs, lvm, zfs, ceph] [default=zfs]: btrfs
Create a new BTRFS pool? (yes/no) [default=yes]: yes
Size in GiB of the new loop device [default=30GiB]: 50GiB
Would you like to create a new local network bridge? (yes/no) [default=yes]: yes
What should the new bridge be called? [default=incusbr0]: incusbr0
```

After initialization, verify node1 is running:

```bash
# On node1
incus cluster list
```

You should see node1 listed as the only cluster member.

## Generate a Join Token

To add nodes 2 and 3, generate a join token from node1:

```bash
# On node1 - generate a token for node2
incus cluster add node2

# This outputs a one-time join token like:
# eyJzZXJ2ZXJfbmFtZSI6Im5vZGUyIiwiZmluZ2VycHJpbnQiOi...
```

Copy this token. You need it to initialize node2.

## Join Additional Nodes

```bash
# On node2
sudo incus admin init
```

Answer the clustering questions:

```text
Would you like to use clustering? (yes/no) [default=no]: yes
What IP address or DNS name should be used to reach this server? [default=192.168.1.11]: 192.168.1.11
Are you joining an existing cluster? (yes/no) [default=no]: yes
Do you have a join token? (yes/no) [default=no]: yes
Please provide join token: <paste the token from node1>
All existing data is lost when joining a cluster, continue? (yes/no) [default=no]: yes
Choose the local disk or volume for the "local" storage pool (or a blank string to skip): /dev/sdb (or leave blank to use a loop file)
```

Repeat the same process for node3 (generate a new token from node1 first).

## Verify the Cluster

```bash
# On any cluster member
incus cluster list
```

Expected output:

```text
+-------+-----------------------------+------------------+--------------+----------------+--------+-------------------+
| NAME  |             URL             |      ROLES       | ARCHITECTURE | FAILURE DOMAIN | STATE  |      MESSAGE      |
+-------+-----------------------------+------------------+--------------+----------------+--------+-------------------+
| node1 | https://192.168.1.10:8443   | database-leader, | x86_64       | default        | ONLINE | Fully operational |
|       |                             | database         |              |                |        |                   |
| node2 | https://192.168.1.11:8443   | database         | x86_64       | default        | ONLINE | Fully operational |
| node3 | https://192.168.1.12:8443   | database         | x86_64       | default        | ONLINE | Fully operational |
+-------+-----------------------------+------------------+--------------+----------------+--------+-------------------+
```

All three nodes should show ONLINE status.

## Configure Shared Storage for Live Migration

Local storage (per-node) works but containers on local storage cannot live-migrate. For live migration, use shared storage accessible from all nodes.

### Option A: NFS Shared Storage

```bash
# On your NFS server
sudo apt-get install -y nfs-kernel-server
sudo mkdir -p /export/incus-storage
echo "/export/incus-storage 192.168.1.0/24(rw,sync,no_subtree_check,no_root_squash)" | \
    sudo tee -a /etc/exports
sudo exportfs -ra

# On all Incus cluster nodes
sudo apt-get install -y nfs-common
sudo mkdir -p /mnt/incus-nfs
echo "nfs-server:/export/incus-storage /mnt/incus-nfs nfs4 defaults 0 0" | \
    sudo tee -a /etc/fstab
sudo mount -a

# Create a shared storage pool on the NFS mount
incus storage create shared dir source=/mnt/incus-nfs
```

### Option B: Ceph (Production Recommended)

```bash
# With an existing Ceph cluster
# Create a storage pool using Ceph RBD
incus storage create ceph-pool ceph source=ceph-cluster ceph.osd.pool_name=incus

# Verify the pool is accessible from all nodes
incus storage info ceph-pool
incus storage volumes list ceph-pool
```

## Launch Containers on Specific Nodes

```bash
# Launch a container on a specific node
incus launch images:ubuntu/22.04 web1 --target node2

# Launch on any available node (Incus chooses)
incus launch images:ubuntu/22.04 web2

# List containers showing which node they are on
incus list -c n,s,4,L
```

## Live Migrate a Container

To live-migrate a container from one node to another, the container must be on shared storage:

```bash
# Create a container on shared storage
incus launch images:ubuntu/22.04 migratable-container \
    --target node1 \
    -s ceph-pool

# Live migrate it to node2 (container keeps running during migration)
incus move migratable-container --target node2

# Verify the container moved
incus info migratable-container | grep Location
```

For containers on local storage, use cold migration (container is stopped):

```bash
# Stop container, migrate to another node, restart
incus stop my-container
incus move my-container --target node2
incus start my-container
```

## Configure Failure Domains

Failure domains tell Incus about your physical topology so it can make better placement decisions:

```bash
# Assign nodes to failure domains (racks, AZs, etc.)
incus cluster member edit node1
```

```yaml
# In the editor, set the failure domain
config: {}
description: ""
failure_domain: rack-1
name: node1
roles:
  - database
```

## Monitor Cluster Health

```bash
# Quick cluster status
incus cluster list

# Detailed member information
incus cluster show node1

# Check for any cluster issues
incus cluster info

# View events across the cluster
incus monitor --type=lifecycle --all-projects

# Check resource usage across all nodes
incus list -c n,s,m,t,L
```

## Handle a Failed Node

If a node fails and cannot be recovered:

```bash
# Check which containers were on the failed node
incus list -c n,s,L | grep failed-node

# On a healthy node, evacuate the failed node's containers
# This moves containers to healthy nodes
incus cluster evacuate failed-node

# If the node is permanently lost, remove it from the cluster
# (Requires at least 2 remaining healthy nodes for quorum)
incus cluster remove --force failed-node
```

## Remove a Node Gracefully

To remove a healthy node from the cluster:

```bash
# Evacuate the node (migrate its containers to other nodes)
incus cluster evacuate node3

# Wait for evacuation to complete
incus list -c n,s,L | grep node3

# Remove the node
incus cluster remove node3

# On node3 itself, clean up
sudo apt-get purge -y incus incus-tools
sudo rm -rf /var/lib/incus
```

Incus clustering significantly expands what you can do with system containers and VMs. Live migration, distributed placement, and unified management across multiple physical hosts opens up patterns that would otherwise require more complex orchestration tools.
