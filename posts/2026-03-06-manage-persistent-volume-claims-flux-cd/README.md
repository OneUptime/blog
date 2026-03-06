# How to Manage PersistentVolumeClaims with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, persistent volume claims, PVC, Storage, GitOps

Description: A practical guide to managing Kubernetes PersistentVolumeClaims and storage resources with Flux CD in a GitOps workflow.

---

## Introduction

PersistentVolumeClaims (PVCs) are how applications request durable storage in Kubernetes. Managing PVCs through GitOps with Flux CD requires special attention because storage resources are stateful by nature and accidental deletion can result in data loss.

This guide covers how to safely manage PVCs, StorageClasses, and related storage resources with Flux CD.

## Prerequisites

- A Kubernetes cluster (v1.26+) with a CSI driver installed
- Flux CD installed and bootstrapped
- A Git repository connected to Flux

## Repository Structure

```text
clusters/
  my-cluster/
    infrastructure.yaml
    storage.yaml
    apps.yaml
infrastructure/
  storage/
    storage-classes.yaml
    persistent-volumes.yaml
apps/
  myapp/
    pvc.yaml
    deployment.yaml
    kustomization.yaml
```

## Defining StorageClasses

Start by managing your StorageClasses through Flux:

```yaml
# infrastructure/storage/storage-classes.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
  labels:
    app.kubernetes.io/managed-by: flux
# Use your cloud provider's CSI driver
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true"
# Keep the volume even if the PVC is deleted
reclaimPolicy: Retain
# Allow volume expansion without recreating the PVC
allowVolumeExpansion: true
# WaitForFirstConsumer delays binding until a pod uses the PVC
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard-hdd
  annotations:
    # Set as the default StorageClass
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
parameters:
  type: gp2
  encrypted: "true"
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: shared-nfs
provisioner: nfs.csi.k8s.io
parameters:
  server: nfs-server.internal
  share: /exports/shared
reclaimPolicy: Retain
allowVolumeExpansion: true
mountOptions:
  - nfsvers=4.1
  - hard
  - noresvport
```

## Creating PersistentVolumeClaims

Define PVCs for your applications:

```yaml
# apps/myapp/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: myapp-data
  namespace: myapp
  labels:
    app: myapp
    app.kubernetes.io/managed-by: flux
  annotations:
    # Prevent Flux from deleting this PVC during pruning
    kustomize.toolkit.fluxcd.io/prune: disabled
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 20Gi
---
# Shared PVC for multiple pods using NFS
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: myapp-shared
  namespace: myapp
  annotations:
    kustomize.toolkit.fluxcd.io/prune: disabled
spec:
  accessModes:
    - ReadWriteMany  # Multiple pods can mount this simultaneously
  storageClassName: shared-nfs
  resources:
    requests:
      storage: 100Gi
```

## Flux Kustomization with Storage Safety

```yaml
# clusters/my-cluster/storage.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: storage-infrastructure
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/storage
  # Critical: never prune storage resources
  prune: false
  wait: true
  timeout: 5m
---
# clusters/my-cluster/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/myapp
  prune: true
  # Even with prune enabled, PVCs with the prune disabled annotation
  # will not be deleted
  dependsOn:
    - name: storage-infrastructure
```

## Using PVCs in Deployments

```yaml
# apps/myapp/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp
spec:
  replicas: 1  # Single replica when using ReadWriteOnce PVC
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myregistry.io/myapp:v1.5.0
          ports:
            - containerPort: 8080
          volumeMounts:
            # Mount the persistent data volume
            - name: data
              mountPath: /app/data
            # Mount the shared volume for file uploads
            - name: shared
              mountPath: /app/uploads
          resources:
            requests:
              cpu: "250m"
              memory: "512Mi"
            limits:
              cpu: "1"
              memory: "1Gi"
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: myapp-data
        - name: shared
          persistentVolumeClaim:
            claimName: myapp-shared
```

## Pre-provisioned PersistentVolumes

For cases where you need to bind to existing storage:

