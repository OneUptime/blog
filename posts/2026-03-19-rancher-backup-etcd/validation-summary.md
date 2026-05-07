# Validation Summary: How to Back Up etcd in Rancher-Managed Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- RKE (Rancher Kubernetes Engine)
- RKE2
- etcd
- Amazon S3
- Prometheus Operator / `PrometheusRule`

## Sources Consulted
- Rancher docs: Backing up a Cluster. https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-rancher-launched-kubernetes-clusters
- Rancher docs: RKE2 Cluster Configuration Reference. https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- RKE docs: Recurring Snapshots. https://rke.docs.rancher.com/etcd-snapshots/recurring-snapshots
- RKE2 docs: Backup and Restore. https://documentation.suse.com/cloudnative/rke2/latest/en/datastore/backup_restore.html
- RKE2 docs: Server Configuration Reference. https://documentation.suse.com/cloudnative/rke2/latest/en/reference/server_config.html
- RKE2 docs: Metrics. https://documentation.suse.com/cloudnative/rke2/latest/en/reference/metrics.html
- etcd docs: How to save the database. https://etcd.io/docs/v3.6/tasks/operator/how-to-save-database/
- etcd docs: Disaster recovery. https://etcd.io/docs/v3.7/op-guide/recovery/
- Rancher source: `pkg/apis/rke.cattle.io/v1/cluster_configuration_types.go` (`ETCD` and S3 snapshot fields). https://github.com/rancher/rancher/blob/release/v2.14/pkg/apis/rke.cattle.io/v1/cluster_configuration_types.go
- Rancher source: `pkg/apis/rke.cattle.io/v1/etcdsnapshot_types.go` (`ETCDSnapshot` resource). https://github.com/rancher/rancher/blob/release/v2.14/pkg/apis/rke.cattle.io/v1/etcdsnapshot_types.go
- Rancher source: `pkg/apis/provisioning.cattle.io/v1/cluster_types.go` (`etcdSnapshotCreate` on provisioning clusters). https://github.com/rancher/rancher/blob/release/v2.14/pkg/apis/provisioning.cattle.io/v1/cluster_types.go
- Rancher source: `pkg/apis/management.cattle.io/v3/rke_types.go` (`EtcdBackup` for RKE clusters). https://github.com/rancher/rancher/blob/release/v2.14/pkg/apis/management.cattle.io/v3/rke_types.go
- RKE source: `types/backup_types.go` (current `backup_config` and S3 fields). https://github.com/rancher/rke/blob/release/v1.8/types/backup_types.go

## Issues Found
- The Rancher UI navigation for editing RKE2/K3s cluster snapshot settings was inaccurate. I corrected it to the documented `Cluster Management` flow and `Edit Config` action.
- The RKE YAML example mixed deprecated legacy snapshot fields (`creation` and top-level `retention`) with current `backup_config` fields. I removed the deprecated fields so the example reflects the current recurring snapshot configuration model.
- The RKE2 configuration example incorrectly included `etcdSnapshotCreate` under recurring snapshot configuration. That field triggers a one-time snapshot operation; it does not configure recurring snapshots. I removed it from the configuration example.
- The manual snapshot subsection was labeled as a `kubectl` method even though it used the `rke2` CLI on a control-plane node. I corrected the heading to match the actual command.
- The RKE2 snapshot listing example hard-coded `fleet-default` and did not explain that it lists Rancher `ETCDSnapshot` resources from the management cluster. I corrected the description and replaced the namespace with the generic `CLUSTER_NAMESPACE` placeholder.
- The RKE2 S3 example used `cloudCredentialName` as if it were a Rancher cloud credential display name. In Rancher source, this field points to a secret reference in `namespace:name` format. I corrected the field value and replaced the incorrect Cloud Credentials UI instructions with a valid secret example containing `accessKey` and `secretKey`.
- The snapshot integrity command used `etcdctl snapshot status`, which is outdated for current etcd documentation. I replaced it with `etcdutl snapshot status` and used the bundled RKE2 binary path.
- The monitoring example referenced a non-documented metric, `etcd_snapshot_last_success_timestamp_seconds`. I replaced it with an alert based on the documented RKE2 snapshot histogram metric and noted that `supervisor-metrics: true` must be enabled for those metrics to be exposed.

## Review Notes
- RKE1 remains supported in Rancher-managed legacy environments, but the upstream `rancher/rke` project is in end-of-life mode. Future content should prefer RKE2 unless the goal is explicitly to support existing RKE1 clusters.
- The RKE2 monitoring example is intentionally RKE2-specific. It does not apply to RKE1 clusters as written.
- `CLUSTER_NAMESPACE` is commonly `fleet-default` for Rancher-provisioned RKE2/K3s clusters, but it can vary by installation.
