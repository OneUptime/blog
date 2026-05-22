# Validation Summary: How to Set Up Automated Terraform State Backups

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Terraform
- Terraform state and remote backends
- AWS S3 backend, bucket versioning, lifecycle rules, replication, and CloudWatch
- Google Cloud Storage bucket versioning and lifecycle rules
- AWS CLI
- GitHub Actions
- Bash and jq

## Sources Consulted
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform state command documentation: https://developer.hashicorp.com/terraform/cli/commands/state
- HashiCorp Terraform state push documentation: https://developer.hashicorp.com/terraform/cli/commands/state/push
- Terraform AWS provider `aws_s3_bucket_lifecycle_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- Terraform AWS provider `aws_s3_bucket_replication_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_replication_configuration
- Terraform AWS provider `aws_cloudwatch_metric_alarm` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform Google provider `google_storage_bucket` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- AWS CLI `s3api copy-object` documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/copy-object.html
- AWS CLI S3 examples for `list-object-versions`: https://docs.aws.amazon.com/cli/latest/userguide/cli_s3_code_examples.html
- AWS CLI `cloudwatch put-metric-data` documentation: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-data.html

## Issues Found
- The S3 backend example used `dynamodb_table` for state locking. Terraform now documents DynamoDB-based locking as deprecated for the S3 backend, so the example was changed to `use_lockfile = true`.
- The S3 lifecycle configuration omitted an explicit `filter {}` block. The AWS provider documentation requires lifecycle rules to include a filter block or a single filter predicate, so an empty filter was added to apply the rule to all objects.
- The GCS lifecycle example said old versions would be deleted after 90 days but used `num_newer_versions = 30`, which retains by version count rather than age. The condition was changed to `days_since_noncurrent_time = 90` with `with_state = "ARCHIVED"`, and `send_age_if_zero = false` was added to avoid sending an unintended default age condition.
- The S3 replication rule omitted an explicit replication `filter {}` block. The example was updated to use the current V2-style replication rule shape.
- The CloudWatch monitoring example used the AWS/S3 `NumberOfObjects` metric to detect no new versions in the last 24 hours. That metric counts objects and does not prove a backup happened recently, so the example now publishes a custom `Terraform/State` `BackupSuccess` metric from CI and alarms when that metric is missing.
- The restore instructions said to increment the state serial manually before `terraform state push`. Terraform's documented escape hatch for restoring an older state snapshot is `terraform state push -force`, after verifying the snapshot, so the command and comment were corrected.

## Review Notes
The replication snippet still assumes the required IAM role and permissions are defined elsewhere. The CI artifact backup approach is technically valid, but Terraform state can contain sensitive values, so production pipelines should restrict artifact access and prefer encrypted, access-controlled storage for long-term backups.
