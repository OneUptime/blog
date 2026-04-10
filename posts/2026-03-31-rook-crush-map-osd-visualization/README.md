# How to View CRUSH Map Visualization for OSDs in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, OSD, Topology

Description: Visualize the Ceph CRUSH map structure showing OSD placement across hosts, racks, and datacenters to verify data distribution policies in Rook clusters.

---

The CRUSH (Controlled Replication Under Scalable Hashing) map defines the physical topology of your Ceph cluster. Understanding the CRUSH map is essential for verifying that failure domains are correctly configured and data is distributed as intended.

## View the OSD Tree

The quickest way to visualize CRUSH topology:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph osd tree
```

Sample output:

```text
ID   CLASS  WEIGHT    TYPE NAME         STATUS  REWEIGHT  PRI-AFF
-1         6.00000   root default
-3         2.00000     host node1
 0    hdd   1.00000       osd.0          up    1.00000   1.00000
 1    hdd   1.00000       osd.1          up    1.00000   1.00000
-5         2.00000     host node2
 2    hdd   1.00000       osd.2          up    1.00000   1.00000
 3    hdd   1.00000       osd.3          up    1.00000   1.00000
-7         2.00000     host node3
 4    hdd   1.00000       osd.4          up    1.00000   1.00000
 5    hdd   1.00000       osd.5          up    1.00000   1.00000
```

## Parse OSD Tree for Specific Information

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd tree --format json | python3 -c "
import json, sys
data = json.load(sys.stdin)
nodes_by_id = {n['id']: n for n in data['nodes']}

for node in data['nodes']:
    if node['type'] == 'host':
        print(f\"Host: {node['name']}\")
        for child_id in node.get('children', []):
            child = nodes_by_id.get(child_id, {})
            if child.get('type') == 'osd':
                cls = child.get('device_class', 'unknown')
                status = child.get('status', 'unknown')
                print(f\"  osd.{child['id']}: {cls}, {status}\")
"
```

## Get the Full CRUSH Map

```bash
# Export binary CRUSH map
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd getcrushmap -o /tmp/crushmap.bin

# Copy out of pod
kubectl cp rook-ceph/$(kubectl get pod -n rook-ceph -l app=rook-ceph-tools -o name | head -1 | sed 's|pod/||'):/tmp/crushmap.bin /tmp/crushmap.bin

# Decompile to text
crushtool -d /tmp/crushmap.bin -o /tmp/crushmap.txt
```

## Verify Failure Domain Coverage

For a 3-replica pool with `failureDomain: host`, verify each OSD's host:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash -c "
  echo '=== Host-to-OSD mapping ==='
  ceph osd tree | grep -E 'host|osd\.'
  echo ''
  echo '=== Failure domain for replicapool ==='
  ceph osd crush rule dump replicated_rule
"
```

## Check CRUSH Rules

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd crush rule ls

kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd crush rule dump
```

Sample rule output:

```json
[
    {
        "rule_id": 0,
        "rule_name": "replicated_rule",
        "type": 1,
        "min_size": 1,
        "max_size": 10,
        "steps": [
            {
                "op": "take",
                "item": -1,
                "item_name": "default"
            },
            {
                "op": "chooseleaf_firstn",
                "num": 0,
                "type": "host"
            },
            {
                "op": "emit"
            }
        ]
    }
]
```

The `chooseleaf_firstn` step with `"type": "host"` means Ceph places each replica on a different host.

## Add Rack-Level Topology

For rack-aware placement:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash -c "
  # Add rack buckets
  ceph osd crush add-bucket rack01 rack
  ceph osd crush add-bucket rack02 rack

  # Move hosts into racks
  ceph osd crush move node1 rack=rack01
  ceph osd crush move node2 rack=rack01
  ceph osd crush move node3 rack=rack02

  # Create rack-level failure domain rule
  ceph osd crush rule create-replicated rack-rule default rack hdd
"
```

## Summary

The CRUSH map visualizes how Ceph places data across the physical topology of your cluster. Use `ceph osd tree` for a quick host-to-OSD view, `ceph osd getcrushmap` for the full binary map, and `ceph osd crush rule dump` to verify that failure domains (host, rack, datacenter) are configured correctly. In Rook, the CRUSH topology is driven by Kubernetes node labels and the `failureDomain` field in `CephBlockPool` or `CephFilesystem` specs.
