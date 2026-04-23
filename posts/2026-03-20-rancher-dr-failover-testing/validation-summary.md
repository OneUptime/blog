# Validation Summary: How to Test Rancher DR Failover

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher Backup and Restore Operator
- Kubernetes
- `kubectl`
- AWS CLI
- Amazon S3
- Bash

## Sources Consulted
- Rancher: Backup, Restore, and Disaster Recovery: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery
- Rancher: Restoring Rancher: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/restore-rancher
- Rancher: Migrate Rancher to a New Cluster: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/migrate-rancher-to-new-cluster
- Rancher: Restore Configuration: https://ranchermanager.docs.rancher.com/v2.12/reference-guides/backup-restore-configuration/restore-configuration
- Rancher: Backup and Restore Examples: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/backup-restore-configuration/examples
- Rancher Backup and Restore Operator CRD: https://github.com/rancher/backup-restore-operator/blob/main/charts/rancher-backup-crd/templates/restore.yaml
- Rancher Backup and Restore Operator controller logic: https://github.com/rancher/backup-restore-operator/blob/main/pkg/controllers/restore/controller.go
- Rancher server health handler: https://github.com/rancher/rancher/blob/main/pkg/api/steve/health/health.go
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- AWS CLI `s3` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/

## Issues Found
- `kubectl get nodes --all` used an invalid flag. I changed it to `kubectl get nodes` because nodes are cluster-scoped and current `kubectl get` documents `--all-namespaces`, not `--all`.
- The post treated the Rancher `Restore` resource as namespaced by setting `metadata.namespace` and querying it with `--namespace`. I removed those because Rancher documents `restores.resources.cattle.io` as a cluster-scoped CRD.
- The restore monitoring loop was checking the wrong field and terminal value. I changed it to watch the specific restore object's `Ready` condition message and wait for `Completed`, which matches Rancher documentation and the operator source.
- The S3 restore example specified `credentialSecretName` but not `credentialSecretNamespace`. I added `credentialSecretNamespace: default` and the regional S3 endpoint so the example matches Rancher's documented restore examples.
- The health check used `https://dr-rancher.example.com/v3/ping`. I changed it to `https://dr-rancher.example.com/ping`, which matches Rancher's documented and implemented health endpoint.

## Review Notes
- The article's `prune: false` setting is appropriate for failover or migration to a separate DR cluster. Rancher documents different guidance for restores onto the same running Rancher cluster, where prune is typically enabled.
- Rancher documentation also requires restoring to the same Rancher version that created the backup. The post does not state a version, so readers should confirm version compatibility before running the procedure.
