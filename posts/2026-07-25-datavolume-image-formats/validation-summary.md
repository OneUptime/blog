# Validation Summary: Raw vs qcow2 vs ISO: Choosing a DataVolume Image Format

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Kubernetes
- KubeVirt
- Containerized Data Importer (CDI)
- DataVolumes and PersistentVolumeClaims
- QEMU `qemu-img`
- raw, qcow2, and ISO VM image formats
- gzip and xz transport compression

## Sources Consulted

- [CDI README: imports and content types](https://github.com/kubevirt/containerized-data-importer/blob/main/README.md#content-types)
- [CDI DataVolumes documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md)
- [CDI scratch-space documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/scratch-space.md)
- [CDI registry-image documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/image-from-registry.md)
- [KubeVirt CDI supported image formats](https://kubevirt.io/user-guide/storage/containerized_data_importer/#supported-image-formats)
- [KubeVirt filesystems, disks, and volumes](https://kubevirt.io/user-guide/storage/disks_and_volumes/)
- [QEMU `qemu-img` documentation](https://www.qemu.org/docs/master/tools/qemu-img.html)
- [QEMU QMP reference for `ImageInfo`](https://www.qemu.org/docs/master/interop/qemu-qmp-ref.html)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes `kubectl describe` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/)
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [GNU Coreutils `du` documentation](https://www.gnu.org/software/coreutils/du)

## Issues Found

- The post described QEMU's `actual-size` value as the artifact size. That field reports the image's allocated size on the local filesystem and may differ from the file length transferred over HTTP when the file itself is sparse. The text now describes the value as local filesystem usage.
- The post advised adding filesystem overhead to the DataVolume size without distinguishing CDI's two target APIs. With `DataVolume.spec.storage`, CDI already inflates the rendered filesystem-mode PVC request to account for the configured overhead; adding it again would double-count it. The guidance now says to request at least the image's virtual size, add a deliberate growth margin, and let `spec.storage` account for filesystem overhead.

## Review Notes

- `cdi.kubevirt.io/v1beta1`, `spec.storage`, `contentType: kubevirt`, `volumeMode: Filesystem`, and the KubeVirt `cdrom`/`dataVolume` fields remain current.
- CDI's image resize expands the virtual disk container; guest partitions and filesystems may still need guest-side expansion before they can use additional space.
- `du --apparent-size` is a GNU Coreutils option and is not portable to every BSD/macOS `du` implementation.
- The example URLs and storage class names are intentionally illustrative and must be replaced with resources available to the reader's cluster.
