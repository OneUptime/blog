# Validation Summary: Upload a Local VM Disk to an Existing DataVolume with virtctl

## Status
validated

## Post Type
Technical tutorial / operational guide

## Technologies Covered
- Kubernetes
- KubeVirt
- Containerized Data Importer (CDI)
- `virtctl image-upload`
- DataVolumes and PersistentVolumeClaims
- Kubernetes StorageClasses and `WaitForFirstConsumer`
- TLS and Kubernetes RBAC
- QEMU `qemu-img`

## Sources Consulted
- [KubeVirt Containerized Data Importer user guide](https://kubevirt.io/user-guide/storage/containerized_data_importer/)
- [KubeVirt v1.8.4 `virtctl image-upload` implementation](https://github.com/kubevirt/kubevirt/blob/v1.8.4/pkg/virtctl/imageupload/imageupload.go)
- [CDI v1.65.0 upload workflow](https://github.com/kubevirt/containerized-data-importer/blob/v1.65.0/doc/upload.md)
- [CDI v1.65.0 DataVolume documentation](https://github.com/kubevirt/containerized-data-importer/blob/v1.65.0/doc/datavolumes.md)
- [CDI v1.65.0 upload RBAC documentation](https://github.com/kubevirt/containerized-data-importer/blob/v1.65.0/doc/RBAC.md#upload-token)
- [CDI v1.65.0 WaitForFirstConsumer handling](https://github.com/kubevirt/containerized-data-importer/blob/v1.65.0/doc/waitforfirstconsumer-storage-handling.md)
- [CDI v1.65.0 scratch-space documentation](https://github.com/kubevirt/containerized-data-importer/blob/v1.65.0/doc/scratch-space.md)
- [Kubernetes JSONPath documentation](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes StorageClass documentation](https://kubernetes.io/docs/concepts/storage/storage-classes/#volume-binding-mode)
- [Kubernetes `kubectl port-forward` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/)
- [QEMU `qemu-img` documentation](https://www.qemu.org/docs/master/tools/qemu-img.html)

## Issues Found
- The source-inspection example expected an empty upload object to print as `{}`. Kubernetes JSONPath renders map objects using Go's string form, so an empty upload object appears as `map[]`. Changed the query to print the complete source and documented the unambiguous `map[upload:map[]]` result.
- The post implied that `--force-bind` alone forces an existing DataVolume to bind when combined with `--no-create`. In KubeVirt v1.8.4, `virtctl` adds the immediate-binding annotation only in its object-creation paths; for an existing object, the flag only bypasses the client's `WaitForFirstConsumer` rejection while it waits. Added the required annotation command for the existing PVC before the upload command.
- The sizing guidance combined the image, filesystem overhead, and scratch requirements. With `DataVolume.spec.storage`, CDI accounts for configured filesystem overhead when it renders the underlying Filesystem PVC, while upload scratch space is a separate temporary Filesystem/ReadWriteOnce PVC. Clarified that the storage request must cover the image's virtual size and that scratch provisioning must be available separately.
- The missing-target troubleshooting item referred only to a missing DataVolume, but `virtctl --no-create` first looks up the target PVC and can fail while an existing DataVolume is still waiting for CDI to create that claim. Updated the item to cover both resources and the preparation delay.
- The post stated that starting a VM from an incomplete DataVolume could use the partial disk. KubeVirt normally gates a VM that references a DataVolume until population succeeds. Replaced the claim with the correct gating behavior while retaining `Succeeded` as the operational readiness check.

## Review Notes
- The review was performed against the latest releases available on the validation date: KubeVirt v1.8.4 and CDI v1.65.0. The post does not pin versions, so users of older installations should confirm their local `virtctl image-upload --help` output.
- `fast-rwo` and `cdi-uploadproxy.example.com` are intentionally environment-specific example values; they must be replaced with an available StorageClass and the cluster's trusted upload-proxy endpoint.
