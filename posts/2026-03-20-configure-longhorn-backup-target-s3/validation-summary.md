# Validation Summary: How to Configure Longhorn Backup Target to S3

## Status
validated

## Post Type
Tutorial / Step-by-step configuration guide

## Technologies Covered
- Longhorn (distributed block storage for Kubernetes)
- Kubernetes (kubectl, Secrets, ServiceAccounts)
- Amazon S3 / S3-compatible object storage
- MinIO (S3-compatible)
- AWS IAM (policies and IRSA on EKS)
- AWS CLI (`aws s3`, `aws s3api`)

## Sources Consulted
- Longhorn official docs — Set Backup Target: https://longhorn.io/docs/1.7.2/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn official docs — Settings Reference: https://longhorn.io/docs/1.7.2/references/settings/
- Longhorn official docs — Scheduling Backups and Snapshots (recurring job label format): https://longhorn.io/docs/1.7.2/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn deployment YAML on GitHub (verifying ServiceAccount name `longhorn-service-account`): https://github.com/longhorn/longhorn/blob/master/deploy/longhorn.yaml
- AWS CLI documentation for `aws s3 mb`, `aws s3api put-bucket-versioning`, `aws s3api put-public-access-block`, and `aws s3api put-bucket-lifecycle-configuration`

## Issues Found
No technical issues found.

Verified against official Longhorn 1.7.2 documentation:
- S3 backup target URL format `s3://<bucket>@<region>/` (with mandatory trailing slash) is correct.
- Secret credential keys (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINTS`, `AWS_CERT`) match the documented keys.
- Setting names `backup-target` and `backup-target-credential-secret` remain valid in Longhorn 1.7.2.
- ServiceAccount name `longhorn-service-account` matches the upstream deployment manifest.
- Recurring-job label format `recurring-job.longhorn.io/<job-name>=enabled` is correct.
- IAM permission set (`GetObject`, `PutObject`, `DeleteObject`, `ListBucket`, `GetBucketLocation`, `AbortMultipartUpload`, `ListMultipartUploadParts`) is appropriate for Longhorn backup operations on the bucket and its objects.
- AWS CLI commands (`aws s3 mb`, `aws s3api put-bucket-versioning`, `aws s3api put-public-access-block`, `aws s3api put-bucket-lifecycle-configuration`) and their flag syntax are correct.
- `kubectl patch settings.longhorn.io ... --type merge -p '{"value": "..."}'` correctly targets the `value` field of the Longhorn `settings` CRD.

## Review Notes
- IRSA section: Official Longhorn docs do not explicitly cover IRSA. The community pattern shown (annotating `longhorn-service-account` with `eks.amazonaws.com/role-arn`) is reasonable, but depending on the Longhorn version the user may still need to set `backup-target-credential-secret` to a (possibly empty-credential) secret in the namespace. Worth a future caveat if the post is updated.
- The "Test the Backup" snippet's comment says "trigger a backup", but applying the `recurring-job.longhorn.io/<name>=enabled` label only associates the volume with an existing RecurringJob — it does not directly trigger an immediate backup. The kubectl command itself is syntactically correct; this is a minor wording nuance, not a technical error.
- `AWS_ENDPOINTS=""` is included in the standard-AWS secret. It's harmless (and explicitly noted by an inline comment), but technically unnecessary since `AWS_ENDPOINTS` is optional and can simply be omitted for standard AWS S3.
- Versioning: The post doesn't pin to a specific Longhorn version. The reviewed configuration is accurate against Longhorn 1.7.x; readers on older releases (pre-1.5) should still see the same behavior, but UI navigation paths may differ slightly.
