# How to Deploy Piraeus Operator (LINSTOR) with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Piraeus, LINSTOR, DRBD, Replicated Storage, Block Storage

Description: Deploy the Piraeus Operator for LINSTOR-backed replicated block storage on Kubernetes using Flux CD for GitOps-managed high-performance distributed storage.

---

## Introduction

Piraeus is the Kubernetes operator for LINSTOR, a software-defined storage system built on DRBD (Distributed Replicated Block Device). LINSTOR manages storage volumes that are synchronously replicated across nodes using DRBD's kernel-level replication, delivering near-local-disk performance with the reliability of replicated storage. It is widely used as an alternative to Ceph in environments where low latency and simplicity are priorities.

The Piraeus operator deploys and manages all LINSTOR components: the LINSTOR controller (cluster metadata and API), LINSTOR satellites (per-node storage agents), and the LINSTOR CSI driver. Together these components provide dynamically provisioned PersistentVolumes backed by DRBD-replicated volumes that can fail over between nodes without data loss.

Deploying Piraeus through Flux CD gives you GitOps-managed replicated storage infrastructure. The operator's CRDs - `LinstorCluster`, `LinstorSatelliteConfiguration`, and `LinstorNodeConnection` - are version-controlled in Git, ensuring consistent storage topology configuration and reproducible cluster deployments.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- Nodes with raw block devices or LVM thin pools for LINSTOR storage pools
- Linux nodes with kernel headers available so the Piraeus DRBD module loader can build or load DRBD 9
- `kubectl` and `flux` CLIs installed

## Step 1: Add the Piraeus OCIRepository

```yaml
# infrastructure/sources/piraeus-oci.yaml

apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: piraeus
  namespace: flux-system
spec:
  interval: 12h
  url: oci://ghcr.io/piraeusdatastore/piraeus-operator/piraeus
  ref:
    semver: "2.7.0"
  layerSelector:
    mediaType: "application/vnd.cncf.helm.chart.content.v1.tar+gzip"
    operation: copy
```

## Step 2: Create the Namespace

```yaml
# infrastructure/storage/piraeus/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: piraeus-datastore
```

## Step 3: Deploy the Piraeus Operator

```yaml
# infrastructure/storage/piraeus/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: piraeus-operator
  namespace: piraeus-datastore
spec:
  interval: 30m
  chartRef:
    kind: OCIRepository
    name: piraeus
    namespace: flux-system
  values:
    # Install the Piraeus CRDs with the operator chart
    installCRDs: true

    # Operator controller resources
    operator:
      resources:
        requests:
          cpu: "100m"
          memory: "128Mi"
        limits:
          cpu: "500m"
          memory: "256Mi"

    # Let the chart generate the webhook TLS certificate
    tls:
      autogenerate: true
```

## Step 4: Configure the LINSTOR Cluster

```yaml
# infrastructure/storage/piraeus/linstor-cluster.yaml
apiVersion: piraeus.io/v1
kind: LinstorCluster
metadata:
  name: linstor
  namespace: piraeus-datastore
spec:
  # LINSTOR controller configuration
  controller:
    enabled: true
    podTemplate:
      spec:
        containers:
          - name: linstor-controller
            resources:
              requests:
                cpu: "200m"
                memory: "512Mi"
              limits:
                cpu: "1"
                memory: "1Gi"

  # Properties applied at the LINSTOR controller level
  properties:
    - name: DrbdOptions/auto-quorum
      value: io-error   # return I/O errors on quorum loss
    - name: DrbdOptions/Resource/on-no-data-accessible
      value: io-error

  # CSI driver configuration
  csiController:
    enabled: true
    podTemplate:
      spec:
        containers:
          - name: linstor-csi
            resources:
              requests:
                cpu: "50m"
                memory: "64Mi"
              limits:
                cpu: "200m"
                memory: "256Mi"
```

## Step 5: Configure Satellite Storage Pools

```yaml
# infrastructure/storage/piraeus/satellite-config.yaml
apiVersion: piraeus.io/v1
kind: LinstorSatelliteConfiguration
metadata:
  name: storage-pool-config
  namespace: piraeus-datastore
spec:
  # Apply to all nodes with the storage label
  nodeSelector:
    piraeus.io/satellite: "true"

  # LVM thin pool storage configuration
  storagePools:
    - name: thinpool
      # LVM thin provisioned pool - most flexible for snapshots
      lvmThinPool:
        volumeGroup: piraeus-vg
        thinPool: piraeus-thinpool

  # DRBD options for all resources on these nodes
  properties:
    - name: Aux/topology-zone
      valueFrom:
        nodeFieldRef: metadata.labels['topology.kubernetes.io/zone']

  # Satellite pod resources
  podTemplate:
    spec:
      containers:
        - name: linstor-satellite
          resources:
            requests:
              cpu: "200m"
              memory: "256Mi"
            limits:
              cpu: "2"
              memory: "2Gi"
```

