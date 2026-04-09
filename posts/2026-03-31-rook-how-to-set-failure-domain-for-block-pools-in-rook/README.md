# How to Set Failure Domain for Block Pools in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Failure Domain, Block Pools, High Availability, CRUSH

Description: Learn how to configure the failure domain for Ceph block pools in Rook to ensure data replicas are placed across separate nodes or racks for resilience.

---

## What Is a Failure Domain?

A failure domain defines the boundary within which Ceph places replicas of data. If the failure domain is `host`, Ceph ensures that each replica of a data object is stored on a different host (node). If the failure domain is `rack`, each replica goes to a different rack.

Setting the correct failure domain is critical for high availability - if all replicas were on the same host and that host failed, data would be lost.

## Failure Domain Options

Ceph supports the following failure domain levels (from smallest to largest):

| Failure Domain | Description |
|----------------|-------------|
| `osd` | Each replica on a different OSD (same node allowed) |
| `host` | Each replica on a different Kubernetes node |
| `rack` | Each replica on a different rack (requires rack labels) |
| `zone` | Each replica in a different availability zone |
| `region` | Each replica in a different region |

The default and most common setting for Kubernetes deployments is `host`.

## Configuring Failure Domain in CephBlockPool

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
    requireSafeReplicaSize: true
```

With `failureDomain: host` and `size: 3`, Ceph places one replica on each of 3 different Kubernetes nodes.

`requireSafeReplicaSize: true` prevents the pool from accepting writes unless the minimum number of OSDs to satisfy the failure domain policy are healthy.

## Using Zone as Failure Domain

For multi-zone Kubernetes clusters, use `zone` as the failure domain:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: zone-replicated-pool
  namespace: rook-ceph
spec:
  failureDomain: zone
  replicated:
    size: 3
```

This requires that your nodes are labeled with `topology.kubernetes.io/zone`. Ceph reads these labels through the CRUSH map to determine zone topology.

## Labeling Nodes for Zone Topology

```bash
# Label nodes with their zone
kubectl label node node-1 topology.kubernetes.io/zone=us-east-1a
kubectl label node node-2 topology.kubernetes.io/zone=us-east-1b
kubectl label node node-3 topology.kubernetes.io/zone=us-east-1c

# Rook picks up these labels when building the CRUSH map
```

## Rack-Level Failure Domains

For bare metal deployments in data centers with multiple racks:

```bash
# Label nodes with their rack
kubectl label node node-1 topology.rook.io/rack=rack-a
kubectl label node node-2 topology.rook.io/rack=rack-a
kubectl label node node-3 topology.rook.io/rack=rack-b
kubectl label node node-4 topology.rook.io/rack=rack-b
kubectl label node node-5 topology.rook.io/rack=rack-c
kubectl label node node-6 topology.rook.io/rack=rack-c
```

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: rack-replicated-pool
  namespace: rook-ceph
spec:
  failureDomain: rack
  replicated:
    size: 3
```

With this configuration, Ceph places one replica per rack, so losing an entire rack does not cause data loss.

## Verifying Failure Domain in the CRUSH Map

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

# View the current CRUSH map rules
ceph osd crush rule dump

# Show the OSD tree with host/zone topology
ceph osd tree
```

Example CRUSH tree with hosts:

```text
ID CLASS WEIGHT  TYPE NAME      STATUS REWEIGHT PRI-AFF
-1       3.00000 root default
-3       1.00000     host node-1
 0   hdd 1.00000         osd.0      up  1.00000 1.00000
-5       1.00000     host node-2
 1   hdd 1.00000         osd.1      up  1.00000 1.00000
-7       1.00000     host node-3
 2   hdd 1.00000         osd.2      up  1.00000 1.00000
```

## Creating a Pool and Verifying Replica Placement

```bash
# Create the pool
kubectl apply -f blockpool.yaml

# Check the pool's CRUSH rule
ceph osd pool get replicapool crush_rule

# Inspect the rule details
ceph osd crush rule dump replicated_rule
```

## Minimum Number of Hosts Required

The number of available failure domain units must be at least equal to the pool's replication size. For a 3-replica pool with `failureDomain: host`, you need at least 3 different nodes with OSDs.

```bash
# Check how many unique hosts have OSDs
ceph osd tree | grep host | wc -l
```

If you have fewer hosts than the replication size, the pool will be in a degraded state.

## Summary

The `failureDomain` field in the Rook `CephBlockPool` CRD controls how Ceph distributes replicas for resilience. Use `host` for standard Kubernetes deployments to ensure replicas span different nodes, `rack` for data center deployments with distinct physical racks, and `zone` for multi-AZ cloud deployments. Label your nodes with topology information, verify the CRUSH tree structure after deployment, and ensure the number of available failure domain units meets or exceeds the pool's replication factor.
