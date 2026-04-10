# How to Understand CRUSH Map Structure (Topology, OSDs, Buckets, Rules)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, Storage, Configuration

Description: A practical guide to understanding Ceph CRUSH map structure including topology hierarchy, OSD devices, bucket types, and placement rules.

---

## What is the CRUSH Map

The CRUSH (Controlled Replication Under Scalable Hashing) map is the topology database that governs where Ceph stores data. It defines the physical layout of your cluster - which OSDs exist, how they are grouped into failure domains (hosts, racks, datacenters), and the rules that determine how data is distributed across those domains.

A CRUSH map has four main sections:

1. **Devices** - individual OSDs
2. **Bucket Types** - topology levels (host, rack, row, datacenter, root)
3. **Buckets** - actual instances (e.g., host ceph-node-01 containing osd.0, osd.1)
4. **Rules** - algorithms for selecting OSDs for data placement

## Viewing the CRUSH Map

```bash
# Get a text representation of the CRUSH map
ceph osd crush dump

# Export binary CRUSH map and decompile it
ceph osd getcrushmap -o crush.bin
crushtool -d crush.bin -o crush.txt
cat crush.txt
```

Example decompiled CRUSH map:

```text
# begin crush map
tunable choose_local_tries 0
tunable choose_local_fallback_tries 0
tunable choose_total_tries 50

# devices
device 0 osd.0 class hdd
device 1 osd.1 class hdd
device 2 osd.2 class ssd

# types
type 0 osd
type 1 host
type 2 chassis
type 3 rack
type 4 row
type 5 pdu
type 6 pod
type 7 room
type 8 datacenter
type 9 zone
type 10 region
type 11 root

# buckets
host ceph-node-01 {
    id -2
    weight 3.000
    alg straw2
    hash 0
    item osd.0 weight 1.000
    item osd.1 weight 1.000
    item osd.2 weight 1.000
}

root default {
    id -1
    weight 3.000
    alg straw2
    hash 0
    item ceph-node-01 weight 3.000
}

# rules
rule replicated_rule {
    id 0
    type replicated
    min_size 1
    max_size 10
    step take default
    step chooseleaf firstn 0 type host
    step emit
}
```

## Understanding Bucket Algorithms

Ceph supports several bucket algorithms that determine how sub-items are selected:

```text
uniform  - all items have equal weight; fast but inflexible
list     - weighted probability list; good for append-only growth
tree     - binary tree; efficient for large buckets
straw    - weighted straw-draw; suboptimal data movement on weight changes
straw2   - improved straw; default and recommended for most use cases
```

## Understanding CRUSH Rules

Rules define the placement algorithm for a pool:

```text
rule replicated_rule {
    id 0
    type replicated          # replicated or erasure
    min_size 1               # minimum number of replicas
    max_size 10              # maximum number of replicas
    step take default        # start from the 'default' root bucket
    step chooseleaf firstn 0 type host   # choose N distinct hosts
    step emit                # output the selected OSDs
}
```

The `chooseleaf firstn 0 type host` line tells CRUSH to select as many distinct hosts as needed (based on pool replication factor), then pick one OSD from each host.

## Applying Changes

```bash
# Compile modified crush.txt back to binary
crushtool -c crush.txt -o crush-new.bin

# Test the new CRUSH map without applying
crushtool -i crush-new.bin --test --num-rep=3 --rule=0 --min-x=0 --max-x=100

# Apply the compiled CRUSH map to the cluster
ceph osd setcrushmap -i crush-new.bin
```

## Summary

The CRUSH map is the backbone of Ceph's data placement system. It models your physical hardware topology through devices (OSDs), bucket types (host/rack/datacenter hierarchy levels), bucket instances (the actual containers), and rules that govern placement. Understanding this structure is essential before making any changes to failure domains, device classes, or replication policies.
