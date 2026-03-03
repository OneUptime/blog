# How to Set Up GlusterFS Distributed Volume on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, GlusterFS, Distributed Storage, Cluster, Storage

Description: Learn how to install GlusterFS on Ubuntu, create a distributed volume across multiple nodes, and mount it on client machines for scalable network-attached storage.

---

GlusterFS is a scalable, distributed file system that aggregates storage from multiple servers into a single namespace. A distributed volume spreads files across all nodes, giving you the combined capacity of all nodes without data redundancy (that's handled by replicated volumes). Distributed volumes are suited for workloads where you need scale-out capacity and can tolerate individual node failures by maintaining your own data redundancy at the application level.

## Architecture

For this guide, we'll use three nodes:
- gluster1: 192.168.1.11
- gluster2: 192.168.1.12
- gluster3: 192.168.1.13

Each node has a dedicated brick directory at `/data/gluster/brick1`. The client will be at 192.168.1.20.

## Installing GlusterFS on All Nodes

Run the following on each server node:

```bash
# Add the GlusterFS PPA for the latest stable release
sudo apt update
sudo apt install software-properties-common -y
sudo add-apt-repository ppa:gluster/glusterfs-10
sudo apt update
sudo apt install glusterfs-server -y

# Enable and start the service
sudo systemctl enable --now glusterd
```

Verify the service is running:

```bash
sudo systemctl status glusterd
```

## Preparing Brick Directories

On each node, create a dedicated directory for the GlusterFS brick. Best practice is to use a dedicated partition or disk for bricks to avoid mixing GlusterFS data with OS data:

```bash
# On each node - create the brick directory
sudo mkdir -p /data/gluster/brick1

# If using a dedicated disk (/dev/sdb), format and mount it
sudo mkfs.xfs /dev/sdb -f
echo "/dev/sdb /data/gluster xfs defaults 0 0" | sudo tee -a /etc/fstab
sudo mount -a

# Create the brick subdirectory within the mount
sudo mkdir -p /data/gluster/brick1

# Set proper permissions
sudo chown -R root:root /data/gluster
```

## Configuring Hostnames

Add entries to `/etc/hosts` on each node so they can resolve each other by name:

```bash
# On all nodes, add to /etc/hosts
cat << 'EOF' | sudo tee -a /etc/hosts
192.168.1.11 gluster1
192.168.1.12 gluster2
192.168.1.13 gluster3
EOF
```

## Peering the Nodes

From any one node (e.g., gluster1), probe the other nodes to form the trusted storage pool:

```bash
# Run on gluster1 only
sudo gluster peer probe gluster2
sudo gluster peer probe gluster3

# Verify peer status
sudo gluster peer status
```

Expected output:
```text
Number of Peers: 2

Hostname: gluster2
Uuid: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
State: Peer in Cluster (Connected)

Hostname: gluster3
Uuid: yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
State: Peer in Cluster (Connected)
```

## Creating the Distributed Volume

Create a distributed volume named `gvol0` using bricks from all three nodes:

```bash
# Run on gluster1 (or any node in the pool)
sudo gluster volume create gvol0 \
  gluster1:/data/gluster/brick1 \
  gluster2:/data/gluster/brick1 \
  gluster3:/data/gluster/brick1

# Start the volume
sudo gluster volume start gvol0

# Check volume status
sudo gluster volume info gvol0
```

Expected info output:
```text
Volume Name: gvol0
Type: Distribute
Volume ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Status: Started
Snapshot Count: 0
Number of Bricks: 3
Transport-type: tcp
Bricks:
Brick1: gluster1:/data/gluster/brick1
Brick2: gluster2:/data/gluster/brick1
Brick3: gluster3:/data/gluster/brick1
Options Reconfigured:
transport.address-family: inet
```

## Opening Firewall Ports

GlusterFS uses ports 24007 (daemon) and 49152+ (bricks):

```bash
# On each node, allow GlusterFS traffic from other nodes
sudo ufw allow from 192.168.1.0/24 to any port 24007
sudo ufw allow from 192.168.1.0/24 to any port 49152:49200/tcp
```

## Mounting the Volume on a Client

On the client machine (192.168.1.20):

```bash
# Install only the GlusterFS client package
sudo apt install glusterfs-client -y

# Create mount point
sudo mkdir -p /mnt/glusterfs

# Mount the volume (use any node as the mount point - GlusterFS handles failover)
sudo mount -t glusterfs gluster1:/gvol0 /mnt/glusterfs

# Verify the mount
df -h /mnt/glusterfs
```

### Making the Mount Persistent

```bash
# Add to /etc/fstab
echo "gluster1:/gvol0 /mnt/glusterfs glusterfs defaults,_netdev,backupvolfile-server=gluster2 0 0" | sudo tee -a /etc/fstab

# Test the fstab entry
sudo mount -a
```

The `backupvolfile-server` option ensures the client can still mount if `gluster1` is down.

## Testing the Distributed Volume

```bash
# Create test files on the client
for i in $(seq 1 30); do
  echo "File $i content" | sudo tee /mnt/glusterfs/file$i.txt > /dev/null
done

# Check how files are distributed across bricks
ls /data/gluster/brick1/ | wc -l  # On gluster1
# Check gluster2 and gluster3 similarly - files should be spread across all nodes
```

GlusterFS distributes files using a hash algorithm based on filename, so each file lands on a specific node deterministically.

## Performance Tuning

```bash
# Increase read-ahead cache
sudo gluster volume set gvol0 performance.readdir-ahead on
sudo gluster volume set gvol0 performance.cache-size 512MB

# Enable write-behind for better write performance
sudo gluster volume set gvol0 performance.write-behind on
sudo gluster volume set gvol0 performance.write-behind-window-size 64MB

# For workloads with large sequential reads
sudo gluster volume set gvol0 performance.io-thread-count 32

# View all current settings
sudo gluster volume get gvol0 all
```

## Expanding the Volume

Adding more capacity is straightforward with distributed volumes:

```bash
# Add a new brick from a new node (gluster4)
# First peer the new node
sudo gluster peer probe gluster4

# Add the brick and rebalance
sudo gluster volume add-brick gvol0 gluster4:/data/gluster/brick1

# Rebalance distributes some existing files to the new brick
sudo gluster volume rebalance gvol0 start

# Monitor rebalance progress
sudo gluster volume rebalance gvol0 status
```

## Monitoring Volume Health

```bash
# Check volume status including brick health
sudo gluster volume status gvol0

# View volume heal info (relevant for replicated volumes too)
sudo gluster volume heal gvol0 info

# Check for split-brain conditions
sudo gluster volume heal gvol0 info split-brain

# Watch process stats
sudo gluster volume profile gvol0 start
sudo gluster volume profile gvol0 info
sudo gluster volume profile gvol0 stop
```

## Common Issues

**Brick not available:**
```bash
# Check if the brick process is running
sudo gluster volume status gvol0 detail

# Restart bricks on a specific node
sudo systemctl restart glusterd
```

**Mount hangs on client:**
```bash
# Verify network connectivity to all nodes
nc -zv gluster1 24007
nc -zv gluster2 24007

# Check for firewall blocking
sudo ufw status
```

**Volume not starting:**
```bash
sudo gluster volume start gvol0 force
sudo journalctl -u glusterd -f
```

A distributed GlusterFS volume gives you a solid foundation for scaling storage horizontally. For production workloads that need data redundancy, consider a distributed-replicated volume instead, which combines the capacity benefits of distribution with the fault tolerance of replication.
