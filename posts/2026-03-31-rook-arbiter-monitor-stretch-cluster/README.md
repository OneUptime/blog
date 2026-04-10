# How to Configure an Arbiter Monitor for Rook Stretch Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Monitor, Arbiter, StretchCluster

Description: Configure the arbiter monitor in a Rook-Ceph stretch cluster to serve as the quorum tiebreaker between two datacenters, preventing split-brain during network partitions.

---

## The Role of the Arbiter Monitor

In a two-datacenter stretch cluster, if the inter-site link fails, each site has 2 of 5 monitors - neither side has a quorum majority. Without resolution, both sites would become read-only simultaneously.

The arbiter monitor lives in a third, independent location (cloud instance, colocation facility, or separate network segment). When the link fails, the site that can reach the arbiter achieves a 3-of-5 quorum and remains writable. The other site with only 2 monitors stops accepting writes.

## Sizing and Placing the Arbiter Node

The arbiter monitor has minimal resource requirements:

```text
CPU: 0.5 cores minimum, 1 core recommended
RAM: 2 GiB minimum
Storage: 10 GiB for monitor data
Network: Must reach both datacenters with reasonable latency
```

Label the arbiter node distinctly:

```bash
kubectl label node arbiter-node topology.kubernetes.io/zone=arbiter-site
kubectl taint node arbiter-node node-role=arbiter:NoSchedule
```

The taint prevents non-arbiter workloads from landing on the arbiter node.

## CephCluster Configuration for the Arbiter

Mark the zone as an arbiter in the stretch cluster configuration:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  mon:
    count: 5
    allowMultiplePerNode: false
    stretchCluster:
      failureDomainLabel: topology.kubernetes.io/zone
      subFailureDomain: host
      zones:
        - name: datacenter-a
          arbiter: false
        - name: datacenter-b
          arbiter: false
        - name: arbiter-site
          arbiter: true
  placement:
    mon:
      nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
            - matchExpressions:
                - key: topology.kubernetes.io/zone
                  operator: In
                  values:
                    - datacenter-a
                    - datacenter-b
                    - arbiter-site
```

## Tolerations for the Arbiter Monitor

Since the arbiter node is tainted, the arbiter monitor pod needs a matching toleration. Configure this in the placement section:

```yaml
spec:
  placement:
    arbiter:
      tolerations:
        - key: node-role
          operator: Equal
          value: arbiter
          effect: NoSchedule
      nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
            - matchExpressions:
                - key: topology.kubernetes.io/zone
                  operator: In
                  values:
                    - arbiter-site
```

## Verifying Arbiter Monitor Status

Check which monitor is the arbiter and confirm it is in quorum:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon dump
```

Look for the arbiter designation in the output:

```text
0: [v2:10.0.3.1:3300/0,v1:10.0.3.1:6789/0] mon.arbiter (rank 4)
```

Monitor quorum status shows all five monitors:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph quorum_status
```

## Testing Arbiter Failover

To validate the arbiter works correctly, simulate a datacenter failure by cordoning and draining all nodes in one site:

```bash
kubectl cordon dc2-node-1 dc2-node-2
kubectl drain dc2-node-1 --ignore-daemonsets --delete-emptydir-data
kubectl drain dc2-node-2 --ignore-daemonsets --delete-emptydir-data
```

The cluster should remain accessible from datacenter-a because it retains quorum through the arbiter. Check health:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

## Summary

The arbiter monitor is the cornerstone of a Rook-Ceph stretch cluster. A lightweight node in a third location enables quorum resolution during datacenter network partitions. Proper node labeling, taint tolerations, and placement affinity rules ensure the arbiter pod lands exactly where you intend it, making stretch cluster failover automatic and reliable.
