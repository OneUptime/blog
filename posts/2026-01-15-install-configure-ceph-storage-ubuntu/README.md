# How to Install and Configure Ceph Storage on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Ceph, Distributed Storage, Object Storage, Block Storage, Tutorial

Description: Complete guide to installing and configuring Ceph distributed storage system on Ubuntu.

---

Ceph is a powerful, open-source distributed storage system designed to provide excellent performance, reliability, and scalability. It offers object storage, block storage, and file system storage in a single unified platform. This comprehensive guide will walk you through installing and configuring Ceph on Ubuntu, from understanding its architecture to setting up production-ready storage services.

## Understanding Ceph Architecture

Before diving into installation, it's essential to understand Ceph's core components and how they work together to provide distributed storage.

### Core Daemon Types

**Ceph Monitor (MON)**
Monitors maintain the cluster map, which includes the monitor map, manager map, OSD map, MDS map, and CRUSH map. They track the state of the cluster and coordinate between cluster members. A production cluster typically runs 3-5 monitors for high availability.

**Ceph Object Storage Daemon (OSD)**
OSDs store the actual data, handle data replication, recovery, rebalancing, and provide heartbeat information to monitors. Each OSD typically corresponds to one physical or logical storage device. A minimum of 3 OSDs is recommended for data redundancy.

**Ceph Manager (MGR)**
Managers run alongside monitors to provide additional monitoring and interfaces to external monitoring and management systems. They handle cluster metrics, the Ceph Dashboard, and various plugins.

**Ceph Metadata Server (MDS)**
MDS servers store metadata for the Ceph File System (CephFS). They enable POSIX-compliant file system operations without burdening the OSDs with metadata overhead.

### Storage Types in Ceph

**RADOS (Reliable Autonomic Distributed Object Store)**
RADOS is the foundational layer of Ceph. All storage types in Ceph ultimately use RADOS to store data as objects. It provides the core data distribution and replication mechanisms.

**RBD (RADOS Block Device)**
RBD provides block storage, allowing you to create virtual block devices backed by Ceph. It's commonly used for virtual machine disks, Kubernetes persistent volumes, and other block storage needs.

**CephFS (Ceph File System)**
CephFS is a POSIX-compliant distributed file system built on top of RADOS. It provides shared file storage that can be mounted by multiple clients simultaneously.

**RGW (RADOS Gateway)**
RGW provides object storage with RESTful interfaces compatible with Amazon S3 and OpenStack Swift APIs. It's ideal for cloud-native applications and data lakes.

## Prerequisites and Planning

### Hardware Requirements

For a production Ceph cluster, consider the following minimum requirements:

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| MON Nodes | 3 | 5 |
| OSD Nodes | 3 | 5+ |
| RAM per OSD | 4 GB | 8 GB |
| Network | 1 Gbps | 10 Gbps |
| Storage per OSD | Any size | SSD for journals |

### Network Planning

```bash
# Example network layout for Ceph cluster
# Public Network (client access): 192.168.1.0/24
# Cluster Network (OSD replication): 192.168.2.0/24

# Verify network connectivity between nodes
ping -c 3 ceph-node1
ping -c 3 ceph-node2
ping -c 3 ceph-node3
```

### Node Preparation

Prepare all nodes that will be part of the Ceph cluster:

```bash
# Update system packages on all nodes
sudo apt update && sudo apt upgrade -y

# Set hostnames appropriately
sudo hostnamectl set-hostname ceph-node1  # Run on each node with appropriate name

# Configure /etc/hosts on all nodes for name resolution
sudo tee -a /etc/hosts << 'EOF'
192.168.1.10 ceph-node1
192.168.1.11 ceph-node2
192.168.1.12 ceph-node3
192.168.1.13 ceph-node4
192.168.1.14 ceph-node5
EOF

# Ensure time synchronization is configured
sudo apt install -y chrony
sudo systemctl enable chrony
sudo systemctl start chrony

# Verify time is synchronized
chronyc tracking
```

### SSH Key Configuration

Configure passwordless SSH from the admin node to all cluster nodes:

```bash
# Generate SSH key on admin node (if not already present)
ssh-keygen -t rsa -b 4096 -N "" -f ~/.ssh/id_rsa

# Copy SSH key to all cluster nodes
for node in ceph-node1 ceph-node2 ceph-node3 ceph-node4 ceph-node5; do
    ssh-copy-id -i ~/.ssh/id_rsa.pub $node
done

# Verify passwordless SSH works
for node in ceph-node1 ceph-node2 ceph-node3 ceph-node4 ceph-node5; do
    ssh $node hostname
done
```

## Installing cephadm and Bootstrapping the Cluster

Cephadm is the official tool for deploying and managing Ceph clusters. It uses containers (Docker or Podman) to run Ceph daemons.

### Install Prerequisites

```bash
# Install required packages on all nodes
sudo apt install -y python3 python3-pip lvm2

# Install Docker on all nodes (cephadm uses containers)
sudo apt install -y apt-transport-https ca-certificates curl gnupg

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Enable and start Docker
sudo systemctl enable docker
sudo systemctl start docker

# Verify Docker is running
sudo docker run hello-world
```

### Install cephadm

