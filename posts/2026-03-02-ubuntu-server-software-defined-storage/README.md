# How to Install Ubuntu Server on a Software-Defined Storage Appliance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Storage, Ceph, Software-Defined Storage

Description: A guide to installing Ubuntu Server as the foundation for software-defined storage using Ceph, covering node preparation, cluster deployment, and storage pool configuration.

---

Software-defined storage (SDS) abstracts physical storage hardware into pools managed by software, enabling distributed, resilient storage without specialized SAN hardware. Ceph is the dominant open-source SDS platform on Ubuntu, and Ubuntu Server is a first-class Ceph deployment target through the MicroCeph and Cephadm tools.

## Understanding Ceph's Architecture

Before installing, it helps to understand what you are building:

- **Monitor (MON)**: Maintains cluster maps and consensus. Deploy at least 3 for production.
- **Manager (MGR)**: Handles metrics, orchestration, and the dashboard. Typically co-located with MONs.
- **Object Storage Daemon (OSD)**: Manages individual storage devices. One OSD per disk.
- **MDS (Metadata Server)**: Only needed for CephFS (shared filesystem). Not required for object or block storage.

A minimal production Ceph cluster needs at least 3 nodes with 3 MONs and enough disks for your data.

## Node Hardware Requirements

Each Ceph storage node should have:
- Dedicated NICs for cluster network and public network (10GbE+ recommended)
- Raw (unformatted) disks for OSDs - Ceph manages partitioning
- An OS disk separate from OSD disks
- 4GB+ RAM per OSD is a rough baseline (more for read-heavy workloads)

## Installing Ubuntu Server on Each Node

Install Ubuntu Server 24.04 LTS on each node. During installation:

- Keep the OS on its own disk (separate from OSD disks)
- Set static IP addresses or reliable DHCP reservations
- Use a consistent hostname scheme (e.g., `ceph-node-01`, `ceph-node-02`, `ceph-node-03`)

After installation:

```bash
# Update all packages
sudo apt update && sudo apt upgrade -y

# Set a hostname if not done during install
sudo hostnamectl set-hostname ceph-node-01

# Add all nodes to /etc/hosts on each node (or use DNS)
sudo nano /etc/hosts
```

```
192.168.10.11  ceph-node-01
192.168.10.12  ceph-node-02
192.168.10.13  ceph-node-03
```

## Setting Up SSH Keys Between Nodes

The orchestration tools need passwordless SSH between nodes:

```bash
# Generate SSH key on the admin node (can be one of the storage nodes)
ssh-keygen -t ed25519 -f ~/.ssh/ceph_admin -N ""

# Copy to all nodes
ssh-copy-id -i ~/.ssh/ceph_admin.pub ceph-node-01
ssh-copy-id -i ~/.ssh/ceph_admin.pub ceph-node-02
ssh-copy-id -i ~/.ssh/ceph_admin.pub ceph-node-03

# Test
ssh -i ~/.ssh/ceph_admin ceph-node-02 hostname
```

## Option 1: MicroCeph (Recommended for Simpler Setups)

MicroCeph is Canonical's snap-based Ceph distribution optimized for simplicity:

```bash
# Install MicroCeph on all nodes
sudo snap install microceph

# On the first node, bootstrap the cluster
sudo microceph cluster bootstrap

# Get the join token for other nodes
sudo microceph cluster add ceph-node-02
# Copy the join token that appears

# On ceph-node-02, join with the token
sudo microceph cluster join <token-from-above>

# Repeat for ceph-node-03

# Add OSDs on each node (run on each node)
# Replace /dev/sdb, /dev/sdc with your actual OSD disks
sudo microceph disk add /dev/sdb --wipe
sudo microceph disk add /dev/sdc --wipe

# Check cluster status
sudo microceph status
sudo ceph status
```

## Option 2: Cephadm (Full-Featured Orchestration)

Cephadm provides more control and is the upstream-recommended deployment method:

```bash
# Install prerequisites
sudo apt install -y cephadm

# Bootstrap the cluster on the first node
sudo cephadm bootstrap \
  --mon-ip 192.168.10.11 \
  --cluster-network 192.168.20.0/24 \
  --initial-dashboard-user admin \
  --initial-dashboard-password changeme

# This installs the Ceph container image and starts initial services
# Note the dashboard URL and credentials from the output
```

After bootstrapping, the Ceph orchestrator runs inside containers:

