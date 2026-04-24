# Validation Summary: How to Automate Backup Schedules in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Backup Operator
- Rancher Manager
- RKE2
- etcd snapshots
- Longhorn
- Velero
- Helm
- Kubernetes
- Amazon S3

## Sources Consulted
- Rancher Backup Configuration: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/backup-configuration
- Rancher Backup and Restore Examples: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/examples
- Rancher backup-restore-operator repository: https://github.com/rancher/backup-restore-operator
- RKE2 Backup and Restore: https://docs.rke2.io/datastore/backup_restore
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- Longhorn Setting a Backup Target: https://longhorn.io/docs/latest/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn Recurring Snapshots and Backups: https://longhorn.io/docs/latest/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn chart CRDs: https://github.com/longhorn/longhorn/blob/master/chart/templates/crds.yaml
- Velero Basic Install: https://velero.io/docs/v1.17/basic-install/
- Velero Backup Reference: https://velero.io/docs/v1.17/backup-reference/
- Velero Helm chart README and values: https://github.com/vmware-tanzu/helm-charts/tree/main/charts/velero
- Velero AWS plugin repository: https://github.com/vmware-tanzu/velero-plugin-for-aws
- Velero CLI schedule source: https://github.com/vmware-tanzu/velero/blob/main/pkg/cmd/cli/schedule/create.go

## Issues Found
- The Rancher Backup Operator install snippet used an outdated chart repository and omitted the required `rancher-backup-crd` chart. I changed it to the current `https://charts.rancher.io` repo, added `helm repo update`, and installed the CRD chart first.
- The Rancher `Backup` manifest was using a namespace even though the `Backup` CRD is cluster-scoped, and it omitted the required `resourceSetName`. I removed the namespace and added `resourceSetName: rancher-resource-set-full`.
- The Rancher S3 example left `endpoint` blank for AWS S3. I replaced it with `s3.us-east-1.amazonaws.com`, which matches the documented field usage.
- The RKE2 configuration set local snapshot retention but not the separate S3 retention now documented for newer releases. I added `etcd-s3-retention: 10` so the example retention matches the text for both local and S3 snapshots.
- The RKE2 S3 listing command used a noncanonical flag order and omitted the access-key flags shown in the official example. I updated it to the documented `rke2 etcd-snapshot --s3 ... ls` form with explicit credentials.
- The Longhorn backup-target example used the older `settings.longhorn.io` objects. I updated it to patch the `default` `BackupTarget` resource and create the credential secret Longhorn expects.
- The Longhorn recurring-job example claimed to target production volumes while also assigning the job to the `default` group. I removed the `default` group from the daily backup job so the behavior matches the explanation.
- The Longhorn PVC labeling example omitted `recurring-job.longhorn.io/source=enabled`, which current Longhorn docs require for PVC labels to be synchronized to the volume. I added that label.
- The second Longhorn recurring job was labeled as a weekly snapshot even though the cron expression was hourly. I corrected the comment and retention wording.
- The Velero Helm install command omitted the required AWS provider plugin init container. I updated the example to include the plugin init container and switched credentials input to the chart’s documented `--set-file` form.
- The Velero schedule command used `--include-namespaces production,staging`, but current Velero CLI flag handling uses repeated values for this flag. I changed it to two `--include-namespaces` flags.
- The verification script queried Rancher backups as if they were namespaced, counted RKE2 snapshots imprecisely by including the header row, and checked a removed Longhorn setting. I updated the checks to use the cluster-scoped Rancher CRD, count actual snapshot rows, and read `backuptargets.longhorn.io default` status.

## Review Notes
- Older Rancher backup examples in the operator repository still show `rancher-resource-set`, but current Rancher documentation recommends `rancher-resource-set-full` or `rancher-resource-set-basic`.
- `etcd-s3-retention` is a newer RKE2 setting; clusters on older RKE2 releases may not support it yet.
- The Velero AWS plugin version must match the installed Velero version, so the post keeps `${VELERO_AWS_PLUGIN_VERSION}` as a compatibility placeholder rather than hardcoding a possibly stale tag.