```bash
# Download cephadm from the official Ceph repository
# Replace 'reef' with your desired Ceph release (quincy, reef, squid, etc.)
CEPH_RELEASE=reef
curl --silent --remote-name --location https://download.ceph.com/rpm-${CEPH_RELEASE}/el9/noarch/cephadm

# Alternatively, install from Ubuntu repository
sudo apt install -y cephadm

# Make cephadm executable (if downloaded manually)
chmod +x cephadm

# Move to system path
sudo mv cephadm /usr/local/bin/

# Verify installation
cephadm version
```

### Bootstrap the Cluster

```bash
# Bootstrap the Ceph cluster from the first node
# This creates the initial monitor and manager daemons
sudo cephadm bootstrap \
    --mon-ip 192.168.1.10 \
    --initial-dashboard-user admin \
    --initial-dashboard-password SecurePassword123 \
    --dashboard-password-noupdate \
    --allow-fqdn-hostname \
    --cluster-network 192.168.2.0/24

# The bootstrap process will output:
# - Dashboard URL and credentials
# - Path to the ceph.conf and admin keyring
# - Commands to add additional hosts

# Verify the cluster is running
sudo cephadm shell -- ceph status
```

### Install Ceph CLI Tools

```bash
# Install the Ceph CLI tools on the admin node
sudo cephadm install ceph-common

# Verify CLI access
ceph -v
ceph status
```

## Adding Hosts and OSDs

### Add Additional Hosts to the Cluster

```bash
# Copy the Ceph public key to all other nodes
# This key was generated during bootstrap
ssh-copy-id -f -i /etc/ceph/ceph.pub root@ceph-node2
ssh-copy-id -f -i /etc/ceph/ceph.pub root@ceph-node3
ssh-copy-id -f -i /etc/ceph/ceph.pub root@ceph-node4
ssh-copy-id -f -i /etc/ceph/ceph.pub root@ceph-node5

# Add hosts to the cluster with their labels
# Labels help organize and target daemon placement
ceph orch host add ceph-node2 192.168.1.11 --labels _admin,mon,osd
ceph orch host add ceph-node3 192.168.1.12 --labels mon,osd
ceph orch host add ceph-node4 192.168.1.13 --labels osd
ceph orch host add ceph-node5 192.168.1.14 --labels osd

# Verify hosts were added
ceph orch host ls

# Expected output:
# HOST        ADDR          LABELS                  STATUS
# ceph-node1  192.168.1.10  _admin,mon,mgr,osd
# ceph-node2  192.168.1.11  _admin,mon,osd
# ceph-node3  192.168.1.12  mon,osd
# ceph-node4  192.168.1.13  osd
# ceph-node5  192.168.1.14  osd
```

### Deploy Additional Monitors

```bash
# Deploy monitors on nodes with the 'mon' label
# Ceph will automatically maintain the specified count
ceph orch apply mon --placement="label:mon"

# Alternatively, specify exact placement
ceph orch apply mon --placement="ceph-node1,ceph-node2,ceph-node3"

# Verify monitor status
ceph mon stat

# Expected output:
# e3: 3 mons at {ceph-node1=[v2:192.168.1.10:3300/0,v1:192.168.1.10:6789/0],
#                ceph-node2=[v2:192.168.1.11:3300/0,v1:192.168.1.11:6789/0],
#                ceph-node3=[v2:192.168.1.12:3300/0,v1:192.168.1.12:6789/0]},
# election epoch 8, leader 0 ceph-node1, quorum 0,1,2 ceph-node1,ceph-node2,ceph-node3
```

### Deploy Manager Daemons

```bash
# Deploy manager daemons for redundancy
ceph orch apply mgr --placement="ceph-node1,ceph-node2"

# Verify manager status
ceph mgr stat

# Check which manager is active
ceph mgr services
```

### Add OSDs (Object Storage Daemons)

```bash
# List available devices on all hosts
ceph orch device ls

# Expected output shows available drives:
# HOST        PATH      TYPE  SIZE   AVAILABLE  REJECT REASONS
# ceph-node1  /dev/sdb  hdd   100G   Yes
# ceph-node1  /dev/sdc  ssd   50G    Yes
# ceph-node2  /dev/sdb  hdd   100G   Yes
# ...

# Option 1: Add all available devices as OSDs automatically
ceph orch apply osd --all-available-devices

# Option 2: Add specific devices manually
ceph orch daemon add osd ceph-node1:/dev/sdb
ceph orch daemon add osd ceph-node2:/dev/sdb
ceph orch daemon add osd ceph-node3:/dev/sdb

# Option 3: Use a DriveGroup specification for complex configurations
# Create a DriveGroup spec file
cat > /tmp/osd-spec.yaml << 'EOF'
service_type: osd
service_id: default_drive_group
placement:
  label: osd
spec:
  # Select all rotational (HDD) devices
  data_devices:
    rotational: 1
  # Use SSDs for the database/WAL
  db_devices:
    rotational: 0
  # Encryption settings
  encrypted: false
  # OSD memory target (important for performance tuning)
  osd_memory_target: 4294967296  # 4GB
EOF

# Apply the DriveGroup specification
ceph orch apply -i /tmp/osd-spec.yaml

# Monitor OSD deployment progress
ceph orch osd status

# Verify OSDs are up and running
ceph osd tree

# Expected output:
# ID  CLASS  WEIGHT   TYPE NAME          STATUS  REWEIGHT  PRI-AFF
# -1         0.48828  root default
# -3         0.09766      host ceph-node1
#  0    hdd  0.09766          osd.0          up   1.00000  1.00000
# -5         0.09766      host ceph-node2
#  1    hdd  0.09766          osd.1          up   1.00000  1.00000
# ...
```

