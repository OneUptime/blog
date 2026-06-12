# Validation Summary: How to Implement Velero for Disaster Recovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Velero (v1.13.0) — Kubernetes backup and restore tool
- Kubernetes (CronJobs, Pods, Deployments, ConfigMaps, Schedules, BackupStorageLocations)
- velero-plugin-for-aws (v1.9.0)
- AWS S3 (object storage for backups)
- Prometheus / Prometheus Operator (PrometheusRule)
- Bash scripting and kubectl
- mermaid diagrams

## Sources Consulted
- Velero v1.13 restore hooks documentation: https://velero.io/docs/v1.13/restore-hooks/
- Velero v1.13 restore reference: https://velero.io/docs/v1.13/restore-reference/
- Velero v1.13 customize installation: https://velero.io/docs/v1.13/customize-installation/
- Velero v1.13.0 source — `pkg/cmd/cli/restore/create.go` (flag definitions)
- Velero v1.13.0 source — `pkg/cmd/cli/backup/get.go` (flag definitions)
- Velero v1.13.0 source — `pkg/cmd/server/server.go` (defaultRestorePriorities)
- Velero v1.13.0 source — `pkg/metrics/metrics.go` (Prometheus metric names)
- Kubernetes CronJob cron-syntax semantics (DOM/DOW OR semantics in robfig/cron and Vixie cron)

## Issues Found

1. **Incorrect pre-restore hook annotations.** The post used `pre.hook.restore.velero.io/container` and `pre.hook.restore.velero.io/command`, which are not valid Velero annotations. Velero's "pre-restore" hooks are init-container hooks and use the `init.hook.restore.velero.io/` prefix (`container-name`, `container-image`, `command`, `timeout`). The example was placed on a `Deployment`, but restore hook annotations apply to Pods (or pod templates); I rewrote the example as a `Pod` with `init.hook.restore.velero.io/container-name`, `init.hook.restore.velero.io/container-image`, and `init.hook.restore.velero.io/command`, and kept the valid `post.hook.restore.velero.io/*` annotations.

2. **Wrong flag name `--restore-pvs`.** Velero v1.13's restore CLI flag is `--restore-volumes` (per the v1.13.0 source). Replaced all occurrences (in the cross-cluster restore, namespace-mapping restore, selective restore, automated DR CronJob, validation script, and runbook ConfigMap).

3. **`velero backup get --all-namespaces` is invalid.** The `backup get` command in Velero v1.13 does not accept `--all-namespaces`; backups live in the Velero server's namespace. Removed the flag.

4. **Incorrect ConfigMap-based restore priority customization.** Velero does not customize restore order via a `velero-restore-resource-priorities` ConfigMap with a `restoreResourcePriorities` YAML list. The supported mechanism is the `--restore-resource-priorities` flag on the Velero server (comma-separated list). Replaced the ConfigMap example with a `kubectl patch` example that adds the flag to the Velero deployment, and mentioned the `velero install --restore-resource-priorities` option.

5. **Inaccurate default restore order list.** The original list had Secrets/ConfigMaps before ServiceAccounts and Services before Pods, and included Deployments/StatefulSets/DaemonSets, which are not part of Velero's default high-priority list. Replaced with the actual v1.13 ordering: CRDs, Namespaces, StorageClasses, VolumeSnapshot resources (CSI), PVs, PVCs, ServiceAccounts, Secrets, ConfigMaps, LimitRanges, Pods, ReplicaSets, Endpoints, Services — with a note that other resources are restored alphabetically afterward.

6. **Misleading cron schedule for "first Sunday of each month".** `"0 3 1-7 * 0"` does not restrict to the first Sunday because Kubernetes CronJob (robfig/cron) and Vixie cron use OR semantics when both day-of-month and day-of-week are restricted. Changed to `"0 3 * * 0"` (every Sunday at 3 AM UTC) with an inline comment explaining the OR-semantics gotcha, and updated the surrounding comment from "monthly" to "weekly".

7. **Non-existent Prometheus metric `velero_restore_duration_seconds`.** Velero exposes `velero_backup_duration_seconds` (a histogram) but does not export a `velero_restore_duration_seconds` metric. Reworked the alert to use a p95 of `velero_backup_duration_seconds_bucket` and renamed it to `VeleroBackupDurationHigh`.

8. **Misleading `s3ForcePathStyle` comment.** The original comment read "Use path-style URLs for MinIO or other S3-compatible storage" but the value was `"false"`. Reworded the comment to clarify that you set it to `"true"` only for path-style stores like MinIO.

9. **Markdown fence typo.** The closing fence of the runbook ConfigMap example was `\`\`\`text` (with `text` after the closing backticks) and inner nested code fences used `\`\`\`bash ... \`\`\`bash` which prematurely closes the outer YAML block. Cleaned up the inner fences to use plain `\`\`\`` and fixed the outer closing fence to just `\`\`\``.

## Review Notes

- `accessMode: ReadOnly` on `BackupStorageLocation` is correct for v1.13 (still a valid field on the CRD).
- `velero install --plugins velero/velero-plugin-for-aws:v1.9.0` is the correct compatible plugin version for Velero v1.13.
- Cron expressions `"0 * * * *"`, `"0 */4 * * *"`, `"0 2 * * *"` in the RPO schedules are valid Kubernetes CronJob cron syntax.
- The Prometheus metric `velero_backup_last_successful_timestamp` is exposed by Velero and labeled with `schedule`; the example regex match `schedule=~"critical.*"` works.
- The `velero restore delete <name> --confirm` flag is valid.
- `--selector`, `--include-resources`, `--exclude-resources`, `--include-namespaces`, `--namespace-mappings`, `--from-backup`, `--wait`, and `--storage-location` flags are all valid in v1.13.
- Although v1.13 is the version pinned in the post, readers running newer Velero releases should consult the version-specific docs because hook annotations and CLI flags occasionally change between minor releases.
- The post intentionally keeps the cross-region setup explicit (separate backup per region) rather than relying on S3 cross-region replication; both are valid strategies — a future revision could compare trade-offs (cost, RTO impact, snapshot semantics for EBS that are region-bound).
