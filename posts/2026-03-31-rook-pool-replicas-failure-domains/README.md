# How to Configure Pool Replicas Across Failure Domains

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Replication, Failure Domain, CRUSH, Kubernetes

Description: Learn how to configure Ceph pool replicas across different failure domains like hosts, racks, and zones to ensure data survives hardware failures.

---

## Understanding Failure Domains in Ceph

A failure domain defines the boundary at which a hardware failure can take out multiple OSDs simultaneously. Ceph's CRUSH algorithm places replicas across failure domains to ensure data remains available if an entire domain fails. Common failure domains include:

- `osd` - individual disk failure
- `host` - entire node failure
- `rack` - rack power or switch failure
- `zone` - datacenter availability zone failure

## Default Failure Domain Configuration

The default Rook CephBlockPool uses `host` as the failure domain, meaning replicas are spread across different Kubernetes nodes:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicated-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
    requireSafeReplicaSize: true
  failureDomain: host
```

## Configuring Rack-Level Failure Domains

For production deployments, spreading replicas across racks prevents data loss during rack-level failures. First, label your nodes with rack information:

```bash
kubectl label node node1 topology.rook.io/rack=rack-a
kubectl label node node2 topology.rook.io/rack=rack-a
kubectl label node node3 topology.rook.io/rack=rack-b
kubectl label node node4 topology.rook.io/rack=rack-b
kubectl label node node5 topology.rook.io/rack=rack-c
```

Configure Rook to use rack topology:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    useAllNodes: true
    useAllDevices: true
  placement:
    osd:
      nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
          - matchExpressions:
            - key: role
              operator: In
              values:
              - storage-node
```

Then specify the rack failure domain in your pool:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: rack-replicated-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
    requireSafeReplicaSize: true
  failureDomain: rack
```

## Verifying CRUSH Rules

Check the CRUSH rule associated with your pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool ls detail | grep crush

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd crush rule dump
```

## Creating a Custom CRUSH Rule for Zones

For multi-zone deployments with zone-level resilience:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd crush rule create-replicated \
  rule-zone default zone ssd
```

Apply the custom rule to a pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set my-pool crush_rule rule-zone
```

## Checking Replica Placement

Verify replicas are placed correctly across failure domains:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd map my-pool test-object

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump | grep "acting"
```

## Summary

Configuring pool replicas across appropriate failure domains is essential for production Ceph clusters. By matching the failure domain to your hardware topology - whether host, rack, or zone - you ensure that a single hardware failure cannot result in data loss. Always use `requireSafeReplicaSize: true` to prevent Ceph from allowing writes when insufficient failure domains are available to maintain the configured replica count.