## Creating Pools and Configuring CRUSH Rules

Pools are logical partitions for storing objects. CRUSH (Controlled Replication Under Scalable Hashing) rules determine how data is distributed across OSDs.

### Understanding Pool Types

```bash
# Ceph supports two pool types:
# 1. Replicated pools - Data is copied to multiple OSDs (default)
# 2. Erasure coded pools - Data is split into chunks with parity (more efficient for large objects)
```

### Create Replicated Pools

```bash
# Create a replicated pool with size 3 (3 copies of data)
# PG (Placement Group) count is important for performance
# Rule of thumb: (OSDs * 100) / replicas, rounded to nearest power of 2

# Create a general-purpose replicated pool
ceph osd pool create mypool 128 128 replicated

# Set the replication size (number of copies)
ceph osd pool set mypool size 3

# Set minimum number of replicas required for I/O
ceph osd pool set mypool min_size 2

# Enable pool for specific application
ceph osd pool application enable mypool rbd

# Verify pool creation
ceph osd pool ls detail
```

### Create Erasure Coded Pools

```bash
# Create an erasure code profile
# k=4 data chunks, m=2 parity chunks (can tolerate 2 failures)
ceph osd erasure-code-profile set ec-4-2-profile \
    k=4 \
    m=2 \
    crush-failure-domain=host

# View the profile
ceph osd erasure-code-profile get ec-4-2-profile

# Create an erasure coded pool
ceph osd pool create ec-pool 128 128 erasure ec-4-2-profile

# Enable pool for specific application (e.g., RGW)
ceph osd pool application enable ec-pool rgw
```

### Configure CRUSH Rules

```bash
# View existing CRUSH rules
ceph osd crush rule ls

# View CRUSH rule details
ceph osd crush rule dump

# Create a custom CRUSH rule for SSD-only placement
ceph osd crush rule create-replicated ssd-rule default host ssd

# Create a rule that spreads data across racks
ceph osd crush rule create-replicated rack-rule default rack host

# Apply CRUSH rule to a pool
ceph osd pool set mypool crush_rule ssd-rule

# View the CRUSH map
ceph osd crush dump

# Export CRUSH map for editing
ceph osd getcrushmap -o crushmap.bin

# Decompile to text format for editing
crushtool -d crushmap.bin -o crushmap.txt

# After editing, compile and inject
crushtool -c crushmap.txt -o crushmap-new.bin
ceph osd setcrushmap -i crushmap-new.bin
```

### Advanced CRUSH Configuration

```bash
# Define a CRUSH hierarchy with racks and datacenters
# This is typically done via CRUSH map editing

# Example CRUSH map structure (crushmap.txt):
cat > /tmp/crush-additions.txt << 'EOF'
# Define device classes
device 0 osd.0 class hdd
device 1 osd.1 class hdd
device 2 osd.2 class ssd

# Define location hierarchy
# type 0 = osd, type 1 = host, type 2 = rack, type 3 = datacenter, type 4 = root

# Add racks to hierarchy
ceph osd crush add-bucket rack1 rack
ceph osd crush add-bucket rack2 rack

# Move hosts under racks
ceph osd crush move ceph-node1 rack=rack1
ceph osd crush move ceph-node2 rack=rack1
ceph osd crush move ceph-node3 rack=rack2
EOF

# Apply rack configuration
ceph osd crush add-bucket rack1 rack
ceph osd crush add-bucket rack2 rack
ceph osd crush move rack1 root=default
ceph osd crush move rack2 root=default
ceph osd crush move ceph-node1 rack=rack1
ceph osd crush move ceph-node2 rack=rack1
ceph osd crush move ceph-node3 rack=rack2

# Verify the hierarchy
ceph osd tree
```

## Setting Up RBD Block Storage

RBD (RADOS Block Device) provides block storage that can be used for virtual machines, containers, or any application requiring block devices.

### Create an RBD Pool

```bash
# Create a dedicated pool for RBD images
ceph osd pool create rbd-pool 128 128 replicated

# Initialize the pool for RBD
rbd pool init rbd-pool

# Enable the rbd application tag
ceph osd pool application enable rbd-pool rbd
```

### Create and Manage RBD Images

```bash
# Create an RBD image (virtual block device)
# --size is in megabytes
rbd create --size 10240 rbd-pool/my-image

# Create with specific features
rbd create --size 10240 \
    --image-feature layering,exclusive-lock,object-map,fast-diff \
    rbd-pool/my-image-v2

# List images in the pool
rbd ls rbd-pool

# Get detailed image information
rbd info rbd-pool/my-image

# Expected output:
# rbd image 'my-image':
#     size 10 GiB in 2560 objects
#     order 22 (4 MiB objects)
#     snapshot_count: 0
#     id: abc123
#     block_name_prefix: rbd_data.abc123
#     format: 2
#     features: layering, exclusive-lock, object-map, fast-diff
#     ...

# Resize an image
rbd resize --size 20480 rbd-pool/my-image

# Enable features on existing image
rbd feature enable rbd-pool/my-image object-map fast-diff
```

### Map RBD Images to Block Devices

