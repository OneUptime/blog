# How to Fix MON_COLOCATED Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Monitor, Topology, High Availability

Description: Learn how to resolve the MON_COLOCATED health warning in Ceph by redistributing monitors across distinct physical nodes to improve fault tolerance.

---

## Understanding MON_COLOCATED

`MON_COLOCATED` fires when multiple Ceph monitors are running on the same physical host. Ceph monitors form a quorum and losing one host should not break quorum. If two or more monitors run on the same node, a single host failure can take down multiple monitors simultaneously and potentially lose quorum.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN 2 monitors are colocated on the same host
[WRN] MON_COLOCATED: mon.a and mon.b are colocated on node1
```

## Identifying Monitor Placement

Check which hosts are running monitors:

```bash
ceph mon dump
```

In Kubernetes:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-mon -o wide
```

The `NODE` column shows which nodes each monitor pod is scheduled on. If two monitors share a node, you have the colocated condition.

## Fixing in Rook-Ceph

Rook allows you to specify anti-affinity rules for monitors. Edit the CephCluster resource:

```bash
kubectl -n rook-ceph edit cephcluster rook-ceph
```

Add pod anti-affinity rules under `placement.mon`:

```yaml
spec:
  mon:
    count: 3
    allowMultiplePerNode: false
  placement:
    mon:
      podAntiAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app: rook-ceph-mon
          topologyKey: kubernetes.io/hostname
```

The `allowMultiplePerNode: false` setting prevents Rook from scheduling multiple monitors on the same node. The `requiredDuringScheduling` anti-affinity rule enforces this at the Kubernetes scheduler level.

After applying, delete the colocated monitor pod to force rescheduling:

```bash
kubectl -n rook-ceph delete pod <colocated-mon-pod>
```

Verify new placement:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-mon -o wide
```

## Fixing on Bare Metal

On bare metal, move one of the colocated monitors to a different host:

```bash
# Remove the monitor to be moved
ceph mon rm b

# Retrieve the current monmap and monitor keyring from an existing monitor
ceph mon getmap -o /tmp/monmap
ceph auth get mon. -o /tmp/ceph.mon.keyring

# Copy both files to the new host, then on the new host initialize and start the monitor
sudo -u ceph ceph-mon --mkfs -i b --monmap /tmp/monmap --keyring /tmp/ceph.mon.keyring
sudo systemctl enable ceph-mon@b
sudo systemctl start ceph-mon@b
```

## Ensuring Sufficient Nodes

For a 3-monitor quorum, you need at least 3 nodes. Check node count:

```bash
kubectl get nodes
```

If you have fewer than 3 nodes, you cannot fix this warning without adding more nodes to the cluster. Consider adding a node or reducing monitor count to 1 (not recommended for production).

## Verifying the Fix

After redistributing monitors:

```bash
ceph mon dump
ceph health detail
```

The `MON_COLOCATED` warning should be gone, and each monitor should be on a unique host.

## Summary

`MON_COLOCATED` warns that multiple monitors share the same physical host, creating a single point of failure. In Rook, set `allowMultiplePerNode: false` and add pod anti-affinity rules with `topologyKey: kubernetes.io/hostname` to enforce monitor spread across distinct nodes. On bare metal, manually move the colocated monitor to a separate host. Always run monitors on separate physical nodes for true high availability.
