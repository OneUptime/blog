# Validation Summary: Why Is My CDI DataVolume Stuck in Pending or `WaitForFirstConsumer`?

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered

- Kubernetes
- KubeVirt
- Containerized Data Importer (CDI)
- DataVolumes and PersistentVolumeClaims
- StorageClasses and `WaitForFirstConsumer`
- CDI StorageProfiles and volume populators
- Container Storage Interface (CSI) drivers
- `kubectl` and `virtctl`

## Sources Consulted

- [CDI WaitForFirstConsumer storage handling](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/waitforfirstconsumer-storage-handling.md)
- [CDI DataVolume documentation and phases](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md)
- [CDI volume populators](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/cdi-populators.md)
- [CDI StorageProfiles](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/storageprofile.md)
- [CDI ResourceQuota handling](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/quota.md)
- [KubeVirt local storage placement for VM disks](https://github.com/kubevirt/kubevirt/blob/main/docs/localstorage-disks.md)
- [KubeVirt filesystems, disks, and volumes](https://kubevirt.io/user-guide/storage/disks_and_volumes/)
- [KubeVirt run strategies](https://kubevirt.io/user-guide/compute/run_strategies/)
- [KubeVirt CDI and `virtctl image-upload`](https://kubevirt.io/user-guide/storage/containerized_data_importer/)
- [Kubernetes StorageClass volume binding modes](https://kubernetes.io/docs/concepts/storage/storage-classes/#volume-binding-mode)
- [Kubernetes persistent volumes and claims](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes ResourceQuota documentation](https://kubernetes.io/docs/concepts/policy/resource-quotas/#storage-resource-quota)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes `kubectl describe` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/)
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)

## Issues Found

- The post described only the legacy CDI `WaitForFirstConsumer` path. For a DataVolume targeting eligible CSI storage, CDI automatically uses volume populators unless that behavior is disabled, and the WFFC state is reported as `PendingPopulation` instead. The diagnosis text and healthy phase examples now cover both paths.
- The post said CDI always begins population after the target PVC binds. That is correct for the legacy flow, but with CDI volume populators a temporary PVC is bound and populated while the target PVC remains Pending until population completes. The explanation now distinguishes those binding sequences.
- The post implied that the final workload itself always initiates placement. In the legacy KubeVirt flow, KubeVirt can use a special ephemeral consumer Pod carrying the VM's scheduling requirements. The wording now accurately describes KubeVirt initiating placement through a consumer with those requirements.

## Review Notes

- The KubeVirt `kubevirt.io/v1` VirtualMachine example, `runStrategy: Always`, DataVolume volume reference, node selector, and disk configuration are current and syntactically valid.
- The `kubectl` commands, JSONPath expression, event sorting, watch syntax, immediate-binding annotation, and `virtctl image-upload --force-bind` flag are current.
- CDI phase transitions differ for imports, uploads, clones, legacy population, and volume-populator workflows, so the post correctly directs readers to events and conditions as the authoritative diagnosis.
- All four documentation links already present in the post resolved successfully during validation.
