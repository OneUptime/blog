# Validation Summary: How to Back Up VMs in Harvester

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- Kubernetes
- KubeVirt
- Longhorn
- S3-compatible object storage
- NFS
- `kubectl`

## Sources Consulted
- Harvester VM Backup, Snapshot & Restore: https://docs.harvesterhci.io/v1.7/vm/backup-restore/
- Harvester Settings: https://docs.harvesterhci.io/v1.7/advanced/index/
- Harvester `Setting` type source: https://raw.githubusercontent.com/harvester/harvester/master/pkg/apis/harvesterhci.io/v1beta1/settings.go
- Harvester `VirtualMachineBackup` type source: https://raw.githubusercontent.com/harvester/harvester/master/pkg/apis/harvesterhci.io/v1beta1/backup.go
- Harvester `ScheduleVMBackup` type source: https://raw.githubusercontent.com/harvester/harvester/master/pkg/apis/harvesterhci.io/v1beta1/schedulebackup.go
- Longhorn Setting a Backup Target: https://longhorn.io/docs/latest/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn Create a Backup: https://longhorn.io/docs/latest/snapshots-and-backups/backup-and-restore/create-a-backup/

## Issues Found
- The post treated Harvester VM backup support as generally applicable to all VM disks. I corrected the wording to make clear that Harvester backup support is for Longhorn-backed VM volumes.
- The S3 UI guidance implied using `https://s3.amazonaws.com` as the AWS endpoint and setting `Virtual Hosted-Style` to `true`. I corrected this to match current Harvester and Longhorn guidance: the S3 endpoint can be left blank for AWS S3, and `virtualHostedStyle` should only be enabled when the target requires it.
- The NFS configuration example used separate `Server Address` and `Mount Point` fields. I corrected this to the actual NFS backup target URL format used by Harvester and Longhorn, for example `nfs://192.168.1.50:/exports/harvester-backups`.
- The `Setting` manifest was not valid for current Harvester. It incorrectly treated `Setting` as namespaced, used `spec.value` instead of the top-level `value` field, and referenced a secret name that is not part of the documented `backup-target` setting schema. I replaced it with a valid cluster-scoped `Setting` example using the documented JSON fields.
- The verification command for the backup target incorrectly used `-n harvester-system` with a cluster-scoped `Setting`. I removed the namespace from the command.
- The UI action for manual backups was labeled as `Backup`. I corrected it to `Take Backup`, which matches the current Harvester UI documentation.
- The post claimed Harvester had no built-in scheduler and recommended a Kubernetes `CronJob`. This is outdated for current Harvester. I replaced that section with Harvester’s native scheduled VM backup feature, available as of v1.4.0, and provided a `ScheduleVMBackup` example.
- The backup status examples referenced fields such as `.status.phase` and `.status.size`, which are not part of the current `VirtualMachineBackup` status schema. I updated the examples to use fields that actually exist, such as `readyToUse` and `progress`.
- The final verification section was described as an integrity check even though the commands only verify resource status and object presence. I adjusted the wording to describe what the commands actually validate.

## Review Notes
- The corrected post is accurate for current Harvester documentation as of April 30, 2026.
- Scheduled VM backups are a Harvester feature and should be preferred over Longhorn recurring jobs for VM workflows; Harvester documentation explicitly warns that Longhorn recurring jobs are not integrated into Harvester and can conflict with Harvester operations.
- The post does not cover guest filesystem quiescing, Ubuntu `netplan` restore caveats, or restore workflows. Those omissions are acceptable for this guide but could be useful future additions.
