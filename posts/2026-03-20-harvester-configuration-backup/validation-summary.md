# Validation Summary: How to Back Up and Restore Harvester Configuration

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- RKE2
- Kubernetes
- Longhorn
- KubeVirt custom resources
- S3-compatible object storage

## Sources Consulted
- Harvester: VM Backup, Snapshot & Restore: https://docs.harvesterhci.io/v1.7/vm/backup-restore/
- Harvester: Settings: https://docs.harvesterhci.io/v1.7/advanced/index/
- Harvester API: List Virtual Machine Backups For All Namespaces: https://docs.harvesterhci.io/v1.7/api/list-virtual-machine-backup-for-all-namespaces/
- Harvester API: List Namespaced Network Attachment Definitions: https://docs.harvesterhci.io/v1.7/api/list-namespaced-network-attachment-definition/
- Harvester: Upload Images: https://docs.harvesterhci.io/v1.7/image/upload-image/
- RKE2: Backup and Restore: https://docs.rke2.io/datastore/backup_restore
- RKE2: Server Configuration Reference: https://docs.rke2.io/reference/server_config
- Longhorn: Setting a Backup Target: https://longhorn.io/docs/1.11.1/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn: Recurring Snapshots and Backups: https://longhorn.io/docs/1.11.0/snapshots-and-backups/scheduling-backups-and-snapshots/
- Harvester CRD: Setting: https://raw.githubusercontent.com/harvester/harvester/v1.7.1/deploy/charts/harvester-crd/templates/harvesterhci.io_settings.yaml
- Harvester CRD: VirtualMachineBackup: https://raw.githubusercontent.com/harvester/harvester/v1.7.1/deploy/charts/harvester-crd/templates/harvesterhci.io_virtualmachinebackups.yaml
- Longhorn generated manifest and CRDs: https://raw.githubusercontent.com/longhorn/longhorn/v1.11.1/deploy/longhorn.yaml

## Issues Found
- The post used `kubectl export`, which is not a current Kubernetes command. I replaced it with `kubectl get ... -o yaml` wording and aligned the example commands with current Harvester resource names.
- The RKE2 S3 snapshot example omitted `etcd-s3-retention`, which is now a separate retention control. I added it so the example does not imply local and S3 retention are kept in sync automatically.
- Step 3 configured the backup target through Longhorn settings and a Kubernetes secret. Harvester documents VM backups through the `settings.harvesterhci.io/backup-target` setting, so I replaced the example with a Harvester setting patch and verification command.
- Step 4 recommended Longhorn recurring jobs for VM backups. Current Harvester documentation states recurring Longhorn backups are not integrated into Harvester, so I replaced that guidance with Harvester's supported Virtual Machine Schedules workflow.
- Step 5 verified `lhbackup` objects directly. For a Harvester VM backup workflow, `VirtualMachineBackup` resources and `status.readyToUse` are the relevant objects, so I updated the verification script accordingly.

## Review Notes
- The post is now technically consistent with current Harvester v1.7 documentation, current RKE2 backup documentation, and Longhorn 1.11 documentation.
- The title mentions restore, but the post is still weighted toward backup configuration. A future revision could add an explicit restore walkthrough, especially for cross-cluster restores where Harvester requires compatible VM image availability and matching image configuration.
- Harvester documentation includes version-specific behavior around VM backup support and Longhorn integration, so readers on older Harvester releases should confirm capabilities against their installed version.
- Exported `settings.harvesterhci.io` data can include sensitive values such as backup target credentials, so those exports should be stored securely and not committed to Git unsanitized.
