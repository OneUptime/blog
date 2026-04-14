# How to Find Which OSD Stores a Specific Object in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OSD, RADOS, Troubleshooting, Object Storage

Description: Trace a specific RADOS object or RBD/CephFS file through the CRUSH map to identify which OSDs are storing its data.

---

## Why Locate Objects on OSDs?

Knowing which OSD stores an object is essential when:

- An OSD is failing and you need to identify affected data
- Debugging slow requests on specific objects
- Verifying that replicas are distributed across failure domains

## Step 1: Identify the Object Name

For a raw RADOS object, you already have the pool and object name. For higher-level constructs, first find the underlying RADOS object:

**For an RBD image:**
```bash
rbd info myrbd/myimage
# Note the "block_name_prefix" field, e.g. rbd_data.1234abc
```

RBD objects are named `<prefix>.<stripe_number>`:

```bash
rados ls -p rbd | grep rbd_data.1234abc
```

**For a CephFS file:**
```bash
# Get the inode number
stat /mnt/cephfs/myfile.txt

# CephFS objects are named with the inode in hex
python3 -c "print(hex(12345678))"
# Output: 0xbc614e
# Object name: 0000000000bc614e.00000000
```

## Step 2: Map Object to PG

```bash
ceph osd map <pool-name> <object-name>
```

Example:

```bash
ceph osd map rbd rbd_data.1234abc.0000000000000001
```

Output:

```text
osdmap e2145 pool 'rbd' (2) object 'rbd_data.1234abc.0000000000000001' -> pg 2.3a7f8c12 (2.12) -> up ([4,1,7], p4) acting ([4,1,7], p4)
```

This tells you:
- PG: `2.12`
- Primary OSD: 4
- Replica OSDs: 1, 7

## Step 3: Find the Physical Location

Map OSD numbers to hosts:

```bash
ceph osd find 4
ceph osd find 1
ceph osd find 7
```

Each returns JSON with the host name, network address, and CRUSH location.

## Step 4: Verify the Object Exists on the OSD

SSH to the primary OSD's host. The OSD must be stopped before `ceph-objectstore-tool` can access the data directory:

```bash
# Stop the OSD first (required - BlueStore locks the data directory)
systemctl stop ceph-osd@4

# List RADOS objects (BlueStore)
ceph-objectstore-tool --data-path /var/lib/ceph/osd/ceph-4 --op list | grep rbd_data.1234abc

# Restart the OSD when done
systemctl start ceph-osd@4
```

## Scripting for Multiple Objects

```bash
for obj in $(rados ls -p mypool); do
  result=$(ceph osd map mypool "$obj")
  echo "$obj -> $result"
done
```

## Summary

To find which OSD stores a Ceph object, use `ceph osd map <pool> <object>` to get the PG and acting OSD set, then `ceph osd find <osd-id>` to resolve OSD numbers to host names. For RBD and CephFS, first determine the underlying RADOS object name from the block name prefix or inode number before mapping.
