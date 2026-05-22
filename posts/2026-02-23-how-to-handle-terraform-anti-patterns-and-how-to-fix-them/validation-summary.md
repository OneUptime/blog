# Validation Summary: How to Handle Terraform Anti-Patterns and How to Fix Them

## Status
validated

## Post Type
Guide / Best Practices

## Technologies Covered
- Terraform (HCL)
- AWS provider (aws_instance, aws_subnet, aws_db_instance, aws_ecs_service, aws_iam_role_policy, aws_secretsmanager_secret_version, aws_ami)
- terraform_remote_state data source (S3 backend)
- GitHub Actions (CI/CD workflows)
- TFLint and Checkov (linting tools, mentioned)

## Sources Consulted
- Terraform language docs - count and for_each: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform language docs - lifecycle meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform language docs - variable validation: https://developer.hashicorp.com/terraform/language/values/variables#custom-validation-rules
- Terraform language docs - sensitive variables: https://developer.hashicorp.com/terraform/language/values/variables#suppressing-values-in-cli-output
- Terraform terraform_remote_state data source: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- Terraform CLI plan options (-detailed-exitcode): https://developer.hashicorp.com/terraform/cli/commands/plan#detailed-exitcode
- AWS provider aws_db_instance: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider aws_secretsmanager_secret_version data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_secret_version
- AWS provider aws_ami data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- GitHub Actions checkout action: https://github.com/actions/checkout

## Issues Found
No technical issues found.

All code examples were verified against current Terraform and AWS provider documentation:
- `terraform_remote_state` data source with S3 backend syntax is correct.
- `aws_ami` data source with `most_recent`, `owners`, and `filter` blocks is correct.
- `for_each` with a map vs. `count` index-shifting is an accurate and well-known pattern.
- `aws_secretsmanager_secret_version.secret_string` is the correct attribute name.
- `prevent_destroy`, `ignore_changes`, and `deletion_protection = true` on `aws_db_instance` are valid; `latest_restorable_time` is a real computed attribute that is reasonable to ignore.
- `variable` validation block syntax (`condition`, `error_message`) is current.
- `terraform plan -detailed-exitcode` returns exit code 2 for drift, as stated.
- GitHub Actions workflow uses `actions/checkout@v4` (current) and valid workflow YAML.
- `jsonencode` with IAM policy structure is correct.

## Review Notes
- The `terraform_remote_state` example uses `backend = "s3"`. Recent Terraform versions also support `s3` with native state locking (without DynamoDB), but the example shown is still valid and provider-agnostic in style.
- In Anti-Pattern 7, the "anti-pattern" snippet uses `s.Action` (PascalCase) while the "fix" uses `perm.action` (lowercase). They are separate independent examples so this is not an error, but consistency could be improved in a future revision.
- The post references TFLint and Checkov as automated scanning tools — both are current and actively maintained as of 2026.
- The validation regex for `t3` instance types intentionally restricts to that family for demonstration purposes; readers should adapt to their own allowed list.
