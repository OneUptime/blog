# How to Troubleshoot GlusterFS Split-Brain Scenarios on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GlusterFS, Split-Brain, Troubleshooting, Storage, Linux

Description: Identify and resolve GlusterFS split-brain scenarios on RHEL where different replicas have conflicting versions of the same file.

---

Split-brain occurs in GlusterFS when two or more replicas of the same file have been modified independently, and GlusterFS cannot determine which version is correct. This typically happens when bricks lose connectivity with each other but clients continue writing to different replicas. When connectivity is restored, the self-heal daemon finds conflicting versions and marks the file as split-brain.

## Detecting Split-Brain

Check for split-brain entries:

```bash
sudo gluster volume heal repvol info split-brain
```

This lists all files in split-brain state. If the output is empty, there are no split-brain files.

You can also detect split-brain from the client side. Attempting to access a split-brain file returns an I/O error:

```bash
cat /mnt/repvol/some-file.txt
# cat: /mnt/repvol/some-file.txt: Input/output error
```

Check the client log for details:

```bash
grep -i "split-brain" /var/log/glusterfs/mnt-repvol.log
```

## Types of Split-Brain

GlusterFS has three types of split-brain:

1. **Data split-brain**: File content differs between replicas
2. **Metadata split-brain**: File metadata (permissions, ownership, timestamps) differs
3. **Entry split-brain**: A file/directory exists on some replicas but not others, or with different types

## Resolution Methods

### Method 1: Choose a Specific Brick as Source

If you know which brick has the correct version:

```bash
# For a specific file
sudo gluster volume heal repvol split-brain source-brick \
    node1:/data/glusterfs/replica/brick1/data /path/to/file.txt

# Trigger heal
sudo gluster volume heal repvol
```

### Method 2: Choose the Bigger File

Let GlusterFS pick the larger file as the source:

```bash
sudo gluster volume heal repvol split-brain bigger-file /path/to/file.txt
sudo gluster volume heal repvol
```

### Method 3: Choose the Newer File (Latest mtime)

```bash
sudo gluster volume heal repvol split-brain latest-mtime /path/to/file.txt
sudo gluster volume heal repvol
```

### Method 4: Set a Favorite Child Policy

For automatic resolution, configure a favorite child policy:

```bash
# Always prefer a specific brick
sudo gluster volume set repvol cluster.favorite-child-policy mtime
```

Available policies:
- `none`: No automatic resolution (default)
- `mtime`: Prefer the file with the latest modification time
- `size`: Prefer the larger file
- `majority`: Prefer the version that exists on the majority of bricks

### Method 5: Manual Resolution with getfattr

For complex cases, inspect extended attributes to understand the conflict:

```bash
# On each brick, check the pending changelog
sudo getfattr -d -m . -e hex /data/glusterfs/replica/brick1/data/file.txt
```

Look at the `trusted.afr.*` attributes. Non-zero values indicate pending changes that could not be synced.

To manually clear split-brain by resetting extended attributes:

```bash
# On the brick you want to discard (the "wrong" copy)
sudo setfattr -x trusted.afr.repvol-client-0 /data/glusterfs/replica/brick1/data/file.txt
sudo setfattr -x trusted.afr.repvol-client-1 /data/glusterfs/replica/brick1/data/file.txt

# Trigger heal
sudo gluster volume heal repvol
```

**Warning**: Only do this if you understand which brick has the correct data. Incorrect resolution causes data loss.

## Resolving Entry Split-Brain

Entry split-brain (where files exist on some replicas but not others) requires a different approach:

```bash
# Check entry heal info
sudo gluster volume heal repvol info split-brain

# Choose which brick has the correct directory listing
sudo gluster volume heal repvol split-brain source-brick \
    node1:/data/glusterfs/replica/brick1/data /path/to/directory
```

## Preventing Split-Brain

### Enable Server-Side Quorum

```bash
sudo gluster volume set repvol cluster.server-quorum-type server
sudo gluster volume set repvol cluster.server-quorum-ratio 51%
```

This prevents writes when less than 51% of the storage pool is available.

### Use 3-Way Replication

With 3 replicas, GlusterFS can determine the majority version and automatically heal:

```bash
sudo gluster volume set repvol cluster.quorum-type auto
```

### Use Arbiter Volumes

An arbiter brick stores only metadata, providing tie-breaking without full storage overhead:

```bash
sudo gluster volume create arbvol replica 3 arbiter 1 \
    node1:/brick/data node2:/brick/data node3:/brick/arbiter
```

## Bulk Split-Brain Resolution

If many files are in split-brain, resolve them in bulk:

```bash
# Get list of split-brain files
sudo gluster volume heal repvol info split-brain | grep "^/" > /tmp/split-brain-files.txt

# Resolve all using latest-mtime policy
while read -r file; do
    sudo gluster volume heal repvol split-brain latest-mtime "$file"
done < /tmp/split-brain-files.txt

# Trigger heal
sudo gluster volume heal repvol
```

## Conclusion

Split-brain is the most disruptive issue in GlusterFS replicated volumes. Prevention through proper quorum configuration is better than resolution after the fact. When split-brain does occur, use the built-in resolution commands to pick the correct version. For production environments, always use 3-way replication or arbiter volumes to minimize split-brain risk.
