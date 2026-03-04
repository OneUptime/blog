# How to Set Up a GlusterFS Replicated Volume for High Availability on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GlusterFS, Replicated Volume, High Availability, Storage, Linux

Description: Configure a GlusterFS replicated volume on RHEL to maintain copies of every file across multiple servers for high availability and data protection.

---

A replicated volume in GlusterFS maintains identical copies of every file on multiple bricks. If one node goes down, clients continue accessing data from the surviving replicas. This is the most common volume type for production workloads where data availability matters.

## How Replication Works

```bash
Client writes file-A

Brick 1 (Node 1): file-A (copy 1)
Brick 2 (Node 2): file-A (copy 2)
Brick 3 (Node 3): file-A (copy 3)
```

Every write goes to all replicas synchronously. Reads can come from any replica. If one node fails, the remaining replicas serve the data.

## Prerequisites

- Three RHEL servers (for a 3-way replica) with GlusterFS installed
- Trusted storage pool configured
- Dedicated storage partitions on each node

A 3-way replica is recommended over 2-way because it allows proper quorum. With 2-way replication and a split-brain scenario, GlusterFS cannot determine which copy is authoritative.

## Step 1: Prepare Bricks on All Nodes

On each of the three nodes:

```bash
sudo mkfs.xfs -i size=512 /dev/sdb
sudo mkdir -p /data/glusterfs/replica/brick1
sudo mount /dev/sdb /data/glusterfs/replica/brick1
echo '/dev/sdb /data/glusterfs/replica/brick1 xfs defaults 0 0' | sudo tee -a /etc/fstab
sudo mkdir -p /data/glusterfs/replica/brick1/data
```

## Step 2: Create the Replicated Volume

From any node:

```bash
sudo gluster volume create repvol replica 3 \
    node1:/data/glusterfs/replica/brick1/data \
    node2:/data/glusterfs/replica/brick1/data \
    node3:/data/glusterfs/replica/brick1/data
```

The `replica 3` keyword tells GlusterFS to maintain 3 copies of every file.

## Step 3: Start the Volume

```bash
sudo gluster volume start repvol
```

Verify:

```bash
sudo gluster volume info repvol
```

You should see:

```bash
Type: Replicate
...
Number of Bricks: 1 x 3 = 3
```

The "1 x 3" means one replica set with 3 bricks.

## Step 4: Mount on the Client

```bash
sudo mkdir -p /mnt/repvol
sudo mount -t glusterfs node1:/repvol /mnt/repvol
```

Add to `/etc/fstab`:

```bash
echo 'node1:/repvol /mnt/repvol glusterfs defaults,_netdev,backupvolfile-server=node2 0 0' | sudo tee -a /etc/fstab
```

The `backupvolfile-server` option ensures the client can mount even if node1 is down.

## Step 5: Verify Replication

```bash
# On the client
echo "Replicated data" | sudo tee /mnt/repvol/test.txt

# Check on each node
cat /data/glusterfs/replica/brick1/data/test.txt  # Should show same content on all three
```

## Quorum Configuration

Server-side quorum prevents split-brain by requiring a majority of bricks in a replica set to be online before allowing writes:

```bash
# Enable server-side quorum
sudo gluster volume set repvol cluster.server-quorum-type server
sudo gluster volume set repvol cluster.server-quorum-ratio 51%
```

Client-side quorum is enabled by default for replica 3 volumes. It ensures a majority of replicas acknowledge a write before it is considered successful:

```bash
# Check current quorum settings
sudo gluster volume get repvol cluster.quorum-type
sudo gluster volume get repvol cluster.quorum-count
```

## Testing Failover

Simulate a node failure and verify continued access:

```bash
# On node3, stop the GlusterFS brick
sudo systemctl stop glusterd

# On the client, reads and writes should still work
echo "Written during node3 outage" | sudo tee /mnt/repvol/failover-test.txt
cat /mnt/repvol/test.txt

# Restart node3
sudo systemctl start glusterd

# The self-heal daemon will sync missed changes
sudo gluster volume heal repvol info
```

## Self-Healing

When a node comes back after a failure, the self-heal daemon automatically synchronizes it:

```bash
# Check files needing healing
sudo gluster volume heal repvol info

# Check healing status
sudo gluster volume heal repvol info summary

# Trigger a full heal manually
sudo gluster volume heal repvol full

# Monitor heal progress
sudo gluster volume heal repvol info healed
```

## Arbiter Volumes

If you want 3-way redundancy without storing 3 full copies, use an arbiter volume. The third brick only stores metadata (file names and sizes), not data:

```bash
sudo gluster volume create arbvol replica 3 arbiter 1 \
    node1:/data/glusterfs/arb/brick1/data \
    node2:/data/glusterfs/arb/brick1/data \
    node3:/data/glusterfs/arb/brick1/data
```

This gives you the split-brain protection of 3-way replication with only 2 full copies of data.

## Performance Tuning

```bash
# Enable metadata caching
sudo gluster volume set repvol group metadata-cache

# Adjust read policy (round-robin reads from replicas)
sudo gluster volume set repvol cluster.read-hash-mode 1

# Set eager-lock for better write performance
sudo gluster volume set repvol cluster.eager-lock enable
```

## Conclusion

Replicated volumes provide the most straightforward high-availability solution in GlusterFS. Use 3-way replication for production workloads to get proper quorum protection against split-brain. The trade-off is storage efficiency: you use 3x the raw capacity to store the data. For better storage efficiency with redundancy, consider dispersed volumes.
