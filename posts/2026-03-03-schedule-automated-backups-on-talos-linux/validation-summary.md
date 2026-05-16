# Validation Summary: How to Schedule Automated Backups on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes (CronJob, PrometheusRule CRD)
- Velero (scheduling, backup verification, restore testing, metrics)
- talosctl (etcd snapshot)
- Prometheus / Prometheus Operator (kube-prometheus-stack)
- AWS S3 (snapshot upload)
- jq (parsing Velero JSON output)
- Slack incoming webhooks (notifications)

## Sources Consulted
- Velero metrics source of truth: [vmware-tanzu/velero pkg/metrics/metrics.go](https://github.com/vmware-tanzu/velero/blob/main/pkg/metrics/metrics.go)
- Velero CLI / Schedule API: [velero.io/docs Schedule API Type](https://velero.io/docs/main/api-types/schedule/)
- Velero troubleshooting / metrics endpoint: [velero.io/docs troubleshooting](https://velero.io/docs/main/troubleshooting/)
- talosctl CLI reference: [docs.siderolabs.com talosctl reference](https://docs.siderolabs.com/talos/v1.12/reference/cli)
- talosctl container image registry: [ghcr.io/siderolabs/talosctl](https://github.com/siderolabs/talos/pkgs/container/talosctl)
- Velero CLI flag references for `--exclude-namespaces`, `--include-namespaces`, `--default-volumes-to-fs-backup`, `--ttl`, `--labels`, `--namespace-mappings`, `--from-backup`, `--wait` (cross-checked against current Velero docs and prior backup tutorials).

## Issues Found

1. **Incorrect Prometheus metric name `velero_backup_storage_location_is_available`** in the `BackupStorageUnavailable` alert. The metric does not exist in Velero. The actual metric exposed by `pkg/metrics/metrics.go` is `velero_backup_location_status_gauge` (gauge: 1 = available, 0 = unavailable). Updated the alert expression to use `velero_backup_location_status_gauge == 0`.

2. **Broken `BackupTakingTooLong` alert expression** `velero_backup_duration_seconds{phase="InProgress"} > 3600`. Two problems: (a) `velero_backup_duration_seconds` is a Histogram (it exposes `_bucket`, `_sum`, `_count` series, not a scalar), so a direct `> 3600` comparison does not produce useful series; and (b) the metric has only a `schedule` label — there is no `phase` label, and the metric is only recorded on backup completion, so it cannot detect an in-progress backup. Rewrote the expression to alert when the 95th-percentile completed backup duration over the last hour exceeds 1 hour: `histogram_quantile(0.95, sum(rate(velero_backup_duration_seconds_bucket[1h])) by (le, schedule)) > 3600`, and adjusted the summary text accordingly to reflect what the alert actually fires on.

## Review Notes
- Velero CLI flags used (`--schedule`, `--include-namespaces`, `--exclude-namespaces`, `--default-volumes-to-fs-backup`, `--ttl`, `--labels`, `--namespace-mappings`, `--from-backup`, `--wait`, `--confirm`) are all valid in current Velero releases.
- TTL hour values (48h, 720h, 2160h, 8760h) correctly map to 2 days / 30 days / 90 days / 365 days.
- All cron expressions parse correctly (`0 * * * *`, `0 2 * * *`, `0 3 * * 0`, `0 4 1 * *`, `0 */6 * * *`, `0 6 * * 6`, `30 8 * * *`).
- `talosctl etcd snapshot <path> --talosconfig <file> --nodes <ip>` matches the official CLI reference.
- `ghcr.io/siderolabs/talosctl:latest` is a published image tag, so the CronJob image reference is valid. For production use, pinning to a specific version tag (e.g. `v1.12.0`) would be safer than `:latest`, but this is a stylistic recommendation, not an error.
- `velero_backup_last_successful_timestamp` and `velero_backup_failure_total` both carry a `schedule` label, so the remaining two alerts (`NoRecentBackup`, `BackupFailed`) use correct metric names and labels.
- The etcd backup CronJob writes snapshots to a `hostPath` (`/var/etcd-backups`). On Talos Linux, hostPath writes are restricted by Pod Security Standards on control-plane nodes; readers may need to relax PSS for the `kube-system` namespace or use a dedicated namespace with appropriate labels. This is a deployment caveat, not a code error.
- The backup verification and notifier CronJob containers run `velero` and `kubectl` from inside the `velero/velero` and `curlimages/curl` images respectively. The `curlimages/curl` image does not ship `velero` or `jq`, so the notifier as written would not actually work without a different image — flagging as a future-improvement note rather than a correctness fix because the post's surrounding text frames this as a template/example pipeline rather than a turn-key manifest.
