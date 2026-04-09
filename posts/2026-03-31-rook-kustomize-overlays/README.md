# How to Set Up Rook-Ceph with Kustomize Overlays

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kustomize, GitOps, Kubernetes, Configuration Management

Description: Learn how to configure Rook-Ceph using Kustomize overlays for multi-environment deployments, enabling environment-specific customization while sharing a common base configuration.

---

## Overview

Kustomize overlays allow you to define a base Rook-Ceph configuration and apply environment-specific patches for staging and production without duplicating YAML files.

## Repository Structure

```text
rook-kustomize/
  base/
    kustomization.yaml
    namespace.yaml
    operator.yaml
    cluster.yaml
    storageclass.yaml
  overlays/
    staging/
      kustomization.yaml
      cluster-patch.yaml
    production/
      kustomization.yaml
      cluster-patch.yaml
      resource-patch.yaml
```

## Base Configuration

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- namespace.yaml
- https://raw.githubusercontent.com/rook/rook/v1.14.0/deploy/examples/crds.yaml
- https://raw.githubusercontent.com/rook/rook/v1.14.0/deploy/examples/common.yaml
- https://raw.githubusercontent.com/rook/rook/v1.14.0/deploy/examples/operator.yaml
- cluster.yaml
- storageclass.yaml
```

```yaml
# base/cluster.yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.4
  dataDirHostPath: /var/lib/rook
  storage:
    useAllNodes: true
    useAllDevices: false
```

## Staging Overlay

```yaml
# overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- ../../base
patches:
- path: cluster-patch.yaml
  target:
    kind: CephCluster
    name: rook-ceph
```

```yaml
# overlays/staging/cluster-patch.yaml
- op: replace
  path: /spec/storage/useAllDevices
  value: true
- op: add
  path: /spec/resources
  value:
    mgr:
      requests:
        cpu: "100m"
        memory: "512Mi"
    osd:
      requests:
        cpu: "200m"
        memory: "1Gi"
```

## Production Overlay

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- ../../base
patches:
- path: cluster-patch.yaml
  target:
    kind: CephCluster
    name: rook-ceph
- path: resource-patch.yaml
  target:
    kind: CephCluster
    name: rook-ceph
```

```yaml
# overlays/production/cluster-patch.yaml
- op: replace
  path: /spec/storage/useAllDevices
  value: false
- op: add
  path: /spec/storage/nodes
  value:
  - name: storage-1
    devices:
    - name: sdb
  - name: storage-2
    devices:
    - name: sdb
  - name: storage-3
    devices:
    - name: sdb
```

## Applying Overlays

```bash
# Preview staging config
kubectl kustomize overlays/staging | less

# Apply staging
kubectl kustomize overlays/staging | kubectl apply -f -

# Apply production
kubectl kustomize overlays/production | kubectl apply -f -
```

Or via ArgoCD:

```yaml
spec:
  source:
    repoURL: https://github.com/myorg/rook-kustomize
    path: overlays/production
    kustomize: {}
```

## Summary

Kustomize overlays provide a clean way to manage Rook-Ceph across multiple environments. A shared base defines common resources, while overlays apply environment-specific patches for resource sizing, storage device selection, and replica counts. This avoids YAML duplication while maintaining environment fidelity.
