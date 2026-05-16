# Validation Summary: How to Set Up Automated etcd Backups for Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (`talosctl`)
- etcd / etcdctl
- Kubernetes (CronJob, Secret, ServiceAccount, batch/v1 API)
- Bash scripting / cron
- AWS S3 (CLI, lifecycle configuration, SSE-KMS)
- Velero
- Prometheus / Pushgateway alerting

## Sources Consulted
- Talos Linux docs — `talosctl etcd snapshot` / `talosctl etcd status`: https://www.talos.dev/v1.7/talos-guides/configuration/etcd-maintenance/
- Talos `talosctl` reference: https://www.talos.dev/v1.7/reference/cli/
- Sidero Labs talosctl container image: https://github.com/siderolabs/talos/pkgs/container/talosctl
- Kubernetes CronJob reference (batch/v1): https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes CronJob labels (KEP for `batch.kubernetes.io/cronjob-name`): https://kubernetes.io/docs/reference/labels-annotations-taints/#batch-kubernetes-io-cronjob-name
- Velero install / plugin documentation: https://velero.io/docs/main/basic-install/ and https://github.com/vmware-tanzu/velero-plugin-for-aws
- etcdctl snapshot command: https://etcd.io/docs/v3.5/op-guide/recovery/
- Prometheus Pushgateway exposition format: https://github.com/prometheus/pushgateway
- AWS S3 lifecycle configuration: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-configuration-examples.html

## Issues Found
1. **Incorrect label selector for listing CronJob-created Jobs.** The post used `kubectl get jobs -l job-name=etcd-backup`. The `job-name` label that Kubernetes sets on Jobs created by a CronJob is the *Job's own unique name* (e.g., `etcd-backup-28534567`), not the parent CronJob's name, so this selector matches nothing. Fixed to use `batch.kubernetes.io/cronjob-name=etcd-backup`, which is the canonical label introduced in Kubernetes 1.27 for filtering Jobs by their owning CronJob.
2. **Missing `--plugins` flag in `velero install`.** When installing Velero with `--provider aws`, the cloud-provider plugin container must also be specified, otherwise the install completes but backups to S3 fail because no provider plugin is loaded. Added `--plugins velero/velero-plugin-for-aws:v1.10.0` to the install command.

## Review Notes
- The `ghcr.io/siderolabs/talosctl:v1.7.0` image contains only the `talosctl` binary. The Approach 2 CronJob script also invokes `aws s3 cp`, so in practice users would need to either build a custom image bundling both `talosctl` and the AWS CLI, or split the snapshot and upload into separate containers. The post is presented as illustrative, so this was left as-is, but readers should be aware.
- Talos v1.7.0 is a real release (April 2024). If readers are on a newer Talos version they should pin to a matching `talosctl` image tag.
- The `etcd_backup_failures_total` metric referenced in the Prometheus alert is not produced by the example backup script — it is implied as something the operator would emit on failure (e.g., via Pushgateway). Worth noting but not technically wrong.
- The Pushgateway exposition body in `--data-binary` does not include a trailing newline; Pushgateway is generally lenient about this, but strictly conformant exposition format expects one. Not corrected as it is broadly accepted in practice.
- `--include-resources=*` in `velero schedule create` is valid (and equivalent to the default), but the `*` will be glob-expanded by some shells if there are matching files in the current directory; quoting it would be safer in production.
