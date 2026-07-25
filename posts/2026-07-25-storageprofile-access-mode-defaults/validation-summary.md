# Validation Summary: Why Does CDI Pick the Wrong Access Mode? Understanding StorageProfile Defaults

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Kubernetes
- kubectl
- KubeVirt
- Containerized Data Importer (CDI)
- DataVolumes
- StorageProfiles
- StorageClasses
- PersistentVolumes and PersistentVolumeClaims
- CSI storage drivers

## Sources Consulted

- [CDI StorageProfile documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/storageprofile.md)
- [CDI DataVolume target storage documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md)
- [CDI v1.65.0 DataVolume PVC rendering implementation](https://github.com/kubevirt/containerized-data-importer/blob/v1.65.0/pkg/controller/datavolume/util.go)
- [CDI v1.65.0 DataVolume PVC rendering tests](https://github.com/kubevirt/containerized-data-importer/blob/v1.65.0/pkg/controller/datavolume/util_test.go)
- [CDI v1.65.0 StorageProfile controller](https://github.com/kubevirt/containerized-data-importer/blob/v1.65.0/pkg/controller/storageprofile-controller.go)
- [Kubernetes Persistent Volumes documentation](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes StorageClasses documentation](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes PersistentVolumeClaim API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-claim-v1/)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes kubectl JSONPath reference](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [KubeVirt live migration documentation](https://kubevirt.io/user-guide/compute/live_migration/)
- Local `kubectl get --help` output from kubectl v1.34.1

## Issues Found

- The introduction stated that CDI renders every omitted access mode or volume mode from the StorageProfile. CDI first tries the profile, but a missing `volumeMode` can remain unset so that Kubernetes applies its `Filesystem` default when no profile set matches an explicitly supplied access mode. The introduction now describes that fallback.
- The no-match explanation was ambiguous about which partial DataVolume specification fails. When `volumeMode` is explicit and `accessModes` is omitted, CDI requires a matching StorageProfile property set and reports `ErrClaimNotValid` if none exists. When `accessModes` is explicit and `volumeMode` is omitted, CDI can leave `volumeMode` unset for the Kubernetes `Filesystem` default. The post now states both cases precisely.
- The default-StorageClass paragraph did not account for DataVolume content type. CDI gives the virtualization-default StorageClass priority for the default KubeVirt disk-image content type, while `contentType: archive` uses the normal Kubernetes default. The introduction and StorageClass paragraph now scope the behavior correctly.
- The live-migration paragraph understated the documented KubeVirt requirement. For a VM using a PVC, current KubeVirt documentation requires shared `ReadWriteMany` storage for live migration. The paragraph now states that requirement and advises checking the VMI's `LiveMigratable` condition and CSI driver support.

## Review Notes

The `cdi.kubevirt.io/v1beta1` API examples, StorageProfile field names, default virtualization StorageClass annotation, access-mode definitions, kubectl commands, and external documentation links were verified as current. The post does not pin a CDI or Kubernetes version; the no-match behavior was checked against CDI v1.65.0 and current CDI main, so it should be revalidated if CDI changes its PVC-rendering rules.
