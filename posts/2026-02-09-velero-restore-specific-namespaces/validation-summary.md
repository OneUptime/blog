# Validation Summary: How to Restore Specific Kubernetes Namespaces from Velero Backup Archives

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Velero
- Kubernetes
- Kubernetes Restore custom resources
- PersistentVolumes and PersistentVolumeClaims
- PrometheusRule alerting

## Sources Consulted
- Velero Restore API Type: https://velero.io/docs/main/api-types/restore/
- Velero Restore Reference: https://velero.io/docs/v1.18/restore-reference/
- Velero Restore Hooks: https://velero.io/docs/main/restore-hooks/
- Velero Debugging Restores: https://velero.io/docs/main/debugging-restores/
- Velero Output File Format: https://velero.io/docs/v1.13/output-file-format/
- Velero v1.18.1 CLI help for `velero backup download`, `velero restore create`, and `velero restore logs`
- Velero v1.18.1 source metrics definitions: https://github.com/vmware-tanzu/velero

## Issues Found
- Corrected the restore architecture explanation to say Velero skips existing resources by default, with ServiceAccounts as a documented merge exception.
- Fixed the backup archive inspection command. `velero backup download` defaults to `my-backup-data.tar.gz`, and the original `cut -d'/' -f2` extracted resource types rather than namespaces from Velero's documented archive layout.
- Replaced the unsupported `--storage-class-mappings` restore flag with Velero's documented storage class mapping ConfigMap format.
- Corrected the restore hook YAML from `post` to `postHooks`, added `includedResources: pods`, and replaced unsupported `timeout` with `waitTimeout` and `execTimeout`.
- Adjusted the dependency hook text because restore hooks do not configure global restore order; they run pod-level init or exec hooks during/after pod restore.
- Removed unsupported `velero restore logs --follow` usage and replaced it with `velero restore logs --timeout 5m`.
- Corrected the Prometheus metric from `velero_restore_failure_total` to `velero_restore_failed_total` and used `increase(...[5m]) > 0` so the alert fires on recent failures rather than forever after any historical failure.
- Updated the troubleshooting wording for existing namespaces because Velero creates missing target namespaces and skips existing resources by default; a pre-existing namespace alone is not necessarily a restore error.

## Review Notes
- Most restore filtering flags in the post were verified against current Velero CLI help, including `--include-namespaces`, `--exclude-namespaces`, `--include-resources`, `--exclude-resources`, `--selector`, `--namespace-mappings`, `--restore-volumes`, `--preserve-nodeports`, and `--wait`.
- The post does not pin a Velero version. The review used current Velero documentation and v1.18.1 CLI behavior.