```bash
# Map the RBD image to a block device on the client
sudo rbd map rbd-pool/my-image

# The command outputs the device path, e.g., /dev/rbd0
# Verify the mapping
rbd showmapped

# Expected output:
# id  pool      namespace  image     snap  device
# 0   rbd-pool             my-image  -     /dev/rbd0

# Create a filesystem on the block device
sudo mkfs.ext4 /dev/rbd0

# Mount the filesystem
sudo mkdir -p /mnt/rbd-storage
sudo mount /dev/rbd0 /mnt/rbd-storage

# Verify the mount
df -h /mnt/rbd-storage

# To persist the mapping across reboots, add to /etc/ceph/rbdmap
echo "rbd-pool/my-image    id=admin,keyring=/etc/ceph/ceph.client.admin.keyring" | sudo tee -a /etc/ceph/rbdmap

# Enable the rbdmap service
sudo systemctl enable rbdmap
```

### RBD Snapshots and Clones

```bash
# Create a snapshot of an RBD image
rbd snap create rbd-pool/my-image@snapshot1

# List snapshots
rbd snap ls rbd-pool/my-image

# Protect a snapshot (required before cloning)
rbd snap protect rbd-pool/my-image@snapshot1

# Create a clone from the snapshot
rbd clone rbd-pool/my-image@snapshot1 rbd-pool/my-clone

# Flatten a clone (make it independent of parent)
rbd flatten rbd-pool/my-clone

# Delete a snapshot (must unprotect first)
rbd snap unprotect rbd-pool/my-image@snapshot1
rbd snap rm rbd-pool/my-image@snapshot1

# Rollback to a snapshot
rbd snap rollback rbd-pool/my-image@snapshot1
```

## Configuring CephFS for File Storage

CephFS provides a POSIX-compliant distributed file system that can be mounted by multiple clients simultaneously.

### Deploy MDS (Metadata Server)

```bash
# Create a CephFS file system
# This creates both data and metadata pools automatically
ceph fs volume create myfs

# Alternatively, create pools manually and then the filesystem
ceph osd pool create cephfs-data 128 128
ceph osd pool create cephfs-metadata 64 64
ceph fs new myfs cephfs-metadata cephfs-data

# Deploy MDS daemons
ceph orch apply mds myfs --placement="ceph-node1,ceph-node2,ceph-node3"

# Verify MDS status
ceph fs status myfs

# Expected output:
# myfs - 1 clients
# ====
# RANK  STATE           MDS              ACTIVITY     DNS    INOS   DIRS   CAPS
#  0    active          myfs.ceph-node1  Reqs:    0   10      12     12      0
#       POOL            TYPE     USED  AVAIL
# cephfs-metadata       metadata   96M   100G
# cephfs-data           data        0    100G
# MDS version: ceph version 18.2.0 reef
```

### Mount CephFS on Clients

```bash
# Install ceph-common on client machines
sudo apt install -y ceph-common

# Copy the Ceph configuration and keyring to the client
sudo scp ceph-node1:/etc/ceph/ceph.conf /etc/ceph/
sudo scp ceph-node1:/etc/ceph/ceph.client.admin.keyring /etc/ceph/

# Create mount point
sudo mkdir -p /mnt/cephfs

# Mount using the kernel driver (recommended for performance)
sudo mount -t ceph ceph-node1:6789,ceph-node2:6789,ceph-node3:6789:/ /mnt/cephfs \
    -o name=admin,secret=$(ceph auth get-key client.admin)

# Alternatively, mount using ceph-fuse (more features, slightly slower)
sudo apt install -y ceph-fuse
sudo ceph-fuse -m ceph-node1:6789 /mnt/cephfs

# Verify the mount
df -h /mnt/cephfs

# Add to /etc/fstab for persistent mounting
echo "ceph-node1:6789,ceph-node2:6789,ceph-node3:6789:/  /mnt/cephfs  ceph  name=admin,secretfile=/etc/ceph/admin.secret,noatime,_netdev  0  0" | sudo tee -a /etc/fstab

# Create the secret file
sudo ceph auth get-key client.admin | sudo tee /etc/ceph/admin.secret
sudo chmod 600 /etc/ceph/admin.secret
```

### CephFS Configuration and Quotas

```bash
# Set quotas on CephFS directories
# Create a directory and set quota
mkdir /mnt/cephfs/project1
setfattr -n ceph.quota.max_bytes -v 107374182400 /mnt/cephfs/project1  # 100GB limit
setfattr -n ceph.quota.max_files -v 100000 /mnt/cephfs/project1        # 100K files limit

# View quota settings
getfattr -n ceph.quota.max_bytes /mnt/cephfs/project1
getfattr -n ceph.quota.max_files /mnt/cephfs/project1

# Configure CephFS settings
ceph fs set myfs max_mds 2                    # Enable multiple active MDS for scaling
ceph fs set myfs allow_standby_replay true   # Enable standby-replay for faster failover

# Pin directories to specific MDS ranks for load balancing
setfattr -n ceph.dir.pin -v 0 /mnt/cephfs/project1
setfattr -n ceph.dir.pin -v 1 /mnt/cephfs/project2
```

### CephFS Snapshots

