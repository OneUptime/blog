# How to Configure Node Affinity and Tolerations for Rook-Ceph Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Node Affinity, Toleration, Kubernetes Scheduling

Description: Learn how to configure node affinity, tolerations, and topology spread constraints for Rook-Ceph pods to control where storage daemons are scheduled.

---

## Why Control Ceph Pod Placement

Controlling where Rook-Ceph pods are scheduled is important for:
- **Isolation**: Keep storage daemons on dedicated storage nodes
- **HA**: Ensure monitors and OSDs spread across failure domains
- **Performance**: Place Ceph daemons on nodes with direct disk access
- **Compliance**: Keep storage workloads on specific hardware tiers

## Placement Configuration Structure

Placement is configured per daemon type in the `CephCluster` spec:

```yaml
spec:
  placement:
    all:           # Applies to all Ceph daemons
      ...
    mon:           # Monitor-specific placement
      ...
    osd:           # OSD-specific placement
      ...
    mgr:           # Manager-specific placement
      ...
    mds:           # Metadata server placement (CephFS)
      ...
    rgw:           # RADOS Gateway placement (Object Store)
      ...
```

Settings in `all` are merged with (and overridden by) daemon-specific settings.

## Node Selector

The simplest form of placement - require nodes to have a specific label:

```bash
# Label dedicated storage nodes
kubectl label node storage-1 node-role=storage
kubectl label node storage-2 node-role=storage
kubectl label node storage-3 node-role=storage
```

```yaml
spec:
  placement:
    all:
      nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
            - matchExpressions:
                - key: node-role
                  operator: In
                  values:
                    - storage
```

## Tolerations for Tainted Nodes

Taints prevent non-storage pods from landing on storage nodes. Tolerations allow Rook-Ceph pods to override these taints:

```bash
# Taint dedicated storage nodes
kubectl taint node storage-1 dedicated=storage:NoSchedule
kubectl taint node storage-2 dedicated=storage:NoSchedule
kubectl taint node storage-3 dedicated=storage:NoSchedule
```

```yaml
spec:
  placement:
    all:
      tolerations:
        - key: dedicated
          operator: Equal
          value: storage
          effect: NoSchedule
```

Combined affinity and tolerations:

```yaml
spec:
  placement:
    all:
      nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
            - matchExpressions:
                - key: dedicated
                  operator: In
                  values:
                    - ceph-storage
      tolerations:
        - key: dedicated
          operator: Equal
          value: ceph-storage
          effect: NoSchedule
        - key: dedicated
          operator: Equal
          value: ceph-storage
          effect: NoExecute
```

## Monitor-Specific Placement for HA

Monitors require quorum and should be spread across failure domains (different nodes, racks, or zones):

```yaml
spec:
  placement:
    mon:
      podAntiAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
                - key: app
                  operator: In
                  values:
                    - rook-ceph-mon
            topologyKey: kubernetes.io/hostname
        # Also prefer different zones:
        preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchExpressions:
                - key: app
                  operator: In
                  values:
                    - rook-ceph-mon
            topologyKey: topology.kubernetes.io/zone
```

This ensures each monitor runs on a different node (required) and prefers different availability zones (preferred).

## OSD Topology Spread

For OSDs, use topology spread constraints to distribute evenly:

```yaml
spec:
  placement:
    osd:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: rook-ceph-osd
```

This ensures OSDs are spread as evenly as possible across nodes.

## Zone-Aware Placement for Multi-Zone Clusters

For clusters spanning multiple availability zones:

```yaml
spec:
  placement:
    all:
      nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
            - matchExpressions:
                - key: topology.kubernetes.io/zone
                  operator: In
                  values:
                    - us-east-1a
                    - us-east-1b
                    - us-east-1c
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              rook_cluster: rook-ceph
```

## Verifying Pod Placement

```bash
# Check which nodes Ceph pods landed on
kubectl -n rook-ceph get pods -o wide | grep -E "mon|osd|mgr"

# Verify pod anti-affinity is working (monitors on different nodes)
kubectl -n rook-ceph get pods -l app=rook-ceph-mon -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName

# Check if any pods are in Pending state due to scheduling constraints
kubectl -n rook-ceph get pods | grep Pending
kubectl -n rook-ceph describe pod <pending-pod> | grep -A10 Events
```

## Common Scheduling Issues

```bash
# Issue: "0/3 nodes are available: 3 node(s) didn't match node affinity"
# Fix: Verify node labels
kubectl get nodes --show-labels | grep storage

# Issue: "0/3 nodes are available: 3 node(s) had untolerated taints"
# Fix: Verify tolerations match node taints
kubectl describe node storage-1 | grep Taint

# Issue: Pod spread constraint cannot be satisfied
# Adjust maxSkew or change to whenUnsatisfiable: ScheduleAnyway
```

## Summary

Rook-Ceph pod placement is configured per daemon type under `spec.placement` in the `CephCluster` CRD. Use `nodeAffinity` with `requiredDuringScheduling` to restrict Ceph daemons to dedicated storage nodes, and add `tolerations` to allow pods on tainted nodes. Configure `podAntiAffinity` on monitors to ensure they run on different nodes for quorum safety. Use `topologySpreadConstraints` to distribute OSDs evenly across failure domains. Always verify placement with `kubectl get pods -o wide` after deployment.
