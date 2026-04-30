# Validation Summary: How to Configure Harvester Backup Target

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- Kubernetes
- Longhorn
- AWS S3
- MinIO
- NFS
- KubeVirt

## Sources Consulted
- Harvester VM Backup, Snapshot & Restore: https://docs.harvesterhci.io/v1.7/vm/backup-restore/
- Harvester Settings: https://docs.harvesterhci.io/v1.7/advanced/index/
- Harvester upgrade note showing current NFS backup-target format and `refreshIntervalInSeconds`: https://docs.harvesterhci.io/v1.5/upgrade/v1-4-1-to-v1-4-2/
- Harvester `Setting` CRD: https://raw.githubusercontent.com/harvester/harvester/master/deploy/charts/harvester-crd/templates/harvesterhci.io_settings.yaml
- Harvester `VirtualMachineBackup` CRD: https://raw.githubusercontent.com/harvester/harvester/master/deploy/charts/harvester-crd/templates/harvesterhci.io_virtualmachinebackups.yaml
- Longhorn backup target documentation: https://longhorn.io/docs/latest/snapshots-and-backups/backup-and-restore/set-backup-target/
- AWS CLI `aws s3 mb` reference: https://docs.aws.amazon.com/en_us/cli/latest/reference/s3/mb.html
- Amazon S3 IAM actions reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html
- MinIO container deployment docs: https://min.io/docs/minio/container/operations/install-deploy-manage/deploy-minio-single-node-single-drive.html
- MinIO `mc alias set` reference: https://min.io/docs/minio/linux/reference/minio-mc/mc-alias-set.html

## Issues Found
- The Harvester `Setting` manifests used `spec.value` and `metadata.namespace`, but the `Setting` resource is cluster-scoped and stores configuration in the top-level `value` field. I corrected the S3, MinIO, and NFS examples and fixed the verification command accordingly.
- The separate Kubernetes Secret shown for the S3 backup target was not referenced by Harvester's `backup-target` setting and would mislead readers into thinking the setting supports a secret reference. I removed that example.
- The MinIO Kubernetes example would not work as written because it did not create the namespace, PVC, or Service needed by the deployment, and the `mc alias set` command targeted an unreachable hostname. I added the required Kubernetes resources, a `port-forward` step, and corrected the `mc` endpoint.
- The MinIO shell examples used `!` in passwords without quoting, which can break in interactive Bash because of history expansion. I quoted the password values in the shell commands.
- The NFS backup target endpoint format was incorrect. Harvester/Longhorn expects an NFS URL such as `nfs://server:/path`, not just `server:/path`. I corrected the NFS setting and added the NFSv4 requirement note.
- The post recommended applying S3 lifecycle expiration rules directly to the backup bucket. Longhorn explicitly warns against direct retention policies on the backupstore because Longhorn manages backup lifecycle itself. I replaced that guidance with Harvester retention guidance.
- The original introduction implied backups were generally available for Harvester VMs. Current Harvester docs state backup support is limited to Longhorn-backed volumes, so I added that caveat and clarified the verification step.

## Review Notes
- Harvester versions from v1.4.2 onward include a backup target refresh interval (`refreshIntervalInSeconds` / Refresh Interval). It is optional for a basic setup guide, but operators may want to set it explicitly in larger environments.
