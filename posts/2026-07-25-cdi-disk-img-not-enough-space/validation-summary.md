# Validation Summary: Fix disk.img Not Enough Space Errors in CDI

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes
- kubectl
- KubeVirt
- Containerized Data Importer (CDI)
- DataVolumes and PersistentVolumeClaims
- StorageClasses, filesystem-mode volumes, and raw block volumes
- CDI scratch space and filesystem overhead
- QEMU `qemu-img`, qcow2, and raw disk images
- CSI storage drivers and container runtimes

## Sources Consulted
- [CDI DataVolume storage API and block volume mode](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md#target-storagepvc)
- [CDI configuration and filesystem overhead](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/cdi-config.md)
- [CDI scratch-space behavior](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/scratch-space.md)
- [CDI scratch PVC sizing implementation](https://github.com/kubevirt/containerized-data-importer/blob/main/pkg/controller/util.go)
- [CDI import controller scratch-space selection](https://github.com/kubevirt/containerized-data-importer/blob/main/pkg/controller/import-controller.go)
- [CDI DataVolume examples](https://github.com/kubevirt/containerized-data-importer/tree/main/manifests/example)
- [QEMU `qemu-img` command reference](https://www.qemu.org/docs/master/tools/qemu-img.html)
- [QEMU `ImageInfo` field definitions](https://www.qemu.org/docs/master/interop/qemu-storage-daemon-qmp-ref.html)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes `kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes PersistentVolume capacity, volume mode, and expansion](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes StorageClass reference](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [KubeVirt filesystems, disks, and volumes](https://kubevirt.io/user-guide/storage/disks_and_volumes/)

## Issues Found
- The scratch-space section said CDI requests scratch at the DataVolume size. Current CDI derives the scratch claim request from the rendered target PVC request and adjusts for the configured filesystem overhead of the target and scratch StorageClasses. Updated the statement to describe that derivation without implying that the two manifest requests are always identical.
- The recovery DataVolume example omitted `apiVersion` and `kind`, so it was not a complete Kubernetes resource manifest. Added `apiVersion: cdi.kubevirt.io/v1beta1` and `kind: DataVolume`.
- The PVC expansion caveat described capability in terms of CSI support. Expansion depends on the underlying storage driver or volume plugin supporting resize, so the wording now uses the more accurate general term.
- The block-mode section said raw block mode requires CSI. Kubernetes and KubeVirt also support statically provisioned raw block volumes, so CSI is not an inherent requirement. Changed this to require raw block support from the storage backend or provisioner, KubeVirt, CDI, and the container runtime.

## Review Notes
The diagnostic kubectl commands and JSONPath expressions are valid. The qcow2 virtual-size explanation, CDI `spec.storage` overhead-aware rendering, 0.06 global overhead default, per-StorageClass configuration, scratch `ReadWriteOnce`/`Filesystem` behavior, `pullMethod: node` exception, PVC expansion caveats, and `cdi.kubevirt.io/v1beta1` API examples match the current official documentation and CDI implementation. The post is not tied to a specific CDI or KubeVirt release, so operators using older releases should verify the same fields and behavior in their installed release documentation.
