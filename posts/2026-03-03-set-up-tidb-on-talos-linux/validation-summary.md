# Validation Summary: How to Set Up TiDB on Talos Linux

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Talos Linux
- TiDB
- TiDB Operator
- Kubernetes
- Helm
- Prometheus and Grafana
- TiDB Backup and Restore (BR)
- Amazon S3-compatible backup storage

## Sources Consulted
- TiDB Operator deployment documentation: https://docs.pingcap.com/tidb-in-kubernetes/stable/deploy-tidb-operator/
- TiDB Operator get started guide: https://docs.pingcap.com/tidb-in-kubernetes/stable/get-started/
- TiDB cluster configuration documentation: https://docs.pingcap.com/tidb-in-kubernetes/stable/configure-a-tidb-cluster/
- TiDB Dashboard access documentation for Kubernetes: https://docs.pingcap.com/tidb-in-kubernetes/v1.6/access-dashboard/
- TiDB monitoring and alerts documentation: https://docs.pingcap.com/tidb-in-kubernetes/stable/monitor-a-tidb-cluster/
- TiDB BR backup to S3 documentation: https://docs.pingcap.com/tidb-in-kubernetes/v1.6/backup-to-aws-s3-using-br/
- TiDB remote storage permission documentation: https://docs.pingcap.com/tidb-in-kubernetes/stable/grant-permissions-to-remote-storage/
- TiDB configuration file documentation: https://docs.pingcap.com/tidb/stable/tidb-configuration-file
- TiKV configuration file documentation: https://docs.pingcap.com/tidb/stable/tikv-configuration-file
- Talos Linux configuration patching documentation: https://www.talos.dev/latest/talos-guides/configuration/patching/
- Talos Linux machine configuration editing documentation: https://www.talos.dev/v1.8/talos-guides/configuration/editing-machine-configuration/
- Talos Linux disk management documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/overview

## Issues Found
- The Talos snippet used `talosctl apply-config --file` with a partial machine config patch. Changed it to `talosctl patch machineconfig --patch @talos-tidb-patch.yaml`, which is the documented workflow for applying strategic merge patches to running nodes.
- The PingCAP Helm repository URL and TiDB Operator install example were outdated or inconsistent with the current stable docs. Updated the chart repo to `https://charts.pingcap.com/`, installed CRDs and the operator at `v1.6.5`, and used the documented `tidb-admin` namespace and pod label selector.
- The TiDB cluster example used TiDB `v7.5.0`. Updated the example to `v8.5.5`, added component `baseImage` fields, and added the recommended `enableDynamicConfiguration` and `configUpdateStrategy: RollingUpdate` fields from the TiDB Operator docs.
- The TiDB Dashboard access instructions forwarded the PD service directly. For Kubernetes access through TiDB Operator, updated the post to enable `dashboard.internal-proxy` and forward the discovery service on port `10262`, matching the documented built-in Dashboard access path.
- The TiDB Monitor example was missing fields present in the stable example and used monitor image versions that did not match the documented v1.6.5 examples. Updated the cluster namespace, Prometheus/Grafana versions, initializer version, and `prometheusReloader` image fields.
- The backup example omitted the required backup RBAC setup and S3 credential secret, and included the `from` field even though it is not required for TiDB v4.0.8 or later. Added the RBAC and S3 secret commands, added `serviceAccount: tidb-backup-manager`, added `s3.secretName`, and removed the unnecessary `from` block.

## Review Notes
The guide is now technically consistent with TiDB Operator v1.6.5 and TiDB v8.5.5 examples. The `local-path` StorageClass name is still environment-specific; readers must replace it if their Talos Kubernetes cluster uses a different StorageClass or local PV setup.
