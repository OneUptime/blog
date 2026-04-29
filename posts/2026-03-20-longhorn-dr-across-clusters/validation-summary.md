# Validation Summary: How to Set Up Longhorn DR Across Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Longhorn
- Kubernetes
- `kubectl`
- S3-compatible backup storage
- Disaster recovery volumes

## Sources Consulted
- Longhorn DR volumes documentation: https://longhorn.io/docs/1.11.0/snapshots-and-backups/setup-disaster-recovery-volumes/
- Longhorn restore-from-backup documentation: https://longhorn.io/docs/1.11.1/snapshots-and-backups/backup-and-restore/restore-from-a-backup/
- Longhorn recurring snapshots and backups documentation: https://longhorn.io/docs/1.11.0/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn backup target documentation: https://longhorn.io/docs/1.11.1/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn settings reference: https://longhorn.io/docs/1.11.1/references/settings/
- Longhorn v1.11.1 install manifest / CRD schema: https://raw.githubusercontent.com/longhorn/longhorn/v1.11.1/deploy/longhorn.yaml

## Issues Found
- The description claimed failover was automatic. Longhorn DR volume failover is manual activation, so this was corrected to manual failover to match the official DR workflow.
- The DR volume examples used incomplete `fromBackup` values that only included `?volume=...`. Longhorn requires the full backup URL, including the specific `backup=...` value, so the examples were corrected and the post now shows retrieving the exact backup URL and size from `backups.longhorn.io`.
- The DR volume examples and monitoring/failover commands used `standby` in places where the current Longhorn Volume CRD schema uses `Standby`. The manifest and related JSONPath/custom-column examples were updated to the CRD’s field name.
- The failover activation example only flipped the standby flag. Longhorn’s documented `kubectl` activation flow also sets the volume frontend, so the example was corrected to patch both `Standby` and `frontend`.
- The workload cutover steps skipped PV/PVC rebinding. Longhorn DR volumes cannot be used by workloads until the DR volume is activated and the PV/PVC bindings point at the activated volume, so the post now reflects that requirement during failover and failback.

## Review Notes
- Validated against current Longhorn 1.11.x documentation and the v1.11.1 published CRD schema.
- The post still references `Longhorn v1.4 or later` as a minimum prerequisite. That is not inherently incorrect for the feature history, but operators should use a currently supported Longhorn release because current documentation and operational behavior are based on newer versions.
