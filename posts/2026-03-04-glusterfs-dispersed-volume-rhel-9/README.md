# How to Configure a GlusterFS Dispersed Volume on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GlusterFS, Dispersed Volume, Erasure Coding, Storage, Linux

Description: Set up a GlusterFS dispersed volume on RHEL using erasure coding to provide redundancy with better storage efficiency than replication.

---

Dispersed volumes in GlusterFS use erasure coding to provide redundancy without the storage overhead of full replication. Instead of keeping complete copies of each file, dispersed volumes split data into fragments, compute redundancy fragments, and spread them across bricks. This is similar to RAID 5 or RAID 6 but distributed across networked servers.

## Dispersed vs Replicated

| Feature | Replicated (3-way) | Dispersed (4+2) |
|---|---|---|
| Raw capacity needed for 1TB usable | 3 TB | 1.5 TB |
| Bricks that can fail simultaneously | 2 | 2 |
| Write performance | Higher | Lower (erasure coding overhead) |
| Read performance | Similar | Similar |
| Minimum bricks | 3 | 6 |

## Prerequisites

- Six RHEL servers with GlusterFS installed (for a 4+2 configuration)
- Trusted storage pool configured
- Dedicated storage partitions on each node

## Step 1: Prepare Bricks on All Nodes

On each of the six nodes:

```bash
sudo mkfs.xfs -i size=512 /dev/sdb
sudo mkdir -p /data/glusterfs/disperse/brick1
sudo mount /dev/sdb /data/glusterfs/disperse/brick1
echo '/dev/sdb /data/glusterfs/disperse/brick1 xfs defaults 0 0' | sudo tee -a /etc/fstab
sudo mkdir -p /data/glusterfs/disperse/brick1/data
```

## Step 2: Create the Dispersed Volume

A dispersed volume with 6 bricks and redundancy of 2 means 4 data fragments + 2 redundancy fragments. This can tolerate 2 simultaneous brick failures:

```bash
sudo gluster volume create dispvol disperse 6 redundancy 2 \
    node1:/data/glusterfs/disperse/brick1/data \
    node2:/data/glusterfs/disperse/brick1/data \
    node3:/data/glusterfs/disperse/brick1/data \
    node4:/data/glusterfs/disperse/brick1/data \
    node5:/data/glusterfs/disperse/brick1/data \
    node6:/data/glusterfs/disperse/brick1/data
```

If you omit the `redundancy` parameter, GlusterFS calculates a default value.

## Step 3: Start the Volume

```bash
sudo gluster volume start dispvol
```

Verify:

```bash
sudo gluster volume info dispvol
```

Output should include:

```
Type: Disperse
...
Number of Bricks: 1 x (4 + 2) = 6
```

## Step 4: Mount and Test

On the client:

```bash
sudo mkdir -p /mnt/dispvol
sudo mount -t glusterfs node1:/dispvol /mnt/dispvol
```

Write some data:

```bash
dd if=/dev/urandom of=/mnt/dispvol/testfile bs=1M count=100
```

Check what is stored on each brick:

```bash
# On any node
ls -la /data/glusterfs/disperse/brick1/data/
```

Each brick stores a fragment, not a complete copy of the file.

## Common Dispersed Volume Configurations

| Configuration | Bricks | Redundancy | Usable Capacity | Failures Tolerated |
|---|---|---|---|---|
| disperse 3 redundancy 1 | 3 | 1 | 66% | 1 |
| disperse 6 redundancy 2 | 6 | 2 | 66% | 2 |
| disperse 6 redundancy 3 | 6 | 3 | 50% | 3 |
| disperse 11 redundancy 3 | 11 | 3 | 73% | 3 |

## Distributed-Dispersed Volumes

For larger deployments, combine distribution with dispersal:

```bash
sudo gluster volume create dist-disp disperse 6 redundancy 2 \
    node1:/data/glusterfs/dd/brick1/data \
    node2:/data/glusterfs/dd/brick1/data \
    node3:/data/glusterfs/dd/brick1/data \
    node4:/data/glusterfs/dd/brick1/data \
    node5:/data/glusterfs/dd/brick1/data \
    node6:/data/glusterfs/dd/brick1/data \
    node7:/data/glusterfs/dd/brick1/data \
    node8:/data/glusterfs/dd/brick1/data \
    node9:/data/glusterfs/dd/brick1/data \
    node10:/data/glusterfs/dd/brick1/data \
    node11:/data/glusterfs/dd/brick1/data \
    node12:/data/glusterfs/dd/brick1/data
```

This creates 2 disperse groups of 6 bricks each. Files are distributed between the groups, and each group provides erasure coding.

## Self-Healing

Dispersed volumes have self-healing similar to replicated volumes:

```bash
# Check files needing healing
sudo gluster volume heal dispvol info

# Trigger a full heal
sudo gluster volume heal dispvol full

# Check heal status
sudo gluster volume heal dispvol info summary
```

## Performance Tuning

Dispersed volumes have higher CPU overhead due to erasure coding. These settings can help:

```bash
# Increase the stripe unit for large-file workloads
sudo gluster volume set dispvol disperse.eager-lock enable

# Enable parallel data access
sudo gluster volume set dispvol performance.io-thread-count 32

# Cache settings
sudo gluster volume set dispvol performance.cache-size 512MB
sudo gluster volume set dispvol performance.write-behind-window-size 4MB
```

## Conclusion

Dispersed volumes offer a good balance between storage efficiency and redundancy. They use about 50-75% of raw capacity for usable storage while tolerating multiple simultaneous failures. The trade-off is higher CPU usage for erasure coding calculations and slightly lower write performance compared to replicated volumes. They are well-suited for large-scale storage where capacity efficiency matters.
