# How to Configure GlusterFS Replicated Volume for HA on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, GlusterFS, High Availability, Replicated Storage, Cluster

Description: Configure a GlusterFS replicated volume on Ubuntu to maintain synchronized copies of data across multiple nodes, providing high availability and fault tolerance.

---

A GlusterFS replicated volume keeps identical copies of all data on each node in the replica set. Unlike a distributed volume where files are spread across nodes, every file exists on every replica node. This means if one node goes offline, clients continue reading and writing without interruption. Replicated volumes are the right choice when data durability and uptime matter more than raw capacity.

## Planning the Setup

Replicated volumes require an even number of nodes matching the replica count. The most common configuration is a 2-node or 3-node replica set.

- **2-node replica** - Simple, but requires an arbiter or external quorum to avoid split-brain
- **3-node replica** - Self-quorum: volume remains writable if at least 2 of 3 nodes are up

For this guide, we'll use a 3-node replica:
- gluster1: 192.168.1.11
- gluster2: 192.168.1.12
- gluster3: 192.168.1.13
- Client: 192.168.1.20

## Installing GlusterFS

Install on each of the three nodes:

```bash
sudo apt update
sudo apt install software-properties-common -y
sudo add-apt-repository ppa:gluster/glusterfs-10
sudo apt update
sudo apt install glusterfs-server -y
sudo systemctl enable --now glusterd
```

## Preparing Bricks

On each node, set up a dedicated brick directory. Using a dedicated partition prevents the brick from filling the OS disk:

```bash
# Format and mount a dedicated disk on each node
sudo mkfs.xfs /dev/sdb -f -L gluster-brick
echo "LABEL=gluster-brick /data/gluster xfs defaults,noatime 0 0" | sudo tee -a /etc/fstab
sudo mount -a

# Create the brick directory inside the mount point
# GlusterFS requires the brick to be a subdirectory, not the mount itself
sudo mkdir -p /data/gluster/replica-brick

# Set proper ownership
sudo chown -R root:root /data/gluster
```

Update `/etc/hosts` on all nodes:

```bash
cat << 'EOF' | sudo tee -a /etc/hosts
192.168.1.11 gluster1
192.168.1.12 gluster2
192.168.1.13 gluster3
EOF
```

## Creating the Trusted Pool

From gluster1, probe the other nodes:

```bash
sudo gluster peer probe gluster2
sudo gluster peer probe gluster3

# Verify all peers are connected
sudo gluster peer status
```

All three nodes should show "State: Peer in Cluster (Connected)".

## Creating the Replicated Volume

```bash
# Create a replica 3 volume - data is written to all 3 nodes simultaneously
sudo gluster volume create ha-vol replica 3 \
  gluster1:/data/gluster/replica-brick \
  gluster2:/data/gluster/replica-brick \
  gluster3:/data/gluster/replica-brick

# Start the volume
sudo gluster volume start ha-vol

# Confirm volume details
sudo gluster volume info ha-vol
```

Output shows:
```text
Volume Name: ha-vol
Type: Replicate
Volume ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Status: Started
Snapshot Count: 0
Number of Bricks: 1 x 3 = 3
Transport-type: tcp
Bricks:
Brick1: gluster1:/data/gluster/replica-brick
Brick2: gluster2:/data/gluster/replica-brick
Brick3: gluster3:/data/gluster/replica-brick
```

"1 x 3 = 3" means 1 replica set with 3 copies each.

## Firewall Configuration

```bash
# Open required ports on each node
sudo ufw allow from 192.168.1.0/24 to any port 24007/tcp
sudo ufw allow from 192.168.1.0/24 to any port 49152:49200/tcp
sudo ufw allow from 192.168.1.0/24 to any port 111/tcp
sudo ufw allow from 192.168.1.0/24 to any port 111/udp
```

## Mounting on the Client

```bash
# On the client (192.168.1.20)
sudo apt install glusterfs-client -y
sudo mkdir -p /mnt/ha-storage

# Mount with backup servers for failover
sudo mount -t glusterfs \
  -o backupvolfile-server=gluster2,backupvolfile-server=gluster3 \
  gluster1:/ha-vol /mnt/ha-storage

# Persistent entry in /etc/fstab
echo "gluster1:/ha-vol /mnt/ha-storage glusterfs defaults,_netdev,backupvolfile-server=gluster2 0 0" | sudo tee -a /etc/fstab
```

## Testing High Availability

With the volume mounted on the client, test that it survives node failures:

