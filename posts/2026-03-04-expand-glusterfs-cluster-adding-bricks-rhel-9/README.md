# How to Expand a GlusterFS Cluster by Adding New Bricks on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GlusterFS, Cluster Expansion, Storage, Linux

Description: Expand your GlusterFS cluster on RHEL by adding new bricks to existing volumes, probing new peers, and rebalancing data.

---

When your GlusterFS cluster runs low on storage, you can expand it by adding new bricks. The process varies slightly depending on the volume type. Adding bricks to a distributed volume is simpler than expanding a replicated or dispersed volume, which requires adding bricks in matching sets.

## Adding a New Node to the Trusted Pool

Before adding bricks from a new server, the server must join the trusted storage pool:

```bash
# From any existing node
sudo gluster peer probe newnode.example.com
sudo gluster peer status
```

Wait until the peer status shows "Connected" before proceeding.

## Expanding a Distributed Volume

Adding a single brick to a distributed volume is straightforward:

```bash
# Prepare the brick on the new node
# On newnode:
sudo mkfs.xfs -i size=512 /dev/sdb
sudo mkdir -p /data/glusterfs/dist/brick1
sudo mount /dev/sdb /data/glusterfs/dist/brick1
sudo mkdir -p /data/glusterfs/dist/brick1/data

# From any node, add the brick
sudo gluster volume add-brick distvol newnode:/data/glusterfs/dist/brick1/data
```

## Expanding a Replicated Volume

For replicated volumes, you must add bricks in multiples of the replica count. If you have a `replica 3` volume, add 3 new bricks at once:

```bash
sudo gluster volume add-brick repvol \
    newnode1:/data/glusterfs/replica/brick1/data \
    newnode2:/data/glusterfs/replica/brick1/data \
    newnode3:/data/glusterfs/replica/brick1/data
```

This converts the volume from `1 x 3` (one replica set of 3) to `2 x 3` (two replica sets of 3), effectively making it a distributed-replicated volume.

## Expanding a Dispersed Volume

Dispersed volumes require adding bricks in multiples of the disperse count. For a `disperse 6 redundancy 2` volume, add 6 bricks:

```bash
sudo gluster volume add-brick dispvol \
    newnode1:/data/glusterfs/disperse/brick1/data \
    newnode2:/data/glusterfs/disperse/brick1/data \
    newnode3:/data/glusterfs/disperse/brick1/data \
    newnode4:/data/glusterfs/disperse/brick1/data \
    newnode5:/data/glusterfs/disperse/brick1/data \
    newnode6:/data/glusterfs/disperse/brick1/data
```

## Rebalancing After Expansion

After adding bricks, existing files are not automatically redistributed. You need to run a rebalance:

```bash
sudo gluster volume rebalance distvol start
```

Monitor the progress:

```bash
sudo gluster volume rebalance distvol status
```

Example output:

```bash
Node        Rebalanced-files  size     scanned  failures  skipped  status     run time in h:m:s
---------   ----------------  ----     -------  --------  -------  ------     -----------------
node1             1543        4.2GB    5420          0         0   completed  0:3:45
node2             1612        4.5GB    5420          0         0   completed  0:3:52
```

Wait for all nodes to show "completed" status.

## Rebalance Options

```bash
# Fix layout only (does not move files, just updates hash ranges)
sudo gluster volume rebalance distvol fix-layout start

# Force a rebalance (moves files even if it otherwise wouldn't)
sudo gluster volume rebalance distvol start force

# Stop a running rebalance
sudo gluster volume rebalance distvol stop
```

## Pre-Expansion Checklist

Before expanding your cluster:

1. **Verify the pool**: Make sure all existing peers are connected
   ```bash
   sudo gluster peer status
   ```

2. **Check volume health**: Ensure no ongoing heals
   ```bash
   sudo gluster volume heal <volname> info summary
   ```

3. **Verify disk space**: Confirm the new bricks have sufficient space
   ```bash
   df -h /data/glusterfs/
   ```

4. **Backup configuration**: Note the current volume layout
   ```bash
   sudo gluster volume info <volname>
   ```

## Verifying the Expansion

After adding bricks and completing the rebalance:

```bash
# Check the new volume layout
sudo gluster volume info <volname>

# Verify all bricks are online
sudo gluster volume status <volname>

# Confirm data distribution
sudo gluster volume rebalance <volname> status
```

## Conclusion

Expanding a GlusterFS cluster is a non-disruptive operation. Clients continue to read and write data during the process. The rebalance step is important for distributing existing data to new bricks. Without it, only new files will land on the newly added bricks. Always add bricks in the correct multiples for your volume type to maintain the intended redundancy.
