# How to Design a Highly Available Ceph Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, High Availability, Architecture, Kubernetes, Storage

Description: Learn the architectural principles and Rook configuration required to design a highly available Ceph cluster that survives node, rack, and network failures.

---

## Overview

High availability in Ceph means the cluster continues serving reads and writes even when components fail. Ceph achieves this through redundant monitors for cluster state, replicated or erasure-coded data across OSDs, multiple manager daemons, and (for file storage) active-standby MDS instances. Designing for HA requires thinking about failure domains at every level.

## HA Design Principles

1. **Three or more nodes** - minimum for quorum-based monitor consensus
2. **Replication factor >= 3** - tolerate single OSD or node failure
3. **Failure domain = host or rack** - prevent data loss from node/rack failure
4. **Redundant networks** - separate public and cluster networks
5. **Multiple monitors** - always an odd number (3, 5, 7)
6. **Multiple managers** - active + standby

## Failure Domain Configuration

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ha-pool
  namespace: rook-ceph
spec:
  failureDomain: host    # "host" prevents data loss on single node failure
  replicated:
    size: 3              # 3 copies of each data object
    requireSafeReplicaSize: true  # Enforce safe min_size; refuse writes if < 2 replicas available
```

For rack-level resilience:

```yaml
spec:
  failureDomain: rack
  replicated:
    size: 3
```

Label nodes with rack topology:

```bash
kubectl label node node1 topology.rook.io/rack=rack-a
kubectl label node node2 topology.rook.io/rack=rack-a
kubectl label node node3 topology.rook.io/rack=rack-b
kubectl label node node4 topology.rook.io/rack=rack-b
kubectl label node node5 topology.rook.io/rack=rack-c
kubectl label node node6 topology.rook.io/rack=rack-c
```

## Monitor HA Configuration

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  mon:
    count: 5                      # 5 mons: tolerates 2 simultaneous failures
    allowMultiplePerNode: false   # Never put 2 mons on the same node
  mgr:
    count: 2                      # Active + standby manager
    allowMultiplePerNode: false
  placement:
    mon:
      podAntiAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchExpressions:
            - key: app
              operator: In
              values: [rook-ceph-mon]
          topologyKey: kubernetes.io/hostname
```

## Network Redundancy

```yaml
spec:
  network:
    provider: host    # Pods share the host network; bonded NICs configured at the OS level
```

Configure network bonding on each node:

```bash
# Create bond interface (run on each Kubernetes node)
nmcli connection add type bond ifname bond0 mode active-backup
nmcli connection add type ethernet ifname eth0 master bond0
nmcli connection add type ethernet ifname eth1 master bond0
```

## OSD Anti-Affinity

Prevent all OSDs from landing on a single node:

```yaml
spec:
  placement:
    osd:
      podAntiAffinity:
        preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values: [rook-ceph-osd]
            topologyKey: kubernetes.io/hostname
```

## PodDisruptionBudgets

Prevent Kubernetes from evicting too many storage pods at once:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: rook-ceph-mon-pdb
  namespace: rook-ceph
spec:
  minAvailable: 3
  selector:
    matchLabels:
      app: rook-ceph-mon
```

## Validating HA

```bash
# Simulate node failure: cordon and drain
kubectl cordon node1
kubectl drain node1 --ignore-daemonsets --delete-emptydir-data

# Watch cluster health
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph -w

# Verify cluster is HEALTH_OK or HEALTH_WARN (not ERR)
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health detail
```

## Summary

A highly available Ceph cluster requires redundancy at every layer: 5 monitors for quorum resilience, 2 managers for active-standby failover, 3x replication with host-level failure domains, bonded NICs for network redundancy, and PodDisruptionBudgets to prevent simultaneous evictions. Design your failure domain to match your largest expected failure unit (host for most clusters, rack for larger deployments) and validate HA by draining nodes and confirming cluster health throughout.
