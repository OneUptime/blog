# How to Configure Device Classes (HDD, SSD, NVMe) in CRUSH

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, Device Class, Storage

Description: Configure Ceph CRUSH device classes for HDD, SSD, and NVMe drives to enable tiered storage pools that target specific drive types.

---

## What are Device Classes in Ceph

Device classes in the CRUSH map allow Ceph to distinguish between different types of storage media. By tagging OSDs as `hdd`, `ssd`, or `nvme`, you can create separate shadow CRUSH hierarchies for each class and write pool placement rules that exclusively target a specific drive type.

This enables tiered storage - for example, storing hot data on NVMe, warm data on SSD, and cold archives on HDD within the same Ceph cluster.

## Viewing Current Device Classes

```bash
# List all device classes in the cluster
ceph osd crush class ls

# Show which OSDs belong to each class
ceph osd crush class ls-osd hdd
ceph osd crush class ls-osd ssd
ceph osd crush class ls-osd nvme

# View the full OSD tree with device classes
ceph osd tree
```

Example output:

```text
ID  CLASS WEIGHT  TYPE NAME             STATUS REWEIGHT PRI-AFF
-1        30.000  root default
-3        15.000      host node-01
 0  hdd    2.000          osd.0           up  1.00000  1.00000
 1  hdd    2.000          osd.1           up  1.00000  1.00000
 2  ssd    1.000          osd.2           up  1.00000  1.00000
 3  nvme   0.500          osd.3           up  1.00000  1.00000
```

## Auto-Detection of Device Classes

Ceph automatically detects and assigns device classes when OSDs are added, based on the drive's rotational flag from the kernel:

```bash
# Check if a device is rotational (1=HDD, 0=SSD/NVMe)
cat /sys/block/sda/queue/rotational

# View what class Ceph assigned
ceph osd tree | grep osd.0
```

## Manually Assigning Device Classes

Assign device classes explicitly. An OSD can only have one class at a time - to change an existing class, you must first remove it with `rm-device-class`:

```bash
# Assign SSD class to an OSD (fails if the OSD already has a class)
ceph osd crush set-device-class ssd osd.2

# Assign NVMe class to an OSD
ceph osd crush set-device-class nvme osd.3

# Remove a device class (required before reassigning a new class)
ceph osd crush rm-device-class osd.2

# Now assign a custom device class
ceph osd crush set-device-class fast-ssd osd.2
```

## Creating Pools Targeting a Device Class

Once device classes are set, create CRUSH rules that target them:

```bash
# Create a replicated rule targeting only SSD OSDs
ceph osd crush rule create-replicated ssd-rule default host ssd

# Create a replicated rule for NVMe only
ceph osd crush rule create-replicated nvme-rule default host nvme

# Create a replicated rule for HDD only
ceph osd crush rule create-replicated hdd-rule default host hdd

# List all CRUSH rules
ceph osd crush rule ls
```

Now assign these rules to pools:

```bash
# Create a pool on SSDs
ceph osd pool create ssd-pool 64 64 replicated ssd-rule
ceph osd pool set ssd-pool crush_rule ssd-rule

# Create a pool on HDDs
ceph osd pool create hdd-pool 64 64 replicated hdd-rule
```

## Configuring in Rook

In Rook, specify the device class in the CephBlockPool spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ssd-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  deviceClass: ssd
  replicated:
    size: 3
```

## Verifying Data Placement

Confirm data lands on the correct device class:

```bash
# Check pool I/O statistics
ceph osd pool stats mypool

# View pool configuration including its CRUSH rule
ceph osd dump | grep mypool

# Map a specific object to see which OSDs it uses
ceph osd map ssd-pool testobject
```

## Summary

Ceph CRUSH device classes (hdd, ssd, nvme) enable tiered storage by grouping OSDs by drive type. Assign classes with `ceph osd crush set-device-class`, create class-specific CRUSH rules with `ceph osd crush rule create-replicated`, and target those rules in pool definitions. In Rook, use the `deviceClass` field in CephBlockPool specs for seamless class-aware pool creation.
