# Validation Summary: How to Run TiDB Distributed SQL Database on Kubernetes Using TiDB Operator

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- TiDB
- TiDB Operator
- Kubernetes
- Helm
- TiKV
- PD
- TiFlash
- TiDB Backup and Restore CRDs
- Prometheus and Grafana monitoring

## Sources Consulted
- TiDB Operator v1.5: Deploy TiDB Operator on Kubernetes: https://docs.pingcap.com/tidb-in-kubernetes/v1.5/deploy-tidb-operator/
- TiDB Operator v1.5: Configure a TiDB Cluster on Kubernetes: https://docs.pingcap.com/tidb-in-kubernetes/v1.5/configure-a-tidb-cluster/
- TiDB Operator v1.5: Backup and Restore Custom Resources: https://docs.pingcap.com/tidb-in-kubernetes/v1.5/backup-restore-cr/
- TiDB Operator v1.5: Back up Data to S3-Compatible Storage Using BR: https://docs.pingcap.com/tidb-in-kubernetes/v1.5/backup-to-aws-s3-using-br/
- TiDB Operator v1.5: Grant Permissions to Remote Storage: https://docs.pingcap.com/tidb-in-kubernetes/v1.5/grant-permissions-to-remote-storage/
- TiDB Operator v1.5: Deploy Monitoring and Alerts for a TiDB Cluster: https://docs.pingcap.com/tidb-in-kubernetes/v1.5/monitor-a-tidb-cluster/
- TiDB SQL reference: SHOW TABLE REGIONS: https://docs.pingcap.com/tidb/stable/sql-statement-show-table-regions/
- TiDB docs: Create TiFlash Replicas: https://docs.pingcap.com/tidb/v8.1/create-tiflash-replicas/
- TiDB docs: Use TiDB to Read TiFlash Replicas: https://docs.pingcap.com/tidb/v8.1/use-tidb-to-read-tiflash/
- TiDB Operator v1.5.5 CRD manifest: https://raw.githubusercontent.com/pingcap/tidb-operator/v1.5.5/manifests/crd.yaml
- TiDB Operator v1.5.5 examples: https://github.com/pingcap/tidb-operator/tree/v1.5.5/examples

## Issues Found
- The operator install commands used TiDB Operator v1.5.0. Updated the CRD URL, Helm chart version, and operator image to v1.5.5, the latest v1.5 patch version referenced by the official v1.5 documentation.
- The TidbCluster example used TiDB v7.5.0. Updated it to v7.5.5 to match the official v1.5.5 examples and patch-level documentation.
- The TidbCluster spec omitted `configUpdateStrategy: RollingUpdate` while later claiming configuration changes roll automatically. Added the field so the behavior matches the explanation.
- The TidbCluster spec omitted `discovery: {}`, which is included in the official CR-based examples. Added it to the cluster spec.
- The TiFlash example used `requests.storage` and `storageClassName` directly under `tiflash`, but the TiDB Operator CRD requires TiFlash storage under `storageClaims`. Replaced the storage fields with `storageClaims`.
- The TiFlash example did not enable PD placement rules. Added `enable-placement-rules = true` under PD replication configuration because TiFlash requires placement rules.
- The BackupSchedule S3 configuration omitted `s3.secretName`, and the credential secret used incorrect key names. Added `secretName: s3-secret` and changed the secret keys to `access_key` and `secret_key`.
- The backup commands did not create the backup RBAC resources required by the official backup workflow. Added the `backup-rbac.yaml` apply command.
- The TidbMonitor example omitted the required `initializer` component. Added `initializer` with the TiDB monitor initializer image.
- The TidbMonitor example put persistent storage under `prometheus.requests.storage`, which is not the TidbMonitor storage field. Moved it to top-level `persistent: true` and `storage: 50Gi`.
- The TidbMonitor example used deprecated inline Grafana `username` and `password` fields. Removed them and left the default Grafana credentials behavior described in the docs.
- The TiKV config patch used an invalid TOML dotted assignment for block cache capacity. Changed it to a valid `[storage.block-cache]` table with `capacity = "20GB"`.
- The Restore S3 configuration omitted `s3.secretName`. Added it so the restore job can use the S3 credential secret.

## Review Notes
TiDB Operator v1.5 is an older major version; the official documentation currently recommends TiDB Operator release-1.6 for general use. The post remains technically valid as a v1.5.5-based guide after the fixes above.