```bash
# CephFS supports directory-level snapshots
# Create a snapshot
mkdir /mnt/cephfs/project1/.snap/snapshot-$(date +%Y%m%d)

# List snapshots
ls /mnt/cephfs/project1/.snap/

# Access files from snapshot
ls /mnt/cephfs/project1/.snap/snapshot-20260115/

# Delete a snapshot
rmdir /mnt/cephfs/project1/.snap/snapshot-20260115

# Schedule automatic snapshots using ceph fs snap-schedule
ceph fs snap-schedule add /project1 1h        # Hourly snapshots
ceph fs snap-schedule retention add /project1 h 24  # Keep 24 hourly snapshots
ceph fs snap-schedule activate /project1
```

## RGW for S3-Compatible Object Storage

The RADOS Gateway (RGW) provides RESTful interfaces compatible with Amazon S3 and OpenStack Swift, enabling object storage for cloud-native applications.

### Deploy RGW Daemons

```bash
# Deploy RGW service with cephadm
ceph orch apply rgw myrgw --placement="ceph-node1,ceph-node2" --port=7480

# For high availability, deploy behind a load balancer
# Create realm, zonegroup, and zone for multi-site configuration
radosgw-admin realm create --rgw-realm=mycompany --default
radosgw-admin zonegroup create --rgw-zonegroup=us --master --default
radosgw-admin zone create --rgw-zonegroup=us --rgw-zone=us-east-1 --master --default

# Commit the period (applies multi-site configuration)
radosgw-admin period update --commit

# Verify RGW is running
ceph orch ps | grep rgw

# Check RGW service status
ceph orch ls | grep rgw
```

### Configure RGW

```bash
# Create RGW configuration in ceph.conf
cat >> /etc/ceph/ceph.conf << 'EOF'

[client.rgw.myrgw]
# RGW host and port configuration
rgw_frontends = beast port=7480

# Enable S3 API (default)
rgw_enable_apis = s3, s3website, swift, swift_auth, admin

# Performance tuning
rgw_thread_pool_size = 512
rgw_num_rados_handles = 4

# Object versioning
rgw_swift_versioning_enabled = true

# Multipart upload settings
rgw_multipart_min_part_size = 5242880  # 5MB minimum part size

# Logging
rgw_enable_ops_log = true
rgw_ops_log_rados = true

# Bucket index sharding (important for buckets with many objects)
rgw_override_bucket_index_max_shards = 16
EOF

# Restart RGW to apply configuration
ceph orch restart rgw.myrgw
```

### Create Users and Access Keys

```bash
# Create an S3 user
radosgw-admin user create \
    --uid=myuser \
    --display-name="My Application User" \
    --email="myuser@example.com"

# The command outputs access credentials:
# {
#     "user_id": "myuser",
#     "display_name": "My Application User",
#     "email": "myuser@example.com",
#     "keys": [
#         {
#             "user": "myuser",
#             "access_key": "AKIAIOSFODNN7EXAMPLE",
#             "secret_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
#         }
#     ],
#     ...
# }

# Create additional access keys
radosgw-admin key create --uid=myuser --key-type=s3

# Set user quota
radosgw-admin quota set --quota-scope=user --uid=myuser --max-size=100G --max-objects=1000000
radosgw-admin quota enable --quota-scope=user --uid=myuser

# Create admin user for management
radosgw-admin user create \
    --uid=admin \
    --display-name="Admin User" \
    --caps="buckets=*;users=*;usage=*;metadata=*;zone=*"
```

### Test S3 Compatibility

```bash
# Install AWS CLI for testing
sudo apt install -y awscli

# Configure AWS CLI with RGW credentials
aws configure set aws_access_key_id AKIAIOSFODNN7EXAMPLE
aws configure set aws_secret_access_key wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Create a bucket
aws --endpoint-url http://ceph-node1:7480 s3 mb s3://my-bucket

# Upload a file
aws --endpoint-url http://ceph-node1:7480 s3 cp /etc/hosts s3://my-bucket/hosts

# List bucket contents
aws --endpoint-url http://ceph-node1:7480 s3 ls s3://my-bucket/

# Download a file
aws --endpoint-url http://ceph-node1:7480 s3 cp s3://my-bucket/hosts /tmp/hosts-download

# Enable versioning on a bucket
aws --endpoint-url http://ceph-node1:7480 s3api put-bucket-versioning \
    --bucket my-bucket \
    --versioning-configuration Status=Enabled

# Set lifecycle policy
cat > /tmp/lifecycle.json << 'EOF'
{
    "Rules": [
        {
            "ID": "Archive old data",
            "Status": "Enabled",
            "Filter": {
                "Prefix": "logs/"
            },
            "Transitions": [
                {
                    "Days": 30,
                    "StorageClass": "GLACIER"
                }
            ],
            "Expiration": {
                "Days": 365
            }
        }
    ]
}
EOF

aws --endpoint-url http://ceph-node1:7480 s3api put-bucket-lifecycle-configuration \
    --bucket my-bucket \
    --lifecycle-configuration file:///tmp/lifecycle.json
```

### Configure HTTPS for RGW

```bash
# Generate or obtain SSL certificates
# For production, use certificates from a trusted CA

# Generate self-signed certificate for testing
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ceph/rgw.key \
    -out /etc/ceph/rgw.crt \
    -subj "/CN=rgw.example.com"

# Combine key and certificate
cat /etc/ceph/rgw.key /etc/ceph/rgw.crt | sudo tee /etc/ceph/rgw.pem

# Update RGW configuration for HTTPS
ceph config set client.rgw rgw_frontends "beast ssl_port=443 ssl_certificate=/etc/ceph/rgw.pem"

# Restart RGW
ceph orch restart rgw.myrgw
```

