# How to View the CRUSH Hierarchy with ceph osd tree

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, OSD, Storage

Description: Learn how to use the ceph osd tree command and related tools to inspect and validate your Ceph CRUSH hierarchy and OSD topology.

---

## Why View the CRUSH Hierarchy

The CRUSH hierarchy controls data placement in Ceph. Viewing it lets you verify that OSDs are correctly assigned to hosts, racks, and datacenters - confirming that your failure domain isolation is working as intended. It also helps diagnose placement issues, imbalanced weights, and OSDs in unexpected locations.

## Basic ceph osd tree Output

```bash
ceph osd tree
```

Example output:

```text
ID  CLASS  WEIGHT   TYPE NAME             STATUS  REWEIGHT  PRI-AFF
-1           6.000  root default
-5           6.000      datacenter dc1
-3           6.000          rack rack1
-2           3.000              host node-01
 0  hdd      1.000                  osd.0   up    1.00000   1.00000
 1  hdd      1.000                  osd.1   up    1.00000   1.00000
 2  ssd      1.000                  osd.2   up    1.00000   1.00000
-4           3.000              host node-02
 3  hdd      1.000                  osd.3   up    1.00000   1.00000
 4  hdd      2.000                  osd.4   up    1.00000   1.00000
```

Column meanings:
- **ID** - negative IDs are buckets; non-negative IDs (0 and above) are OSDs
- **CLASS** - device class (hdd, ssd, nvme)
- **WEIGHT** - CRUSH weight (typically TB of capacity)
- **TYPE NAME** - bucket type and name
- **STATUS** - OSD up/down status
- **REWEIGHT** - reweight value (0.0 to 1.0)
- **PRI-AFF** - primary affinity value

## Filtering and Formatting Output

```bash
# Show only down OSDs
ceph osd tree down

# Show only OSDs in a specific state
ceph osd tree up

# Output as JSON for scripting
ceph osd tree -f json | python3 -m json.tool

# Show only a specific bucket subtree
ceph osd tree | awk '/host node-01/{found=1} found{print} /^-[0-9]/{if(found && !/host node-01/)exit}'
```

## Checking Weights and Balance

```bash
# Show OSD utilization alongside the tree
ceph osd df tree

# Check for weight imbalances
ceph osd df | awk 'NR>1 {if($6+0 > 90) print "HIGH:", $0}'

# Show the expected vs actual data distribution
ceph balancer eval
```

## Inspecting the Hierarchy as a Graph

For a compact hierarchical view, dump the CRUSH map:

```bash
# Get JSON hierarchy
ceph osd crush tree --show-shadow

# Dump full CRUSH structure
ceph osd crush dump | python3 -m json.tool | less
```

## Verifying Failure Domains

Check that replicas for a given pool are spread correctly:

```bash
# Map an object and see which OSDs host its replicas
ceph osd map mypool myobject

# Example output:
# osdmap e137 pool 'mypool' (1) object 'myobject' -> pg 1.5e23c62b (1.2b) -> up ([2,5,8], p2) acting ([2,5,8], p2)
# OSDs 2, 5, 8 should be in different failure domains

# Verify those OSDs are on different hosts
ceph osd find 2
ceph osd find 5
ceph osd find 8
```

## Exporting the Tree for Documentation

```bash
# Save the current hierarchy to a file
ceph osd tree > /tmp/crush-hierarchy-$(date +%Y%m%d).txt

# Generate a formatted JSON tree for auditing
ceph osd tree -f json-pretty > /tmp/crush-tree.json
```

## Summary

`ceph osd tree` is the primary command for inspecting the CRUSH hierarchy. It shows OSDs, their device classes, weights, bucket membership, and status in a single view. Pair it with `ceph osd df tree` for utilization data, `ceph osd map` to verify placement, and `ceph osd crush dump` for the raw CRUSH map details. Regular inspection of the hierarchy helps catch misconfigured failure domains before they cause data loss.
