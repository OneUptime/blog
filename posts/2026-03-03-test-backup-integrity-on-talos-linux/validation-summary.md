# Validation Summary: How to Test Backup Integrity on Talos Linux

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Talos Linux
- Velero
- Kubernetes
- Kubernetes CronJobs
- kubectl
- jq
- PostgreSQL / psql
- Bash

## Sources Consulted
- Velero v1.18 documentation: https://velero.io/docs/v1.18/
- Velero restore reference: https://velero.io/docs/v1.18/restore-reference/
- Velero Backup API type documentation: https://velero.io/docs/main/api-types/backup/
- Velero v1.18 CLI source for backup and restore commands: https://github.com/vmware-tanzu/velero/tree/v1.18.0/pkg/cmd/cli
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Talos v1.12 CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos machine configuration editing documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/editing-machine-configuration

## Issues Found
- The recent-backups script passed null completion timestamps to `fromdateiso8601`, which can make `jq` fail for incomplete backups. Added a null check before parsing the timestamp.
- The single-backup status checks treated `velero backup get <name> -o json` as a single Backup object. Velero's get command prints a BackupList, so the script now reads the named Backup custom resource with `kubectl -n velero get backup <name> -o json`.
- The metadata validation script used `velero backup describe -o json` for raw Backup fields. Velero describe JSON is structured describe output, not the raw Backup CR. The script now reads `.status.progress.itemsBackedUp` and `.spec.includedNamespaces` from the Backup custom resource.
- The metadata validation script could compare `null` as an integer when progress was absent. Added a `// 0` default.
- Namespace validation did not account for `*` meaning all namespaces. Added an exact wildcard check.
- The `kubectl run` health-check examples could include kubectl status text in captured output. Added `--quiet` before the command separator.
- The CronJob used `bitnami/kubectl:latest` while the script also required `velero`, `jq`, and `bash`. Changed the snippet to use a custom backup tools image that explicitly includes those tools.
- The Talos machine config backup commands exported the wrapper API resource from `talosctl get machineconfig -o yaml`, but `talosctl validate` expects the machine configuration document. Updated the example to export the `.spec` document with `talosctl get machineconfig v1alpha1 -o jsonpath='{.spec}'`.

## Review Notes
The examples are intentionally template-like and still require environment-specific values such as namespace names, service names, database credentials, RBAC permissions, and a real toolbox container image for the CronJob. The technical flow and command shapes are now consistent with the consulted official documentation.
