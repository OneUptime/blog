# How to Configure CSI Driver NFS with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, CSI, NFS, Storage, ReadWriteMany, Persistent Volumes

Description: Deploy and configure the NFS CSI driver for Kubernetes using Flux CD for GitOps-managed NFS-backed PersistentVolumes with dynamic provisioning and static pre-provisioned volumes.

---

## Introduction

The Kubernetes NFS CSI driver (`csi-driver-nfs`) from the Kubernetes SIG Storage project provides a Container Storage Interface (CSI) compliant driver for mounting NFS shares as Kubernetes PersistentVolumes. Unlike the older `nfs-subdir-external-provisioner`, the CSI driver integrates natively with Kubernetes CSI infrastructure, supporting both dynamic provisioning and static pre-provisioned volumes, and providing better observability through the standard CSI interface.

The CSI driver creates one directory per PVC under a specified NFS base path, supports `ReadWriteMany` access mode for shared workloads, and works with any NFS server version 3 or 4. It is particularly useful when you need to mount specific NFS paths directly rather than using a subdirectory provisioner.

Deploying the CSI driver through Flux CD ensures the driver DaemonSet and controller are version-controlled and consistently deployed across your clusters, while allowing you to manage multiple NFS StorageClasses pointing to different NFS servers and export paths.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- An NFS server accessible from all Kubernetes nodes
- `nfs-common` (Debian/Ubuntu) or `nfs-utils` (RHEL/CentOS) installed on all nodes
- `kubectl` and `flux` CLIs installed

## Step 1: Add the CSI Driver NFS HelmRepository

```yaml
# infrastructure/sources/csi-driver-nfs-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: csi-driver-nfs
  namespace: flux-system
spec:
  interval: 12h
  url: https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/charts
```

## Step 2: Create the Namespace

```yaml
# infrastructure/storage/csi-nfs/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kube-system   # CSI drivers typically deploy to kube-system
```

## Step 3: Deploy the NFS CSI Driver

```yaml
# infrastructure/storage/csi-nfs/csi-driver-nfs.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: csi-driver-nfs
  namespace: kube-system
spec:
  interval: 30m
  chart:
    spec:
      chart: csi-driver-nfs
      version: "4.9.0"
      sourceRef:
        kind: HelmRepository
        name: csi-driver-nfs
        namespace: flux-system
  values:
    # Controller (Deployment) - manages PV lifecycle
    controller:
      replicas: 2
      resources:
        csiProvisioner:
          requests:
            cpu: "10m"
            memory: "20Mi"
          limits:
            cpu: "200m"
            memory: "200Mi"
        nfs:
          requests:
            cpu: "10m"
            memory: "20Mi"
          limits:
            cpu: "200m"
            memory: "200Mi"

    # Node DaemonSet - performs the actual NFS mount on each node
    node:
      resources:
        livenessProbe:
          requests:
            cpu: "10m"
            memory: "20Mi"
          limits:
            cpu: "100m"
            memory: "100Mi"
        nfs:
          requests:
            cpu: "10m"
            memory: "20Mi"
          limits:
            cpu: "500m"
            memory: "300Mi"

    # Feature gates
    feature:
      enableFSGroupPolicy: true   # support fsGroup in securityContext

    # ExternalSnapshotter CRDs are installed separately
    externalSnapshotter:
      enabled: false
```

## Step 4: Create NFS StorageClasses

```yaml
# infrastructure/storage/csi-nfs/storageclasses.yaml

# Primary NFS StorageClass - default for RWX workloads
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-csi
  annotations:
    storageclass.kubernetes.io/is-default-class: "false"
provisioner: nfs.csi.k8s.io
reclaimPolicy: Delete
volumeBindingMode: Immediate   # NFS does not require WaitForFirstConsumer
allowVolumeExpansion: false    # NFS CSI does not support online resize
parameters:
  server: 10.0.0.100           # NFS server IP or hostname
  share: /mnt/nfs-share        # NFS export path
  subDir: ""                   # optional: subdirectory under the share
  # Mount options applied to all PVs from this class
  mountPermissions: "0"        # 0 = inherit from NFS server
---
# High-performance NFS StorageClass (NVMe-backed export)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-csi-fast
provisioner: nfs.csi.k8s.io
reclaimPolicy: Delete
volumeBindingMode: Immediate
parameters:
  server: 10.0.0.101           # separate NFS server for fast storage
  share: /mnt/nvme-share
  mountPermissions: "0777"
mountOptions:
  - nfsvers=4.1
  - rsize=1048576
  - wsize=1048576
  - hard
  - noatime
---
# Retain-policy NFS StorageClass for important data
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-csi-retain
provisioner: nfs.csi.k8s.io
reclaimPolicy: Retain          # keep the NFS directory after PVC deletion
volumeBindingMode: Immediate
parameters:
  server: 10.0.0.100
  share: /mnt/nfs-share
mountOptions:
  - nfsvers=4.1
  - hard
```

