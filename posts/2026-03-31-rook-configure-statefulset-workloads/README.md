# How to Configure Rook-Ceph for StatefulSet Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, StatefulSet, Kubernetes, Persistent Volume, Storage

Description: Learn how to configure Rook-Ceph storage to optimally support Kubernetes StatefulSet workloads, including volumeClaimTemplates, pod affinity, and storage class design.

---

StatefulSets are the standard Kubernetes primitive for deploying stateful applications like databases, message queues, and distributed systems. Rook-Ceph integrates naturally with StatefulSets through its CSI driver, providing persistent, reliable storage for each pod replica.

## Why StatefulSets Need Special Storage Consideration

Unlike Deployments, StatefulSets:
- Give each pod a stable, unique identifier
- Create persistent volumes per replica via `volumeClaimTemplates`
- Ensure ordered, graceful pod deployment and deletion
- Maintain stable network identities across restarts

Each pod in a StatefulSet needs its own dedicated PVC that survives pod rescheduling.

## Configuring StorageClass for StatefulSets

Use `volumeBindingMode: WaitForFirstConsumer` to ensure PVCs are provisioned on the same node as their pods:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-stateful
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

## StatefulSet with VolumeClaimTemplates

Define per-replica storage directly in the StatefulSet:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mydb
  namespace: databases
spec:
  serviceName: mydb
  replicas: 3
  selector:
    matchLabels:
      app: mydb
  template:
    metadata:
      labels:
        app: mydb
    spec:
      containers:
        - name: db
          image: mysql:8.0
          volumeMounts:
            - name: data
              mountPath: /var/lib/mysql
            - name: logs
              mountPath: /var/log/mysql
  volumeClaimTemplates:
    - metadata:
        name: data
        labels:
          app: mydb
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: rook-ceph-stateful
        resources:
          requests:
            storage: 50Gi
    - metadata:
        name: logs
        labels:
          app: mydb
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: rook-ceph-stateful
        resources:
          requests:
            storage: 10Gi
```

## Pod Disruption Budgets for Safe Operations

Protect StatefulSet pods during cluster upgrades and maintenance:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: mydb-pdb
  namespace: databases
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: mydb
```

## Spreading Replicas Across Nodes

Use `topologySpreadConstraints` to distribute StatefulSet pods across failure domains:

```yaml
spec:
  template:
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: mydb
```

## Cleaning Up StatefulSet PVCs

When a StatefulSet is deleted, PVCs are not automatically removed (by design). Clean them up explicitly:

```bash
# List PVCs for a StatefulSet
kubectl -n databases get pvc -l app=mydb

# Delete all PVCs after backing up data
kubectl -n databases delete pvc -l app=mydb
```

## Summary

Rook-Ceph works seamlessly with Kubernetes StatefulSets via CSI-provisioned PVCs created from `volumeClaimTemplates`. Using `WaitForFirstConsumer` binding mode, `reclaimPolicy: Retain`, and topology spread constraints ensures each replica gets local-affinity storage that survives pod rescheduling without data loss. PodDisruptionBudgets protect StatefulSets during Rook or Kubernetes upgrades.
