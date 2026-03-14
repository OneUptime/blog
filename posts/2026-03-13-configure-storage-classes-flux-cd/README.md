# How to Configure Storage Classes with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, StorageClass, PersistentVolume, Storage Management

Description: Manage Kubernetes StorageClass resources using Flux CD GitOps for version-controlled, consistent storage provisioning across environments.

---

## Introduction

Kubernetes StorageClasses define how dynamic storage is provisioned. Different workloads have different storage requirements: databases need fast SSD block storage, shared workloads need ReadWriteMany filesystem storage, and archival jobs need cheap bulk storage. Managing StorageClasses through Flux CD ensures that your storage catalog is consistent across clusters and environments, and that changes to storage configuration (like changing the default class or adding a new tier) go through code review.

This post covers organizing StorageClasses for different storage backends, managing default classes, and using Flux to ensure storage configuration is consistently applied across multiple clusters.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- Storage provisioners installed (CSI drivers, Rook, Longhorn, etc.)
- `kubectl` and `flux` CLIs installed

## Step 1: Understand StorageClass Hierarchy

Organize storage tiers by performance, cost, and access mode:

```
StorageClass Tiers:
├── premium-ssd          (Rook-Ceph RBD, NVMe) — databases, Kafka
├── standard-ssd         (cloud provider SSD)   — general workloads
├── standard-hdd         (cloud provider HDD)   — archive storage
├── shared-filesystem    (CephFS, NFS)          — RWX workloads
└── local-ssd            (local-path, OpenEBS)  — caches, scratch
```

## Step 2: Create StorageClasses for Multiple Backends

```yaml
# infrastructure/storage/storageclasses/aws-ebs-classes.yaml
# AWS EKS: gp3 (general purpose SSD - default)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer  # wait until pod is scheduled
allowVolumeExpansion: true
reclaimPolicy: Delete
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true"
  kmsKeyId: ""   # use default EBS CMK
---
# AWS EKS: io2 (high IOPS for databases)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: io2-database
  annotations:
    storageclass.kubernetes.io/is-default-class: "false"
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Retain   # retain on delete for safety
parameters:
  type: io2
  iops: "16000"
  encrypted: "true"
---
# AWS EKS: st1 (cheap bulk storage for logs/archives)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: st1-bulk
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Delete
parameters:
  type: st1
```

```yaml
# infrastructure/storage/storageclasses/on-prem-classes.yaml
# On-premises: Rook-Ceph NVMe block storage (fast tier)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-nvme-rwo
provisioner: rook-ceph.rbd.csi.ceph.com
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Retain
parameters:
  clusterID: rook-ceph
  pool: nvme-pool
  imageFormat: "2"
  imageFeatures: layering,fast-diff,object-map,deep-flatten,exclusive-lock
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
---
# On-premises: CephFS shared storage (RWX)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cephfs-rwx
provisioner: rook-ceph.cephfs.csi.ceph.com
volumeBindingMode: Immediate
allowVolumeExpansion: true
reclaimPolicy: Delete
parameters:
  clusterID: rook-ceph
  fsName: myfs
  pool: myfs-replicated
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
```

## Step 3: Use Kustomize for Environment-Specific Default Classes

Production uses expensive SSD as default; staging uses cheaper standard:

```yaml
# infrastructure/storage/storageclasses/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
patches:
  - target:
      kind: StorageClass
      name: gp3
    patch: |
      - op: add
        path: /metadata/annotations/storageclass.kubernetes.io~1is-default-class
        value: "true"
---
# infrastructure/storage/storageclasses/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
patches:
  - target:
      kind: StorageClass
      name: gp3
    patch: |
      - op: replace
        path: /parameters/iops
        value: "1000"   # lower IOPS in staging to reduce costs
```

## Step 4: Handle the Default StorageClass Change Pattern

Only one StorageClass should have `is-default-class: "true"`. To change the default:

```yaml
# infrastructure/storage/storageclasses/change-default-patch.yaml
# Step 1: Remove default annotation from old class
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp2   # old default
  annotations:
    storageclass.kubernetes.io/is-default-class: "false"
---
# Step 2: Set new default
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3   # new default
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
```

Both changes go in a single commit. Flux applies them atomically.

## Step 5: Flux Kustomization

```yaml
# clusters/production/storageclasses-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: storage-classes
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/storage/storageclasses/production
  prune: true  # delete removed StorageClasses
  dependsOn:
    - name: rook-ceph-cluster
    - name: aws-ebs-csi-driver
```

## Step 6: Verify StorageClasses

```bash
# List all StorageClasses
kubectl get storageclass

# Check which is the default
kubectl get storageclass | grep "(default)"

# Verify provisioner
kubectl get storageclass gp3 -o yaml | grep provisioner

# Test PVC creation
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  # no storageClassName → uses default
EOF

kubectl get pvc test-pvc
kubectl get pv $(kubectl get pvc test-pvc -o jsonpath='{.spec.volumeName}')
```

## Best Practices

- Use `volumeBindingMode: WaitForFirstConsumer` for block storage to ensure volumes are provisioned in the same zone as the pod.
- Use `reclaimPolicy: Retain` for production database StorageClasses to prevent accidental data loss on PVC deletion.
- Never have two StorageClasses with `is-default-class: "true"` simultaneously — this causes unpredictable PVC provisioning behavior.
- Include the CSI driver version in StorageClass comments so you know which driver version the parameters were tested against.
- Document allowed access modes (`ReadWriteOnce`, `ReadWriteMany`) in StorageClass metadata labels for discoverability.

## Conclusion

StorageClasses managed through Flux CD ensure your storage catalog is consistently defined and version-controlled across clusters. Changes to storage tiers — adding a new high-performance class, adjusting IOPS parameters, or changing the default class — are Git commits reviewed by your team. Kustomize overlays enable environment-specific customization without duplicating the base StorageClass definitions, keeping your storage configuration DRY and maintainable.
