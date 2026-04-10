# How to Understand the CRUSH Algorithm in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, Algorithm, Storage, DataPlacement

Description: Understand how Ceph's CRUSH algorithm deterministically maps objects to OSDs without a central lookup table, enabling scalable distributed storage.

---

## What Is CRUSH

CRUSH (Controlled Replication Under Scalable Hashing) is the algorithm Ceph uses to calculate where to store and retrieve data. Unlike traditional storage systems that maintain a lookup table mapping files to physical locations, CRUSH computes placement deterministically using a hierarchical map of your cluster infrastructure.

This means any client with an up-to-date cluster map can independently calculate exactly which OSDs hold a given object - no metadata server query required.

## How CRUSH Works

The algorithm takes three inputs:
- The object name (hashed to a placement group ID)
- The current CRUSH map (hierarchy of buckets and devices)
- The replication rules (pool rules specifying how many copies and failure domains)

```text
hash(object_name) % num_pgs = PG_ID
CRUSH(PG_ID, crush_map, rule) = [osd.4, osd.11, osd.19]
```

CRUSH traverses the bucket hierarchy from root to leaf (host, rack, zone, etc.) selecting OSDs at each level according to straw2 or other bucket algorithms.

## CRUSH Map Structure

A CRUSH map consists of:
- **Devices**: Individual OSDs with associated weights
- **Buckets**: Groups of devices or other buckets (hosts, racks, rows, rooms)
- **Rules**: Instructions specifying how to select OSDs for placement

View the current CRUSH map in Rook:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- bash
ceph osd crush dump
```

Export and decompile the full CRUSH map:

```bash
ceph osd getcrushmap -o /tmp/crushmap.bin
crushtool -d /tmp/crushmap.bin -o /tmp/crushmap.txt
cat /tmp/crushmap.txt
```

## Sample CRUSH Rule

A typical replicated pool rule looks like:

```text
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

The `chooseleaf` step selects distinct hosts (failure domains), then picks one OSD per host. This ensures replicas land on separate physical machines.

## CRUSH Weights and Rebalancing

OSD weight typically reflects disk size in terabytes. When you add a new OSD, CRUSH automatically begins migrating data to rebalance according to weights.

```bash
# Check OSD weights
ceph osd tree

# Adjust OSD weight manually (e.g., for a smaller disk)
ceph osd crush reweight osd.5 0.5
```

## Failure Domains

CRUSH failure domains are the key to high availability. By setting `chooseleaf type host`, Ceph ensures no two replicas share the same host. You can set this to rack, zone, or any custom bucket type.

In Rook, configure failure domains through pool specs:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
```

## Testing CRUSH Placement

Simulate where an object would be placed without writing data:

```bash
ceph osd map replicapool mytest-object
```

Output example:

```text
osdmap e42 pool 'replicapool' (2) object 'mytest-object' -> pg 2.f8c3e1e (2.1e) -> up ([4,11,19], p4) acting ([4,11,19], p4)
```

This tells you object `mytest-object` maps to PG `2.1e`, stored on OSDs 4, 11, and 19, with OSD 4 as primary.

## Summary

The CRUSH algorithm enables Ceph to distribute data across thousands of OSDs without any central placement metadata service. It uses a hierarchical bucket structure and configurable rules to place replicas across specified failure domains. Understanding CRUSH helps you tune data distribution, plan hardware layout, and diagnose uneven data distribution or unexpected OSD utilization in your Rook-Ceph cluster.
