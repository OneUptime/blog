# Validation Summary: How to Automate Ceph Backup Scheduling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (RBD snapshots, export)
- Kubernetes CronJobs
- Velero (backup/restore tool)
- Prometheus / kube-state-metrics (alerting)
- AWS S3 (external backup storage)

## Sources Consulted
- Ceph RBD CLI documentation: https://docs.ceph.com/en/reef/man/8/rbd/
- Kubernetes CronJob API (batch/v1): https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- kube-state-metrics Job metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/job-metrics.md
- Velero CLI documentation: https://velero.io/docs/v1.17/velero-install/
- Velero plugin for AWS releases: https://github.com/vmware-tanzu/velero-plugin-for-aws/releases
- AWS S3 storage classes: https://aws.amazon.com/s3/storage-classes/

## Issues Found
1. **Prometheus alert used wrong label name for Kubernetes Job**: The alert rule used `job=~"rbd-snapshot.*"` and `{{ $labels.job }}` in the annotation. In kube-state-metrics, the `job` label is reserved by Prometheus for the scrape target name. The Kubernetes Job resource name is exposed as `job_name`. Changed both the selector and annotation template to use `job_name` instead of `job`.

## Review Notes
- The Velero plugin version (`velero/velero-plugin-for-aws:v1.8.0`) is valid but older. Current latest is v1.14.x. The post doesn't claim to use the latest, so this is acceptable but readers may want to use a newer version.
- The section title "Using Velero for Application-Consistent Backups" is slightly imprecise -- Velero with CSI snapshots alone provides crash-consistent backups. Application-consistent backups require Velero pre/post hooks to quiesce applications. The title is not strictly wrong (Velero can be used for this purpose with hooks), but readers should be aware of the distinction.
- The `rook-ceph-admin-secret` secret name used in the CronJob is a placeholder that doesn't exist by default in Rook installations. This is consistent with other placeholder values in the example (`mypool`, `myvolume`) but readers will need to substitute the correct secret name for their Rook deployment (typically derived from a CephClient custom resource).