```bash
# Check status
sudo ceph status

# Add additional nodes
ssh-copy-id -f -i /etc/ceph/ceph.pub root@ceph-node-02
sudo ceph orch host add ceph-node-02 192.168.10.12
sudo ceph orch host add ceph-node-03 192.168.10.13

# Deploy MONs to additional hosts
sudo ceph orch apply mon ceph-node-01,ceph-node-02,ceph-node-03

# Let the orchestrator manage OSDs on all available disks
sudo ceph orch apply osd --all-available-devices

# Or specify drives explicitly
sudo ceph orch daemon add osd ceph-node-02:/dev/sdb
sudo ceph orch daemon add osd ceph-node-02:/dev/sdc
```

## Verifying the Cluster

```bash
# Overall health
sudo ceph health detail

# Show OSD tree (physical layout)
sudo ceph osd tree

# Show disk usage
sudo ceph df

# Show OSD performance
sudo ceph osd perf

# Check MON quorum
sudo ceph quorum_status --format json-pretty
```

A healthy cluster shows `HEALTH_OK`. Common warnings on a fresh cluster include too few OSDs for the default replication settings.

## Creating Storage Pools

Ceph stores data in pools. Create pools for different workloads:

```bash
# Create a replicated pool for block storage (default 3x replication)
sudo ceph osd pool create block-pool replicated

# Set replication size
sudo ceph osd pool set block-pool size 3
sudo ceph osd pool set block-pool min_size 2

# Create an erasure-coded pool for object storage (more efficient, less CPU intensive)
sudo ceph osd erasure-code-profile set ec-profile k=4 m=2
sudo ceph osd pool create object-pool erasure ec-profile

# Enable RBD (block device) on the block pool
sudo ceph osd pool application enable block-pool rbd

# Create an RBD image
sudo rbd create --size 100G block-pool/my-volume
```

## Using Ceph Block Devices (RBD) on Ubuntu

On a client node (or the same nodes), map and use an RBD volume:

```bash
# Install Ceph client tools
sudo apt install ceph-common

# Copy the ceph.conf and keyring from the admin node
sudo scp ceph-node-01:/etc/ceph/ceph.conf /etc/ceph/
sudo scp ceph-node-01:/etc/ceph/ceph.client.admin.keyring /etc/ceph/

# Map the RBD image to a block device
sudo rbd map block-pool/my-volume

# The device appears as /dev/rbd0
ls /dev/rbd0

# Format and mount it
sudo mkfs.ext4 /dev/rbd0
sudo mkdir -p /mnt/ceph-block
sudo mount /dev/rbd0 /mnt/ceph-block
```

## Setting Up CephFS (Shared Filesystem)

CephFS provides a POSIX-compliant shared filesystem:

```bash
# Deploy MDS (Metadata Servers)
sudo ceph orch apply mds cephfs --placement="2 ceph-node-01 ceph-node-02"

# Create CephFS
sudo ceph fs volume create myfs

# Create pools for CephFS
sudo ceph osd pool create cephfs-data
sudo ceph osd pool create cephfs-metadata
sudo ceph fs new myfs cephfs-metadata cephfs-data

# Check FS status
sudo ceph fs status
```

Mount CephFS on a client:

```bash
# Get the admin keyring secret
sudo ceph auth get-key client.admin

# Mount using kernel CephFS
sudo mount -t ceph ceph-node-01:/ /mnt/cephfs -o name=admin,secret=your-key-here

# Or mount using FUSE (more portable)
sudo apt install ceph-fuse
sudo ceph-fuse /mnt/cephfs
```

## Monitoring the Cluster

The Ceph dashboard provides a web interface for monitoring:

```bash
# Get the dashboard URL
sudo ceph mgr services

# Enable the dashboard module if not already active
sudo ceph mgr module enable dashboard
sudo ceph dashboard create-self-signed-cert
sudo ceph dashboard ac-user-create admin --enabled -r administrator
```

For integration with external monitoring, Ceph exposes Prometheus metrics:

```bash
# Enable Prometheus module
sudo ceph mgr module enable prometheus

# Metrics endpoint (defaults to port 9283)
curl http://ceph-node-01:9283/metrics | head -20
```

## Disk Failure and Replacement

When a disk fails, Ceph marks the OSD as down and redistributes data automatically:

```bash
# Identify failed OSD
sudo ceph osd tree
sudo ceph health detail

# After replacing the disk, add it as a new OSD
sudo ceph orch daemon add osd ceph-node-02:/dev/sdb

# Monitor rebalancing
sudo ceph status
# Watch "degraded" count return to 0
```

Ubuntu Server provides a solid foundation for Ceph. The combination of Ubuntu's enterprise-grade package repositories, Canonical's MicroCeph distribution, and Ceph's own maturity makes it a proven SDS platform for both small clusters and large deployments.
