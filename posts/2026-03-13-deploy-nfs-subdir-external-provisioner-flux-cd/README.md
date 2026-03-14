# How to Deploy NFS Subdir External Provisioner with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, NFS, Storage Provisioner, ReadWriteMany, Shared Storage

Description: Deploy the NFS Subdir External Provisioner for NFS-backed Kubernetes storage using Flux CD for GitOps-managed network file system provisioning.

---

## Introduction

The NFS Subdir External Provisioner dynamically provisions Kubernetes PersistentVolumes backed by an existing NFS server. When a PVC is created, the provisioner automatically creates a subdirectory on the NFS share. It's the simplest way to add `ReadWriteMany` (RWX) storage to a Kubernetes cluster when you already have NFS infrastructure.

While NFS has performance limitations compared to Ceph or distributed storage, it is widely available, easy to understand, and perfectly adequate for many workloads: CI/CD artifact storage, shared configuration, development environments, and legacy application workloads.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- An existing NFS server with an exported share
- `nfs-common` installed on all Kubernetes nodes (`apt install nfs-common`)
- `kubectl` and `flux` CLIs installed

## Step 1: Verify NFS Server Accessibility

```bash
# On any Kubernetes node, test NFS mount
showmount -e <nfs-server-ip>
# Expected output:
# Export list for <nfs-server-ip>:
# /mnt/nfs-share *

# Test manual mount
mount -t nfs <nfs-server-ip>:/mnt/nfs-share /tmp/nfs-test
ls /tmp/nfs-test
umount /tmp/nfs-test
```

## Step 2: Add the NFS Provisioner HelmRepository

```yaml
# infrastructure/sources/nfs-provisioner-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: nfs-subdir-external-provisioner
  namespace: flux-system
spec:
  interval: 12h
  url: https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner
```

## Step 3: Deploy the NFS Subdir External Provisioner

```yaml
# infrastructure/storage/nfs/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: nfs-provisioner
```

```yaml
# infrastructure/storage/nfs/provisioner.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nfs-subdir-external-provisioner
  namespace: nfs-provisioner
spec:
  interval: 30m
  chart:
    spec:
      chart: nfs-subdir-external-provisioner
      version: "4.0.18"
      sourceRef:
        kind: HelmRepository
        name: nfs-subdir-external-provisioner
        namespace: flux-system
  values:
    # NFS server connection settings
    nfs:
      server: 10.0.0.100          # NFS server IP or hostname
      path: /mnt/nfs-share        # NFS export path
      mountOptions:
        - nfsvers=4.1             # use NFSv4.1 for better performance
        - rsize=1048576           # read size 1 MiB
        - wsize=1048576           # write size 1 MiB
        - hard                    # retry on failure
        - intr                    # allow interrupt
        - timeo=14                # 14 × 0.1s = 1.4s timeout
        - retrans=2               # retry 2 times before error

    # StorageClass configuration
    storageClass:
      name: nfs-client
      # Make this the default StorageClass for development clusters
      defaultClass: false
      reclaimPolicy: Delete
      # Subdirectory naming: ${namespace}-${pvcName}-${pvName}
      pathPattern: "${.PVC.namespace}/${.PVC.annotations.nfs.io/storage-path:${.PVC.name}}"
      onDelete: delete           # delete the NFS subdirectory on PVC deletion
      # OR: onDelete: retain      # keep the directory for manual inspection

    resources:
      requests:
        cpu: "50m"
        memory: "64Mi"
      limits:
        cpu: "200m"
        memory: "128Mi"
```

## Step 4: Create Multiple NFS StorageClasses

For different use cases, create multiple StorageClasses pointing to different NFS paths:

```yaml
# infrastructure/storage/nfs/additional-storageclasses.yaml
# High-speed NFS for CI/CD artifacts (NVMe-backed NFS)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-fast
provisioner: cluster.local/nfs-subdir-external-provisioner
reclaimPolicy: Delete
allowVolumeExpansion: false  # NFS doesn't support resize
parameters:
  pathPattern: "fast/${.PVC.namespace}/${.PVC.name}"
  onDelete: delete
---
# Retain StorageClass for important data
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-retain
provisioner: cluster.local/nfs-subdir-external-provisioner
reclaimPolicy: Retain
parameters:
  pathPattern: "retained/${.PVC.namespace}/${.PVC.name}"
  onDelete: retain   # keep the directory even after PVC deletion
---
# Archived StorageClass for cheap NFS-backed archive storage
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-archive
provisioner: cluster.local/nfs-subdir-external-provisioner
reclaimPolicy: Retain
parameters:
  pathPattern: "archive/${.PVC.namespace}/${.PVC.name}"
  onDelete: retain
```

## Step 5: Test with ReadWriteMany PVC

```yaml
# Test that RWX works with multiple pods simultaneously
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-shared-test
  namespace: default
spec:
  accessModes:
    - ReadWriteMany   # NFS supports multiple simultaneous readers/writers
  storageClassName: nfs-client
  resources:
    requests:
      storage: 5Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nfs-test-writer
  namespace: default
spec:
  replicas: 3   # 3 pods sharing the same NFS volume
  selector:
    matchLabels:
      app: nfs-test
  template:
    metadata:
      labels:
        app: nfs-test
    spec:
      volumes:
        - name: nfs-data
          persistentVolumeClaim:
            claimName: nfs-shared-test
      containers:
        - name: writer
          image: busybox
          command: ["sh", "-c", "while true; do hostname >> /data/writers.log; sleep 5; done"]
          volumeMounts:
            - name: nfs-data
              mountPath: /data
```

## Step 6: Flux Kustomization

```yaml
# clusters/production/nfs-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: nfs-provisioner
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/storage/nfs
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: nfs-subdir-external-provisioner
      namespace: nfs-provisioner
```

## Step 7: Verify NFS Provisioning

```bash
# Check provisioner is running
kubectl get deployment nfs-subdir-external-provisioner -n nfs-provisioner

# Check StorageClasses
kubectl get storageclass | grep nfs

# Create a test PVC and verify NFS directory is created
kubectl create namespace nfs-test
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-pvc
  namespace: nfs-test
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: nfs-client
  resources:
    requests:
      storage: 1Gi
EOF

kubectl get pvc test-pvc -n nfs-test

# Verify NFS directory was created on the server
ssh nfs-server "ls /mnt/nfs-share/nfs-test/"
```

## Best Practices

- Use NFSv4.1 (`nfsvers=4.1`) for better performance and atomic operations compared to NFSv3.
- Set `rsize` and `wsize` to 1 MiB for sequential workloads; reduce to 64KB for random small I/O.
- Use `hard` mount option for production — `soft` mounts silently fail on server timeout, corrupting data.
- Consider `onDelete: retain` for production data even if the StorageClass `reclaimPolicy` is Delete — you can always manually clean up directories.
- Secure the NFS server with IP-based exports (`/mnt/share 10.0.0.0/24(rw,sync,no_subtree_check)`) to restrict which nodes can mount.

## Conclusion

The NFS Subdir External Provisioner deployed via Flux CD provides simple, immediate ReadWriteMany storage provisioning for Kubernetes clusters with existing NFS infrastructure. It is the fastest path to RWX persistent volumes when you don't need the advanced features of Ceph or a dedicated distributed filesystem. With Flux managing the provisioner deployment and StorageClass configuration, your NFS storage is consistently defined in Git and automatically applied across your clusters.
