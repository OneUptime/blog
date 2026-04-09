# How to Deploy a Rook-Ceph Stretch Cluster Across Two Datacenters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, StretchCluster, HighAvailability, Datacenter

Description: Deploy a Rook-Ceph stretch cluster spanning two datacenters with a tiebreaker monitor in a third site to survive complete datacenter failures without losing data.

---

## What is a Stretch Cluster

A Ceph stretch cluster distributes OSDs and monitors across two physical datacenters (data sites) with a third site hosting a tiebreaker (arbiter) monitor. The design guarantees:

- Data survives a complete loss of one datacenter
- Monitor quorum is maintained through the arbiter when one site goes down
- No split-brain where both sites think they are the primary

## Prerequisites

Before deploying a stretch cluster:
1. Two Kubernetes worker node groups in separate datacenters with low-latency replication (RTT < 10ms recommended)
2. One additional node in a third site or cloud for the arbiter monitor
3. Nodes labeled with their datacenter/zone topology
4. Rook operator version 1.7 or later (stretch cluster support became stable in v1.7)

## Labeling Nodes

Label datacenter nodes:

```bash
# Site A
kubectl label node dc1-node-1 topology.kubernetes.io/zone=datacenter-a
kubectl label node dc1-node-2 topology.kubernetes.io/zone=datacenter-a

# Site B
kubectl label node dc2-node-1 topology.kubernetes.io/zone=datacenter-b
kubectl label node dc2-node-2 topology.kubernetes.io/zone=datacenter-b

# Arbiter site
kubectl label node arbiter-node topology.kubernetes.io/zone=arbiter
```

## CephCluster Configuration for Stretch Mode

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
        - name: arbiter
          arbiter: true
  storage:
    useAllNodes: false
    nodes:
      - name: "dc1-node-1"
        config:
          crushLocation: "zone=datacenter-a"
      - name: "dc1-node-2"
        config:
          crushLocation: "zone=datacenter-a"
      - name: "dc2-node-1"
        config:
          crushLocation: "zone=datacenter-b"
      - name: "dc2-node-2"
        config:
          crushLocation: "zone=datacenter-b"
```

The arbiter zone gets only a monitor - no OSDs.

## Understanding the Monitor Distribution

With `mon.count: 5` and three zones, Rook distributes monitors as:
- 2 monitors in datacenter-a
- 2 monitors in datacenter-b
- 1 monitor (arbiter) in the third site

This gives 5 monitors total with the arbiter serving as the quorum tiebreaker.

## Creating Stretch-Aware Pools

Stretch clusters require pools with a two-site replication rule:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash
```

```bash
ceph osd crush rule create-replicated stretch-rule default zone
ceph osd pool create stretch-pool 32 replicated stretch-rule
ceph osd pool set stretch-pool size 4
ceph osd pool set stretch-pool min_size 2
```

With `size: 4`, two replicas go to each datacenter. When stretch mode is active and one datacenter fails, Ceph automatically reduces `min_size` to 1 on the surviving site, allowing writes to continue until the failed site recovers.

## Verifying Stretch Cluster Health

Check the stretch mode status:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon dump | grep stretch
```

Verify monitor quorum spans both sites:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph quorum_status --format json-pretty | jq '.quorum_names'
```

## Summary

Deploying a Rook-Ceph stretch cluster requires careful node labeling, the correct `stretchCluster` configuration in the `CephCluster` CRD, and stretch-aware pool replication rules. The arbiter monitor in a third site is the key architectural element that prevents split-brain and maintains quorum when an entire datacenter goes offline.
