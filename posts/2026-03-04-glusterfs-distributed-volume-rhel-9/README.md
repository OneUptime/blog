# How to Create a GlusterFS Distributed Volume on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GlusterFS, Distributed Volume, Storage, Linux

Description: Learn how to create a GlusterFS distributed volume on RHEL to aggregate storage capacity across multiple servers without replication.

---

A distributed volume in GlusterFS spreads files across bricks without any replication or striping. Each file is stored on exactly one brick. This gives you the maximum usable capacity from all nodes, but at the cost of no redundancy. If a brick goes down, any files stored on that brick become unavailable.

Distributed volumes are a good fit when you need maximum storage capacity and handle redundancy at a different layer, such as through application-level replication or regular backups.

## How Distributed Volumes Work

```bash
Client writes file-A, file-B, file-C

Brick 1 (Node 1): file-A, file-C
Brick 2 (Node 2): file-B
```

GlusterFS uses a hashing algorithm (Davies-Humphreys) to decide which brick stores each file. The hash is based on the filename, so the placement is deterministic and no metadata server is needed.

## Prerequisites

- At least two RHEL servers with GlusterFS installed and running
- A trusted storage pool already configured
- Dedicated storage partitions on each node

If you have not yet installed GlusterFS, see the installation guide first.

## Step 1: Prepare the Bricks

On each node, create and mount a dedicated partition:

```bash
# On node1
sudo mkfs.xfs -i size=512 /dev/sdb
sudo mkdir -p /data/glusterfs/dist/brick1
sudo mount /dev/sdb /data/glusterfs/dist/brick1
echo '/dev/sdb /data/glusterfs/dist/brick1 xfs defaults 0 0' | sudo tee -a /etc/fstab

# On node2
sudo mkfs.xfs -i size=512 /dev/sdb
sudo mkdir -p /data/glusterfs/dist/brick1
sudo mount /dev/sdb /data/glusterfs/dist/brick1
echo '/dev/sdb /data/glusterfs/dist/brick1 xfs defaults 0 0' | sudo tee -a /etc/fstab
```

Create the data subdirectory on each node:

```bash
sudo mkdir -p /data/glusterfs/dist/brick1/data
```

## Step 2: Create the Distributed Volume

From any node in the trusted pool:

```bash
sudo gluster volume create distvol \
    node1:/data/glusterfs/dist/brick1/data \
    node2:/data/glusterfs/dist/brick1/data
```

Notice that there is no `replica` or `disperse` keyword. Without these keywords, GlusterFS creates a distributed volume by default.

## Step 3: Start the Volume

```bash
sudo gluster volume start distvol
```

Confirm:

```bash
sudo gluster volume info distvol
```

Output should show:

```bash
Volume Name: distvol
Type: Distribute
...
Number of Bricks: 2
...
```

## Step 4: Mount on the Client

```bash
sudo mkdir -p /mnt/distvol
sudo mount -t glusterfs node1:/distvol /mnt/distvol
```

For persistence across reboots:

```bash
echo 'node1:/distvol /mnt/distvol glusterfs defaults,_netdev 0 0' | sudo tee -a /etc/fstab
```

## Step 5: Verify File Distribution

Create several test files and check which bricks they land on:

```bash
# On the client
for i in $(seq 1 20); do
    echo "test data $i" | sudo tee /mnt/distvol/file-$i.txt > /dev/null
done
```

Check the bricks:

```bash
# On node1
ls /data/glusterfs/dist/brick1/data/

# On node2
ls /data/glusterfs/dist/brick1/data/
```

You should see some files on node1 and some on node2. The distribution depends on the hash of each filename.

## Adding More Bricks

To expand capacity, add a third node:

```bash
# First, probe the new node
sudo gluster peer probe node3

# Add the brick
sudo gluster volume add-brick distvol node3:/data/glusterfs/dist/brick1/data

# Rebalance so existing files are redistributed
sudo gluster volume rebalance distvol start

# Monitor rebalance progress
sudo gluster volume rebalance distvol status
```

## Removing a Brick

When removing a brick from a distributed volume, you must migrate data off it first:

```bash
sudo gluster volume remove-brick distvol node2:/data/glusterfs/dist/brick1/data start
sudo gluster volume remove-brick distvol node2:/data/glusterfs/dist/brick1/data status
# When migration is complete:
sudo gluster volume remove-brick distvol node2:/data/glusterfs/dist/brick1/data commit
```

## Tuning Options

Some useful options for distributed volumes:

```bash
# Set lookup optimization
sudo gluster volume set distvol cluster.lookup-optimize on

# Adjust read-ahead
sudo gluster volume set distvol performance.read-ahead on
sudo gluster volume set distvol performance.read-ahead-page-count 8

# Enable write-behind for better write performance
sudo gluster volume set distvol performance.write-behind on
```

## When to Use Distributed Volumes

**Good for:**
- Maximum storage capacity across nodes
- Workloads that can tolerate individual file loss (e.g., caching layers, scratch space)
- Situations where replication is handled at the application level

**Not good for:**
- Data that must be highly available
- Production workloads without a separate backup strategy

## Conclusion

Distributed volumes give you the simplest GlusterFS setup with maximum usable space. They are the right choice when capacity matters more than redundancy at the storage layer, or when your application handles its own replication. For most production workloads, consider replicated or dispersed volumes instead.
