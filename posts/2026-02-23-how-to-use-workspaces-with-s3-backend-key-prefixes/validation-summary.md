# Validation Summary: How to Use Workspaces with S3 Backend Key Prefixes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI workspaces
- Terraform S3 backend
- Terraform remote state
- AWS S3
- AWS IAM policies
- Terraform AWS provider resources
- AWS CLI S3 commands

## Sources Consulted
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform workspaces documentation: https://docs.hashicorp.com/terraform/language/state/workspaces
- HashiCorp terraform_remote_state data source documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- HashiCorp Terraform init command documentation: https://developer.hashicorp.com/terraform/cli/commands/init
- AWS Prescriptive Guidance for Terraform backend best practices: https://docs.aws.amazon.com/prescriptive-guidance/latest/terraform-aws-provider-best-practices/backend.html
- Terraform AWS provider aws_s3_bucket_server_side_encryption_configuration documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- AWS CLI S3 command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/

## Issues Found
- The post said the `env:` workspace prefix was hardcoded and could not be changed through configuration. Changed this to say `env:` is Terraform's default workspace key prefix, because the S3 backend supports `workspace_key_prefix`.
- The multi-project example used `key = "terraform.tfstate"` for several projects while implying a single organized structure that included the default workspace. Because the default workspace ignores `workspace_key_prefix`, those projects would collide at the root `terraform.tfstate` key. Updated the section to describe the shown structure as applying to named workspaces and added a caveat to avoid the default workspace or use distinct `key` values for default workspace state.
- The post used `dynamodb_table` for S3 backend state locking. Current Terraform documentation marks DynamoDB-based S3 backend locking as deprecated and recommends S3 lock files with `use_lockfile = true`. Replaced the DynamoDB locking examples and troubleshooting text with S3 lock file examples.
- The bootstrap configuration created a DynamoDB table for state locking. Removed that deprecated-locking resource from the example because the updated backend examples use S3 native lock files.

## Review Notes
The remaining Terraform backend path examples, `terraform_remote_state` workspace usage, IAM object prefix examples, AWS provider S3 bucket resources, and AWS CLI commands are consistent with current official documentation. The local environment did not have `terraform` or `aws` installed, so CLI syntax was verified against official command documentation rather than local `--help` output.
