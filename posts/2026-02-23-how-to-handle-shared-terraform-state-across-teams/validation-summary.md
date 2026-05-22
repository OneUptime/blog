# Validation Summary: How to Handle Shared Terraform State Across Teams

## Status
validated

## Post Type
Guide / Best Practices

## Technologies Covered
- Terraform (state management, backends, workspaces, remote state data sources)
- AWS S3 (backend storage, versioning, lifecycle configuration)
- AWS DynamoDB (state locking)
- AWS SSM Parameter Store
- AWS IAM (policy for cross-team state access)
- AWS ECS (used in example resources)
- GitHub Actions (CI/CD apply ordering)

## Sources Consulted
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform `terraform_remote_state` data source: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- Terraform workspaces docs: https://developer.hashicorp.com/terraform/language/state/workspaces
- AWS provider `aws_ssm_parameter` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- AWS provider `aws_s3_bucket_versioning` and `aws_s3_bucket_lifecycle_configuration` resources
- AWS provider `aws_iam_policy` resource
- Terraform CLI `-chdir` flag (introduced in Terraform 0.14)

## Issues Found
- The comment in the workspace example previously read "Workspace name is automatically appended to the key", which is misleading. With the S3 backend, non-default workspace state is stored at `<workspace_key_prefix>/<workspace_name>/<key>` — the workspace name is inserted between the prefix and the key, not appended to the key. Updated the comment to accurately describe the path layout.

## Review Notes
- All code samples are syntactically valid HCL and use current, non-deprecated APIs.
- The S3 backend example uses DynamoDB for state locking, which is still fully supported. As of Terraform 1.10, native S3 locking is also available via `use_lockfile = true`, but DynamoDB locking remains valid and widely used; the post is not incorrect.
- `aws_ssm_parameter` types `"String"` and `"StringList"` are valid.
- The `aws_s3_bucket_lifecycle_configuration` block with `noncurrent_version_expiration { noncurrent_days = 90 }` is correct.
- The `terraform -chdir=DIR` flag is correct (available since Terraform 0.14).
- The workspace example's key/prefix combination (`key = "application/terraform.tfstate"`, `workspace_key_prefix = "application"`) is technically valid but produces a slightly redundant path like `application/<workspace>/application/terraform.tfstate`. A more conventional choice would be `key = "terraform.tfstate"`. Not changed because it still works; only the misleading comment was corrected.
- The post correctly notes that `terraform_remote_state` exposes all outputs to consumers, and recommends Parameter Store as a contract-based intermediary — accurate guidance.
