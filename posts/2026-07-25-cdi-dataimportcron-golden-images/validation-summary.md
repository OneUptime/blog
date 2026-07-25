# Validation Summary: How to Refresh Golden VM Images Automatically with CDI `DataImportCron`

## Status
validated

## Post Type
Technical tutorial and operational guide

## Technologies Covered
- Kubernetes
- KubeVirt
- Containerized Data Importer (CDI)
- `DataImportCron`
- `DataSource`
- `DataVolume`
- `StorageProfile`
- PersistentVolumeClaims and VolumeSnapshots
- ContainerDisk and OCI registry images
- Kubernetes RBAC and cron schedules

## Sources Consulted
- [CDI automated OS image import, poll, and update](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/os-image-poll-and-update.md)
- [CDI API reference](https://kubevirt.io/cdi-api-reference/main/definitions.html)
- [CDI registry image import and platform selection](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/image-from-registry.md)
- [CDI cross-namespace DataVolume cloning](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/clone-datavolume.md)
- [CDI RBAC documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/RBAC.md)
- [CDI StorageProfile documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/storageprofile.md)
- [CDI generated CRD definitions](https://github.com/kubevirt/containerized-data-importer/blob/main/pkg/operator/resources/crds_generated.go)
- [CDI DataImportCron controller implementation](https://github.com/kubevirt/containerized-data-importer/blob/main/pkg/controller/dataimportcron-controller.go)
- [Kubernetes CronJob schedule syntax](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/#schedule-syntax)
- [KubeVirt user guide examples using the Fedora ContainerDisk](https://kubevirt.io/user-guide/user_workloads/accessing_virtual_machines/)

## Issues Found
- The introduction implied that the initial import waits for the first cron schedule. CDI creates an initial polling job when a URL-backed `DataImportCron` is created, while the configured schedule controls subsequent polls. Updated the introduction and example description to distinguish the initial import from later scheduled polls.
- The namespace security guidance grouped `StorageProfile` with namespaced resources. `StorageProfile` is cluster-scoped. Updated the guidance to protect `DataImportCron`, `DataSource`, and Secrets in the golden-image namespace while separately restricting changes to cluster-scoped StorageProfiles.
- The official-documentation link labeled as DataSource reference documentation pointed to the general DataVolume guide, which does not document `DataVolumeSourceRef`. Replaced it with the CDI API reference for `sourceRef`.

## Review Notes
- The `cdi.kubevirt.io/v1beta1` manifests and the fields used in the post are current: `managedDataSource`, `garbageCollect`, `importsToKeep`, registry `platform.architecture`, and StorageProfile `dataImportCronSourceFormat`.
- The registry source supports only `contentType: kubevirt` and requires a ContainerDisk-compatible image. The referenced Fedora image is used in current KubeVirt documentation.
- Cross-namespace clones require authorization in the source namespace. CDI documents either permission to create pods or the narrower `datavolumes/source` permission.
- `platform.architecture` is present in the current API. CDI release history includes fixes to make DataImportCron honor it consistently, so the post's installed-version caveat remains appropriate.
- `DataImportCron` does not expose a time-zone field. The post correctly advises operators to confirm schedule-time interpretation for their installed controller environment.
