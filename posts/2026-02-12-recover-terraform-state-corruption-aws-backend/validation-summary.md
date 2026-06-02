# Validation Summary: How to Recover from Terraform State Corruption with AWS Backend

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform S3 backend
- AWS S3
- AWS CLI
- AWS provider for Terraform
- Amazon EC2
- Amazon RDS

## Sources Consulted
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform `state push` command documentation: https://developer.hashicorp.com/terraform/cli/commands/state/push
- Terraform `force-unlock` command documentation: https://developer.hashicorp.com/terraform/cli/commands/force-unlock
- Terraform import documentation: https://developer.hashicorp.com/terraform/language/import
- AWS CLI `s3api list-object-versions` documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/list-object-versions.html
- AWS CLI `s3api get-object` documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/get-object.html
- AWS CLI `s3api head-object` documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/head-object.html
- AWS CLI `ec2 describe-instances` documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS CLI `ec2 describe-vpcs` documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpcs.html
- AWS CLI `rds describe-db-instances` documentation: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html
- Terraform AWS provider S3 lifecycle configuration documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration

## Issues Found
- The post presented DynamoDB locking as the current S3 backend locking mechanism. Current Terraform documentation marks DynamoDB-based locking as deprecated and recommends S3 lock files via `use_lockfile = true`, so the backend snippet and explanations were updated.
- The restore workflow uploaded restored state directly with `aws s3 cp`, bypassing Terraform's state push checks. It was changed to `terraform state push -force restored_state.json`, which is the Terraform CLI command for pushing a local state file to the configured backend. The force flag is needed for this recovery scenario because an older restored state version may have a lower serial than the currently stored state.
- The stuck lock verification command checked DynamoDB directly. It was changed to check the S3 `.tflock` object with `aws s3api head-object`, matching the updated S3 lock-file backend configuration.
- Indexed Terraform import addresses were unquoted. They were wrapped in single quotes so shells do not interpret the square brackets as glob syntax.
- The "State Surgery with jq" heading was inaccurate because the example uses Python JSON processing, not `jq`. The heading was changed to "State Surgery with JSON Manipulation."

## Review Notes
The AWS CLI commands and Terraform AWS provider resource snippets are otherwise consistent with current official documentation. Terraform and AWS CLI were not installed in the local environment, so command validation was performed against official documentation rather than local `--help` output.
