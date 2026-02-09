# How to Set Up Cross-Namespace PVC Sharing with Data Sources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, DevOps

Description: Discover how to share persistent volume data across Kubernetes namespaces using volume data sources and cross-namespace references for efficient storage management.

---

Kubernetes namespaces provide logical isolation between workloads, but this isolation creates challenges when you need to share persistent data across namespace boundaries. The PersistentVolume data source feature allows you to reference volumes from other namespaces, enabling data sharing without breaking namespace isolation.

## The Cross-Namespace Challenge

Traditionally, PersistentVolumeClaims (PVCs) can only reference resources within the same namespace. If you have a dataset in namespace-a that applications in namespace-b need to access, you face several awkward workarounds:

- Duplicating the data by creating separate PVCs in each namespace
- Using ReadWriteMany volumes and mounting them across namespace boundaries
- Implementing external data synchronization mechanisms
- Breaking namespace isolation by sharing credentials

None of these solutions feel natural or maintain proper Kubernetes resource boundaries.

## Understanding Volume Data Sources

Kubernetes 1.22 introduced cross-namespace volume data sources as a beta feature. This mechanism allows a PVC in one namespace to reference a PVC in another namespace as its data source, creating a clone or snapshot of the original volume.

The feature works with CSI drivers that support volume cloning. When you create a PVC with a cross-namespace data source, the CSI driver creates a new volume populated with data from the source volume.

## Enabling Cross-Namespace Data Sources

First, enable the AnyVolumeDataSource and CrossNamespaceVolumeDataSource feature gates on your cluster:

```yaml
# For kubeadm clusters, add to kube-apiserver manifest
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - name: kube-apiserver
    command:
    - kube-apiserver
    - --feature-gates=AnyVolumeDataSource=true,CrossNamespaceVolumeDataSource=true
    # ... other flags
```

For managed Kubernetes services, check if the feature is available and enabled by default in newer versions.

## Creating a ReferenceGrant

Cross-namespace access requires explicit authorization using a ReferenceGrant resource. This prevents unauthorized access to volumes across namespace boundaries:

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-data-sharing
  namespace: source-namespace
spec:
  from:
  - group: ""
    kind: PersistentVolumeClaim
    namespace: destination-namespace
  to:
  - group: ""
    kind: PersistentVolumeClaim
```

This grant allows PVCs in destination-namespace to reference PVCs in source-namespace. The grant must exist in the namespace containing the source PVC.

## Basic Cross-Namespace PVC Example

Here's how to reference a PVC from another namespace:

```yaml
# Source PVC in namespace: data-source
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: original-data
  namespace: data-source
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: csi-driver
---
# ReferenceGrant in source namespace
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-app-access
  namespace: data-source
spec:
  from:
  - group: ""
    kind: PersistentVolumeClaim
    namespace: application
  to:
  - group: ""
    kind: PersistentVolumeClaim
---
# Destination PVC in namespace: application
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: cloned-data
  namespace: application
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: csi-driver
  dataSourceRef:
    kind: PersistentVolumeClaim
    name: original-data
    namespace: data-source
```

When you create the cloned-data PVC, the CSI driver creates a new volume containing a copy of all data from original-data.

## Real-World Example: Shared Machine Learning Dataset

A common use case involves sharing large datasets across development, staging, and production namespaces:

```yaml
# ML dataset in ml-datasets namespace
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: imagenet-dataset
  namespace: ml-datasets
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 500Gi
  storageClassName: fast-nvme
---
# Grant access to development namespace
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-dev-access
  namespace: ml-datasets
spec:
  from:
  - group: ""
    kind: PersistentVolumeClaim
    namespace: ml-development
  to:
  - group: ""
    kind: PersistentVolumeClaim
    name: imagenet-dataset
---
# Grant access to production namespace
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-prod-access
  namespace: ml-datasets
spec:
  from:
  - group: ""
    kind: PersistentVolumeClaim
    namespace: ml-production
  to:
  - group: ""
    kind: PersistentVolumeClaim
    name: imagenet-dataset
---
# Development clone
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: training-data
  namespace: ml-development
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 500Gi
  storageClassName: fast-nvme
  dataSourceRef:
    kind: PersistentVolumeClaim
    name: imagenet-dataset
    namespace: ml-datasets
