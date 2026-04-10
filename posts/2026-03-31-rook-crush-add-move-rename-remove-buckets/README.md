# How to Add, Move, Rename, and Remove Buckets in CRUSH

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, Storage, Configuration

Description: Learn how to manage CRUSH map buckets in Ceph - adding new hierarchy nodes, moving them to different parents, renaming them, and safely removing empty buckets.

---

## CRUSH Bucket Management Operations

CRUSH buckets are the non-leaf nodes in the CRUSH hierarchy - hosts, racks, datacenters, and the root. Managing them allows you to reflect changes in your physical infrastructure, expand the cluster topology, or reorganize failure domains without rebuilding the cluster.

The four key operations are: add, move, rename, and remove.

## Adding Buckets

Create new buckets to represent new infrastructure:

```bash
# Add a new host bucket
ceph osd crush add-bucket node-05 host

# Add a new rack bucket
ceph osd crush add-bucket rack-d rack

# Add a new datacenter bucket
ceph osd crush add-bucket dc-west datacenter

# Add a new root (for multi-root configurations)
ceph osd crush add-bucket secondary-root root

# Verify the bucket was created (as an orphan until placed)
ceph osd tree
```

Newly created buckets are orphaned until placed in the hierarchy.

## Moving Buckets into the Hierarchy

Connect buckets to their parents:

```bash
# Place a host under a rack
ceph osd crush move node-05 rack=rack-d

# Place a rack under a datacenter
ceph osd crush move rack-d datacenter=dc-west

# Place a datacenter under the root
ceph osd crush move dc-west root=default

# Move an OSD to a host (crush set is preferred for OSDs)
ceph osd crush set osd.8 1.0 host=node-05

# Verify the hierarchy
ceph osd tree
```

## Moving Buckets to a Different Parent

Use the same `crush move` command to relocate buckets:

```bash
# Move a host from one rack to another
ceph osd crush move node-05 rack=rack-a

# Move a rack to a different datacenter
ceph osd crush move rack-d datacenter=dc-east

# Confirm the new location
ceph osd find 8  # verify via an OSD in the moved host
```

## Renaming Buckets

Rename buckets to correct naming mistakes or align with updated naming conventions:

```bash
# Rename a bucket directly (preferred method)
ceph osd crush rename-bucket ceph-node-01 storage-node-01

# Verify rename
ceph osd tree | grep storage-node-01
```

For more complex renaming (e.g., renaming multiple buckets or editing rules at the same time), you can manually edit the CRUSH map:

```bash
# Export and decompile the CRUSH map
ceph osd getcrushmap -o crush.bin
crushtool -d crush.bin -o crush.txt

# Edit crush.txt to rename a bucket
# Before: host ceph-node-01
# After:  host storage-node-01
sed -i 's/ceph-node-01/storage-node-01/g' crush.txt

# Recompile and apply
crushtool -c crush.txt -o crush-new.bin
ceph osd setcrushmap -i crush-new.bin

# Verify rename
ceph osd tree | grep storage-node-01
```

## Removing Buckets

Buckets can only be removed when they are empty (contain no OSDs or child buckets):

```bash
# First, remove all items from the bucket
# Move or remove OSDs from the host
ceph osd crush remove osd.8

# Then remove the now-empty host bucket
ceph osd crush remove node-05

# For a rack, first move or remove all hosts from it
ceph osd crush move node-05 rack=rack-a  # move to another rack
ceph osd crush remove rack-d

# Verify removal
ceph osd tree | grep node-05  # should return nothing
```

## Bulk Hierarchy Rebuild Script

```bash
#!/bin/bash
# Add and connect a new rack with 3 hosts

RACK="rack-new"
DATACENTER="dc1"

ceph osd crush add-bucket $RACK rack
ceph osd crush move $RACK datacenter=$DATACENTER

for i in 1 2 3; do
  HOST="new-node-0$i"
  ceph osd crush add-bucket $HOST host
  ceph osd crush move $HOST rack=$RACK
  echo "Added $HOST to $RACK"
done

ceph osd tree
```

## Summary

CRUSH bucket management in Ceph uses `ceph osd crush add-bucket` to create, `ceph osd crush move` to place or relocate, `ceph osd crush rename-bucket` to rename, and `ceph osd crush remove` to delete empty buckets. Always verify the hierarchy with `ceph osd tree` after each operation and ensure buckets are empty before attempting removal to avoid errors.
