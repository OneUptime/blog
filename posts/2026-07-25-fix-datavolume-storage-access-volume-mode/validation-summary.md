# Validation Summary: How to Fix “DataVolume.storage Spec Is Missing accessMode and volumeMode”

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- KubeVirt
- Containerized Data Importer (CDI)
- DataVolume custom resources
- StorageProfile custom resources
- PersistentVolumeClaims and StorageClasses
- CSI storage drivers
- kubectl

## Sources Consulted
- [CDI StorageProfiles documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/storageprofile.md)
- [CDI DataVolumes documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md)
- [CDI DataVolume validating webhook source](https://github.com/kubevirt/containerized-data-importer/blob/main/pkg/apiserver/webhooks/datavolume-validate.go)
- [CDI DataVolume PVC-rendering source](https://github.com/kubevirt/containerized-data-importer/blob/main/pkg/controller/datavolume/util.go)
- [CDI StorageProfile controller source](https://github.com/kubevirt/containerized-data-importer/blob/main/pkg/controller/storageprofile-controller.go)
- [CDI storage-class selection source](https://github.com/kubevirt/containerized-data-importer/blob/main/pkg/controller/common/util.go)
- [CDI v1beta1 API types](https://github.com/kubevirt/containerized-data-importer/blob/main/staging/src/kubevirt.io/containerized-data-importer-api/pkg/apis/core/v1beta1/types.go)
- [CDI v1.65.0 release](https://github.com/kubevirt/containerized-data-importer/releases/tag/v1.65.0)
- [Kubernetes Persistent Volumes: volume modes and access modes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#volume-mode)
- [Kubernetes kubectl apply reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/)
- [Kubernetes kubectl auth can-i reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [Kubernetes kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)

## Issues Found
- The post implied that access and volume modes could be added to an existing DataVolume unless it had already created a PVC. CDI's validating webhook rejects DataVolume `spec` changes after creation regardless of whether a PVC exists. The recovery guidance now states that `kubectl apply` creates the corrected object only when it does not already exist and recommends using a new DataVolume name for a failed import.
- The empty StorageProfile example showed `status.claimPropertySets: []`, but the current CDI API uses `omitempty`, and official empty-profile output omits the field. The example now shows the field as absent while preserving the explanation that no usable claim property set is available.
- The default StorageClass selection statement was broader than CDI's implementation. The default virtualization StorageClass takes priority for the default `kubevirt` content type used by the post, while other content types can follow different fallback behavior. The statement now identifies its content-type scope.

## Review Notes
- The manifests use the current `cdi.kubevirt.io/v1beta1` API and valid field names and enum values.
- The `spec.storage` behavior, StorageProfile preference ordering, default virtualization StorageClass annotation, filesystem-overhead behavior, and `spec.pvc` comparison agree with current CDI documentation and implementation.
- The kubectl commands and flags are current. Server-side dry run validates schema and admission behavior but does not exercise the asynchronous DataVolume controller or prove that the storage driver supports the requested mode combination.
- Kubernetes also supports `ReadWriteOncePod` for compatible CSI volumes, but the post's access-mode list is explicitly presented as a list of common values rather than an exhaustive list.
