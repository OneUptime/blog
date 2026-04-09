# How to Configure OSD Co-Location Best Practices in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Placement, Best Practice

Description: Learn best practices for co-locating Ceph OSDs with other workloads and OSDs on the same nodes to maximize resource usage without compromising stability.

---

## Understanding OSD Co-Location

OSD co-location refers to running multiple OSD processes on the same node, or running OSDs on nodes that also host other Kubernetes workloads. Both situations require careful resource management to prevent OSD processes from starving each other or competing with application pods. Misconfigured co-location is a common source of performance unpredictability in Rook clusters.

## Multiple OSDs per Node

Running multiple OSDs per node is normal and expected. Each physical disk should have exactly one OSD process. The key rules are:

- Never share a physical disk between two OSDs
- Avoid placing multiple OSDs on the same rotational disk via partitions - this serializes all I/O
- NVMe devices can host multiple OSDs via partitioning due to their internal parallelism

Configure osds-per-device in the `CephCluster` spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    config:
      osdsPerDevice: "1"
    nodes:
    - name: worker-1
      devices:
      - name: nvme0n1
        config:
          osdsPerDevice: "4"
```

## Resource Limits for Co-Located OSDs

Set explicit CPU and memory limits to prevent OSDs from consuming all node resources:

```yaml
spec:
  resources:
    osd:
      requests:
        cpu: "1"
        memory: "2Gi"
      limits:
        cpu: "4"
        memory: "8Gi"
```

## Separating OSD Nodes from Application Nodes

For production clusters, use node labels and node affinity rules to direct OSDs to specific nodes:

```bash
kubectl label node worker-1 node-role.kubernetes.io/storage=osd
kubectl label node worker-2 node-role.kubernetes.io/storage=osd
```

Configure OSD placement in the `CephCluster`:

```yaml
spec:
  placement:
    osd:
      nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
          - matchExpressions:
            - key: node-role.kubernetes.io/storage
              operator: In
              values:
              - osd
```

## Co-Locating OSDs with Application Pods

If you must share nodes, configure resource requests on application pods to prevent OSD starvation:

```yaml
resources:
  requests:
    cpu: "500m"
    memory: "512Mi"
  limits:
    cpu: "2"
    memory: "2Gi"
```

Use Kubernetes priority classes to ensure OSDs are evicted last under memory pressure:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: ceph-osd-priority
value: 1000000
globalDefault: false
```

Then reference it in the `CephCluster` spec so OSD pods actually use it:

```yaml
spec:
  priorityClassNames:
    osd: ceph-osd-priority
```

## Avoid Placing MONs and OSDs on Same Small Nodes

MON and OSD processes both use significant memory and disk I/O. On small nodes (less than 16 GB RAM), co-locating MONs and OSDs causes both to compete for resources. Use separate node groups when possible.

## Summary

OSD co-location best practices focus on isolating disk I/O (one OSD per disk), setting resource limits, and using node affinity to separate storage workloads from application workloads. For clusters where co-location is unavoidable, priority classes and resource requests protect OSD stability. NVMe drives can safely host multiple OSDs via partitioning thanks to their parallel I/O architecture.
