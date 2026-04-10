# How to Configure RBD for High-Availability Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, High Availability, Kubernetes

Description: Configure Ceph RBD in Rook for high-availability applications by enabling mirroring, configuring pool replication, and using Kubernetes storage policies for fast failover.

---

## High Availability with RBD

High availability for RBD block storage means: the data remains accessible when OSDs fail, when nodes go down, and when pods are rescheduled. Ceph's replication provides baseline HA. RBD mirroring adds cross-cluster failover for disaster recovery scenarios.

## Pool Replication Settings

Ensure the pool uses at least 3 replicas with a safe minimum of 2:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ha-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
    requireSafeReplicaSize: true
  parameters:
    min_size: "2"
```

The `min_size=2` means Ceph will continue serving I/O with 2 replicas during OSD failures, preventing application downtime while the third replica recovers.

## OSD Failure Domain

Configure the CRUSH rule to spread replicas across failure domains (hosts or racks):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd crush rule create-replicated ha-rule default host
```

Apply to the pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set ha-pool crush_rule ha-rule
```

## Kubernetes Pod Disruption Budget

Protect pods using HA storage from simultaneous eviction:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: db-pdb
  namespace: default
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: postgresql
```

## Fast Failover with Topology Constraints

Use topology-aware scheduling to keep PVC-using pods near their storage:

```yaml
spec:
  topologySpreadConstraints:
    - maxSkew: 1
      topologyKey: kubernetes.io/hostname
      whenUnsatisfiable: DoNotSchedule
      labelSelector:
        matchLabels:
          app: postgresql
```

## RBD Mirroring for Cross-Cluster HA

For disaster recovery, set up RBD mirroring between two Ceph clusters:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephRBDMirror
metadata:
  name: my-rbd-mirror
  namespace: rook-ceph
spec:
  count: 1
  resources:
    requests:
      cpu: "1"
      memory: "1Gi"
```

Enable mirroring on the pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd mirror pool enable ha-pool image

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd mirror image enable ha-pool/my-vol snapshot
```

## Peer Cluster Configuration

Exchange bootstrap tokens between clusters:

```bash
# On primary cluster
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd mirror pool peer bootstrap create \
    --site-name primary ha-pool > /tmp/bootstrap-token

# On secondary cluster
kubectl -n rook-ceph exec -i deploy/rook-ceph-tools -- \
  rbd mirror pool peer bootstrap import \
    --site-name secondary ha-pool - < /tmp/bootstrap-token
```

## Monitoring HA Status

Check mirror synchronization status:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd mirror pool status ha-pool

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd mirror image status ha-pool/my-vol
```

## Summary

RBD high availability combines Ceph pool replication (3 replicas minimum) with proper failure domain configuration to survive individual OSD and host failures. For cross-datacenter failover, RBD mirroring replicates images to a secondary cluster asynchronously. Kubernetes PDB and topology constraints prevent accidental simultaneous disruption of HA application pods.