## Monitoring with Ceph Dashboard

The Ceph Dashboard provides a web-based interface for monitoring and managing your Ceph cluster.

### Enable and Access Dashboard

```bash
# Dashboard is enabled by default with cephadm bootstrap
# Verify dashboard is running
ceph mgr services

# Expected output:
# {
#     "dashboard": "https://ceph-node1:8443/",
#     "prometheus": "http://ceph-node1:9283/"
# }

# If dashboard is not enabled, enable it
ceph mgr module enable dashboard

# Set dashboard port (if needed)
ceph config set mgr mgr/dashboard/server_port 8443
ceph config set mgr mgr/dashboard/ssl_server_port 8443

# Generate self-signed certificate (or use your own)
ceph dashboard create-self-signed-cert

# Create/reset admin password
ceph dashboard ac-user-create admin -i /tmp/dashboard-password administrator

# Or reset existing password
echo "NewSecurePassword123" > /tmp/dashboard-password
ceph dashboard ac-user-set-password admin -i /tmp/dashboard-password
```

### Configure Dashboard Features

```bash
# Enable monitoring stack (Prometheus + Grafana)
ceph orch apply prometheus
ceph orch apply grafana
ceph orch apply alertmanager
ceph orch apply node-exporter

# Configure Grafana URL for dashboard integration
ceph dashboard set-grafana-api-url https://ceph-node1:3000
ceph dashboard set-grafana-api-ssl-verify false

# Enable Prometheus integration
ceph dashboard set-prometheus-api-host http://ceph-node1:9090

# Enable Alertmanager integration
ceph dashboard set-alertmanager-api-host http://ceph-node1:9093

# Configure RGW credentials for dashboard
radosgw-admin user info --uid=admin | jq -r '.keys[0].access_key' > /tmp/rgw-access-key
radosgw-admin user info --uid=admin | jq -r '.keys[0].secret_key' > /tmp/rgw-secret-key
ceph dashboard set-rgw-api-access-key -i /tmp/rgw-access-key
ceph dashboard set-rgw-api-secret-key -i /tmp/rgw-secret-key
ceph dashboard set-rgw-api-host ceph-node1
ceph dashboard set-rgw-api-port 7480
ceph dashboard set-rgw-api-scheme http

# Verify dashboard configuration
ceph dashboard feature status
```

### Dashboard SSL Configuration

```bash
# Use custom SSL certificate for dashboard
# Place your certificate and key files on the system
ceph dashboard set-ssl-certificate -i /path/to/certificate.crt
ceph dashboard set-ssl-certificate-key -i /path/to/certificate.key

# Restart the dashboard module
ceph mgr module disable dashboard
ceph mgr module enable dashboard
```

## Maintenance and Troubleshooting

### Health Monitoring Commands

```bash
# Check overall cluster health
ceph health detail

# Get comprehensive cluster status
ceph status

# Example output interpretation:
#   cluster:
#     id:     a7f64266-0894-4f1e-a635-d0aeaca0e993
#     health: HEALTH_WARN
#             1 pool(s) have no replicas configured
#
#   services:
#     mon: 3 daemons, quorum ceph-node1,ceph-node2,ceph-node3
#     mgr: ceph-node1(active), standbys: ceph-node2
#     osd: 10 osds: 10 up, 10 in
#     rgw: 2 daemons active (myrgw.ceph-node1, myrgw.ceph-node2)
#
#   data:
#     pools:   5 pools, 256 pgs
#     objects: 1.23k objects, 4.5 GiB
#     usage:   15 GiB used, 985 GiB / 1000 GiB avail
#     pgs:     256 active+clean

# Check OSD status
ceph osd stat
ceph osd tree
ceph osd df

# Check PG (Placement Group) status
ceph pg stat
ceph pg dump

# Monitor in real-time
ceph -w                    # Watch cluster events
ceph health --watch        # Watch health changes
```

### Common Maintenance Tasks

```bash
# Mark OSD as out for maintenance (data will rebalance)
ceph osd out osd.5

# Mark OSD back in after maintenance
ceph osd in osd.5

# Set OSD noout flag to prevent rebalancing during maintenance
ceph osd set noout

# Remove noout flag
ceph osd unset noout

# Set cluster-wide flags for maintenance
ceph osd set norebalance   # Prevent rebalancing
ceph osd set nobackfill    # Prevent backfill operations
ceph osd set noscrub       # Disable scrubbing
ceph osd set nodeep-scrub  # Disable deep scrubbing

# Unset flags after maintenance
ceph osd unset norebalance
ceph osd unset nobackfill
ceph osd unset noscrub
ceph osd unset nodeep-scrub

# Remove a failed OSD permanently
ceph osd out osd.5
ceph osd crush remove osd.5
ceph auth del osd.5
ceph osd rm osd.5

# Add a replacement OSD
ceph orch daemon add osd ceph-node3:/dev/sdd
```

### Recovery and Repair

```bash
# Trigger PG repair
ceph pg repair <pg_id>

# Deep scrub a PG
ceph pg deep-scrub <pg_id>

# Check for inconsistent PGs
ceph health detail | grep inconsistent

# Export and import PGs for recovery
ceph pg export <pg_id> > pg_export.bin
ceph pg import pg_export.bin

# Recover missing objects
ceph pg list-unfound <pg_id>
ceph pg mark_unfound_lost revert <pg_id>  # Revert to prior version
# OR
ceph pg mark_unfound_lost delete <pg_id>   # Delete unfound objects
```

