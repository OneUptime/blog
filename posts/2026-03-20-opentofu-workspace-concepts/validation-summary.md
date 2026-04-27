# Validation Summary: How to Explain OpenTofu Workspace Concepts

## Status
validated

## Post Type
Guide / Conceptual explainer

## Technologies Covered
- OpenTofu (workspaces, CLI)
- Terraform / OpenTofu HCL configuration language
- AWS provider resources (`aws_s3_bucket`, `aws_instance`)
- S3 remote backend for state storage

## Sources Consulted
- OpenTofu workspaces documentation: https://opentofu.org/docs/language/state/workspaces/
- OpenTofu `tofu workspace` CLI reference: https://opentofu.org/docs/cli/commands/workspace/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- Terraform AWS provider `aws_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS provider `aws_s3_bucket` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket

## Issues Found
- In the "Using Workspace in Configuration" example, the `aws_instance` resource used `instance_class` as its argument. The correct argument name for `aws_instance` is `instance_type`; `instance_class` is the argument used by `aws_db_instance` (RDS), not EC2. Updated the resource to use `instance_type = local.instance_type` so the local variable name and the resource argument both match the AWS provider schema.

## Review Notes
- `terraform.workspace` is the correct interpolation expression in OpenTofu — it is preserved for compatibility with Terraform configurations and is documented in the OpenTofu language reference.
- The described S3 backend layout (default state at the root key, non-default workspaces under `env:/<workspace>/<key>`) matches the current OpenTofu S3 backend behavior.
- The "Limitations of Workspaces" code block is tagged as `hcl` but contains a plain numbered list rather than HCL — this is a stylistic choice, not a technical error, so it was left as-is per the review constraints.
- All `tofu workspace` subcommands (`list`, `new`, `select`, `show`, `delete`) and the `-auto-approve` flag for `tofu apply`/`tofu destroy` are valid in current OpenTofu releases.
