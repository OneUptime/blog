# Validation Summary: How to Clone a CDI DataVolume Across Kubernetes Namespaces Without RBAC Errors

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- KubeVirt Containerized Data Importer (CDI)
- DataVolumes and PersistentVolumeClaims
- Kubernetes RBAC
- ServiceAccounts and user impersonation
- CSI volume cloning and snapshot-based cloning

## Sources Consulted
- [CDI RBAC for PVC cloning](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/RBAC.md#pvc-cloning)
- [CDI DataVolume clone guide](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/clone-datavolume.md)
- [CDI efficient clone prerequisites and host-assisted fallback](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/efficient-cloning.md)
- [CDI API reference for DataVolume and StorageSpec](https://kubevirt.io/cdi-api-reference/main/definitions.html)
- [CDI project README and PVC clone behavior](https://github.com/kubevirt/containerized-data-importer/blob/main/README.md#clone-another-pvc)
- [Kubernetes RBAC authorization reference](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes `kubectl auth can-i` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [Kubernetes `kubectl apply` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/)
- [Kubernetes user impersonation reference](https://kubernetes.io/docs/reference/access-authn-authz/user-impersonation/)

## Issues Found
- The two `kubectl auth can-i` examples used the unsupported `--api-group` flag. The source check also supplied `datavolumes/source` as the positional argument, where current `kubectl auth can-i` interprets slash syntax as `TYPE/NAME`. Changed both commands to use the qualified resource `datavolumes.cdi.kubevirt.io` and changed the source authorization check to select the virtual subresource with `--subresource=source`.
- The target-permission explanation implied that the creating actor needs permission to create CDI-associated resources. Clarified that the actor needs permission to create the DataVolume in the target namespace, while CDI's controllers create the underlying PVC and clone resources with CDI-managed permissions.

## Review Notes
The post does not pin a CDI or Kubernetes version. It was validated against the current CDI documentation and main API reference on 2026-07-25. The `cdi.kubevirt.io/v1beta1` DataVolume API, `spec.source.pvc`, `spec.storage`, RBAC manifests, clone prerequisites, fallback behavior, and cited URLs are current. Actual clone strategy remains dependent on the installed CDI version, StorageProfile, CSI driver, StorageClass, snapshot support, and source-volume state.
