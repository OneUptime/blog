# How to Move OSDs in the CRUSH Hierarchy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, OSD, Storage

Description: Learn how to safely move OSDs to different positions in the Ceph CRUSH hierarchy to reflect physical infrastructure changes or correct misplaced entries.

---

## When to Move OSDs in CRUSH

You need to move OSDs in the CRUSH hierarchy when:
- Physical hardware is relocated to a different rack or datacenter
- You reorganize the topology after cluster expansion
- An OSD was placed in the wrong bucket during initial deployment
- You are migrating to a deeper hierarchy (adding rack or datacenter levels)

Moving an OSD in CRUSH changes which failure domain it belongs to, which triggers data rebalancing to maintain the configured replication policy.

## Viewing Current OSD Placement

```bash
# See the full CRUSH hierarchy
ceph osd tree

# Find where a specific OSD is located
ceph osd find 3

# Check the parent bucket of an OSD
ceph osd crush dump | python3 -m json.tool | grep -B5 '"name": "osd.3"'
```

## Moving an OSD to a Different Host

Use `ceph osd crush set` to change the location of an OSD:

```bash
# Move osd.3 to a different host while preserving its weight
ceph osd crush set osd.3 1.0 root=default rack=rack2 host=node-04

# The weight (1.0) should match the actual drive size in TB
ceph osd tree | grep osd.3
```

## Using osd crush move

An alternative is `ceph osd crush move`, which moves an OSD by changing its parent bucket:

```bash
# Move an OSD to a new host
ceph osd crush move osd.3 host=node-04

# Move a host bucket to a different rack
ceph osd crush move node-04 rack=rack2

# Move a rack to a different datacenter
ceph osd crush move rack2 datacenter=dc2
```

Note: `crush move` only changes the parent; it does not change the weight.

## Moving an OSD Without Triggering Immediate Rebalancing

For large moves that would trigger excessive rebalancing, temporarily freeze movement:

```bash
# Set norebalance to prevent data migration during the move
ceph osd set norebalance

# Move the OSD in CRUSH
ceph osd crush move osd.3 host=node-04

# Verify the new position
ceph osd tree | grep osd.3

# Unset norebalance to allow migration to begin
ceph osd unset norebalance

# Monitor rebalancing
watch -n 5 ceph -s
```

## Bulk Moving Multiple OSDs

Script to move multiple OSDs to a new host:

```bash
#!/bin/bash
NEW_HOST="node-05"
NEW_RACK="rack3"

# Move OSDs 10 through 14 to node-05 in rack3
for osd in 10 11 12 13 14; do
  WEIGHT=$(ceph osd tree -f json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for node in data['nodes']:
    if node.get('name') == 'osd.$osd':
        print(node['crush_weight'])
        break
")
  ceph osd crush set osd.$osd $WEIGHT root=default rack=$NEW_RACK host=$NEW_HOST
  echo "Moved osd.$osd to $NEW_HOST"
done

ceph osd tree
```

## Verifying the Move is Correct

```bash
# Check that replicas are now spread across expected failure domains
ceph osd map mypool testobject

# Verify PGs are properly distributed after the move
ceph pg stat

# Check cluster health
ceph health detail
```

## Summary

Moving OSDs in the CRUSH hierarchy is done with `ceph osd crush set` (which also updates weight) or `ceph osd crush move` (parent change only). For large moves, use `norebalance` to batch the changes before allowing migration. Always verify the resulting CRUSH tree with `ceph osd tree` to confirm OSDs are in the correct failure domain positions before releasing the norebalance flag.
