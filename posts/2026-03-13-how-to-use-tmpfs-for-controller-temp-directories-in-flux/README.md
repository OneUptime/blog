# How to Use tmpfs for Controller Temp Directories in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Performance, Tmpfs, Storage, Controller

Description: Improve Flux controller I/O performance by mounting tmpfs volumes for temporary directories instead of relying on disk-backed storage.

---

## Why tmpfs Matters for Flux Controllers

Flux controllers write temporary files during reconciliation. The source-controller clones Git repositories and downloads Helm charts to a temporary directory. The kustomize-controller writes built manifests to disk before applying them. These I/O operations happen on every reconciliation cycle, and when the underlying storage is a slow network-attached disk, the latency adds up quickly.

By mounting a tmpfs volume for these temporary directories, all I/O happens in memory. This eliminates disk latency entirely and can significantly reduce reconciliation times, especially in cloud environments where the default ephemeral storage is backed by network disks.

## How tmpfs Works in Kubernetes

A tmpfs volume is an emptyDir volume with the `medium` field set to `Memory`. Kubernetes backs the volume with RAM instead of disk. The contents are lost when the pod restarts, which is perfectly acceptable for temporary files that are regenerated on every reconciliation.

## Configuring tmpfs for the Source Controller

The source-controller uses `/tmp` for cloning repositories and downloading charts. Mount a tmpfs volume at that path:

```yaml
# clusters/my-cluster/flux-system/source-controller-tmpfs-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          volumeMounts:
            - name: tmpfs
              mountPath: /tmp
      volumes:
        - name: tmpfs
          emptyDir:
            medium: Memory
            sizeLimit: 1Gi
```

## Configuring tmpfs for the Kustomize Controller

```yaml
# clusters/my-cluster/flux-system/kustomize-controller-tmpfs-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          volumeMounts:
            - name: tmpfs
              mountPath: /tmp
      volumes:
        - name: tmpfs
          emptyDir:
            medium: Memory
            sizeLimit: 512Mi
```

## Configuring tmpfs for the Helm Controller

```yaml
# clusters/my-cluster/flux-system/helm-controller-tmpfs-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: helm-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          volumeMounts:
            - name: tmpfs
              mountPath: /tmp
      volumes:
        - name: tmpfs
          emptyDir:
            medium: Memory
            sizeLimit: 512Mi
```

## Adding the Patches to Kustomization

```yaml
# clusters/my-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: source-controller-tmpfs-patch.yaml
    target:
      kind: Deployment
      name: source-controller
  - path: kustomize-controller-tmpfs-patch.yaml
    target:
      kind: Deployment
      name: kustomize-controller
  - path: helm-controller-tmpfs-patch.yaml
    target:
      kind: Deployment
      name: helm-controller
```

## Sizing the tmpfs Volume

The `sizeLimit` field controls how much memory the tmpfs volume can consume. Set it based on the size of your largest artifacts:

- Source controller: should accommodate the largest Git repository clone or Helm chart archive. 1Gi is a safe starting point for most setups.
- Kustomize controller: needs enough space for the largest set of rendered manifests. 512Mi is usually sufficient.
- Helm controller: similar to the kustomize controller. 512Mi is a reasonable default.

Keep in mind that tmpfs memory counts against the container's memory limits. Make sure to increase memory limits by at least the sizeLimit amount.

## Applying the Change

```bash
git add clusters/my-cluster/flux-system/
git commit -m "Mount tmpfs for Flux controller temp directories"
git push
```

## Measuring the Impact

Compare reconciliation times before and after the change using Flux metrics:

```bash
kubectl exec -n flux-system deploy/source-controller -- \
  curl -s localhost:8080/metrics | grep gotk_reconcile_duration_seconds
```

You should see a reduction in reconciliation duration, particularly for large repositories or charts.

## Summary

Mounting tmpfs volumes for Flux controller temporary directories is a simple optimization that removes disk I/O from the reconciliation path. It is especially effective in cloud environments where ephemeral storage has high latency. Size the volumes appropriately and increase container memory limits to match.
