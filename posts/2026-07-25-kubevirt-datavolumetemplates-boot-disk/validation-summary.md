# Validation Summary: How to Use `dataVolumeTemplates` So a KubeVirt VM Waits for Its Boot Disk

## Status

validated

## Post Type

Technical tutorial and troubleshooting guide

## Technologies Covered

- Kubernetes
- KubeVirt
- Containerized Data Importer (CDI)
- DataVolumes and `dataVolumeTemplates`
- PersistentVolumeClaims and StorageClasses
- `WaitForFirstConsumer` volume binding
- cloud-init NoCloud
- `kubectl` and `virtctl`
- DataImportCron and DataSource

## Sources Consulted

- [CDI DataVolumes documentation, including status phases and KubeVirt integration](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md)
- [KubeVirt filesystems, disks, volumes, DataVolume VM behavior, and cloud-init documentation](https://kubevirt.io/user-guide/storage/disks_and_volumes/)
- [KubeVirt run strategies documentation](https://kubevirt.io/user-guide/compute/run_strategies/)
- [Current KubeVirt API reference](https://kubevirt.io/api-reference/main/definitions.html)
- [Current CDI API reference for DataVolume, DataImportCron, and DataSource](https://kubevirt.io/cdi-api-reference/main/definitions.html)
- [KubeVirt VM controller source for DataVolume readiness and `WaitForFirstConsumer`](https://github.com/kubevirt/kubevirt/blob/main/pkg/virt-controller/watch/vm/vm.go)
- [KubeVirt VMI controller source for the temporary `WaitForFirstConsumer` pod](https://github.com/kubevirt/kubevirt/blob/main/pkg/virt-controller/watch/vmi/lifecycle.go)
- [KubeVirt pod template source showing that VMI placement constraints are carried into the temporary pod](https://github.com/kubevirt/kubevirt/blob/main/pkg/virt-controller/services/template.go)
- [Kubernetes StorageClass and `WaitForFirstConsumer` documentation](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes `kubectl apply` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes `kubectl describe` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/)
- [cloud-init users and SSH authorized keys documentation](https://docs.cloud-init.io/en/latest/reference/yaml_examples/user_groups.html)

## Issues Found

- The manifest used a documentation-only image URL and environment-specific namespace and StorageClass without saying they were prerequisites. Added a sentence requiring CDI, the namespace, the StorageClass, and a reachable replacement image URL before applying the manifest.
- The opening stated that KubeVirt always prevents the VM launcher from being scheduled until population succeeds. Modern `WaitForFirstConsumer` handling can schedule a temporary pod with no VM payload before the DataVolume succeeds, so the statement now accurately says that KubeVirt prevents the guest from starting.
- The linear control-flow example placed VMI scheduling after `Succeeded` without limiting that sequence to immediate volume binding. Qualified it as the expected flow for an immediately binding StorageClass.
- The troubleshooting section said an incomplete DataVolume implies that no VMI exists. With `WaitForFirstConsumer`, KubeVirt creates the VMI and a temporary provisioning pod so the PVC can bind using the VM's placement constraints. Updated both the `WaitForFirstConsumer` explanation and troubleshooting note to describe that behavior.

## Review Notes

- The `kubevirt.io/v1` VirtualMachine API, `runStrategy`, embedded DataVolume `storage` fields, HTTP source, `contentType: kubevirt`, disk and volume references, and cloud-init NoCloud fields are current and valid.
- The statement that `running` and `runStrategy` are mutually exclusive is correct; `running` is deprecated in favor of `runStrategy`.
- The `kubectl` and `virtctl` command forms are current. All YAML snippets parse successfully.
- The owner-reference lifecycle warning, DataVolume phase troubleshooting, and DataImportCron/DataSource golden-image recommendation are consistent with current KubeVirt and CDI behavior.
- All four links in the post's Official Documentation section resolve to the intended current documentation.
