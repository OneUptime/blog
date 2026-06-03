# Validation Summary: How to Implement Kubernetes Secrets Backup and Restore Using Velero

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Secrets
- Velero backups, restores, schedules, selectors, and restore hooks
- AWS S3 server-side encryption with KMS
- AWS KMS key policies
- AWS CloudTrail and CloudWatch alarms
- External Secrets Operator with AWS Secrets Manager
- Bash, kubectl, jq, and AWS CLI

## Sources Consulted
- Velero resource filtering documentation: https://velero.io/docs/v1.12/resource-filtering/
- Velero restore hooks documentation: https://velero.io/docs/v1.15/restore-hooks/
- Velero restore reference: https://velero.io/docs/v1.15/restore-reference/
- Velero backup file format documentation: https://velero.io/docs/v1.15/output-file-format/
- Velero AWS plugin BackupStorageLocation configuration: https://raw.githubusercontent.com/velero-io/velero-plugin-for-aws/main/backupstoragelocation.md
- External Secrets Operator AWS access documentation: https://external-secrets.io/v1.3.0/provider/aws-access/
- External Secrets Operator API documentation: https://external-secrets.io/v1.3.0/api/externalsecret/
- AWS CLI CloudTrail put-event-selectors documentation: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/put-event-selectors.html
- AWS CLI CloudWatch put-metric-alarm documentation: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html

## Issues Found
- The KMS key policy required a custom `kms:EncryptionContext:velero-backup` value. Velero's AWS object store configuration uses S3 server-side encryption options and does not set that custom KMS encryption context, so the deny statement could block decrypt operations. Removed the deny statement and added `kms:GenerateDataKey*` and `kms:DescribeKey` permissions.
- The restore hook example implied Velero could run the rotation script from the Velero namespace or a `kubectl` container directly. Velero exec restore hooks run inside containers in restored Pods. Updated the text and YAML to target restored Pods with a `tools` container and label selector, and moved the script ConfigMap into the production namespace.
- The selective restore example used `--existing-resource-policy update` while saying it would exclude existing secrets. Velero's update policy attempts to update existing resources; the default restore behavior is non-destructive for existing resources. Removed the update flag.
- The selective restore script tried to parse individual secret names from `velero backup describe --details` and used `--selector metadata.name=...`. Velero selectors are Kubernetes label selectors, not field selectors. Replaced the script with a label-based restore example using a `restore-name=<secret-name>` label.
- The CloudWatch alarm example was wrapped in a Kubernetes ConfigMap, which would not create a CloudWatch alarm. Replaced it with an alarm JSON document and an `aws cloudwatch put-metric-alarm --cli-input-json` command, and noted that CloudTrail events must be forwarded to CloudWatch Logs with a metric filter first.
- The External Secrets Operator examples used `external-secrets.io/v1beta1`. Current official examples use `external-secrets.io/v1`. Updated the SecretStore and ExternalSecret snippets to `v1`.

## Review Notes
The remaining examples are generally valid as patterns, but several depend on environment-specific setup: Velero AWS plugin installation, IAM permissions, CloudTrail-to-CloudWatch metric filters, RBAC for any in-cluster `kubectl` hook container, and labels applied before backup. The post now calls out the most important assumptions where they affect correctness.