---
# Training job using the cloned data
apiVersion: batch/v1
kind: Job
metadata:
  name: model-training
  namespace: ml-development
spec:
  template:
    spec:
      containers:
      - name: trainer
        image: tensorflow/tensorflow:latest-gpu
        command: ["python", "/scripts/train.py"]
        volumeMounts:
        - name: dataset
          mountPath: /data
          readOnly: true
        - name: output
          mountPath: /output
        resources:
          limits:
            nvidia.com/gpu: 2
      volumes:
      - name: dataset
        persistentVolumeClaim:
          claimName: training-data
      - name: output
        emptyDir: {}
      restartPolicy: Never
```

This setup allows you to maintain a single authoritative dataset in the ml-datasets namespace while giving other namespaces their own independent copies for experimentation.

## Using VolumeSnapshots as Data Sources

You can also use VolumeSnapshots from other namespaces as data sources:

```yaml
# Snapshot in backup namespace
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: production-backup-daily
  namespace: backups
spec:
  volumeSnapshotClassName: csi-snapshots
  source:
    persistentVolumeClaimName: production-database
---
# ReferenceGrant for snapshot access
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-restore-access
  namespace: backups
spec:
  from:
  - group: ""
    kind: PersistentVolumeClaim
    namespace: disaster-recovery
  to:
  - group: snapshot.storage.k8s.io
    kind: VolumeSnapshot
---
# Restore PVC in disaster recovery namespace
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: restored-database
  namespace: disaster-recovery
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: csi-driver
  dataSourceRef:
    kind: VolumeSnapshot
    name: production-backup-daily
    namespace: backups
    apiGroup: snapshot.storage.k8s.io
```

This pattern enables centralized backup management with distributed restore capabilities.

## Security Considerations

ReferenceGrants provide fine-grained access control. You can restrict access to specific source PVCs:

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: selective-access
  namespace: data-source
spec:
  from:
  - group: ""
    kind: PersistentVolumeClaim
    namespace: trusted-app
  to:
  - group: ""
    kind: PersistentVolumeClaim
    name: sensitive-data  # Only this specific PVC
```

Without specifying a name in the "to" section, the grant allows access to all PVCs in the source namespace.

## CSI Driver Requirements

Not all CSI drivers support cross-namespace volume cloning. Check your driver's capabilities:

```bash
# Check CSI driver capabilities
kubectl get csidrivers

# Describe specific driver
kubectl describe csidriver csi.example.com
```

Look for these capabilities in the driver spec:
- Volume cloning support
- Cross-namespace reference support

Popular drivers with support include AWS EBS CSI, GCE PD CSI, and Azure Disk CSI drivers.

## Monitoring and Troubleshooting

Check PVC status to see if cross-namespace cloning succeeded:

```bash
# Check PVC events
kubectl describe pvc cloned-data -n application

# Verify data source reference
kubectl get pvc cloned-data -n application -o yaml | grep -A 5 dataSourceRef

# Check for ReferenceGrant
kubectl get referencegrant -n data-source
kubectl describe referencegrant allow-app-access -n data-source
```

Common issues include missing ReferenceGrants, CSI driver limitations, or insufficient storage quota in the destination namespace.

## Best Practices

Keep ReferenceGrants as restrictive as possible. Grant access only to specific namespaces and PVCs rather than broad permissions.

Document cross-namespace dependencies in your cluster documentation. Other operators need to understand which namespaces depend on resources from other namespaces.

Consider using VolumeSnapshots as the data source rather than live PVCs. Snapshots provide point-in-time consistency and don't impact the source volume's performance.

Monitor storage costs carefully. Cross-namespace cloning creates full copies of data, which can quickly consume storage budgets if overused.

## Conclusion

Cross-namespace PVC sharing through data sources provides a clean, Kubernetes-native way to share persistent data across namespace boundaries. By using ReferenceGrants and dataSourceRef, you maintain proper security boundaries while enabling flexible data access patterns. This approach works well for sharing datasets, creating test environments from production snapshots, and implementing disaster recovery workflows.
