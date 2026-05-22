# Validation Summary: How to Handle Terraform for Stateful Application Infrastructure

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- Terraform lifecycle meta-arguments
- Terraform moved blocks
- AWS RDS DB instances
- Amazon ElastiCache replication groups
- Amazon S3 bucket versioning
- Amazon EBS volumes and volume attachments
- Amazon SQS queues and dead-letter queues
- AWS Backup plans and selections

## Sources Consulted
- Terraform lifecycle meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform moved blocks/refactoring documentation: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- Terraform `timestamp` function documentation: https://developer.hashicorp.com/terraform/language/functions/timestamp
- Terraform AWS Provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS Provider `aws_elasticache_replication_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Terraform AWS Provider `aws_s3_bucket_versioning` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- Terraform AWS Provider `aws_volume_attachment` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/volume_attachment
- Terraform AWS Provider `aws_sqs_queue` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue
- Terraform AWS Provider `aws_backup_selection` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/backup_selection

## Issues Found
- The RDS example omitted required master credential configuration. Added `username` and `password = var.database_password` so the `aws_db_instance` example is complete for a new PostgreSQL instance.
- The RDS `final_snapshot_identifier` used `timestamp()` directly in a resource argument. Terraform's documentation warns that this causes a diff on every run, so it was replaced with a stable variable-based suffix.
- The moved block explanation implied moved blocks are a safe pattern for risky provider-level changes. Updated the text to clarify that moved blocks preserve state for Terraform resource address renames and do not make provider-level replacements, such as engine changes, safe.
- The SQS example referenced `aws_sqs_queue.orders_dlq` without defining it. Added a minimal encrypted dead-letter queue resource with `prevent_destroy`.
- The best-practice note said to enable `deletion_protection` at the resource level without qualification. Updated it to say "where the resource supports it" because not all listed AWS resources expose a deletion protection argument.

## Review Notes
Terraform was not installed in the local environment, so command-based formatting or validation could not be run. The snippets were reviewed by inspection against current official Terraform and Terraform AWS Provider documentation.
