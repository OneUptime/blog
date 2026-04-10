# How to Use Ceph with Kubernetes Ephemeral Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Ephemeral Volume, CSI, Storage, GenericEphemeralVolume

Description: Use Ceph CSI with Kubernetes generic ephemeral volumes to provision temporary storage that is automatically created and deleted with the Pod lifecycle.

---

## What are Kubernetes Ephemeral Volumes?

Kubernetes supports several types of ephemeral volumes. Generic ephemeral volumes (GA in Kubernetes 1.23) allow any CSI driver to provision temporary PVCs that are tied to a Pod's lifecycle. When the Pod is deleted, the CSI driver automatically cleans up the volume. This is perfect for scratch space, temporary caches, and intermediate data processing stages.

## How Generic Ephemeral Volumes Work

Unlike `emptyDir`, generic ephemeral volumes are backed by real persistent storage (in this case, Ceph). The kube-controller-manager creates a PVC named `<pod-name>-<volume-name>` automatically when the Pod is created.

## Using Ceph RBD for Ephemeral Volumes

Define an ephemeral volume inline in the Pod spec:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: data-processor
  namespace: batch-jobs
spec:
  containers:
    - name: processor
      image: mycompany/data-processor:latest
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
                storage: 50Gi
```

## Using CephFS for Ephemeral Shared Scratch Space

For Jobs that spawn multiple Pods needing shared ephemeral storage, use CephFS:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: ml-training
  namespace: ml-platform
spec:
  template:
    spec:
      containers:
        - name: trainer
          image: mycompany/ml-trainer:latest
          volumeMounts:
            - name: dataset-cache
              mountPath: /cache
      volumes:
        - name: dataset-cache
          ephemeral:
            volumeClaimTemplate:
              spec:
                accessModes:
                  - ReadWriteMany
                storageClassName: rook-ceph-filesystem
                resources:
                  requests:
                    storage: 200Gi
      restartPolicy: Never
```

## Verifying Automatic PVC Creation

```bash
# List PVCs created for ephemeral volumes
kubectl get pvc -n batch-jobs

# The PVC name follows the pattern: <pod-name>-<volume-name>
# Example: data-processor-scratch

# Verify it's deleted when the Pod is removed
kubectl delete pod data-processor -n batch-jobs
kubectl get pvc -n batch-jobs  # Should show no PVCs
```

## Resource Quotas for Ephemeral Volumes

Ephemeral volumes count against namespace resource quotas. Apply limits to prevent runaway storage consumption:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: batch-storage-quota
  namespace: batch-jobs
spec:
  hard:
    requests.storage: "2Ti"
    persistentvolumeclaims: "20"
    rook-ceph-block.storageclass.storage.k8s.io/requests.storage: "1Ti"
```

## Comparison: Ephemeral Volume Types

```text
emptyDir       - Node-local, no CSI driver, lost on node restart
genericEphemeral - CSI-backed (Ceph), durable, auto-cleaned on Pod delete
CSI ephemeral  - Driver-specific, not all drivers support it
```

## Summary

Kubernetes generic ephemeral volumes backed by Ceph combine the convenience of automatically managed storage with the durability and capacity of a distributed storage system. The kube-controller-manager handles PVC creation and deletion transparently, making ephemeral Ceph volumes ideal for batch jobs, ML training pipelines, and any workload needing significant scratch space without manual PVC lifecycle management.
