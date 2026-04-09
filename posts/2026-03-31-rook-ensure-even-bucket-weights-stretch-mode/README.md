# How to Ensure Even Bucket Weights in Stretch Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, Stretch Mode, Load Balancing

Description: Learn how to ensure even CRUSH bucket weights across both sites in Ceph stretch mode to avoid unbalanced data distribution and hotspots.

---

## Why Bucket Weight Balance Matters

In Ceph stretch mode, uneven CRUSH bucket weights cause disproportionate data placement on one site. If site A has twice the weight of site B, site A will store more data even though stretch mode requires even distribution. This creates storage hotspots and reduces fault tolerance.

## Checking Current Bucket Weights

View the current OSD tree with weights:

```bash
ceph osd tree
```

Check bucket weights specifically:

```bash
ceph osd df | sort -k3 -n
```

To compare site-level weights:

```bash
ceph osd crush tree --format json | python3 -c "
import sys, json
tree = json.load(sys.stdin)
nodes = tree.get('nodes', [])
for node in nodes:
    if node.get('type') == 'datacenter':
        print(f\"{node['name']}: weight={node.get('crush_weight', node.get('weight', 0))}\")"
```

## Setting OSD Weights Explicitly

Each OSD's CRUSH weight should be proportional to its capacity. For uniform drives, all weights should be equal:

```bash
# Set weight to match drive capacity in TiB (e.g., 2 TiB drive = 2.0)
ceph osd crush reweight osd.0 2.0
ceph osd crush reweight osd.1 2.0
ceph osd crush reweight osd.4 2.0
ceph osd crush reweight osd.5 2.0
```

## Balancing Weights Automatically

Use the `reweight-by-utilization` command to normalize based on actual usage:

```bash
ceph osd reweight-by-utilization
```

For more precise balancing, use the PG balancer:

```bash
ceph balancer on
ceph balancer mode upmap
ceph balancer status
```

Generate and apply a balancing plan:

```bash
ceph balancer optimize myplan
ceph balancer show myplan
ceph balancer execute myplan
```

## Accounting for Drive Size Differences

If sites have different OSD sizes, normalize the total capacity per site. For example, site A has four 4TB drives and site B has eight 2TB drives:

```bash
# Site A: 4 x 4 TiB = 16 TiB total weight
ceph osd crush reweight osd.0 4.0
ceph osd crush reweight osd.1 4.0
ceph osd crush reweight osd.2 4.0
ceph osd crush reweight osd.3 4.0

# Site B: 8 x 2 TiB = 16 TiB total weight (matches site A)
for i in 4 5 6 7 8 9 10 11; do
  ceph osd crush reweight osd.$i 2.0
done
```

## Verifying Balance After Changes

After adjusting weights, monitor the cluster for rebalancing:

```bash
watch ceph pg stat
```

Check the distribution of PGs per OSD and utilization:

```bash
ceph osd df
```

An ideally balanced cluster has similar `%USE` values across all OSDs. You can also use JSON output for scripted checks:

```bash
ceph osd df --format json | python3 -c "
import sys, json
data = json.load(sys.stdin)
for osd in sorted(data['nodes'], key=lambda x: x['utilization']):
    print(f\"osd.{osd['id']}: {osd['utilization']:.2f}%\")"
```

## Preventing Future Imbalance

When adding new OSDs, set the correct CRUSH weight immediately:

```bash
ceph orch daemon add osd host-dc1c:/dev/sdb
ceph osd crush reweight osd.12 2.0
```

## Summary

Even CRUSH bucket weights in stretch mode ensure that data is distributed proportionally across both sites, maintaining the fault tolerance guarantees of the stretch configuration. Regularly checking OSD utilization and using the Ceph balancer module helps prevent drift over time, especially after adding or removing OSDs from one site.