### Performance Tuning

```bash
# View current configuration
ceph config dump

# Set configuration values
ceph config set osd osd_memory_target 8589934592     # 8GB memory target per OSD
ceph config set osd osd_max_backfills 1              # Reduce backfill load
ceph config set osd osd_recovery_max_active 1       # Reduce recovery impact

# Tune scrubbing for less impact during business hours
ceph config set osd osd_scrub_begin_hour 1
ceph config set osd osd_scrub_end_hour 5
ceph config set osd osd_scrub_load_threshold 0.5

# Monitor performance
ceph osd perf
ceph osd pool stats
ceph pg dump | awk '/^[0-9]/ {print $1,$15,$16,$17,$18}'

# Check slow requests
ceph daemon osd.0 ops
ceph daemon osd.0 dump_blocked_ops
```

### Backup and Disaster Recovery

```bash
# Export cluster configuration
ceph config dump > ceph-config-backup.txt

# Backup CRUSH map
ceph osd getcrushmap -o crushmap-backup.bin

# Backup OSD map
ceph osd getmap -o osdmap-backup.bin

# Backup monitor store (run on each monitor)
ceph-monstore-tool /var/lib/ceph/mon/ceph-mon.ceph-node1 store-copy /backup/mon-store

# Export user authentication data
ceph auth export > auth-backup.txt

# RBD image export
rbd export rbd-pool/my-image /backup/my-image.raw

# RBD incremental backup (using snapshots)
rbd snap create rbd-pool/my-image@backup-$(date +%Y%m%d)
rbd export-diff --from-snap prev-backup rbd-pool/my-image@current-backup /backup/incremental.diff

# CephFS metadata backup
ceph fs dump > cephfs-metadata-backup.txt
```

### Log Analysis and Debugging

```bash
# View Ceph logs
journalctl -u ceph-mon@ceph-node1 -f
journalctl -u ceph-osd@0 -f
journalctl -u ceph-mds@myfs.ceph-node1 -f

# Enable debug logging temporarily
ceph tell osd.0 config set debug_osd 20
ceph tell osd.0 config set debug_ms 1

# Disable debug logging
ceph tell osd.0 config set debug_osd 0
ceph tell osd.0 config set debug_ms 0

# Dump daemon status
ceph daemon osd.0 status
ceph daemon osd.0 config show
ceph daemon mon.ceph-node1 quorum_status

# Check for slow operations
ceph daemon osd.0 dump_historic_slow_ops
```

## Complete Configuration Reference

Here's a comprehensive ceph.conf example with well-documented options:

