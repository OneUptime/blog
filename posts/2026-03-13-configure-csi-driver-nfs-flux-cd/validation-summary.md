# Validation Summary: How to Configure CSI Driver NFS with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Flux CD
- HelmRepository and HelmRelease custom resources
- NFS CSI driver (`csi-driver-nfs`)
- Kubernetes StorageClass, PersistentVolume, and PersistentVolumeClaim
- NFS mount options

## Sources Consulted
- Kubernetes CSI Driver NFS README: https://github.com/kubernetes-csi/csi-driver-nfs
- Kubernetes CSI Driver NFS driver parameters: https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/docs/driver-parameters.md
- Kubernetes CSI Driver NFS Helm chart values and chart index: https://github.com/kubernetes-csi/csi-driver-nfs/tree/master/charts
- Kubernetes CSI Driver NFS example StorageClass and static PV manifests: https://github.com/kubernetes-csi/csi-driver-nfs/tree/master/deploy/example
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization v1 API reference: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- The HelmRelease pinned `csi-driver-nfs` to `4.9.0`, while the official chart index currently lists `4.13.2` as the latest GA chart. Updated the chart version to `4.13.2`.
- The chart values did not include resource settings for the `csi-resizer` sidecar present in current NFS CSI chart releases. Added `controller.resources.csiResizer` limits and requests consistent with the existing resource style.
- The primary StorageClass set `allowVolumeExpansion: false` and stated that NFS CSI does not support online resize. The official NFS CSI examples and driver capabilities support CSI volume expansion, so this was changed to `allowVolumeExpansion: true`.
- The static PV comment described the `volumeHandle` format as `server##share##subdir`. The official format is `{nfs-server-address}#{share-name}#{sub-dir-name}`, so the comment was corrected to `server#share#subdir`.
- The best-practices note described NFS volumes as "not zone-affine." Kubernetes documentation uses topology constraints terminology for `WaitForFirstConsumer`, so this was clarified as "not topology-constrained."

## Review Notes
The Flux `HelmRepository`, `HelmRelease`, and `Kustomization` API versions are current. The Kubernetes StorageClass, PV, PVC, and `kubectl run --overrides` examples are syntactically valid. The static NFS PV example remains a representative configuration, but real clusters should ensure the referenced namespace exists and that the NFS export permissions match the pod security context.
