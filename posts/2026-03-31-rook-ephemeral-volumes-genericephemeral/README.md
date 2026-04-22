# How to Use Ephemeral Volumes (GenericEphemeralVolume) with Rook CSI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CSI, Kubernetes, Volume

Description: Learn how to use Kubernetes GenericEphemeralVolumes with Rook CSI drivers to provision temporary storage that is automatically cleaned up with the pod.

---

## What Are GenericEphemeralVolumes

Kubernetes `GenericEphemeralVolume` (stable since Kubernetes 1.23) allows you to define a PVC inline within a Pod spec. The PVC is created when the pod starts and automatically deleted when the pod is removed. This is ideal for temporary processing storage, scratch space for batch jobs, or caches - anything where you want pod-scoped storage without manually managing PVCs.

Rook CSI drivers (RBD and CephFS) fully support GenericEphemeralVolumes, enabling ephemeral Ceph-backed storage at pod level.

## Using GenericEphemeralVolume with RBD

Define the volume directly in the pod spec using the `ephemeral` field:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: batch-job
  namespace: my-app
spec:
  containers:
    - name: processor
      image: python:3.12
      command:
        - python
        - /app/process.py
      volumeMounts:
        - name: scratch
          mountPath: /tmp/scratch
  volumes:
    - name: scratch
      ephemeral:
        volumeClaimTemplate:
          spec:
            accessModes:
              - ReadWriteOnce
            storageClassName: rook-ceph-block
            resources:
              requests:
                storage: 20Gi
```

When this pod is scheduled, Rook CSI dynamically provisions a 20Gi RBD image. When the pod is deleted, the PVC and RBD image are automatically cleaned up.

## Using GenericEphemeralVolume with CephFS

For shared or filesystem-type ephemeral storage, use the CephFS StorageClass:

```yaml
volumes:
  - name: working-dir
    ephemeral:
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteMany
          storageClassName: rook-cephfs
          resources:
            requests:
              storage: 50Gi
```

CephFS ephemeral volumes provide POSIX filesystem semantics for per-pod temporary storage. Note that each pod in a parallel Job gets its own ephemeral PVC - GenericEphemeralVolumes are not shared across pods. To share a volume across parallel pods, use a regular PVC instead.

## Lifecycle and Cleanup Behavior

The PVC created by a GenericEphemeralVolume is named after the pod and volume:

```bash
kubectl get pvc -n my-app | grep batch-job
```

Output:

```text
batch-job-scratch   Bound   pvc-abc123   20Gi   RWO   rook-ceph-block   10s
```

When the pod object is deleted from the cluster, Kubernetes garbage-collects the PVC automatically via owner references. The Rook CSI provisioner then deletes the underlying Ceph volume. Note that a terminated pod still exists as an API object until explicitly deleted or cleaned up by a controller such as the Job controller.

## Using in Kubernetes Jobs

GenericEphemeralVolumes work well in Jobs for transient data processing:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-transform
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: transform
          image: my-etl:latest
          volumeMounts:
            - name: staging
              mountPath: /data/staging
      volumes:
        - name: staging
          ephemeral:
            volumeClaimTemplate:
              spec:
                accessModes:
                  - ReadWriteOnce
                storageClassName: rook-ceph-block
                resources:
                  requests:
                    storage: 100Gi
```

Each job run gets fresh ephemeral storage. No manual PVC cleanup is needed between runs.

## Summary

GenericEphemeralVolumes with Rook CSI provide automatically managed, pod-scoped storage using the full power of Ceph-backed volumes. Define the PVC inline in the pod spec under `volumes[].ephemeral.volumeClaimTemplate`, and Rook CSI handles provisioning and cleanup. This pattern eliminates manual PVC lifecycle management for batch jobs, caches, and any workload that needs temporary high-performance storage.
