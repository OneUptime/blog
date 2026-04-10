# How to Use the ceph osd crush Command Suite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CLI, CRUSH, OSD, Topology, Data Placement

Description: Use the ceph osd crush commands to manage CRUSH maps, adjust data placement rules, and control how Ceph distributes data across failure domains.

---

## Introduction

The CRUSH (Controlled Replication Under Scalable Hashing) algorithm determines where Ceph places data. The `ceph osd crush` command suite lets you view, modify, and validate the CRUSH map that controls data distribution across your hardware topology.

## Viewing the CRUSH Map

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

# Show the full CRUSH tree
ceph osd crush tree

# Show CRUSH rules
ceph osd crush rule ls
ceph osd crush rule dump

# Export the full CRUSH map
ceph osd getcrushmap -o crushmap.bin
crushtool -d crushmap.bin -o crushmap.txt
cat crushmap.txt
```

## Adding a New Host to the CRUSH Map

When adding a new node with OSDs:

```bash
# Add the host bucket
ceph osd crush add-bucket worker-4 host

# Move it under the root
ceph osd crush move worker-4 root=default

# Add OSDs to the host
ceph osd crush set osd.6 1.0 root=default host=worker-4
ceph osd crush set osd.7 1.0 root=default host=worker-4
```

## Moving a Node in the Hierarchy

Reorganize topology to reflect rack changes:

```bash
# Move a host into a rack
ceph osd crush add-bucket rack-1 rack
ceph osd crush move worker-1 rack=rack-1
ceph osd crush move worker-2 rack=rack-1
ceph osd crush move rack-1 root=default
```

## Creating Custom CRUSH Rules

Create a rule that places replicas across racks:

```bash
ceph osd crush rule create-replicated rack-rule default rack
```

Apply the rule to a pool:

```bash
ceph osd pool set mypool crush_rule rack-rule
```

## Adjusting OSD Weights

Change data placement proportions:

```bash
# Reduce weight of a slower OSD
ceph osd crush reweight osd.3 0.5

# Set a new OSD's weight
ceph osd crush add osd.8 2.0 root=default host=worker-5
```

## Rebalancing with the Balancer

After topology changes, use the balancer:

```bash
ceph mgr module enable balancer
ceph balancer mode upmap
ceph balancer on

# Check the balancer's recommendation
ceph balancer status
ceph balancer eval
```

## Removing a Node from the CRUSH Map

```bash
# Remove all OSDs from the host first
ceph osd crush remove osd.6
ceph osd crush remove osd.7

# Then remove the host bucket
ceph osd crush remove worker-4
```

## Validating a CRUSH Map Before Applying

```bash
crushtool -i crushmap.bin --test --show-choose-tries
```

## Summary

The `ceph osd crush` command suite provides full control over the CRUSH hierarchy, enabling you to model your physical topology (racks, rows, datacenters) and control how data is distributed across failure domains. Proper CRUSH configuration ensures data replicas are placed on separate physical components, maximizing availability during hardware failures.
