# How to Replace a Failed Brick in a GlusterFS Volume on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GlusterFS, Brick Replacement, Storage Recovery, Linux

Description: Replace a failed brick in a GlusterFS volume on RHEL using the replace-brick command, then heal the data to restore full redundancy.

---

When a brick fails in a GlusterFS replicated or dispersed volume, the volume continues to serve data from the remaining bricks. However, you should replace the failed brick as soon as possible to restore full redundancy. GlusterFS provides a `replace-brick` command that swaps the failed brick with a new one and triggers self-healing.

## Identifying a Failed Brick

Check which bricks are offline:

```bash
sudo gluster volume status repvol
```

A failed brick will not appear in the output, or it will show as "N/A":

```bash
sudo gluster volume status repvol detail
```

You can also check the heal info:

```bash
sudo gluster volume heal repvol info summary
```

If entries need healing, it means some bricks are out of sync.

## Step 1: Prepare the Replacement Brick

If replacing on the same node (new disk):

```bash
sudo mkfs.xfs -i size=512 /dev/sdc
sudo mkdir -p /data/glusterfs/replica/brick2
sudo mount /dev/sdc /data/glusterfs/replica/brick2
echo '/dev/sdc /data/glusterfs/replica/brick2 xfs defaults 0 0' | sudo tee -a /etc/fstab
sudo mkdir -p /data/glusterfs/replica/brick2/data
```

If replacing on a different node, prepare the brick on the new node and make sure it is part of the trusted storage pool:

```bash
sudo gluster peer probe newnode
```

## Step 2: Replace the Brick

Use the `replace-brick` command with the `commit force` option:

```bash
sudo gluster volume replace-brick repvol \
    oldnode:/data/glusterfs/replica/brick1/data \
    newnode:/data/glusterfs/replica/brick2/data \
    commit force
```

This immediately replaces the brick reference in the volume configuration and starts the new brick.

## Step 3: Trigger Self-Healing

The self-heal daemon should start automatically, but you can trigger it manually:

```bash
sudo gluster volume heal repvol
```

Monitor the healing progress:

```bash
sudo gluster volume heal repvol info
```

Check for files still needing healing:

```bash
sudo gluster volume heal repvol info summary
```

Example output during healing:

```bash
Brick node1:/data/glusterfs/replica/brick1/data
Status: Connected
Total Number of entries: 0

Brick newnode:/data/glusterfs/replica/brick2/data
Status: Connected
Total Number of entries: 1523
```

The entries count on the new brick shows files being healed. When it reaches 0 on all bricks, healing is complete.

## Step 4: Verify the Replacement

```bash
# Check volume info shows the new brick
sudo gluster volume info repvol

# Verify all bricks are online
sudo gluster volume status repvol

# Confirm no entries need healing
sudo gluster volume heal repvol info summary
```

## Replacing a Brick on the Same Node

If the brick failed because of a disk failure but the node is still operational, you can replace on the same node:

```bash
# Unmount the failed disk (if possible)
sudo umount /data/glusterfs/replica/brick1

# Install and mount the new disk
sudo mkfs.xfs -i size=512 /dev/sdc
sudo mount /dev/sdc /data/glusterfs/replica/brick1
sudo mkdir -p /data/glusterfs/replica/brick1/data

# Replace the brick with itself (same path, new disk)
# First, remove the old .glusterfs directory entries
sudo setfattr -x trusted.glusterfs.volume-id /data/glusterfs/replica/brick1/data
sudo setfattr -x trusted.gfid /data/glusterfs/replica/brick1/data

# Replace
sudo gluster volume replace-brick repvol \
    node1:/data/glusterfs/replica/brick1/data \
    node1:/data/glusterfs/replica/brick1/data \
    commit force
```

## Handling Extended Outages

If a brick has been down for a long time and many files need healing:

```bash
# Check the backlog
sudo gluster volume heal repvol info summary

# Increase heal threads for faster recovery
sudo gluster volume set repvol cluster.shd-max-threads 8

# Full heal to catch everything
sudo gluster volume heal repvol full

# Monitor progress
watch -n 10 'sudo gluster volume heal repvol info summary'
```

After healing completes, reset the thread count:

```bash
sudo gluster volume set repvol cluster.shd-max-threads 1
```

## Conclusion

Replacing a failed brick is straightforward with the `replace-brick commit force` command. The self-heal daemon handles data synchronization automatically. The key is to replace the brick promptly to restore redundancy before another failure occurs. Always verify that healing completes fully before considering the replacement done.
