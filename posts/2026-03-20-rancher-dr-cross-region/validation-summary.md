# Validation Summary: How to Set Up Rancher DR with Cross-Region Replication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Rancher Backup and Restore Operator
- Amazon S3 Cross-Region Replication
- Amazon CloudWatch
- Amazon Route 53
- RKE2
- Helm
- cert-manager
- Kubernetes

## Sources Consulted
- Rancher Backup Configuration: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/backup-configuration
- Rancher Restore Configuration: https://ranchermanager.docs.rancher.com/v2.11/reference-guides/backup-restore-configuration/restore-configuration
- Rancher Backup and Restore Examples: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/backup-restore-configuration/examples
- Rancher Migrating to a New Cluster: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/migrate-rancher-to-new-cluster
- Rancher Restoring Rancher: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/restore-rancher
- Rancher Helm CLI Quick Start: https://ranchermanager.docs.rancher.com/v2.14/getting-started/quick-start-guides/deploy-rancher-manager/helm-cli
- Rancher backup-restore-operator API types: https://github.com/rancher/backup-restore-operator/blob/main/pkg/apis/resources.cattle.io/v1/types.go
- Rancher backup-restore-operator restore controller: https://github.com/rancher/backup-restore-operator/blob/main/pkg/controllers/restore/controller.go
- AWS CLI `put-bucket-replication`: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-replication.html
- Amazon S3 replication permissions: https://docs.aws.amazon.com/AmazonS3/latest/userguide/setting-repl-config-perm-overview.html
- Amazon S3 replication metrics: https://docs.aws.amazon.com/AmazonS3/latest/userguide/viewing-replication-metrics.html
- Amazon S3 metrics dimensions: https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html
- Route 53 health check configuration: https://docs.aws.amazon.com/Route53/latest/APIReference/API_HealthCheckConfig.html
- Route 53 health check values: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-creating-values.html
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- cert-manager Helm installation: https://cert-manager.io/docs/installation/helm/

## Issues Found
- The `Backup` and `Restore` manifests incorrectly set `metadata.namespace`, but those Rancher resources are cluster-scoped. I removed the namespaces.
- The `Backup` manifest omitted `resourceSetName`, which the operator API requires. I added `resourceSetName: rancher-resource-set-full`.
- The Rancher S3 backup and restore examples used a generic S3 endpoint and omitted `credentialSecretNamespace`. I switched to regional S3 endpoints and added the secret namespace so the manifests match Rancher’s documented configuration model.
- The restore example used encrypted backups in Step 2 but did not pass `encryptionConfigSecretName` during restore. I added the encryption secret to the restore manifest.
- The S3 replication IAM policy omitted current documented tag-related permissions. I added `s3:GetObjectVersionTagging` and `s3:ReplicateTags`.
- The S3 replication rule was incomplete for the current CLI examples and the post later queried replication metrics without enabling them. I added `Priority`, `DeleteMarkerReplication`, `Filter`, and `Metrics`.
- The replication verification script used the wrong CloudWatch dimensions and the wrong region for `ReplicationLatency`. I updated it to use `SourceBucket`, `DestinationBucket`, and `RuleId`, and moved the metric query to the destination region.
- The replication verification text implied a fixed 15-minute delay, which is only guaranteed with S3 Replication Time Control. I removed that assumption and changed the guidance to verify asynchronously.
- The Route 53 health check used `/v3/ping`, which is not the documented Rancher health-check path used in Rancher’s AWS guidance, and it omitted SNI for HTTPS. I changed the path to `/ping` and added `EnableSNI: true`.
- The DR activation playbook installed only the backup chart, not the required CRD chart, and skipped repo setup. I added the documented Rancher chart repositories and installed both charts in the documented order.
- The DR activation playbook restored with `prune: true`, but Rancher’s migration guidance requires `prune: false` for restore-to-new-cluster workflows. I corrected that.
- The restore playbook passed the full S3 object key as `backupFilename`, but Rancher expects the filename relative to the configured folder. I changed the script to extract only the filename.
- The DR playbook installed Rancher immediately after creating the `Restore` object. Rancher’s migration workflow requires waiting for the restore to complete first. I added a `kubectl wait --for=condition=Ready` step and moved cert-manager and Rancher installation after restore completion.
- The RKE2 installation pinned an old release. I switched the example to the documented `stable` channel.
- The architecture diagram and conclusion implied automatic warm-standby failover and a guaranteed sub-2-hour RTO. I adjusted both to reflect the actual documented restore-first flow and environment-dependent recovery time.

## Review Notes
- The introduction still mentions Azure-region outages, but the walkthrough is AWS-specific. That is not incorrect, though a future revision could either generalize the implementation steps or keep the introduction AWS-only.
- The Route 53 example uses `A` records with literal IP placeholders. That is technically valid if the Rancher endpoint is exposed on stable IPs, but real AWS deployments often front Rancher with load balancers and alias records instead.
