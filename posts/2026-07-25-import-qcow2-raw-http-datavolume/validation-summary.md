# Validation Summary: How to Import a qcow2 or Raw VM Image into a KubeVirt DataVolume over HTTP

## Status

validated

## Post Type

Tutorial / Guide

## Technologies Covered

- Kubernetes
- KubeVirt
- Containerized Data Importer (CDI)
- DataVolumes and PersistentVolumeClaims
- HTTP and HTTPS image imports
- qcow2 and raw VM disk images
- QEMU `qemu-img`
- `kubectl` and `virtctl`

## Sources Consulted

- [CDI DataVolumes documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md)
- [CDI project overview and content types](https://github.com/kubevirt/containerized-data-importer/blob/main/README.md)
- [CDI HTTP source API types](https://github.com/kubevirt/containerized-data-importer-api/blob/main/pkg/apis/core/v1beta1/types.go)
- [CDI v1.65.0 release notes](https://github.com/kubevirt/containerized-data-importer/releases/tag/v1.65.0)
- [CDI scratch-space documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/scratch-space.md)
- [CDI WaitForFirstConsumer storage handling](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/waitforfirstconsumer-storage-handling.md)
- [KubeVirt filesystems, disks, and volumes guide](https://kubevirt.io/user-guide/storage/disks_and_volumes/)
- [KubeVirt run strategies guide](https://kubevirt.io/user-guide/compute/run_strategies/)
- [KubeVirt CDI user guide](https://kubevirt.io/user-guide/storage/containerized_data_importer/)
- [Kubernetes StorageClasses documentation](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [QEMU disk image utility documentation](https://www.qemu.org/docs/master/tools/qemu-img.html)

## Issues Found

- The DataVolume manifest targets the `vm-images` namespace, but the apply steps did not ensure that the namespace exists. Added a namespace creation command so the example works on a cluster where it has not already been created.
- The VM startup instructions said to wait for `Succeeded` before starting and implied that only `dataVolumeTemplates` automate the readiness gate. That workflow cannot make progress with a `WaitForFirstConsumer` StorageClass. Clarified that KubeVirt gates startup for every referenced DataVolume, including separately created ones, and that a VM should be started while the DataVolume is in `WaitForFirstConsumer` so KubeVirt can trigger topology-aware binding before waiting for the import.
- The troubleshooting guidance implied that all authentication must use `secretRef`. Clarified that `secretRef` supplies HTTP basic authentication, `certConfigMap` supplies custom CAs, and `secretExtraHeaders` supports sensitive header-based credentials.

## Review Notes

- HTTP checksum validation was added in CDI v1.65.0. The post correctly tells readers to confirm that the installed CRD exposes `spec.source.http.checksum` and to omit the field on older installations.
- The remaining DataVolume and VirtualMachine manifests use current APIs and valid field names. The `kubectl`, `virtctl`, `curl`, and `qemu-img` commands are syntactically valid.
- CDI's scratch-space documentation confirms that HTTP sources without working `HEAD` or byte-range support, as well as non-raw HTTP imports using custom certificates, may require scratch space.