Label your storage nodes:

```bash
# Label nodes that have storage devices managed by LINSTOR
kubectl label node storage-node-1 piraeus.io/satellite=true
kubectl label node storage-node-2 piraeus.io/satellite=true
kubectl label node storage-node-3 piraeus.io/satellite=true
```

## Step 6: Create StorageClasses

```yaml
# infrastructure/storage/piraeus/storageclasses.yaml

# Replicated block storage - 2 copies (survives 1 node failure)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: piraeus-r2
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: linstor.csi.linbit.com
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Delete
parameters:
  linstor.csi.linbit.com/storagePool: thinpool
  linstor.csi.linbit.com/placementCount: "2"   # 2 replicas
  linstor.csi.linbit.com/layerList: "drbd storage"
  property.linstor.csi.linbit.com/DrbdOptions/Net/rr-conflict: retry-connect
---
# Replicated block storage - 3 copies for critical data
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: piraeus-r3
provisioner: linstor.csi.linbit.com
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Retain   # retain for databases
parameters:
  linstor.csi.linbit.com/storagePool: thinpool
  linstor.csi.linbit.com/placementCount: "3"   # 3 replicas
  linstor.csi.linbit.com/layerList: "drbd storage"
---
# Local storage (no replication) - highest performance
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: piraeus-local
provisioner: linstor.csi.linbit.com
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Delete
parameters:
  linstor.csi.linbit.com/storagePool: thinpool
  linstor.csi.linbit.com/placementCount: "1"   # no replication
  linstor.csi.linbit.com/layerList: "storage"   # no DRBD layer
```

## Step 7: Configure VolumeSnapshotClass

```yaml
# infrastructure/storage/piraeus/snapshot-class.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: piraeus-snapclass
  annotations:
    snapshot.storage.kubernetes.io/is-default-class: "true"
driver: linstor.csi.linbit.com
deletionPolicy: Delete
```

## Step 8: Flux Kustomization

```yaml
# clusters/production/piraeus-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: piraeus
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/storage/piraeus
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: piraeus-operator
      namespace: piraeus-datastore
    - apiVersion: piraeus.io/v1
      kind: LinstorCluster
      name: linstor
      namespace: piraeus-datastore
```

## Step 9: Verify the Cluster

```bash
# Check operator and LINSTOR pods
kubectl get pods -n piraeus-datastore

# Check LINSTOR cluster status
kubectl exec -n piraeus-datastore deploy/linstor-controller -- \
  linstor node list

# Check storage pools on satellites
kubectl exec -n piraeus-datastore deploy/linstor-controller -- \
  linstor storage-pool list

# Test PVC creation
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: piraeus-test
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: piraeus-r2
  resources:
    requests:
      storage: 10Gi
EOF

kubectl get pvc piraeus-test

# Verify DRBD resource was created
kubectl exec -n piraeus-datastore deploy/linstor-controller -- \
  linstor resource list
```

## Best Practices

- Use LVM thin pools as the LINSTOR storage backend to enable efficient snapshot support and thin provisioning - raw device pools do not support snapshots.
- Set `placementCount: "3"` for databases and stateful workloads that cannot tolerate data loss - two-replica deployments lose access to the volume if one node fails during maintenance.
- Configure `DrbdOptions/auto-quorum: io-error` to prevent split-brain by returning I/O errors rather than corrupting data when quorum is lost.
- Use `volumeBindingMode: WaitForFirstConsumer` for all Piraeus StorageClasses - this ensures LINSTOR places the primary replica on the same node where the pod is scheduled, minimizing remote I/O.
- Monitor DRBD resource states with `linstor resource list` - a resource stuck in `SyncTarget` state indicates replication is catching up after a node reconnection.

## Conclusion

The Piraeus Operator deployed via Flux CD provides LINSTOR-backed replicated block storage that combines the performance of local NVMe with the resilience of synchronous DRBD replication. Its straightforward architecture - controller, satellites, and CSI driver - is simpler to operate than Ceph while delivering comparable performance for block storage workloads. With Flux managing the operator, `LinstorCluster`, and StorageClass configurations in Git, your replicated storage infrastructure is reproducible, auditable, and consistently deployed across every cluster in your fleet.
