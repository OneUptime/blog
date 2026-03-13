# How to Deploy Azure File CSI Driver with Flux on AKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Azure, AKS, CSI, Azure Files, Storage, Persistent Volumes, SMB, NFS

Description: Learn how to deploy and manage the Azure File CSI Driver on AKS using Flux CD, including NFS and SMB share configurations for shared persistent storage.

---

## Introduction

The Azure File CSI Driver allows Kubernetes workloads on AKS to mount Azure file shares as persistent volumes. Unlike Azure Disk, Azure Files supports ReadWriteMany access mode, making it suitable for workloads that require shared storage across multiple pods or nodes. The driver supports both SMB and NFS protocols.

Managing the Azure File CSI Driver and its associated StorageClasses through Flux ensures that storage configuration is consistent, auditable, and automatically reconciled across your clusters.

## Prerequisites

- An Azure subscription
- An AKS cluster running Kubernetes 1.24 or later
- Flux CLI version 2.0 or later bootstrapped on the cluster
- Azure CLI version 2.40 or later

## Step 1: Verify the Built-in Driver

AKS includes the Azure File CSI Driver by default. Check the current state:

```bash
kubectl get csidrivers | grep file
kubectl get storageclasses | grep file
```

You should see `file.csi.azure.com` and storage classes like `azurefile-csi` and `azurefile-csi-premium`.

## Step 2: Add the Helm Repository

For custom driver management, add the Helm repository to Flux:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: azurefile-csi
  namespace: flux-system
spec:
  interval: 1h
  url: https://raw.githubusercontent.com/kubernetes-sigs/azurefile-csi-driver/master/charts
```

## Step 3: Deploy the Driver via HelmRelease

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: azurefile-csi-driver
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: azurefile-csi-driver
      version: "1.30.*"
      sourceRef:
        kind: HelmRepository
        name: azurefile-csi
  targetNamespace: kube-system
  values:
    controller:
      replicas: 2
    node:
      livenessProbe:
        healthPort: 29613
    linux:
      enabled: true
    windows:
      enabled: false
```

## Step 4: Create Custom StorageClasses

Define StorageClasses for different Azure Files configurations:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azurefile-csi-premium-retain
provisioner: file.csi.azure.com
parameters:
  skuName: Premium_LRS
  protocol: smb
reclaimPolicy: Retain
volumeBindingMode: Immediate
allowVolumeExpansion: true
mountOptions:
  - dir_mode=0777
  - file_mode=0777
  - uid=0
  - gid=0
  - mfsymlinks
  - cache=strict
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azurefile-csi-nfs
provisioner: file.csi.azure.com
parameters:
  skuName: Premium_LRS
  protocol: nfs
reclaimPolicy: Delete
volumeBindingMode: Immediate
allowVolumeExpansion: true
mountOptions:
  - nconnect=4
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azurefile-csi-premium-zrs
provisioner: file.csi.azure.com
parameters:
  skuName: Premium_ZRS
  protocol: smb
reclaimPolicy: Delete
volumeBindingMode: Immediate
allowVolumeExpansion: true
```

## Step 5: Deploy a Shared Storage Workload

Create a PVC and a deployment with multiple replicas sharing the same volume:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-data
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: azurefile-csi-nfs
  resources:
    requests:
      storage: 100Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: file-writer
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: file-writer
  template:
    metadata:
      labels:
        app: file-writer
    spec:
      containers:
        - name: writer
          image: busybox
          command: ["sh", "-c", "while true; do echo $(date) >> /data/log.txt; sleep 60; done"]
          volumeMounts:
            - name: shared
              mountPath: /data
      volumes:
        - name: shared
          persistentVolumeClaim:
            claimName: shared-data
```

## Step 6: Mount an Existing Azure File Share

To use a pre-existing Azure file share, create a PersistentVolume:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: existing-fileshare
spec:
  capacity:
    storage: 50Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: ""
  csi:
    driver: file.csi.azure.com
    volumeHandle: unique-volume-id
    volumeAttributes:
      shareName: myexistingshare
      resourceGroup: my-resource-group
      storageAccount: mystorageaccount
      protocol: smb
    nodeStageSecretRef:
      name: azure-storage-secret
      namespace: default
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: existing-fileshare-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: ""
  volumeName: existing-fileshare
  resources:
    requests:
      storage: 50Gi
```

## Step 7: Organize with a Flux Kustomization

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: azure-file-csi
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/azure-file-csi
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: azurefile-csi-driver-controller
      namespace: kube-system
```

## NFS vs SMB Considerations

When choosing between NFS and SMB protocols, consider the following:

**NFS** is recommended for Linux workloads that need high performance and POSIX-compliant file access. NFS shares require Premium storage accounts and do not need storage account keys for authentication when using private endpoints.

**SMB** is the default protocol and works with both Linux and Windows nodes. SMB shares support all storage account tiers but require storage credentials mounted as Kubernetes secrets.

## Verifying the Deployment

```bash
flux get helmreleases -A
kubectl get storageclasses | grep file
kubectl get pvc -A
kubectl describe pvc shared-data -n default
```

## Troubleshooting

**NFS mount failures**: Ensure your AKS nodes have the `nfs-common` package available. Also verify that the storage account allows NFS access and network rules permit traffic from the AKS subnet.

**Permission denied on SMB**: Check the `dir_mode` and `file_mode` mount options. Default permissions may not match your application's requirements.

**Slow performance**: For NFS, use the `nconnect` mount option to increase parallel connections. For SMB, consider enabling large file shares on the storage account.

## Conclusion

The Azure File CSI Driver managed through Flux provides a reliable, GitOps-driven approach to shared storage on AKS. Whether you need NFS for high-performance Linux workloads or SMB for cross-platform compatibility, the configuration is declarative, version-controlled, and automatically reconciled. This makes it straightforward to standardize storage configurations across development, staging, and production clusters.
