# Validation Summary: How to Set Up Cross-Cluster Backup Replication on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (talosctl)
- Kubernetes (kubectl)
- Velero (backup/restore, schedules, node-agent, fs-backup)
- Velero AWS plugin (velero-plugin-for-aws v1.8.0)
- AWS S3 and S3 Cross-Region Replication
- MinIO (mc client, bucket replication)
- Prometheus / kube-prometheus-stack (PrometheusRule CR)
- Bash scripting with `jq`

## Sources Consulted
- Velero resource filtering docs: https://velero.io/docs/main/resource-filtering/
- Velero CLI / install docs: https://velero.io/docs/main/
- Velero AWS plugin: https://github.com/vmware-tanzu/velero-plugin-for-aws
- MinIO `mc replicate add` reference: https://docs.min.io/enterprise/aistor-object-store/reference/cli/mc-replicate/mc-replicate-add/
- AWS S3 Replication Configuration reference (ARN format): https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-add-config.html
- AWS IAM ARN format reference: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html
- Prometheus Operator PrometheusRule CRD docs: https://prometheus-operator.dev/

## Issues Found
1. **`--include-cluster-scoped-resources` used without a value** in the `cluster-resources` schedule. This flag is a `stringArray` (per Velero docs) and requires a value such as `"*"` (all) or a comma-separated list of `resource.group`. Using it bare would fail validation. Changed to `--include-cluster-scoped-resources="*"`.
2. **Malformed IAM Role ARN** in the S3 replication JSON: `arn:aws:iam::role/s3-replication-role` is missing the account ID segment. IAM role ARNs are always of the form `arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME`. Replaced with a placeholder `arn:aws:iam::123456789012:role/s3-replication-role`.
3. **"Two main approaches" but three options listed** (A: Shared Bucket, B: S3 CRR, C: MinIO). Corrected the lead-in sentence to "three main approaches" so the count matches the section.
4. **`kubectl get deployments --all-namespaces | grep -v Running`** in the failover script does not do anything useful — Deployment status columns are READY/UP-TO-DATE/AVAILABLE/AGE, not "Running". Changed to `kubectl get pods --all-namespaces | grep -v Running`, which is what reliably surfaces unhealthy workloads (and matches the obvious author intent).

## Review Notes
- `--use-node-agent` and `--default-volumes-to-fs-backup` are the current Velero flags (replacing the older restic-specific flags); they are correct.
- `--snapshot-move-data` is valid for Velero 1.12+ (used with CSI to move snapshot data to object storage).
- Velero plugin version `v1.8.0` is a real release; users may want to track the current latest, but the post is not technically wrong to pin it.
- `velero_backup_failure_total` and `velero_backup_last_successful_timestamp` are both real metrics exported by Velero.
- The MinIO `mc replicate add` syntax and `--replicate "delete,delete-marker,existing-objects"` values are correct per current MinIO docs.
- The `talosctl --talosconfig <file> health` invocation is correct usage.
- Cross-cutting caveat (not changed): the S3 replication JSON snippet shows only the `ReplicationConfiguration` body (no top-level wrapper) — this is the correct payload shape for `aws s3api put-bucket-replication --replication-configuration file://...`, so it's fine in context but readers must remember to also enable versioning on both source and destination buckets, which the post does not call out.
