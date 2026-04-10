# How to Configure Ceph for Kubernetes Horizontal Pod Autoscaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, HPA, Autoscaling, Storage, Performance

Description: Configure Rook-Ceph storage to support Kubernetes Horizontal Pod Autoscaling by ensuring ReadWriteMany access modes and shared volumes.

---

## Introduction

Horizontal Pod Autoscaling (HPA) scales the number of pod replicas based on CPU, memory, or custom metrics. When pods scale horizontally, they may need shared access to the same storage volume. Rook-Ceph's CephFS and RBD volumes support different access modes that affect how HPA interacts with storage.

## Understanding Access Modes

- `ReadWriteOnce` (RWO) - Volume can be mounted read/write by a single node (RBD)
- `ReadOnlyMany` (ROX) - Volume can be mounted read-only by many nodes (RBD)
- `ReadWriteMany` (RWX) - Volume can be mounted read/write by many nodes (CephFS)

For HPA workloads that need shared writable storage, use CephFS with `ReadWriteMany`.

## Creating a CephFS StorageClass for RWX

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-cephfs
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: myfs
  pool: myfs-replicated
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
```

## Deploying an HPA-Compatible Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
      - name: webapp
        image: nginx:latest
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        volumeMounts:
        - name: shared-data
          mountPath: /usr/share/nginx/html
      volumes:
      - name: shared-data
        persistentVolumeClaim:
          claimName: webapp-rwx-pvc
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: webapp-rwx-pvc
spec:
  storageClassName: rook-cephfs
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 20Gi
```

## Setting Up HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webapp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Verifying HPA Under Load

Generate load to trigger scaling:

```bash
kubectl run load-generator --image=busybox --restart=Never -- \
  /bin/sh -c "while true; do wget -q -O- http://webapp; done"
```

Watch HPA respond:

```bash
kubectl get hpa webapp-hpa --watch
```

Confirm all replicas can access the shared volume:

```bash
kubectl exec -it webapp-<pod-id> -- ls /usr/share/nginx/html
```

## Summary

Rook-Ceph CephFS volumes with `ReadWriteMany` access mode are ideal for HPA workloads that need shared writable storage across multiple pod replicas. By creating a CephFS StorageClass and using RWX PVCs, scaled pods can all simultaneously access the same data, enabling truly stateful horizontal scaling.
