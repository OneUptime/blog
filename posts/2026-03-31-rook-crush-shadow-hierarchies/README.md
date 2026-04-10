# How to Understand Shadow CRUSH Hierarchies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, Device Class, Storage

Description: Understand how Ceph automatically generates shadow CRUSH hierarchies for device classes and how they enable targeted placement without manual CRUSH map edits.

---

## What are Shadow CRUSH Hierarchies

Shadow hierarchies are virtual copies of the CRUSH bucket tree that Ceph automatically generates for each device class. When you assign a device class (hdd, ssd, nvme) to OSDs, Ceph creates a parallel subtree containing only those OSDs. These shadow trees have the same bucket structure as the main hierarchy but are prefixed with `~classname`.

This allows CRUSH rules to target a specific drive type using `step take default class ssd` without requiring you to build and maintain a separate CRUSH hierarchy manually.

## Viewing Shadow Hierarchies

```bash
# Show the main tree and shadow hierarchies
ceph osd crush tree --show-shadow
```

Example output with shadow hierarchies:

```text
ID    CLASS  WEIGHT   TYPE NAME          STATUS  REWEIGHT  PRI-AFF
-1           10.000   root default
-3            5.000       host node-01
 0    hdd     1.000           osd.0        up    1.00000   1.00000
 1    hdd     1.000           osd.1        up    1.00000   1.00000
 2    ssd     1.000           osd.2        up    1.00000   1.00000

-100          2.000   root default~hdd
-101          2.000       host node-01~hdd
 0    hdd     1.000           osd.0        up    1.00000   1.00000
 1    hdd     1.000           osd.1        up    1.00000   1.00000

-200          1.000   root default~ssd
-201          1.000       host node-01~ssd
 2    ssd     1.000           osd.2        up    1.00000   1.00000
```

Shadow buckets use negative IDs (like -100, -101) and are automatically created and maintained.

## How CRUSH Rules Use Shadow Hierarchies

When a CRUSH rule includes `step take default class ssd`, Ceph transparently resolves this to the corresponding shadow hierarchy `default~ssd`:

```text
rule ssd-pool {
    id 3
    type replicated
    step take default class ssd   # => resolves to default~ssd
    step chooseleaf firstn 0 type host
    step emit
}
```

You never reference the shadow hierarchy directly in rules - the `class` keyword in the `take` step handles the lookup.

## When Shadow Hierarchies are Created

Ceph creates shadow hierarchy entries automatically when:

```bash
# Assigning a class to an OSD creates shadow entries
ceph osd crush set-device-class ssd osd.2

# Verify shadow was created
ceph osd crush tree --show-shadow | grep "~ssd"

# Adding a new OSD with a class detected at startup also creates entries
# Class is auto-detected from /sys/block/sdX/queue/rotational
```

## Shadow Hierarchy Naming Convention

Shadow bucket names follow the pattern `<parent-name>~<class>`:

```text
main root:        default
hdd shadow root:  default~hdd
ssd shadow root:  default~ssd
nvme shadow root: default~nvme

main host:        node-01
hdd shadow host:  node-01~hdd
ssd shadow host:  node-01~ssd
```

## Removing Shadow Hierarchies

Shadow hierarchies are managed automatically, but you can remove a device class entirely:

```bash
# Remove the device class from specific OSDs (also removes shadow tree entries when no OSDs remain)
ceph osd crush rm-device-class osd.2
ceph osd crush rm-device-class osd.3

# To remove a class from all OSDs at once, combine with class listing
ceph osd crush rm-device-class $(ceph osd crush class ls-osd ssd)

# Verify shadow hierarchy is gone
ceph osd crush tree --show-shadow | grep "~ssd"
```

## Debugging Shadow Hierarchy Issues

```bash
# If a pool is not using the correct device class, inspect the rule
ceph osd crush rule dump mypool-rule

# Check that the expected OSDs are in the shadow tree
ceph osd crush class ls-osd ssd

# Map an object and verify OSDs are from the expected class
ceph osd map mypool testobject
```

## Summary

Shadow CRUSH hierarchies are Ceph's mechanism for implementing device class-based placement without manual CRUSH map management. They are created automatically when device classes are assigned and are referenced in CRUSH rules via the `class` keyword in `step take`. Understanding shadow hierarchies explains why class-targeted rules work and helps you debug situations where data is not landing on the intended drive type.