```yaml
# infrastructure/storage/persistent-volumes.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: legacy-data-volume
  labels:
    type: legacy
    app.kubernetes.io/managed-by: flux
  annotations:
    kustomize.toolkit.fluxcd.io/prune: disabled
spec:
  capacity:
    storage: 500Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: fast-ssd
  # Bind to a specific PVC
  claimRef:
    namespace: myapp
    name: legacy-data
  # AWS EBS volume reference
  csi:
    driver: ebs.csi.aws.com
    volumeHandle: vol-0abc123def456789
    fsType: ext4
---
# PVC that binds to the pre-provisioned PV
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: legacy-data
  namespace: myapp
  annotations:
    kustomize.toolkit.fluxcd.io/prune: disabled
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 500Gi
  # Select the specific PV by label
  selector:
    matchLabels:
      type: legacy
```

## Volume Expansion with Flux

To resize a PVC, update the storage request in your Git repository:

```yaml
# apps/myapp/pvc.yaml (updated storage from 20Gi to 50Gi)
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: myapp-data
  namespace: myapp
  annotations:
    kustomize.toolkit.fluxcd.io/prune: disabled
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      # Increased from 20Gi to 50Gi
      # The StorageClass must have allowVolumeExpansion: true
      storage: 50Gi
```

## Volume Snapshots

Manage VolumeSnapshots and VolumeSnapshotClasses through Flux:

```yaml
# infrastructure/storage/snapshot-class.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: ebs-snapshot
  labels:
    app.kubernetes.io/managed-by: flux
driver: ebs.csi.aws.com
deletionPolicy: Retain
parameters:
  # Tag snapshots for identification
  tagSpecification_1: "ManagedBy=flux"
---
# apps/myapp/snapshot.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: myapp-data-snapshot-20260306
  namespace: myapp
spec:
  volumeSnapshotClassName: ebs-snapshot
  source:
    # Reference the PVC to snapshot
    persistentVolumeClaimName: myapp-data
```

## Restoring from a Snapshot

Create a new PVC from a VolumeSnapshot:

```yaml
# apps/myapp/pvc-restored.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: myapp-data-restored
  namespace: myapp
  annotations:
    kustomize.toolkit.fluxcd.io/prune: disabled
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 50Gi
  # Restore from a snapshot
  dataSource:
    name: myapp-data-snapshot-20260306
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

## Kustomize Overlays for Different Environments

Use Kustomize overlays to vary storage configurations per environment:

```yaml
# apps/myapp/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - pvc.yaml
  - deployment.yaml

# apps/myapp/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - target:
      kind: PersistentVolumeClaim
      name: myapp-data
    patch: |
      - op: replace
        path: /spec/resources/requests/storage
        value: 100Gi
      - op: replace
        path: /spec/storageClassName
        value: fast-ssd

# apps/myapp/overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - target:
      kind: PersistentVolumeClaim
      name: myapp-data
    patch: |
      - op: replace
        path: /spec/resources/requests/storage
        value: 10Gi
      - op: replace
        path: /spec/storageClassName
        value: standard-hdd
```

## Monitoring PVC Usage

Deploy a monitoring alert for PVC capacity:

```yaml
# apps/monitoring/pvc-alert.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: pvc-alerts
  namespace: monitoring
spec:
  groups:
    - name: pvc.rules
      rules:
        - alert: PVCAlmostFull
          # Alert when PVC is more than 85% full
          expr: |
            kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes > 0.85
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "PVC {{ $labels.persistentvolumeclaim }} is almost full"
            description: "PVC {{ $labels.persistentvolumeclaim }} in namespace {{ $labels.namespace }} is {{ $value | humanizePercentage }} full."
```

## Summary

Managing PVCs with Flux CD requires careful handling to prevent data loss:

- Always set `prune: false` or use the prune disabled annotation on PVCs
- Use `reclaimPolicy: Retain` on StorageClasses to keep volumes after PVC deletion
- Set `volumeBindingMode: WaitForFirstConsumer` for topology-aware provisioning
- Enable `allowVolumeExpansion` on StorageClasses for easy resizing through Git
- Use VolumeSnapshots for backup and restore workflows
- Apply Kustomize overlays to differentiate storage requirements per environment
- Monitor PVC usage to prevent capacity issues before they cause outages
