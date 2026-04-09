# Validation Summary: How to Set Up Rook-Ceph with Kubernetes Federation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (storage orchestration for Kubernetes)
- KubeFed (Kubernetes Federation v2)
- ArgoCD ApplicationSets
- Kustomize overlays
- Ceph RBD CSI driver
- Kubernetes StorageClass and CephBlockPool CRDs

## Sources Consulted
- KubeFed GitHub repository status: https://github.com/kubernetes-retired/kubefed (archived April 2023)
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook Block Storage StorageClass examples: https://rook.io/docs/rook/v1.12/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook RBD StorageClass example on GitHub: https://github.com/rook/rook/blob/master/deploy/examples/csi/rbd/storageclass-ec.yaml
- ArgoCD ApplicationSet documentation (apiVersion verification)
- Kustomize documentation (bases vs resources deprecation)

## Issues Found

1. **KubeFed project is retired/archived**: The KubeFed project was archived in April 2023 and the repository moved from `kubernetes-sigs/kubefed` to `kubernetes-retired/kubefed`. The original Helm chart URL (`https://raw.githubusercontent.com/kubernetes-sigs/kubefed/master/charts`) returns a 404. Added a deprecation note and updated the Helm repo URL to point to `kubernetes-retired/kubefed`.

2. **Missing required node-stage-secret parameters in StorageClass**: The FederatedStorageClass was missing `csi.storage.k8s.io/node-stage-secret-name` and `csi.storage.k8s.io/node-stage-secret-namespace` parameters. These are required for the CSI node plugin to authenticate and map RBD images on nodes. Without them, volumes cannot be mounted. Added `rook-csi-rbd-node` and `rook-ceph` as the secret name and namespace respectively.

3. **Deprecated Kustomize `bases` field**: The kustomization.yaml example used the `bases` field, which has been deprecated since Kustomize v2.1.0 (2019). Changed to `resources`, which is the current replacement.

4. **Incorrect code fence language**: The kustomization.yaml code block used ` ```bash ` as the language identifier instead of ` ```yaml `. Changed to `yaml` for correct syntax highlighting.

## Review Notes
- The ArgoCD ApplicationSet `apiVersion: argoproj.io/v1alpha1` is still correct as of Argo CD 2.13+. No promotion to v1beta1 or v1 has occurred.
- The CephBlockPool CRD fields (`spec.failureDomain`, `spec.replicated.size`, `spec.replicated.requireSafeReplicaSize`, `spec.parameters.compression_mode`, `spec.parameters.compression_algorithm`) are all correct per current Rook documentation.
- The CSI provisioner name `rook-ceph.rbd.csi.ceph.com` follows the correct `<namespace>.rbd.csi.ceph.com` format.
- The StorageClass example could also benefit from `csi.storage.k8s.io/controller-expand-secret-name` and `csi.storage.k8s.io/controller-expand-secret-namespace` for volume expansion support, but these are optional and not strictly required for basic functionality.
- While KubeFed is archived, the post already recommends ArgoCD as the simpler and more widely adopted option, which is sound advice.