```bash
# On the client - start a continuous write test
while true; do
  date >> /mnt/ha-storage/ha-test.log
  sleep 1
done &

# On gluster1 - stop the GlusterFS daemon to simulate a failure
sudo systemctl stop glusterd

# Back on the client - verify writes continue without interruption
tail -f /mnt/ha-storage/ha-test.log
```

Writes should continue uninterrupted because 2 of 3 nodes are still available.

```bash
# Bring gluster1 back
sudo systemctl start glusterd

# Check heal status - gluster1 needs to sync the writes it missed
sudo gluster volume heal ha-vol info
```

## Self-Heal Configuration

GlusterFS includes an automatic self-heal mechanism that syncs diverged replicas:

```bash
# Check for files needing healing
sudo gluster volume heal ha-vol info

# Trigger heal manually
sudo gluster volume heal ha-vol

# Full crawl to find and fix all inconsistencies
sudo gluster volume heal ha-vol full

# Monitor heal progress
sudo gluster volume heal ha-vol info healed
sudo gluster volume heal ha-vol info heal-failed
```

### Tuning Self-Heal

```bash
# Increase self-heal threads for faster recovery
sudo gluster volume set ha-vol cluster.heal-timeout 300
sudo gluster volume set ha-vol cluster.self-heal-daemon on

# Set number of parallel heal threads
sudo gluster volume set ha-vol client.event-threads 4
```

## Split-Brain Prevention and Resolution

Split-brain occurs when nodes disagree about which version of a file is authoritative. With a 3-node replica, this is much rarer than with 2 nodes, but it can still happen:

```bash
# Detect split-brain files
sudo gluster volume heal ha-vol info split-brain

# Resolve split-brain for a specific file by preferring one node's copy
sudo gluster volume heal ha-vol split-brain latest-mtime /path/to/file

# Or prefer the biggest file version
sudo gluster volume heal ha-vol split-brain bigger-file /path/to/file

# Source-specific resolution - use gluster1's copy as authoritative
sudo gluster volume heal ha-vol split-brain source-brick gluster1:/data/gluster/replica-brick /path/to/file
```

## Performance Tuning for Replicated Volumes

Replicated volumes have higher write latency than distributed volumes because all replicas must acknowledge writes:

```bash
# Enable write-behind to buffer small writes
sudo gluster volume set ha-vol performance.write-behind on
sudo gluster volume set ha-vol performance.write-behind-window-size 32MB

# Enable read-ahead for sequential reads
sudo gluster volume set ha-vol performance.readdir-ahead on
sudo gluster volume set ha-vol performance.cache-size 256MB

# For databases - disable caching to avoid stale reads
sudo gluster volume set ha-vol performance.cache-size 0MB

# For NFS-like workloads - tune the io-cache
sudo gluster volume set ha-vol performance.io-cache on
sudo gluster volume set ha-vol performance.cache-max-file-size 1GB
```

## Monitoring Replication Health

```bash
# Overall volume status
sudo gluster volume status ha-vol

# Detailed brick information
sudo gluster volume status ha-vol detail

# Check brick process status across all nodes
sudo gluster volume status ha-vol brick

# View live I/O statistics
sudo gluster volume profile ha-vol start
# ...wait for some I/O...
sudo gluster volume profile ha-vol info
sudo gluster volume profile ha-vol stop
```

## Replacing a Failed Node

If a node is permanently failed and needs to be replaced:

```bash
# Replace gluster3 with a new node (gluster4)
# First, probe the new node into the pool
sudo gluster peer probe gluster4

# Replace the failed brick
sudo gluster volume replace-brick ha-vol \
  gluster3:/data/gluster/replica-brick \
  gluster4:/data/gluster/replica-brick commit force

# Trigger a heal to sync data to the new brick
sudo gluster volume heal ha-vol full

# Monitor until complete
watch -n 5 'sudo gluster volume heal ha-vol info | grep "Number of entries"'
```

## Expanding to Distributed-Replicated

When you need both scale-out capacity and redundancy:

```bash
# Add another replica set (3 more bricks) to create a distributed-replicated volume
sudo gluster volume add-brick ha-vol replica 3 \
  gluster4:/data/gluster/replica-brick \
  gluster5:/data/gluster/replica-brick \
  gluster6:/data/gluster/replica-brick

# Rebalance to distribute existing files across both replica sets
sudo gluster volume rebalance ha-vol start
sudo gluster volume rebalance ha-vol status
```

This gives you 2x replica sets, 3 copies each - total of 6 bricks with 2x the usable capacity of a single 3-node replica.

GlusterFS replicated volumes are a practical choice for shared storage in clusters where you need file-level access, HA, and don't want to invest in dedicated SAN hardware.
