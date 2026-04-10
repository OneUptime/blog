# How to Add and Manage Devices in CRUSH Maps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, OSD, Storage

Description: Learn how to add, update, and remove OSD devices in Ceph CRUSH maps, including weight assignment and device class tagging.

---

## What are Devices in the CRUSH Map

In Ceph's CRUSH map, devices are the individual OSD entries at the leaf level of the hierarchy. Each device has an ID (matching the OSD number), a name (e.g., `osd.0`), an optional device class (e.g., `hdd`, `ssd`, `nvme`), and a weight that influences how much data Ceph stores on that OSD.

Managing devices correctly ensures balanced data distribution and proper failure domain isolation.

## Viewing Devices in the CRUSH Map

```bash
# List all devices in the CRUSH map
ceph osd crush dump | python3 -m json.tool | grep -A3 '"devices"'

# View device weights and classes via osd tree
ceph osd tree

# Export and inspect the full CRUSH map
ceph osd getcrushmap -o crush.bin
crushtool -d crush.bin -o crush.txt
grep "^device" crush.txt
```

Example device section in a decompiled CRUSH map:

```text
device 0 osd.0 class hdd
device 1 osd.1 class hdd
device 2 osd.2 class ssd
device 3 osd.3 class nvme
```

## Adding a Device to the CRUSH Map

When you add a new OSD, Ceph automatically adds it to the CRUSH map. You can also add it manually:

```bash
# Add an OSD to CRUSH with a weight of 1TB and specify its location
ceph osd crush add osd.4 1.0 root=default rack=rack2 host=node-03

# Verify the device was added
ceph osd tree | grep osd.4
```

The weight is typically expressed in terabytes (1.0 = 1 TB) so that larger drives receive proportionally more data.

## Updating Device Weight

Adjust OSD weights to account for differently-sized drives:

```bash
# Set the CRUSH weight for a specific OSD
ceph osd crush reweight osd.4 2.0  # 2 TB drive

# Reweight all OSDs based on actual utilization
ceph osd reweight-by-utilization

# Set reweight (not CRUSH weight) to reduce data on a specific OSD
ceph osd reweight osd.4 0.5
```

## Assigning Device Classes

Device classes allow CRUSH rules to target specific storage tiers:

```bash
# Assign a device class to an OSD
ceph osd crush set-device-class ssd osd.2
ceph osd crush set-device-class nvme osd.3

# Remove a device class from an OSD
ceph osd crush rm-device-class osd.2

# List all device classes
ceph osd crush class ls

# List OSDs in a specific class
ceph osd crush class ls-osd ssd
```

## Removing a Device

When decommissioning an OSD, remove it from the CRUSH map after safely migrating data:

```bash
# First, mark the OSD out to trigger data migration
ceph osd out osd.4

# Wait for recovery to complete
watch -n 5 ceph -s

# Stop the OSD daemon
sudo systemctl stop ceph-osd@4
ceph osd crush remove osd.4
ceph auth del osd.4
ceph osd rm osd.4
```

## Manually Editing Devices in the CRUSH Map

For bulk changes, edit the decompiled CRUSH map directly:

```bash
# Export and decompile
ceph osd getcrushmap -o crush.bin
crushtool -d crush.bin -o crush.txt

# Edit crush.txt to add/modify device entries
# device 5 osd.5 class ssd

# Recompile and apply
crushtool -c crush.txt -o crush-new.bin
ceph osd setcrushmap -i crush-new.bin
```

## Summary

CRUSH devices represent individual OSDs and are the leaf nodes of the placement hierarchy. Add devices with `ceph osd crush add`, adjust weights with `ceph osd crush reweight`, assign classes with `ceph osd crush set-device-class`, and remove them with `ceph osd crush remove` after safely draining data. Accurate device management in the CRUSH map is essential for balanced, fault-tolerant storage.
