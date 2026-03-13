# How to Deploy Azure Disk CSI Driver with Flux on AKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Azure, AKS, CSI, Azure Disk, Storage, Persistent Volumes

Description: Learn how to deploy and configure the Azure Disk CSI Driver on AKS using Flux CD for GitOps-managed persistent storage.

---

## Introduction

The Azure Disk CSI Driver enables Kubernetes workloads on AKS to use Azure Managed Disks as persistent volumes. While AKS includes a built-in CSI driver, there are scenarios where you need to manage a custom version, configure advanced features like disk encryption sets, or ensure consistent driver configuration across multiple clusters. Flux CD provides a GitOps approach to managing the CSI driver lifecycle.

This guide covers deploying and configuring the Azure Disk CSI Driver on AKS using Flux, including custom StorageClass definitions and snapshot configurations.

## Prerequisites

- An Azure subscription
- An AKS cluster running Kubernetes 1.24 or later
- Flux CLI version 2.0 or later bootstrapped on the cluster
- Azure CLI version 2.40 or later

## Step 1: Understand the Built-in CSI Driver

AKS ships with the Azure Disk CSI Driver pre-installed. Before deploying a custom version, check what is already available:

```bash
kubectl get csidrivers
kubectl get storageclasses
```

You should see `disk.csi.azure.com` in the CSI drivers list and storage classes like `managed-csi` and `managed-csi-premium`.

## Step 2: Add the Azure Disk CSI Helm Repository

If you need to manage the CSI driver through Flux (for example, to use a newer version or custom configuration), add the Helm repository:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: azuredisk-csi
  namespace: flux-system
spec:
  interval: 1h
  url: https://raw.githubusercontent.com/kubernetes-sigs/azuredisk-csi-driver/master/charts
```

## Step 3: Create a HelmRelease for the CSI Driver

Define a HelmRelease to deploy the driver:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: azuredisk-csi-driver
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: azuredisk-csi-driver
      version: "1.30.*"
      sourceRef:
        kind: HelmRepository
        name: azuredisk-csi
  targetNamespace: kube-system
  values:
    controller:
      replicas: 2
      runOnControlPlane: false
    node:
      livenessProbe:
        healthPort: 29603
    snapshot:
      enabled: true
    linux:
      enabled: true
    windows:
      enabled: false
```

## Step 4: Define Custom StorageClasses

Create StorageClass resources for different disk types and configurations:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: managed-csi-premium-retain
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS
  cachingMode: ReadOnly
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: managed-csi-premium-zrs
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_ZRS
  cachingMode: ReadOnly
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: managed-csi-ultra
provisioner: disk.csi.azure.com
parameters:
  skuName: UltraSSD_LRS
  cachingMode: None
  DiskIOPSReadWrite: "4000"
  DiskMBpsReadWrite: "128"
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

## Step 5: Configure Volume Snapshots

Enable volume snapshots by deploying the VolumeSnapshotClass:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: azure-disk-snapshot
driver: disk.csi.azure.com
deletionPolicy: Delete
parameters:
  incremental: "true"
```

## Step 6: Create a Flux Kustomization

Organize everything under a Flux Kustomization:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: azure-disk-csi
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/azure-disk-csi
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: azuredisk-csi-driver-controller
      namespace: kube-system
```

## Step 7: Deploy a Workload with Persistent Storage

Create a PersistentVolumeClaim and a deployment that uses it:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-app-data
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: managed-csi-premium-retain
  resources:
    requests:
      storage: 50Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: myapp:latest
          volumeMounts:
            - name: data
              mountPath: /data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: my-app-data
```

## Step 8: Create a Volume Snapshot

To create a snapshot of the persistent volume:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: my-app-data-snapshot
  namespace: default
spec:
  volumeSnapshotClassName: azure-disk-snapshot
  source:
    persistentVolumeClaimName: my-app-data
```

## Verifying the Deployment

Check the CSI driver and storage resources:

```bash
flux get helmreleases -A
kubectl get csidrivers
kubectl get storageclasses
kubectl get pvc -A
kubectl get volumesnapshots -A
```

## Troubleshooting

**PVC stuck in Pending**: Check that the StorageClass exists and the `skuName` parameter is valid for your region. Ultra SSD requires enabling UltraSSD on the node pool.

**Snapshot creation fails**: Ensure the snapshot controller is running and the VolumeSnapshotClass references the correct driver name.

**Driver conflicts**: If you deploy a custom CSI driver alongside the built-in one, you may encounter conflicts. Consider disabling the AKS-managed driver with `--disable-disk-driver` on cluster creation.

## Conclusion

Managing the Azure Disk CSI Driver through Flux gives you consistent, version-controlled storage configuration across your AKS clusters. Custom StorageClasses, snapshot policies, and driver configurations are all tracked in Git, making it easy to audit changes and replicate configurations across environments. This approach is particularly valuable in multi-cluster setups where storage configurations need to be standardized.