## Step 5: Static Pre-Provisioned Volume

For mounting a specific existing NFS export directly:

```yaml
# infrastructure/storage/csi-nfs/static-pv.yaml
# Pre-provisioned PV pointing to an existing NFS path
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-legacy-data
  annotations:
    pv.kubernetes.io/provisioned-by: nfs.csi.k8s.io
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: nfs-csi
  mountOptions:
    - nfsvers=4.1
    - hard
  csi:
    driver: nfs.csi.k8s.io
    # volumeHandle must be unique: server##share##subdir
    volumeHandle: "10.0.0.100#/mnt/nfs-share#legacy-data#"
    volumeAttributes:
      server: "10.0.0.100"
      share: "/mnt/nfs-share"
      subdir: "legacy-data"
---
# PVC bound to the static PV above
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-legacy-data
  namespace: production
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: nfs-csi
  volumeName: nfs-legacy-data   # bind to specific PV
  resources:
    requests:
      storage: 100Gi
```

## Step 6: Flux Kustomization

```yaml
# clusters/production/csi-nfs-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: csi-driver-nfs
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/storage/csi-nfs
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: csi-nfs-controller
      namespace: kube-system
    - apiVersion: apps/v1
      kind: DaemonSet
      name: csi-nfs-node
      namespace: kube-system
```

## Step 7: Verify and Test

```bash
# Check CSI driver pods
kubectl get pods -n kube-system | grep csi-nfs

# List CSIDriver registration
kubectl get csidriver nfs.csi.k8s.io

# Test dynamic provisioning
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-csi-test
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: nfs-csi
  resources:
    requests:
      storage: 5Gi
EOF

kubectl get pvc nfs-csi-test
kubectl get pv | grep nfs-csi-test

# Verify mount works in a pod
kubectl run nfs-test --image=busybox --rm -it --restart=Never \
  --overrides='{"spec":{"volumes":[{"name":"nfs","persistentVolumeClaim":{"claimName":"nfs-csi-test"}}],"containers":[{"name":"test","image":"busybox","command":["sh","-c","echo test > /nfs/file.txt && cat /nfs/file.txt"],"volumeMounts":[{"mountPath":"/nfs","name":"nfs"}]}]}}'
```

## Best Practices

- Install `nfs-common` (Debian) or `nfs-utils` (RHEL) on all cluster nodes before deploying the driver - the CSI node DaemonSet requires NFS utilities on the host to perform mounts.
- Use `volumeBindingMode: Immediate` for NFS StorageClasses since NFS volumes are not zone-affine and do not require `WaitForFirstConsumer`.
- Set `reclaimPolicy: Retain` for production data StorageClasses - with `Delete`, the entire NFS subdirectory is removed when the PVC is deleted.
- Use the `nfsvers=4.1` mount option for production to benefit from NFSv4.1 features including parallel NFS (pNFS) and better locking semantics.
- Monitor the CSI controller and node DaemonSet pods for mount errors - NFS mount failures appear in the node DaemonSet logs and as `FailedMount` events on pods.

## Conclusion

The NFS CSI driver deployed via Flux CD provides a standards-compliant CSI interface for NFS-backed PersistentVolumes, supporting both dynamic provisioning and static pre-provisioned volumes. Its clean separation between the controller (PV lifecycle management) and node DaemonSet (mounting) makes it more maintainable than older NFS provisioners. With Flux managing the driver deployment and StorageClass definitions, your NFS storage configuration is version-controlled and consistently applied across clusters, while the CSI interface ensures compatibility with standard Kubernetes storage operations like snapshots and volume statistics.
