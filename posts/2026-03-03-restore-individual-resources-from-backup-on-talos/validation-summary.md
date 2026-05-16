# Validation Summary: How to Restore Individual Resources from Backup on Talos

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Talos Linux (Kubernetes OS context)
- Kubernetes (kubectl, deployments, services, configmaps, secrets, PVCs, RBAC, CronJobs)
- Velero (backup/restore CLI and filtering)
- jq / yq (JSON/YAML manipulation)
- bash scripting

## Sources Consulted
- Velero Restore Reference: https://velero.io/docs/main/restore-reference/
- Velero Resource Filtering: https://velero.io/docs/main/resource-filtering/
- Velero Output File Format: https://velero.io/docs/main/output-file-format/
- Velero v1.9 Release Notes: https://github.com/vmware-tanzu/velero/releases/tag/v1.9.0
- Velero v1.9 Restore Reference (for `--existing-resource-policy` introduction): https://velero.io/docs/v1.9/restore-reference/
- Velero CLI `velero restore create --help` flag list

## Issues Found

1. **Incorrect claim that Velero has no built-in overwrite option.**
   - Original text in "Handling Restore Conflicts" said: *"There is no built-in overwrite option"* and *"You must delete the existing resource first if you want to restore from backup."*
   - This is incorrect: Velero 1.9 added `--existing-resource-policy=update`, which patches existing resources from the backup rather than skipping them. The default policy is `none` (skip), which is what the original bullet was describing.
   - Fix: Updated the bullets to mention the default `none` policy, document `--existing-resource-policy=update` (with its 1.9 introduction and known limitations around PVCs/Pods), and reframe delete-first as the alternative for a clean restore. Also amended the earlier ConfigMap/Secret section to surface the same option.

2. **Backup tarball internal paths missing API-version segment.**
   - Original paths used `resources/deployments.apps/namespaces/production/my-app.json` (the older v1 output format).
   - Current Velero output format (v1.1) is `resources/<resource>.<group>/<api-version>/namespaces/<namespace>/<name>.json`, e.g. `v1-preferredversion`.
   - Fix: Updated the three example paths in "Listing Backup Contents", "Manual Resource Extraction from Backup", and "Comparing Backup vs Current State" to include `v1-preferredversion`, and noted this in the first example comment.

## Review Notes
- All other Velero CLI flags verified as correct and current: `--include-resources`, `--exclude-resources`, `--include-namespaces`, `--selector`, `--namespace-mappings`, `--restore-volumes`, `--from-backup`, `--wait`, plus `velero backup get/describe/logs/download` commands.
- `--restore-volumes` is a boolean that defaults to true; including it is harmless but redundant for snapshot-backed restores. Left as-is since the explicit form aids clarity.
- The `endpoints` core resource still exists and works as shown, though modern Kubernetes increasingly relies on `EndpointSlice`. Not flagged as an error because Velero/Kubernetes still supports the bare `endpoints` resource and the kube-controller-manager keeps Endpoints and EndpointSlices in sync.
- The helper bash script uses `eval` on a constructed command string. This is fine in a controlled operator script but would be a concern with untrusted inputs; left as-is per the no-stylistic-changes rule.
- Tarball download filename (`<backup-name>-data.tar.gz`) confirmed against Velero CLI default `--output` behavior.
- The post's Talos framing is light (mostly context that the OS layer is immutable), and the substantive content is generic Velero usage — accurate for any Kubernetes cluster, including Talos.
