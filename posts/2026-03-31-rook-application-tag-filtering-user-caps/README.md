# How to Use Application Tag Filtering for Ceph User Caps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Authentication

Description: Learn how to use application tag filtering in Ceph capability strings to restrict user access to pools tagged for specific applications like RBD or CephFS.

---

## What Is Application Tag Filtering

Ceph pools can be tagged with an application name using `ceph osd pool application enable`. Application tag filtering in capability strings lets you restrict a user's OSD access to only pools that have been tagged for a specific application. This is particularly useful for separating RBD, CephFS, and RGW workloads.

## Tagging Pools with an Application

Before using tag-based caps, pools must be tagged. Check current pool application tags:

```bash
ceph osd pool application get
```

Sample output:

```text
{
    "rbd-pool": {
        "rbd": {}
    },
    "cephfs-data": {
        "cephfs": {
            "data": "myfs",
            "metadata": "no"
        }
    },
    "rgw-pool": {
        "rgw": {}
    }
}
```

Tag a pool if not already done:

```bash
ceph osd pool application enable mypool rbd
ceph osd pool application enable myfs-data cephfs
```

## Syntax for Tag-Based Capabilities

Use the `tag` keyword in OSD capability strings:

```bash
ceph auth get-or-create client.rbd-user \
  mon 'allow r' \
  osd 'allow rw tag rbd *=*'
```

This grants read-write access to all pools tagged with the `rbd` application.

## CephFS Tag-Based Access

For CephFS clients, the tag syntax includes the filesystem name:

```bash
ceph auth get-or-create client.cephfs-user \
  mon 'allow r' \
  mds 'allow rw' \
  osd 'allow rw tag cephfs data=myfs'
```

The `tag cephfs data=myfs` restricts access to pools that are the data pools for the `myfs` filesystem.

For the metadata pool:

```bash
osd 'allow rw tag cephfs metadata=myfs'
```

## Combining Tag and Explicit Pool Access

You can combine tag-based and explicit pool restrictions:

```bash
ceph auth get-or-create client.hybrid \
  mon 'allow r' \
  osd 'allow rw tag rbd *=*, allow r pool=monitoring-data'
```

## Why Tags Are Better Than Listing Pools

If you list pools explicitly in a capability string, you must update the capability every time a new pool is added. With application tags, the capability automatically covers any future pool tagged with that application:

```bash
# Requires update when a new rbd pool is created
osd 'allow rw pool=rbd-pool1, allow rw pool=rbd-pool2'

# Automatically covers future rbd pools
osd 'allow rw tag rbd *=*'
```

## Rook CSI Driver and Tag-Based Access

Rook's CSI provisioner uses tag-based OSD caps for CephFS:

```bash
ceph auth get client.csi-cephfs-provisioner
```

Sample output:

```text
[client.csi-cephfs-provisioner]
    key = AQA...==
    caps mon = "allow r, allow command 'osd blocklist'"
    caps mgr = "allow rw"
    caps osd = "allow rw tag cephfs metadata=*, allow rw tag cephfs data=*"
```

The wildcard `metadata=*` and `data=*` mean access to all CephFS filesystems' pools.

## Verifying Tag Filtering

After creating a user with tag caps, verify which pools are accessible:

```bash
# List all rbd-tagged pools
ceph osd pool ls detail | grep '"rbd"'

# Test access as the tag-restricted user
rados --name client.rbd-user --keyring /tmp/rbd-user.keyring -p rbd-pool ls
```

## Summary

Application tag filtering in Ceph OSD caps uses the `tag <app> <key>=<value>` syntax to restrict access to pools tagged for a specific application. This is more flexible than listing pools explicitly because it automatically covers new pools as they are tagged. Rook's CSI drivers use `tag cephfs` caps to access all CephFS pools without requiring capability updates when new filesystems are created.
