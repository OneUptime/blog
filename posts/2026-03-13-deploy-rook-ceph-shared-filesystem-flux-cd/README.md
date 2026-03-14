# How to Deploy Rook-Ceph Shared Filesystem with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Rook, Ceph, CephFS, ReadWriteMany, Shared Storage

Description: Deploy Rook-Ceph CephFS for ReadWriteMany persistent volumes on Kubernetes using Flux CD for GitOps-managed shared filesystem storage.

---

## Introduction

CephFS (Ceph Filesystem) provides a POSIX-compliant distributed filesystem backed by Ceph's object storage. It is the right storage solution when multiple pods need to simultaneously read and write to the same volume — a use case that RBD block storage cannot satisfy. CephFS supports `ReadWriteMany` (RWX) access mode, making it ideal for shared content, configuration stores, and workloads like JupyterHub that require shared home directories.

Rook manages CephFS through the `CephFilesystem` CRD, and the CSI driver exposes it as a Kubernetes StorageClass. Deploying through Flux CD gives you GitOps control over filesystem configuration, metadata pools, and data pools.

## Prerequisites

- Rook-Ceph operator and CephCluster deployed (see block storage post)
- Flux CD bootstrapped to your Git repository
- `kubectl` and `flux` CLIs installed

## Step 1: Create the CephFilesystem

```yaml
# infrastructure/storage/rook-ceph/filesystem.yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  # Metadata pool (stores filesystem metadata: directories, inodes)
  metadataPool:
    replicated:
      size: 3    # 3-way replication for metadata
    parameters:
      compression_mode: none   # don't compress metadata

  # Data pools (store actual file content)
  dataPools:
    - name: replicated
      failureDomain: host
      replicated:
        size: 3
      parameters:
        compression_mode: aggressive

  # Preserve pools when CephFilesystem is deleted (prevents data loss)
  preserveFilesystemOnDelete: true

  # MDS (Metadata Server) configuration
  metadataServer:
    activeCount: 1      # number of active MDS instances
    activeStandby: true  # one standby MDS for failover
    resources:
      requests:
        cpu: "500m"
        memory: "1Gi"
      limits:
        cpu: "1"
        memory: "2Gi"
    priorityClassName: system-cluster-critical
```

## Step 2: Create the StorageClass

```yaml
# infrastructure/storage/rook-ceph/cephfs-storageclass.yaml
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
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
mountOptions:
  - debug   # remove in production; useful for initial testing
```

## Step 3: Test with a ReadWriteMany PVC

```yaml
# Test RWX access from multiple pods
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-data
  namespace: default
spec:
  accessModes:
    - ReadWriteMany   # CephFS supports multiple simultaneous writers
  storageClassName: rook-cephfs
  resources:
    requests:
      storage: 50Gi
---
# Writer pod
apiVersion: v1
kind: Pod
metadata:
  name: writer-pod
  namespace: default
spec:
  containers:
    - name: writer
      image: busybox
      command: ["sh", "-c", "while true; do echo 'written by writer' >> /data/shared.log; sleep 5; done"]
      volumeMounts:
        - name: shared
          mountPath: /data
  volumes:
    - name: shared
      persistentVolumeClaim:
        claimName: shared-data
---
# Reader pod (simultaneous access to same PVC)
apiVersion: v1
kind: Pod
metadata:
  name: reader-pod
  namespace: default
spec:
  containers:
    - name: reader
      image: busybox
      command: ["sh", "-c", "tail -f /data/shared.log"]
      volumeMounts:
        - name: shared
          mountPath: /data
  volumes:
    - name: shared
      persistentVolumeClaim:
        claimName: shared-data
```

## Step 4: Use CephFS for JupyterHub Shared Home Directories

```yaml
# Example JupyterHub storage configuration
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: jupyterhub
  namespace: jupyter
spec:
  values:
    singleuser:
      storage:
        type: dynamic
        dynamic:
          storageClass: rook-cephfs    # RWX for user home directories
          capacity: 10Gi
        extraVolumes:
          - name: shared-datasets
            persistentVolumeClaim:
              claimName: shared-datasets-pvc   # RWX shared dataset volume
        extraVolumeMounts:
          - name: shared-datasets
            mountPath: /home/shared
            readOnly: true
```

## Step 5: Configure CephFS Quotas

Set per-PVC quotas using Ceph's native quota feature through a post-provisioning Job:

```yaml
# infrastructure/storage/rook-ceph/quota-job.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: enforce-cephfs-quotas
  namespace: rook-ceph
spec:
  schedule: "0 * * * *"   # hourly
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: ceph-tools
              image: quay.io/ceph/ceph:v18.2.4
              command:
                - /bin/sh
                - -c
                - |
                  # Set quota on specific CephFS directories
                  ceph fs subvolume setattr myfs shared-datasets max_bytes 107374182400
                  echo "Quotas applied"
```

## Step 6: Flux Kustomization

```yaml
# clusters/production/cephfs-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: rook-cephfs
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/storage/rook-ceph/filesystem
  prune: true
  dependsOn:
    - name: rook-ceph-cluster
  healthChecks:
    - apiVersion: ceph.rook.io/v1
      kind: CephFilesystem
      name: myfs
      namespace: rook-ceph
```

## Step 7: Verify CephFS

```bash
# Check filesystem status
kubectl get cephfilesystem myfs -n rook-ceph

# Check MDS status
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph fs status myfs

# Check active MDS
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph mds stat

# Verify PVC is mounted on multiple pods
kubectl get pvc shared-data -n default
kubectl exec -n default writer-pod -- df -h /data
kubectl exec -n default reader-pod -- cat /data/shared.log
```

## Best Practices

- Set `activeStandby: true` to maintain a hot-standby MDS that takes over within seconds if the active MDS fails.
- Remove the `debug` mount option before production — it adds overhead to every filesystem operation.
- Use CephFS subvolumes for multi-tenant scenarios where you need per-user quotas and isolation.
- Monitor MDS cache size and client metadata requests with Prometheus to detect performance bottlenecks.
- Prefer CephFS over NFS for shared workloads — it provides better performance and native Ceph redundancy.

## Conclusion

Rook-Ceph CephFS deployed via Flux CD provides a production-grade `ReadWriteMany` storage solution for Kubernetes workloads that require shared filesystem access. The `CephFilesystem` CRD and associated `StorageClass` are version-controlled, making it straightforward to provision shared storage for JupyterHub, content management systems, or any application that requires POSIX-compatible shared storage accessible from multiple pods simultaneously.
