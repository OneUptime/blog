# How to Set Priority Class Names for Rook-Ceph Components

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, PriorityClass, Scheduling, Resource

Description: Assign Kubernetes PriorityClass to Rook-Ceph daemon pods so critical storage components are protected from eviction during node resource pressure or cluster autoscaling.

---

## Why Priority Classes Matter for Storage

Kubernetes evicts pods during resource pressure using Priority as a primary sort key. Without explicit priority classes, Ceph daemon pods compete equally with application pods. A memory spike in a tenant workload can evict a Ceph OSD or monitor, causing storage unavailability across the entire cluster.

Assigning high-priority classes to critical Ceph daemons ensures they survive node pressure events that would otherwise cascade into storage outages.

## Creating Priority Classes

Define priority classes before referencing them in Rook:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: rook-critical
value: 1000000
globalDefault: false
description: "Priority class for critical Rook-Ceph daemons (mon, mgr, osd)"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: rook-default
value: 500000
globalDefault: false
description: "Priority class for standard Rook-Ceph daemons (mds, rgw, nfs)"
```

For reference, the built-in `system-cluster-critical` class has a value of `2000000000`. Position your Ceph priorities above application workloads but below system-level critical components.

## Setting priorityClassName in CephCluster

Reference the priority class inside the `priorityClassNames` block for each daemon type:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  priorityClassNames:
    mon: rook-critical
    mgr: rook-critical
    osd: rook-critical
    crashcollector: rook-default
    cleanup: rook-default
```

Rook injects the `priorityClassName` field into each daemon pod spec during reconciliation.

## Using system-cluster-critical

For clusters where storage underpins all other workloads, using the built-in `system-cluster-critical` class is appropriate:

```yaml
priorityClassNames:
  mon: system-cluster-critical
  osd: system-cluster-critical
```

This places Ceph daemons at the same eviction priority as kube-apiserver and coredns, making them nearly impossible to evict under normal resource pressure.

## Priority Classes for CephFilesystem and CephObjectStore

Set priority classes on MDS and RGW components through their own CRDs:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  metadataServer:
    priorityClassName: rook-critical
---
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  gateway:
    priorityClassName: rook-default
```

## Verifying Priority Assignment

Confirm the priority class is applied to running pods:

```bash
kubectl -n rook-ceph get pod -l app=rook-ceph-mon \
  -o custom-columns='NAME:.metadata.name,PRIORITY:.spec.priorityClassName,VALUE:.spec.priority'
```

## Summary

Priority classes are a low-effort, high-impact configuration for Rook-Ceph clusters. By assigning `rook-critical` or `system-cluster-critical` to monitors, managers, and OSDs, you prevent Kubernetes from evicting storage components during resource pressure events, keeping your cluster healthy even when application workloads spike unexpectedly.