```bash
# /etc/ceph/ceph.conf - Comprehensive Ceph Configuration
cat > /etc/ceph/ceph.conf << 'EOF'
###############################################################################
# GLOBAL SETTINGS
# These settings apply to all daemons unless overridden in specific sections
###############################################################################
[global]
# Cluster identification
fsid = a7f64266-0894-4f1e-a635-d0aeaca0e993
cluster = ceph

# Monitor addresses - comma-separated list of all monitors
mon_host = 192.168.1.10,192.168.1.11,192.168.1.12
mon_initial_members = ceph-node1,ceph-node2,ceph-node3

# Network configuration
# Public network: client communication and inter-daemon communication
public_network = 192.168.1.0/24
# Cluster network: OSD replication traffic (optional but recommended)
cluster_network = 192.168.2.0/24

# Authentication settings
auth_cluster_required = cephx
auth_service_required = cephx
auth_client_required = cephx

# Logging configuration
log_to_stderr = false
log_to_file = true
log_file = /var/log/ceph/$cluster-$name.log
err_to_stderr = false

# Memory management
# Enable memory autotuning (recommended for modern Ceph)
osd_memory_target_autotune = true

###############################################################################
# MONITOR DAEMON SETTINGS
###############################################################################
[mon]
# Monitor data directory
mon_data = /var/lib/ceph/mon/$cluster-$id

# Quorum settings
mon_election_timeout = 5
mon_lease = 5

# Performance tuning
mon_osd_min_down_reporters = 2
mon_osd_down_out_interval = 600

# Clock drift allowance
mon_clock_drift_allowed = 0.15
mon_clock_drift_warn_backoff = 30

# PG settings
mon_max_pg_per_osd = 250
mon_pg_warn_min_per_osd = 3

###############################################################################
# OSD DAEMON SETTINGS
###############################################################################
[osd]
# OSD data and journal directories
osd_data = /var/lib/ceph/osd/$cluster-$id

# Memory settings
# Target memory usage per OSD (4GB default, adjust based on available RAM)
osd_memory_target = 4294967296

# Journal settings (for HDD-based OSDs with SSD journals)
osd_journal_size = 10240

# Recovery and backfill tuning
# Lower values reduce impact on client I/O during recovery
osd_recovery_max_active = 1
osd_recovery_max_active_hdd = 1
osd_recovery_max_active_ssd = 4
osd_max_backfills = 1

# Scrubbing settings
# Schedule scrubs during off-peak hours
osd_scrub_begin_hour = 1
osd_scrub_end_hour = 5
osd_scrub_begin_week_day = 0
osd_scrub_end_week_day = 7
osd_scrub_load_threshold = 0.5
osd_deep_scrub_interval = 604800  # Weekly deep scrub (seconds)
osd_scrub_min_interval = 86400    # Daily scrub minimum (seconds)

# Heartbeat settings
osd_heartbeat_interval = 6
osd_heartbeat_grace = 20

# Client operation settings
osd_client_message_size_cap = 2147483648
osd_client_message_cap = 100

# Filestore/Bluestore settings (Bluestore is default in modern Ceph)
osd_objectstore = bluestore
bluestore_cache_size = 3221225472  # 3GB cache

###############################################################################
# MDS (METADATA SERVER) SETTINGS
###############################################################################
[mds]
# MDS cache size (memory for metadata caching)
mds_cache_memory_limit = 4294967296  # 4GB

# Session limits
mds_session_timeout = 60
mds_session_autoclose = 300

# Client capabilities
mds_max_file_size = 1099511627776  # 1TB max file size

# Logging
mds_log_max_segments = 128
mds_log_max_expiring = 20

# Subtree partitioning (for multi-MDS scaling)
mds_bal_split_size = 10000
mds_bal_merge_size = 50

###############################################################################
# CLIENT SETTINGS
###############################################################################
[client]
# RBD settings
rbd_cache = true
rbd_cache_size = 33554432           # 32MB cache
rbd_cache_max_dirty = 25165824      # 24MB max dirty
rbd_cache_target_dirty = 16777216   # 16MB target dirty
rbd_cache_max_dirty_age = 1.0       # Seconds before flush

# RBD default features
rbd_default_features = layering,exclusive-lock,object-map,fast-diff,deep-flatten

# Client-side caching for CephFS
client_cache_size = 16384
client_cache_mid = 0.75

# Admin socket for client debugging
admin_socket = /var/run/ceph/$cluster-$name.$pid.asok

###############################################################################
# RADOS GATEWAY SETTINGS
###############################################################################
[client.rgw.myrgw]
# Host configuration
host = ceph-node1
rgw_frontends = beast port=7480 ssl_port=443

# API settings
rgw_enable_apis = s3, s3website, swift, swift_auth, admin

# Performance tuning
rgw_thread_pool_size = 512
rgw_num_rados_handles = 4

# Bucket indexing
rgw_override_bucket_index_max_shards = 16

# Multipart upload settings
rgw_multipart_min_part_size = 5242880  # 5MB

# Object versioning
rgw_swift_versioning_enabled = true

# Logging
rgw_enable_ops_log = true
rgw_ops_log_rados = true

# Cache settings
rgw_cache_enabled = true
rgw_cache_lru_size = 50000

# Garbage collection
rgw_gc_max_objs = 32
rgw_gc_processor_max_time = 3600
rgw_gc_processor_period = 3600
EOF
```

## Summary

This guide has covered the complete process of installing and configuring Ceph distributed storage on Ubuntu. You've learned how to:

1. **Understand Ceph Architecture**: The roles of MON, OSD, MDS, and MGR daemons, and how they work together to provide distributed storage.

2. **Plan Your Deployment**: Hardware requirements, network topology, and node preparation for a production-ready cluster.

3. **Bootstrap with cephadm**: Modern containerized deployment of Ceph clusters with automated management.

4. **Configure Storage Pools**: Creating replicated and erasure-coded pools with proper CRUSH rules for data placement.

5. **Deploy RBD Block Storage**: Creating and managing virtual block devices for VMs and containers.

6. **Set Up CephFS**: Distributed file system with quotas, snapshots, and multi-MDS scaling.

7. **Configure RGW Object Storage**: S3-compatible object storage for cloud-native applications.

8. **Monitor and Maintain**: Using the Ceph Dashboard, performing health checks, and handling common maintenance tasks.

Ceph's flexibility makes it suitable for a wide range of storage needs, from small lab environments to large-scale production deployments. The key to successful Ceph operation is proper planning, consistent monitoring, and proactive maintenance.

## Monitor Your Ceph Cluster with OneUptime

While Ceph provides built-in monitoring through its Dashboard and Prometheus integration, maintaining visibility into your distributed storage infrastructure requires comprehensive monitoring that extends beyond storage metrics alone.

[OneUptime](https://oneuptime.com) offers a complete observability platform that can help you monitor your entire Ceph infrastructure:

- **Infrastructure Monitoring**: Track the health of all nodes in your Ceph cluster, including CPU, memory, disk I/O, and network performance across MON, OSD, MDS, and RGW daemons.

- **Custom Metrics**: Integrate Ceph's Prometheus metrics with OneUptime to create unified dashboards that combine storage metrics with application and infrastructure telemetry.

- **Alerting and On-Call**: Set up intelligent alerts for Ceph health warnings, OSD failures, slow requests, and capacity thresholds. OneUptime's on-call scheduling ensures the right team members are notified when issues arise.

- **Status Pages**: Keep your users informed about storage service availability with public or private status pages that reflect your Ceph cluster's operational state.

- **Incident Management**: When storage issues occur, OneUptime's incident management features help you coordinate response, track resolution progress, and conduct post-incident reviews.

By combining Ceph's native monitoring with OneUptime's comprehensive observability platform, you can ensure your distributed storage system remains healthy, performant, and available for your critical workloads.
