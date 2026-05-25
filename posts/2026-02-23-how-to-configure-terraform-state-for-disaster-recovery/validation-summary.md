# Validation Summary: How to Configure Terraform State for Disaster Recovery

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI and S3 backend configuration
- Terraform AWS provider resources for S3, DynamoDB, and CloudWatch
- AWS S3 cross-region replication and replication metrics
- AWS DynamoDB global tables
- Google Cloud Storage buckets, lifecycle rules, and Storage Transfer Service
- GitHub Actions scheduled workflows
- Bash recovery scripts

## Sources Consulted
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform init command documentation: https://developer.hashicorp.com/terraform/cli/commands/init
- HashiCorp Terraform state pull documentation: https://developer.hashicorp.com/terraform/cli/commands/state/pull
- HashiCorp Terraform plan command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform AWS provider `aws_s3_bucket_replication_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_replication_configuration
- Terraform AWS provider `aws_dynamodb_table` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- AWS S3 documentation for replicating SSE-KMS encrypted objects: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-config-for-kms-objects.html
- AWS S3 replication metrics and dimensions documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html
- Google Cloud Storage bucket locations documentation: https://cloud.google.com/storage/docs/locations
- Google Cloud Storage lifecycle documentation: https://cloud.google.com/storage/docs/lifecycle
- Terraform Google provider `google_storage_bucket` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- Terraform Google provider `google_storage_transfer_job` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_transfer_job
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions

## Issues Found
- The S3 replication rule configured destination KMS encryption but did not opt in to replicating SSE-KMS encrypted source objects. Added `source_selection_criteria` with `sse_kms_encrypted_objects` enabled, matching AWS and Terraform provider requirements.
- The S3 replication rule used delete-marker replication without an explicit V2 rule filter and did not ensure versioning was enabled before replication configuration. Added `priority`, an empty `filter {}`, and `depends_on` for both bucket versioning resources.
- The later CloudWatch alarm used the `ReplicationLatency` metric, but replication metrics were not enabled in the replication rule. Added a `metrics` block with the required 15-minute event threshold.
- The S3 backend examples omitted the required `key` argument. Added a consistent state key to both primary and DR backend config files.
- The S3 backend examples used `dynamodb_table`, which is now deprecated for S3 backend state locking. Updated the main backend examples to use `use_lockfile = true` and reframed DynamoDB global tables as a legacy locking option.
- The GCS lifecycle comment said it retained 90 days of versions, but the configuration used `num_newer_versions = 90`, which retains by version count rather than age. Replaced it with `age = 90` for archived versions.
- The GitHub Actions Slack notification referenced `$SLACK_WEBHOOK` without exposing the secret to the step environment. Added an `env` mapping for `secrets.SLACK_WEBHOOK`.
- The failover script used `terraform state list` followed by `$?` under `set -e`, which would exit before the error branch ran. Changed it to an `if terraform state list ...; then` condition.
- The CloudWatch alarm did not follow AWS guidance for missing S3 replication metric data. Added `treat_missing_data = "ignore"`.

## Review Notes
Terraform was not installed in the local environment, so CLI flags were verified against official HashiCorp command documentation rather than local `terraform --help` output. The AWS S3 example still assumes supporting IAM role and KMS key resources exist elsewhere, which is acceptable for the partial snippet but should be made explicit if the post is later expanded into a complete module.
