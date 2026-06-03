# Validation Summary: How to Use Velero Backup Describe Commands to Analyze Backup Contents

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes
- Velero CLI
- Bash
- jq
- Python
- Kubernetes CronJob

## Sources Consulted
- Velero Backup API documentation: https://velero.io/docs/main/api-types/backup/
- Velero output file format documentation: https://velero.io/docs/v1.13/output-file-format/
- Velero file system backup documentation: https://velero.io/docs/v1.16/file-system-backup/
- Velero official source for `backup describe`: https://github.com/vmware-tanzu/velero/blob/main/pkg/cmd/cli/backup/describe.go
- Velero official source for backup describe output: https://github.com/vmware-tanzu/velero/blob/main/pkg/cmd/util/output/backup_describer.go
- Velero official source for structured backup describe output: https://github.com/vmware-tanzu/velero/blob/main/pkg/cmd/util/output/backup_structured_describer.go
- Velero official source for `backup get`: https://github.com/vmware-tanzu/velero/blob/main/pkg/cmd/cli/backup/get.go
- Velero official source for `backup logs`: https://github.com/vmware-tanzu/velero/blob/main/pkg/cmd/cli/backup/logs.go

## Issues Found
- `velero backup describe --warnings` and `velero backup describe --errors` are not valid flags. Replaced these examples with `velero backup describe`, which includes warnings and errors in the describe output.
- Warning and error examples did not match Velero's structured result output. Updated them to show Velero, Cluster, and Namespaces result sections.
- Backup comparison script was extracting resource kind headings instead of actual backed-up resource names. Updated the grep and sed pipeline to extract resource list entries.
- Backup completeness script compared incompatible resource formats from `kubectl -o name` and Velero's resource list. Updated it to compare normalized resource names.
- Metrics and reporting examples used `.status.totalItems`, but Velero's Backup API stores item counts under `.status.progress.totalItems` and `.status.progress.itemsBackedUp`. Updated examples to use `.status.progress.itemsBackedUp`.
- The volume snapshot section referred to `Persistent Volumes:`, but current Velero describe output uses `Backup Volumes:` with `Velero-Native Snapshots`, `CSI Snapshots`, and `Pod Volume Backups` subsections. Updated the commands, sample output, and verification script.
- JSON reporting examples used `velero backup describe -o json` where raw Backup API fields were expected. Updated those examples to use `velero backup get <name> -o json`.
- Python subprocess example did not check the command exit status. Added `check=True` so failed Velero commands are not silently parsed as JSON.

## Review Notes
Velero's exact describe output can vary by version and backup method, especially for native snapshots, CSI snapshots, and file system backups. The article now avoids invalid flags and uses API JSON where stable machine-readable fields are needed.
