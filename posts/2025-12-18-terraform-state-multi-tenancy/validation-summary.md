# Validation Summary: How to Manage Terraform State for Multi-Tenancy

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform state and backends
- Terraform CLI workspaces
- Terraform S3 backend
- Terragrunt
- AWS S3
- AWS IAM
- AWS KMS
- AWS EventBridge
- AWS CloudWatch

## Sources Consulted
- Terraform backend block configuration overview: https://developer.hashicorp.com/terraform/language/backend
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform workspace CLI documentation: https://developer.hashicorp.com/terraform/cli/workspaces
- Terraform workspace command references: https://developer.hashicorp.com/terraform/cli/commands/workspace/new, https://developer.hashicorp.com/terraform/cli/commands/workspace/select, https://developer.hashicorp.com/terraform/cli/commands/workspace/list
- Terraform init command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform apply command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terragrunt CLI redesign migration guide: https://docs.terragrunt.com/migrate/cli-redesign/
- Terragrunt run command reference: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt strict controls documentation: https://docs.terragrunt.com/reference/strict-controls/
- Amazon S3 CloudWatch metrics documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html
- Amazon S3 EventBridge documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventBridge.html
- Amazon EventBridge S3 object-level logging tutorial: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-log-s3-data-events.html
- Terraform AWS provider registry documentation for `aws_s3_bucket_notification`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_notification

## Issues Found
- The S3 backend examples used `dynamodb_table` for state locking. Terraform's S3 backend now documents DynamoDB locking as deprecated and recommends `use_lockfile` for S3-native locking, so the examples were updated to `use_lockfile = true`.
- The workspace example referenced `var.all_tenant_ids` without declaring it. Added the missing `all_tenant_ids` variable.
- The workspaces limitations said the "state file grows with tenant count." With the S3 backend, non-default workspaces are stored at separate state paths, so this was changed to "Workspace count grows with tenant count."
- The separate-state-file section initially presented a backend key using `var.tenant_id` as if it were a working pattern. Backend blocks cannot refer to input variables, so the wording now frames it as the tempting direct approach and points readers to partial backend configuration instead.
- The Terragrunt bulk commands used deprecated `run-all` syntax. Updated them to the current `terragrunt run --all ...` form and adjusted the direct apply example to `terragrunt run -- apply -auto-approve`.
- The cross-account backend comment used flat `role_arn` backend configuration. Current S3 backend documentation uses nested `assume_role`, so the comment was corrected to describe `assume_role = { role_arn = ... }`.
- The tenant IAM policy included DynamoDB lock-table permissions tied to the deprecated locking approach. Removed the DynamoDB statement and kept S3 object access for state and lock files.
- The onboarding module referenced `var.state_bucket` without declaring it. Added the missing `state_bucket` variable.
- The monitoring example used the daily S3 `NumberOfObjects` storage metric as a near-real-time state modification alarm. Replaced it with an EventBridge-based S3 object create/delete rule for the tenant state prefix.
- The monitoring example now references an SNS topic ARN for the EventBridge target, so the missing `state_change_topic_arn` variable was added.
- The KMS backend example used a short alias string where the Terraform S3 backend documentation specifies a KMS key ARN. Updated the example to use an alias ARN placeholder.

## Review Notes
- Terraform and Terragrunt CLIs were not installed in the local environment, so snippets were reviewed against official documentation rather than executed locally.
- `aws_s3_bucket_notification` manages the bucket notification configuration for a bucket; in a real module, combine all S3 notification settings in one resource to avoid replacing existing notification configuration.
