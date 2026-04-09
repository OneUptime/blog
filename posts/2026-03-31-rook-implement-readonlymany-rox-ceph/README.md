# How to Implement ReadOnlyMany (ROX) Storage with Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Storage, PVC, Access Mode, Read-Only, CephFS

Description: Configure ReadOnlyMany persistent volumes with Ceph for distributing read-only data like ML models, static assets, and configuration files to many pods simultaneously.

---

## What is ReadOnlyMany?

ReadOnlyMany (ROX) is a Kubernetes access mode that mounts a volume as read-only across multiple nodes and pods simultaneously. ROX is useful for distributing static data - machine learning model weights, reference datasets, static web assets, and configuration bundles - to many consumers without allowing modification.

## When to Use ROX vs. RWX

| Scenario | Recommended Mode |
|----------|-----------------|
| Static ML model serving | ROX |
| Shared mutable cache | RWX |
| Reference data / lookup tables | ROX |
| Log collection from multiple pods | RWX |
| Immutable content distribution | ROX |

## Creating an ROX PVC from an Existing Volume

The most common ROX pattern is to pre-populate a volume, then share it read-only. Start by creating a writable PVC:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ml-models-source
  namespace: ml-platform
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: rook-cephfs
  resources:
    requests:
      storage: 20Gi
```

Populate it with your model files using a Job:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: model-loader
  namespace: ml-platform
spec:
  template:
    spec:
      containers:
        - name: loader
          image: alpine:3.19
          command: ["/bin/sh", "-c"]
          args:
            - |
              wget -O /models/model.onnx https://example.com/model.onnx
              echo "Model loaded successfully"
          volumeMounts:
            - name: models
              mountPath: /models
      volumes:
        - name: models
          persistentVolumeClaim:
            claimName: ml-models-source
      restartPolicy: OnFailure
```

## Creating a Static PV for ROX Access

Create a PersistentVolume that references the same underlying CephFS path but specifies ROX access:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: ml-models-readonly
spec:
  capacity:
    storage: 20Gi
  accessModes:
    - ReadOnlyMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: rook-cephfs
  csi:
    driver: rook-ceph.cephfs.csi.ceph.com
    volumeHandle: <copy-volumeHandle-from-source-pv>
    volumeAttributes:
      clusterID: rook-ceph
      fsName: myfs
      staticVolume: "true"
    nodeStageSecretRef:
      name: rook-csi-cephfs-node
      namespace: rook-ceph
```

Then create an ROX PVC bound to this PV:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ml-models-readonly
  namespace: ml-platform
spec:
  accessModes:
    - ReadOnlyMany
  storageClassName: rook-cephfs
  volumeName: ml-models-readonly
  resources:
    requests:
      storage: 20Gi
```

## Using ROX PVC in Inference Deployments

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: model-server
  namespace: ml-platform
spec:
  replicas: 10
  selector:
    matchLabels:
      app: model-server
  template:
    metadata:
      labels:
        app: model-server
    spec:
      containers:
        - name: inference
          image: mycompany/inference-server:latest
          volumeMounts:
            - name: models
              mountPath: /opt/models
              readOnly: true
      volumes:
        - name: models
          persistentVolumeClaim:
            claimName: ml-models-readonly
            readOnly: true
```

## Summary

ReadOnlyMany volumes in Ceph allow immutable data to be distributed safely to many pods across the cluster. By pre-populating a CephFS volume and re-exposing it as ROX, you enforce data immutability at the storage layer rather than relying on application-level controls. This pattern is ideal for ML model serving, reference data distribution, and static asset delivery.
