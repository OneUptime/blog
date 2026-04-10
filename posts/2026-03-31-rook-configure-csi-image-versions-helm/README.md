# How to Configure CSI Image Versions in Rook Helm Chart

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, CSI, Helm, Image

Description: Pin specific CSI sidecar container image versions in the Rook-Ceph Helm chart to control upgrades and ensure compatibility with your Kubernetes version.

---

## Overview

The Rook-Ceph operator deploys multiple CSI sidecar containers alongside the main CSI plugin. Each sidecar has its own image and version. The Helm chart bundles default versions tested with each Rook release, but you may need to pin specific versions for Kubernetes compatibility or to use patched images.

## CSI Sidecar Images in Rook

The following sidecars are managed through Helm values:

| Sidecar | Purpose |
| --- | --- |
| driver-registrar | Registers CSI driver with kubelet |
| provisioner | Handles CreateVolume/DeleteVolume |
| attacher | Handles ControllerPublish/Unpublish |
| resizer | Handles volume expansion |
| snapshotter | Handles VolumeSnapshot operations |
| liveness-prometheus | Exposes health metrics |

## Viewing Default Image Versions

```bash
helm show values rook-release/rook-ceph | grep -A1 "repository:"
```

## Pinning CSI Sidecar Images

Override individual sidecar images in your values file:

```yaml
csi:
  provisioner:
    repository: registry.k8s.io/sig-storage/csi-provisioner
    tag: v3.6.4

  attacher:
    repository: registry.k8s.io/sig-storage/csi-attacher
    tag: v4.4.0

  resizer:
    repository: registry.k8s.io/sig-storage/csi-resizer
    tag: v1.9.3

  snapshotter:
    repository: registry.k8s.io/sig-storage/csi-snapshotter
    tag: v6.3.3

  registrar:
    repository: registry.k8s.io/sig-storage/csi-node-driver-registrar
    tag: v2.9.4

  cephcsi:
    repository: quay.io/cephcsi/cephcsi
    tag: v3.10.0
```

## Using a Private Registry

For air-gapped environments, mirror images to an internal registry and override the repository:

```yaml
csi:
  provisioner:
    repository: registry.internal.example.com/csi-provisioner
    tag: v3.6.4
  cephcsi:
    repository: registry.internal.example.com/cephcsi
    tag: v3.10.0
```

Also configure image pull secrets:

```yaml
imagePullSecrets:
  - name: internal-registry-credentials
```

## Applying Image Overrides

```bash
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  -f rook-csi-images.yaml
```

Verify the updated images on running pods:

```bash
kubectl get pod -n rook-ceph -l app=csi-rbdplugin-provisioner \
  -o jsonpath='{range .items[0].spec.containers[*]}{.name}: {.image}{"\n"}{end}'
```

## Compatibility Notes

CSI sidecar versions must be compatible with both the Kubernetes API server version and the CSI spec version. Check the compatibility matrix in the Rook documentation before changing defaults. Typically, use the versions bundled with the Rook Helm chart unless you have a specific reason to override.

## Summary

CSI image version configuration in the Rook Helm chart lets you pin sidecar images for stability, apply security patches, or redirect pulls to a private registry. Override only what is necessary and verify compatibility with your Kubernetes and Ceph versions before deploying changes to production.
