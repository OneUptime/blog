# Validation Summary: How to Set Up Disaster Recovery Across Talos Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- etcd
- Velero
- AWS S3 and Route 53
- CloudNativePG / PostgreSQL streaming replication
- Bash

## Sources Consulted
- Talos Linux disaster recovery documentation: https://www.talos.dev/latest/advanced/disaster-recovery/
- Talos Linux CLI reference: https://www.talos.dev/latest/reference/cli/
- etcd disaster recovery documentation: https://etcd.io/docs/v3.7/op-guide/recovery/
- etcd database snapshot documentation: https://etcd.io/docs/v3.6/tasks/operator/how-to-save-database/
- Velero install CLI documentation: https://velero.io/docs/v1.13/velero-install/
- Velero upgrade and AWS plugin version guidance: https://velero.io/docs/main/upgrade-to-1.18/
- Velero AWS plugin compatibility documentation: https://github.com/vmware-tanzu/velero-plugin-for-aws
- Velero schedule API documentation: https://velero.io/docs/v1.14/api-types/schedule/
- Velero restore reference: https://velero.io/docs/v1.12/restore-reference/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- CloudNativePG replica cluster documentation: https://cloudnative-pg.io/documentation/current/replica_cluster/
- CloudNativePG bootstrap documentation: https://cloudnative-pg.io/docs/1.28/bootstrap/
- CloudNativePG API reference: https://cloudnative-pg.io/docs/1.28/cloudnative-pg.v1
- AWS CLI Route 53 command reference: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html

## Issues Found
- The post described verifying an etcd snapshot by taking another snapshot from a different control-plane node. Changed this to `etcdutl --write-out=table snapshot status /tmp/etcd-backup.db`, which is the official etcd utility for inspecting snapshot hash, revision, and metadata.
- The Velero AWS plugin pin used `velero/velero-plugin-for-aws:v1.8.0`, which is outdated for current Velero releases. Updated it to `v1.14.0`, which is the AWS plugin version documented for Velero v1.18.
- The standby Kubernetes Deployment had a selector but no matching pod template labels, so the API would reject it. Added `spec.template.metadata.labels.app: api-server`.
- The CloudNativePG replica cluster snippet omitted the `bootstrap.pg_basebackup.source` section needed to initialize from the external source and omitted storage configuration. Added `bootstrap.pg_basebackup.source: app-db-primary` and a `storage.size` example.
- The Talos full-cluster recovery flow used `talosctl etcd restore`, which is not a current Talos CLI command. Replaced it with the documented `talosctl bootstrap --recover-from /tmp/etcd-backup.db` recovery flow.

## Review Notes
- The backup retention shell example is Linux/GNU-date specific and assumes simple S3 listing output, but it is acceptable as an illustrative cron script.
- Velero volume backup behavior depends on the storage provider and whether snapshots, CSI snapshots, or filesystem backup are configured. The install command is valid for AWS-backed snapshots, but production setups should confirm plugin and Kubernetes compatibility for their exact versions.
