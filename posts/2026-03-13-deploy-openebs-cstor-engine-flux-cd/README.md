# How to Deploy OpenEBS cStor Engine with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, OpenEBS, cStor, Block Storage, Storage Engine

Description: Deploy OpenEBS cStor storage engine to Kubernetes using Flux CD for GitOps-managed enterprise-grade block storage with snapshots and replication.

---

## Introduction

OpenEBS is a leading open-source container-native storage project that provides multiple storage engines for different use cases. The cStor engine is OpenEBS's enterprise storage engine offering copy-on-write (COW) snapshots, thin provisioning, and synchronous data replication across nodes. It uses ZFS-inspired concepts for data integrity and is well-suited for stateful workloads requiring advanced storage features.

Deploying OpenEBS cStor through Flux CD gives you GitOps control over storage pools, storage classes, and volume policies. The OpenEBS operator is available as a Helm chart that manages cStor through CRDs.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- Worker nodes with available block devices (unformatted) for cStor pools
- `kubectl` and `flux` CLIs installed

## Step 1: Add the OpenEBS HelmRepository

```yaml
# infrastructure/sources/openebs-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: openebs
  namespace: flux-system
spec:
  interval: 12h
  url: https://openebs.github.io/openebs
```

## Step 2: Deploy OpenEBS with cStor

```yaml
# infrastructure/storage/openebs/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: openebs
```

```yaml
# infrastructure/storage/openebs/openebs.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: openebs
  namespace: openebs
spec:
  interval: 30m
  chart:
    spec:
      chart: openebs
      version: "3.10.0"
      sourceRef:
        kind: HelmRepository
        name: openebs
        namespace: flux-system
  install:
    crds: Create
  upgrade:
    crds: CreateReplace
  values:
    # Enable cStor engine
    cstor:
      enabled: true
      resources:
        requests:
          cpu: "100m"
          memory: "128Mi"
        limits:
          cpu: "500m"
          memory: "512Mi"
    # Disable Local PV engines if not needed
    localprovisioner:
      enabled: false
    ndm:
      enabled: true   # Node Device Manager for block device discovery
      resources:
        requests:
          cpu: "50m"
          memory: "64Mi"
```

## Step 3: Create a cStor Pool Cluster

After deploying the operator, discover available block devices:

```bash
kubectl get blockdevice -n openebs
```

Then create a CStorPoolCluster:

```yaml
# infrastructure/storage/openebs/cstor-pool-cluster.yaml
apiVersion: cstor.openebs.io/v1
kind: CStorPoolCluster
metadata:
  name: cspc-stripe
  namespace: openebs
spec:
  pools:
    # Pool on node 1
    - nodeSelector:
        kubernetes.io/hostname: node-1
      dataRaidGroups:
        - blockDevices:
            - blockDeviceName: blockdevice-abc123def456
      poolConfig:
        dataRaidGroupType: stripe   # stripe for performance; mirror for redundancy
        writeCacheGroupType: ""
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
          limits:
            cpu: "1"
            memory: "2Gi"
        roThresholdLimit: 85   # make pool read-only at 85% capacity

    # Pool on node 2
    - nodeSelector:
        kubernetes.io/hostname: node-2
      dataRaidGroups:
        - blockDevices:
            - blockDeviceName: blockdevice-xyz789abc012
      poolConfig:
        dataRaidGroupType: stripe

    # Pool on node 3
    - nodeSelector:
        kubernetes.io/hostname: node-3
      dataRaidGroups:
        - blockDevices:
            - blockDeviceName: blockdevice-pqr345stu678
      poolConfig:
        dataRaidGroupType: stripe
```

## Step 4: Create a StorageClass

```yaml
# infrastructure/storage/openebs/cstor-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cstor-csi-disk
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: cstor.csi.openebs.io
allowVolumeExpansion: true
reclaimPolicy: Delete
parameters:
  cas-type: cstor
  cstorPoolCluster: cspc-stripe
  replicaCount: "3"   # replicate data across 3 pool instances
```

## Step 5: Create a VolumeSnapshotClass

```yaml
# infrastructure/storage/openebs/cstor-snapshot-class.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: csi-cstor-snapshotclass
  annotations:
    snapshot.storage.kubernetes.io/is-default-class: "true"
driver: cstor.csi.openebs.io
deletionPolicy: Delete
```

## Step 6: Flux Kustomization

```yaml
# clusters/production/openebs-cstor-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: openebs-cstor
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/storage/openebs
  prune: true
  dependsOn:
    - name: openebs-operator
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: openebs-ndm
      namespace: openebs
```

## Step 7: Verify and Test

```bash
# Check block devices discovered by NDM
kubectl get blockdevice -n openebs -o wide

# Check cStor pool cluster
kubectl get cspc -n openebs
kubectl get cspi -n openebs  # pool instances

# Create a test PVC
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: cstor-pvc-test
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: cstor-csi-disk
  resources:
    requests:
      storage: 10Gi
EOF

# Check PVC is bound
kubectl get pvc cstor-pvc-test

# Check cStor volume
kubectl get cstorvolume -n openebs

# Take a snapshot
kubectl apply -f - <<EOF
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: cstor-test-snapshot
spec:
  volumeSnapshotClassName: csi-cstor-snapshotclass
  source:
    persistentVolumeClaimName: cstor-pvc-test
EOF
```

## Best Practices

- Use `replicaCount: "3"` in the StorageClass for production volumes to ensure data is replicated across pool instances on different nodes.
- Set `roThresholdLimit: 85` on pool config to prevent 100% capacity from causing data corruption.
- Use the `mirror` RAID group type for the pool when using multiple disks on a node for combined redundancy and performance.
- Monitor cStor pool and volume health with Prometheus and alert on `CStorVolumeReplica` degraded status.
- Take snapshots before significant operations (database upgrades, batch jobs) and verify restore procedures regularly.

## Conclusion

OpenEBS cStor deployed via Flux CD provides enterprise-grade block storage with synchronous replication, COW snapshots, and thin provisioning using your existing node disks. The `CStorPoolCluster` and `StorageClass` CRDs are fully GitOps-managed, making it straightforward to adjust replication factors or add new pools through pull requests. For Kubernetes clusters without dedicated storage hardware, OpenEBS cStor delivers a compelling storage solution that scales with your infrastructure.
