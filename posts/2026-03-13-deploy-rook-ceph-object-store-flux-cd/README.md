# How to Deploy Rook-Ceph Object Store with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Rook, Ceph, Object Storage, S3

Description: Deploy Rook-Ceph object storage with S3-compatible API on Kubernetes using Flux CD for GitOps-managed distributed object storage.

---

## Introduction

Rook is a cloud-native storage orchestrator that turns distributed storage systems like Ceph into self-managing, self-healing storage services. Ceph's object store provides an S3-compatible API (via RADOS Gateway), making it a drop-in replacement for AWS S3 in on-premises or air-gapped environments.

Deploying Rook-Ceph through Flux CD gives you GitOps control over your storage cluster - from the number of OSD nodes and replication factor to object store configuration and bucket policies. The Rook operator is available as a Helm chart, and storage clusters are defined through `CephCluster` and `CephObjectStore` CRDs.

## Prerequisites

- Kubernetes v1.26+ with at least 3 worker nodes having dedicated raw block devices
- Flux CD bootstrapped to your Git repository
- Minimum 3 raw block devices (unformatted) or directories for Ceph OSDs
- `kubectl` and `flux` CLIs installed

## Step 1: Add the Rook HelmRepository

```yaml
# infrastructure/sources/rook-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: rook-release
  namespace: flux-system
spec:
  interval: 12h
  url: https://charts.rook.io/release
```

## Step 2: Deploy the Rook Operator

```yaml
# infrastructure/storage/rook-ceph/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: rook-ceph
```

```yaml
# infrastructure/storage/rook-ceph/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: rook-ceph-operator
  namespace: rook-ceph
spec:
  interval: 30m
  chart:
    spec:
      chart: rook-ceph
      version: "v1.14.9"
      sourceRef:
        kind: HelmRepository
        name: rook-release
        namespace: flux-system
  install:
    crds: Create
  upgrade:
    crds: CreateReplace
  values:
    monitoring:
      enabled: true
    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "500m"
        memory: "512Mi"
```

## Step 3: Create the Ceph Cluster

```yaml
# infrastructure/storage/rook-ceph/ceph-cluster.yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.4   # Ceph Reef
    allowUnsupported: false

  dataDirHostPath: /var/lib/rook

  mon:
    count: 3
    allowMultiplePerNode: false

  mgr:
    count: 2
    modules:
      - name: pg_autoscaler
        enabled: true

  dashboard:
    enabled: true
    ssl: false

  monitoring:
    enabled: true

  network:
    connections:
      requireMsgr2: true

  crashCollector:
    disable: false

  cleanupPolicy:
    confirmation: ""
    sanitizeDisks:
      method: quick
      dataSource: zero
    allowUninstallWithVolumes: false

  storage:
    useAllNodes: true
    useAllDevices: false
    deviceFilter: "nvme.*"   # only use NVMe devices for OSDs
    config:
      osdsPerDevice: "1"

  resources:
    mgr:
      requests:
        cpu: "500m"
        memory: "512Mi"
    mon:
      requests:
        cpu: "500m"
        memory: "1Gi"
    osd:
      requests:
        cpu: "500m"
        memory: "2Gi"
      limits:
        cpu: "2"
        memory: "4Gi"
```

## Step 4: Create the Ceph Object Store

```yaml
# infrastructure/storage/rook-ceph/object-store.yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  metadataPool:
    failureDomain: host
    replicated:
      size: 3
  dataPool:
    failureDomain: host
    erasureCoded:
      dataChunks: 2
      codingChunks: 1
  preservePoolsOnDelete: true
  gateway:
    port: 80
    resources:
      requests:
        cpu: "500m"
        memory: "512Mi"
      limits:
        cpu: "1"
        memory: "1Gi"
    instances: 2
    priorityClassName: system-cluster-critical
  healthCheck:
    bucket:
      disabled: false
      interval: 60s
```

## Step 5: Create a StorageClass for Object Buckets

```yaml
# infrastructure/storage/rook-ceph/storageclass-bucket.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-delete-bucket
provisioner: rook-ceph.ceph.rook.io/bucket
reclaimPolicy: Delete
parameters:
  objectStoreName: my-store
  objectStoreNamespace: rook-ceph
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-retain-bucket
provisioner: rook-ceph.ceph.rook.io/bucket
reclaimPolicy: Retain
parameters:
  objectStoreName: my-store
  objectStoreNamespace: rook-ceph
```

## Step 6: Create a Bucket via ObjectBucketClaim

```yaml
# apps/my-app/bucket-claim.yaml
apiVersion: objectbucket.io/v1alpha1
kind: ObjectBucketClaim
metadata:
  name: my-app-bucket
  namespace: myapp
spec:
  generateBucketName: my-app
  storageClassName: rook-ceph-delete-bucket
```

## Step 7: Flux Kustomization

```yaml
# clusters/production/rook-ceph-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: rook-ceph-storage
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/storage/rook-ceph
  prune: true
  dependsOn:
    - name: rook-ceph-operator
  healthChecks:
    - apiVersion: ceph.rook.io/v1
      kind: CephCluster
      name: rook-ceph
      namespace: rook-ceph
  timeout: 15m
```

## Step 8: Verify the Object Store

```bash
# Check Ceph cluster health
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph status

# Check object store is ready
kubectl get cephobjectstore my-store -n rook-ceph

# Get S3 endpoint and credentials
kubectl get service rook-ceph-rgw-my-store -n rook-ceph
kubectl get secret my-app-bucket -n myapp -o yaml

# Test S3 API access
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin bucket list
```

## Best Practices

- Run 3 Ceph monitors (`mon.count: 3`) for quorum - never run 2 or 4.
- Use erasure coding (`erasureCoded: dataChunks: 2, codingChunks: 1`) for the data pool to reduce storage overhead compared to 3-way replication.
- Use the Ceph dashboard for visual monitoring but configure Prometheus metrics via `monitoring.enabled: true` for alerting.
- Apply node taints (`rook-ceph/cluster=my-cluster:NoSchedule`) to storage nodes to prevent application workloads from competing with Ceph for CPU and memory.
- Test data durability by simulating OSD failures before going to production.

## Conclusion

Rook-Ceph object storage deployed via Flux CD gives you a production-grade, S3-compatible object store that runs entirely within your Kubernetes cluster. The `CephCluster`, `CephObjectStore`, and `ObjectBucketClaim` CRDs provide a fully declarative storage API managed by Flux. Applications use standard S3 SDKs to interact with the store, making Rook-Ceph a transparent replacement for AWS S3 in on-premises environments.
