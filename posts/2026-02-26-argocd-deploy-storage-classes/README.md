# How to Deploy Storage Classes with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Storage, Infrastructure

Description: Learn how to deploy and manage Kubernetes StorageClass resources with ArgoCD for consistent storage provisioning policies across clusters and environments.

---

StorageClass resources define how storage is provisioned in your Kubernetes cluster. They configure the volume provisioner, reclaim policy, mount options, volume binding mode, and other parameters that determine what kind of storage your applications get. Managing StorageClasses through ArgoCD ensures every cluster has the same storage options available, preventing the common problem of "it works on this cluster but not that one."

This guide covers deploying and managing StorageClasses with ArgoCD across single and multi-cluster setups.

## Why Manage StorageClasses with ArgoCD

StorageClasses are cluster-scoped resources that directly affect application behavior:

- An application requesting `fast-ssd` storage will fail if that StorageClass does not exist
- Different default StorageClasses across clusters cause inconsistent behavior
- Misconfigured reclaim policies can lead to data loss or orphaned volumes
- Parameter changes affect all future PersistentVolumeClaims

With ArgoCD, StorageClass definitions are version-controlled, reviewed, and deployed consistently.

## Basic StorageClass Definitions

### AWS EBS StorageClasses

```yaml
# gp3-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true"
  kmsKeyId: "arn:aws:kms:us-east-1:123456789:key/abc-123"
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer

---
# io2-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: io2
  iops: "10000"
  encrypted: "true"
  kmsKeyId: "arn:aws:kms:us-east-1:123456789:key/abc-123"
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer

---
# sc1-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cold-hdd
provisioner: ebs.csi.aws.com
parameters:
  type: sc1
  encrypted: "true"
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

### GCP Persistent Disk StorageClasses

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-balanced
  disk-encryption-kms-key: >
    projects/my-project/locations/us-east1/keyRings/my-ring/cryptoKeys/my-key
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer

---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer

---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: regional-ssd
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
  replication-type: regional-pd
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

### Azure Managed Disk StorageClasses

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: managed-premium
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS
  cachingmode: ReadOnly
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer

---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ultra-disk
provisioner: disk.csi.azure.com
parameters:
  skuName: UltraSSD_LRS
  DiskIOPSReadWrite: "10000"
  DiskMBpsReadWrite: "256"
  cachingmode: None
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

## Repository Structure

```text
storage-config/
  base/
    kustomization.yaml
    storage-classes/
      default.yaml
      fast-ssd.yaml
      cold-hdd.yaml
  overlays/
    aws/
      kustomization.yaml
      storage-classes/
        aws-gp3.yaml
        aws-io2.yaml
        aws-sc1.yaml
    gcp/
      kustomization.yaml
      storage-classes/
        gcp-balanced.yaml
        gcp-ssd.yaml
        gcp-regional.yaml
    azure/
      kustomization.yaml
      storage-classes/
        azure-premium.yaml
        azure-ultra.yaml
    bare-metal/
      kustomization.yaml
      storage-classes/
        local-path.yaml
        nfs.yaml
```

## ArgoCD Application

Since StorageClasses are cluster-scoped, deploy them without a namespace:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: storage-classes
  namespace: argocd
spec:
  project: infrastructure
  source:
    repoURL: https://github.com/your-org/storage-config
    path: overlays/aws
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    # No namespace - StorageClasses are cluster-scoped
  syncPolicy:
    automated:
      selfHeal: true
    syncOptions:
      - ServerSideApply=true
      - CreateNamespace=false
```

## Multi-Cluster Deployment with ApplicationSet

Deploy StorageClasses to all clusters with the appropriate cloud provider overlay:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: storage-classes
  namespace: argocd
spec:
  generators:
    - clusters:
        selector:
          matchExpressions:
            - key: cloud-provider
              operator: In
              values: [aws, gcp, azure, bare-metal]
  template:
    metadata:
      name: "storage-classes-{{name}}"
    spec:
      project: infrastructure
      source:
        repoURL: https://github.com/your-org/storage-config
        path: "overlays/{{metadata.labels.cloud-provider}}"
        targetRevision: main
      destination:
        server: "{{server}}"
      syncPolicy:
        automated:
          selfHeal: true
        syncOptions:
          - ServerSideApply=true
```

## Handling the Default StorageClass

Only one StorageClass should be marked as default. Use Kustomize to ensure consistency:

```yaml
# overlays/aws/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - storage-classes/aws-gp3.yaml
  - storage-classes/aws-io2.yaml
  - storage-classes/aws-sc1.yaml

patches:
  # Ensure only gp3 is the default
  - target:
      kind: StorageClass
      name: gp3
    patch: |
      - op: add
        path: /metadata/annotations/storageclass.kubernetes.io~1is-default-class
        value: "true"
```

## Important Considerations

### Reclaim Policy

The reclaim policy determines what happens to the underlying volume when a PVC is deleted:

- **Delete** - the volume is automatically deleted (use for ephemeral data)
- **Retain** - the volume persists after PVC deletion (use for critical data)

```yaml
# For databases and critical data
reclaimPolicy: Retain

# For temporary/reproducible data
reclaimPolicy: Delete
```

### Volume Binding Mode

```yaml
# WaitForFirstConsumer: delays binding until a Pod using the PVC is scheduled
# Ensures the volume is created in the same zone as the Pod
volumeBindingMode: WaitForFirstConsumer

# Immediate: binds the PVC immediately
# Can cause zone mismatches in multi-zone clusters
volumeBindingMode: Immediate
```

Always use `WaitForFirstConsumer` in multi-zone clusters to prevent zone mismatch issues.

### Volume Expansion

Enable volume expansion on all StorageClasses:

```yaml
allowVolumeExpansion: true
```

This lets you resize PVCs without recreating them.

## Pre-Sync Validation

Validate StorageClass changes before applying:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: validate-storage-classes
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: validate
          image: bitnami/kubectl:1.29
          command:
            - sh
            - -c
            - |
              # Check only one default StorageClass
              DEFAULT_COUNT=$(kubectl get storageclass \
                -o json | jq '[.items[] |
                select(.metadata.annotations["storageclass.kubernetes.io/is-default-class"]=="true")
              ] | length')

              if [ "$DEFAULT_COUNT" -gt 1 ]; then
                echo "ERROR: Multiple default StorageClasses detected"
                exit 1
              fi

              echo "StorageClass validation passed"
      restartPolicy: Never
  backoffLimit: 0
```

## Monitoring Storage

Track storage provisioning and usage:

```promql
# PVCs by StorageClass
count(kube_persistentvolumeclaim_info) by (storageclass)

# PVC capacity by StorageClass
sum(kube_persistentvolumeclaim_resource_requests_storage_bytes)
  by (storageclass)

# Unbound PVCs (potential issues)
kube_persistentvolumeclaim_status_phase{phase="Pending"}
```

## Summary

Deploying StorageClasses with ArgoCD ensures consistent storage provisioning across all your clusters. Use Kustomize overlays to handle cloud-specific provisioner configuration, ApplicationSets to deploy to all clusters, and sync waves when you need to install CSI drivers before creating StorageClasses. Pay attention to reclaim policies, volume binding modes, and default class annotations to prevent data loss and scheduling issues.

For more advanced storage patterns, see our guides on [managing PersistentVolume configurations](https://oneuptime.com/blog/post/2026-02-26-argocd-manage-persistentvolume-config/view) and [deploying Ceph/Rook with ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-deploy-ceph-rook/view).
