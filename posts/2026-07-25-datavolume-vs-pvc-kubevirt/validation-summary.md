# Validation Summary: Kubernetes CDI DataVolume vs PVC: When Should KubeVirt Use Each?

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- KubeVirt
- Containerized Data Importer (CDI)
- DataVolume custom resources
- PersistentVolumeClaims (PVCs)
- StorageClasses and StorageProfiles
- `kubectl`

## Sources Consulted
- [CDI DataVolumes documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md)
- [Containerized Data Importer overview](https://github.com/kubevirt/containerized-data-importer/blob/main/README.md)
- [CDI StorageProfile documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/storageprofile.md)
- [KubeVirt filesystems, disks, and volumes guide](https://kubevirt.io/user-guide/storage/disks_and_volumes/)
- [KubeVirt current API reference](https://kubevirt.io/api-reference/main/definitions.html)
- [Kubernetes persistent volumes documentation](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes `kubectl api-resources` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/)
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)

## Issues Found
- The post originally said CDI starts an importer, uploader, or cloner workload for every DataVolume population operation. That was too broad because CDI can perform smart clones through storage-backend mechanisms such as CSI cloning instead of a CDI data-transfer workload. The sentence now says CDI orchestrates the required import, upload, or clone operation.

## Review Notes
- All three YAML examples parse successfully and use the current `cdi.kubevirt.io/v1beta1` DataVolume and `kubevirt.io/v1` VirtualMachine APIs.
- The DataVolume storage fields, HTTP source, `kubevirt` content type, KubeVirt disk and volume references, `runStrategy`, and `dataVolumeTemplates` placement agree with the current API references.
- The `kubectl` commands and JSONPath expression are current and syntactically valid.
- The example image URLs and `fast-rwo` StorageClass are illustrative placeholders; users must replace them with reachable image locations and a StorageClass available in their cluster.
