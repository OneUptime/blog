# Validation Summary: How to Handle Data Migration Alongside Terraform Changes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HashiCorp Configuration Language)
- AWS RDS (PostgreSQL)
- AWS S3
- AWS DynamoDB
- AWS Database Migration Service (DMS)
- AWS CLI
- PostgreSQL utilities (pg_dump, psql)
- Terraform `null_resource` and provisioners
- Terraform lifecycle rules (`prevent_destroy`)

## Sources Consulted
- AWS DMS source endpoints documentation: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Introduction.Sources.html
- AWS DMS DynamoDB target documentation: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.DynamoDB.html
- Terraform AWS provider — `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider — `aws_dynamodb_table`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- Terraform AWS provider — `aws_dms_endpoint`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dms_endpoint
- Terraform AWS provider source (`internal/service/rds/instance.go`): https://github.com/hashicorp/terraform-provider-aws/blob/main/internal/service/rds/instance.go
- AWS CLI `create-endpoint` reference: https://docs.aws.amazon.com/cli/latest/reference/dms/create-endpoint.html

## Issues Found

1. **Strategy 4 (DynamoDB Migration) used AWS DMS with DynamoDB as both source and target — not supported by AWS DMS.**
   - AWS DMS supports DynamoDB only as a *target* endpoint. The source must be a relational database, MongoDB, DocumentDB, S3, etc. Configuring `endpoint_type = "source"` with `engine_name = "dynamodb"` would fail.
   - **Fix:** Replaced the DMS example with a DynamoDB-native approach using point-in-time recovery (PITR) and the `aws_dynamodb_table` resource's `restore_source_name` / `restore_to_latest_time` attributes, which are the supported way to migrate one DynamoDB table to another via Terraform.

2. **"Handling Terraform Changes That Force Replacement" used `storage_type` (gp2 → gp3) as the example of a replacement-forcing change — incorrect.**
   - The `storage_type` attribute on `aws_db_instance` is not marked `ForceNew` in the Terraform AWS provider schema; gp2 → gp3 is applied in-place via `ModifyDBInstance`, not by replacement.
   - **Fix:** Replaced the example with a change to `engine` (postgres → mysql), which actually does force replacement of the DB instance.

## Review Notes

- The `final_snapshot_identifier = "final-snapshot-${formatdate("YYYYMMDD", timestamp())}"` pattern in Strategy 5 is valid Terraform syntax and the value is only consumed when the resource is destroyed, but `timestamp()` is impure and will show up as a planned change on every `terraform plan`. This is a common Terraform anti-pattern; users typically suppress it with `lifecycle.ignore_changes = [final_snapshot_identifier]` or by computing the suffix outside Terraform. Left as-is since it's not technically incorrect.
- `null_resource` with `local-exec` is still supported but is superseded by the built-in `terraform_data` resource as of Terraform 1.4+. Left as-is — `null_resource` continues to work and is widely used.
- `terraform apply -target=...` is used throughout the runbook section. This works but the Terraform docs explicitly call it an exceptional/troubleshooting tool, not a routine workflow. The runbook framing is fine for a controlled migration.
- PostgreSQL versions referenced (14.9, 16.1) and RDS instance classes (`db.r5.large`, `db.r6g.large`) are all real and valid.
