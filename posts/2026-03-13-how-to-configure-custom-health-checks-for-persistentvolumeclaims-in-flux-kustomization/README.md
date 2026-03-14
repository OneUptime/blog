# Custom Health Checks for PersistentVolumeClaims in Flux Kustomization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, GitOps, Kubernetes, Health Check, PersistentVolumeClaims, Storage, Kustomization

Description: Learn how to configure custom health checks for PersistentVolumeClaim resources in Flux Kustomization to ensure storage is provisioned before workloads start.

---

## Introduction

PersistentVolumeClaims (PVCs) request storage from the cluster. If a PVC remains in a Pending state because no suitable PersistentVolume is available or the storage class cannot provision one, any pod mounting that PVC will be stuck waiting. Flux Kustomization health checks for PVCs let you detect storage provisioning failures early and prevent dependent workloads from deploying until storage is ready.

## Prerequisites

- A Kubernetes cluster running version 1.25 or later
- Flux v2.3 or later installed on the cluster
- A StorageClass configured in the cluster (or a CSI driver)
- kubectl configured to access the cluster
- A Git repository connected to Flux via a GitRepository source

## How Flux Checks PVC Health

Flux considers a PVC healthy when its status phase is `Bound`. A PVC in `Pending` state means storage has not yet been provisioned or matched. Flux waits for the PVC to transition to `Bound` or reports a failure when the timeout expires.

For PVCs using `WaitForFirstConsumer` volume binding mode, the PVC remains in `Pending` until a pod that uses it is scheduled. This has implications for health check ordering that we will cover below.

## Basic PVC Health Check

Configure a health check for a PVC:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: database-storage
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/storage
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 5m
  healthChecks:
    - apiVersion: v1
      kind: PersistentVolumeClaim
      name: postgres-data
      namespace: database
```

The corresponding PVC:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  namespace: database
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: gp3
  resources:
    requests:
      storage: 100Gi
```

## Health Checking Multiple PVCs

When your application requires multiple storage volumes:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-storage
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/app-storage
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 10m
  healthChecks:
    - apiVersion: v1
      kind: PersistentVolumeClaim
      name: app-data
      namespace: production
    - apiVersion: v1
      kind: PersistentVolumeClaim
      name: app-uploads
      namespace: production
    - apiVersion: v1
      kind: PersistentVolumeClaim
      name: app-cache
      namespace: production
```

## Handling WaitForFirstConsumer Binding Mode

Many StorageClasses use `volumeBindingMode: WaitForFirstConsumer`, which delays PVC binding until a pod that uses the PVC is scheduled. This creates a chicken-and-egg problem for health checks: the PVC will not become `Bound` until a pod mounts it.

In this case, deploy the PVC and the pod together in the same Kustomization:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: database
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/database
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 10m
```

With `wait: true`, Flux checks all resources including the PVC and the Deployment or StatefulSet. The pod scheduling triggers PVC binding, and Flux waits for both to become healthy.

Alternatively, if you use `Immediate` binding mode, PVCs bind as soon as they are created, and you can health check them independently:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: ebs.csi.aws.com
volumeBindingMode: Immediate
parameters:
  type: io2
  iopsPerGB: "50"
```

## PVC Health Checks with Storage Dependencies

Ensure the CSI driver or storage infrastructure is ready before PVCs are created:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: csi-driver
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/csi
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 10m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: storage-classes
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/storage-classes
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: csi-driver
  wait: true
  timeout: 2m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: database
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/database
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: storage-classes
  wait: true
  timeout: 10m
```

## Pre-Provisioning Storage

For environments where you pre-provision PersistentVolumes, health check both the PV and PVC:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: postgres-data-pv
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: manual
  hostPath:
    path: /data/postgres
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  namespace: database
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: manual
  resources:
    requests:
      storage: 100Gi
```

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: storage-provision
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/storage-provision
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 5m
  healthChecks:
    - apiVersion: v1
      kind: PersistentVolumeClaim
      name: postgres-data
      namespace: database
```

## Setting Appropriate Timeouts

Storage provisioning time depends on the provider and volume type. Consider these factors when setting timeouts:

- Cloud provider disk creation: 30 seconds to 2 minutes
- Large volume sizing: can take longer for high-IOPS volumes
- Cross-zone provisioning: may take additional time
- Snapshot restore: depends on snapshot size

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: large-volumes
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/large-volumes
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 10m
  healthChecks:
    - apiVersion: v1
      kind: PersistentVolumeClaim
      name: data-warehouse
      namespace: analytics
```

## Debugging PVC Health Check Failures

When a PVC health check fails:

```bash
# Check Kustomization status
flux get kustomization database-storage

# Check PVC status
kubectl get pvc -n database

# Check PVC events
kubectl describe pvc postgres-data -n database

# Check available PVs
kubectl get pv

# Check StorageClass
kubectl get storageclass

# Check CSI driver pods
kubectl get pods -n kube-system -l app=ebs-csi-controller
```

Common PVC health check failure causes:

- StorageClass does not exist or is misconfigured
- CSI driver not installed or not functioning
- Insufficient storage quota on the cloud provider
- PVC requesting more storage than available
- Access mode mismatch between PVC and available PVs
- Volume binding mode is `WaitForFirstConsumer` and no pod is scheduled yet
- Node affinity constraints preventing PVC binding in the required zone

## Conclusion

Custom health checks for PersistentVolumeClaims in Flux Kustomization ensure that storage is provisioned and bound before workloads that depend on it attempt to start. This prevents pods from getting stuck in a Pending state due to unbound PVCs. Pay attention to the volume binding mode of your StorageClass, as `WaitForFirstConsumer` requires the PVC and its consuming pod to be in the same Kustomization or deployed simultaneously. With proper health checks and dependency chains, you can build a reliable storage provisioning pipeline that integrates with your GitOps workflow.
