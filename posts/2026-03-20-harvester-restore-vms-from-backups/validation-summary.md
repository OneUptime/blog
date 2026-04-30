# Validation Summary: How to Restore VMs from Backups in Harvester

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Harvester
- Kubernetes
- KubeVirt
- `kubectl`
- `virtctl`
- S3-compatible object storage
- NFS
- Longhorn-backed VM storage

## Sources Consulted
- Harvester VM Backup, Snapshot & Restore docs: https://docs.harvesterhci.io/v1.7/vm/backup-restore/
- Harvester Settings docs: https://docs.harvesterhci.io/v1.7/advanced/index/
- Harvester `VirtualMachineRestore` and `VirtualMachineBackup` API types: https://github.com/harvester/harvester/blob/master/pkg/apis/harvesterhci.io/v1beta1/backup.go
- Harvester restore controller behavior: https://github.com/harvester/harvester/blob/master/pkg/controller/master/backup/restore.go
- Harvester restore validation rules: https://github.com/harvester/harvester/blob/master/pkg/webhook/resources/virtualmachinerestore/validator.go
- Harvester backup target settings helper: https://github.com/harvester/harvester/blob/master/pkg/settings/settings_helper.go
- Harvester `Setting` resource type: https://github.com/harvester/harvester/blob/master/pkg/apis/harvesterhci.io/v1beta1/settings.go
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- KubeVirt lifecycle docs: https://kubevirt.io/user-guide/user_workloads/lifecycle/
- KubeVirt console access docs: https://kubevirt.io/user-guide/user_workloads/accessing_virtual_machines/

## Issues Found
- The post used invalid `VirtualMachineRestore` fields and values: `type: restore`, `newVolumes`, `delete-volumes`, and `retain-volumes`. I removed unsupported fields, added `newVM: true` where required, and changed the in-place restore policy to `deletionPolicy: delete` to match the current Harvester CRD.
- The backup readiness checks were incorrect. `VirtualMachineBackup` does not expose `.status.phase=Complete`; Harvester uses `status.readyToUse` and a `Ready` condition. I updated the prerequisites and `kubectl` checks accordingly.
- The cross-cluster backup target example used the wrong `Setting` shape and unsupported keys. I changed it to the current cluster-scoped `Setting` format with top-level `value` and the documented S3 fields (`accessKeyId`, `secretAccessKey`, `bucketName`, `bucketRegion`, `cert`, `virtualHostedStyle`).
- The restore-to-new-VM examples were missing `newVM: true`, which Harvester requires when the target VM does not already exist. I fixed the single-cluster, cross-cluster, and DR test examples.
- The post told readers to start restored VMs manually after restore. Harvester’s restore controller starts the target VM automatically and marks the restore `Ready` only after the VM is ready. I replaced those steps with waits on the `VirtualMachineRestore` and `VirtualMachineInstance`.
- The stop/start command examples depended on `spec.running`, which can conflict with KubeVirt `runStrategy`. I switched the stop commands to `virtctl stop` and fixed the `kubectl wait` syntax to use `--for=delete`.
- The cross-cluster section omitted the VM image prerequisite/version caveat. I added the current Harvester behavior: automatic image sync on v1.4.0+ unless conflicting image names/display names exist, and manual identical image setup on earlier versions.

## Review Notes
- Validated against Harvester v1.7 documentation and current Harvester source as of 2026-04-30.
- Harvester documentation notes that VM backup support is limited to Longhorn-backed volumes; readers restoring VMs that rely on external storage should verify support separately.
