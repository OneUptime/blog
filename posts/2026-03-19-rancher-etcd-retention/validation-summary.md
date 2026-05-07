# Validation Summary: How to Configure etcd Snapshot Retention in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- RKE1
- RKE2
- etcd snapshots
- Kubernetes
- AWS S3
- AWS CLI
- Prometheus Operator

## Sources Consulted
- SUSE Rancher Manager: Backing up a Cluster: https://documentation.suse.com/cloudnative/rancher-manager/v2.13/en/cluster-admin/backups-and-restore/backups.html
- SUSE RKE2: Backup and Restore: https://documentation.suse.com/cloudnative/rke2/latest/en/datastore/backup_restore.html
- SUSE Rancher Manager v2.14 release notes: https://documentation.suse.com/cloudnative/rancher-manager/v2.14/en/release-notes/v2.14.0.html
- RKE1 documentation: Recurring Snapshots: https://rke.docs.rancher.com/etcd-snapshots/recurring-snapshots
- Rancher source: `ClusterConfiguration` / `ETCD` types: https://raw.githubusercontent.com/rancher/rancher/release/v2.13/pkg/apis/rke.cattle.io/v1/cluster_configuration_types.go
- Rancher source: `ETCDSnapshotS3` type: https://raw.githubusercontent.com/rancher/rancher/release/v2.13/pkg/apis/rke.cattle.io/v1/etcdsnapshot_types.go
- AWS CLI reference: `put-bucket-lifecycle-configuration`: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- AWS CLI reference: `s3 rm`: https://docs.aws.amazon.com/cli/latest/reference/s3/rm.html

## Issues Found
- The RKE section mixed legacy `services.etcd.creation` / `services.etcd.retention` settings with the newer `backup_config` model and implied RKE1 was still a normal current option. I updated the example to use `backup_config.interval_hours` and `backup_config.retention`, and noted that RKE1 reached end of life on July 31, 2025 and Rancher v2.12+ no longer supports downstream RKE1 clusters.
- The RKE2 S3 section incorrectly said `snapshotRetention` applied to both local and S3 snapshots. I corrected the explanation to distinguish local scheduled snapshot retention from separate S3 retention via the RKE2 `etcd-s3-retention` setting when supported.
- The RKE2 S3 YAML used `cloudCredentialName` without the required `namespace:name` format. I corrected the example to a namespaced secret reference and added the `machineGlobalConfig.etcd-s3-retention` example.
- The AWS S3 lifecycle example transitioned objects to `STANDARD_IA` after 30 days. AWS CLI documentation requires more than 30 days for `STANDARD_IA`, so I changed it to 31 days.
- The manual RKE2 cleanup example used direct `rm` deletion from the snapshot directory. I replaced it with the documented `rke2 etcd-snapshot ls` and `rke2 etcd-snapshot delete` commands.
- The retention verification section assumed cluster-wide snapshot counts should stay under the configured retention value. I corrected this to explain that recurring retention is enforced per node and that on-demand snapshots are not pruned automatically.
- The PrometheusRule example hard-coded a mountpoint matcher without noting that it must match the filesystem that actually contains the snapshot directory. I added that caveat.

## Review Notes
- The RKE2 UI wording in Rancher can vary slightly by version, so the post now describes the cron schedule setting generically instead of relying on a specific label.
- The Rancher UI documentation clearly documents viewing snapshots in the `Snapshots` tab, but delete actions can vary by version and surface area, so the post now treats UI deletion as version-dependent.
