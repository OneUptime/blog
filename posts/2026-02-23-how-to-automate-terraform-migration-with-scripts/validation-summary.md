# Validation Summary: How to Automate Terraform Migration with Scripts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform configuration-driven import blocks
- Terraform state management
- AWS CLI
- Bash scripting
- Python scripting

## Sources Consulted
- Terraform import block reference: https://developer.hashicorp.com/terraform/language/block/import
- Terraform import resources overview: https://developer.hashicorp.com/terraform/language/import
- Terraform state command reference: https://developer.hashicorp.com/terraform/cli/commands/state
- Terraform state mv command reference: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- Terraform state push command reference: https://developer.hashicorp.com/terraform/cli/commands/state/push
- Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform validate command reference: https://developer.hashicorp.com/terraform/cli/commands/validate
- Terraform configuration syntax and identifier rules: https://developer.hashicorp.com/terraform/language/syntax/configuration
- AWS CLI ec2 describe-instances command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS CLI s3api list-buckets command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/list-buckets.html
- Terraform AWS provider aws_instance import documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS provider aws_s3_bucket import documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket

## Issues Found
- The inventory script counted the CSV header as a Terraform resource and included the header row in the "Resources by type" summary. Updated the count to subtract the header and changed the type summary to skip the header row.
- The inventory script only captured the first module segment for nested module addresses. Updated module extraction to preserve the full module path.
- The import generation script could generate invalid Terraform resource names for AWS names that start with a digit or contain unsupported characters, and duplicate names could create duplicate resource addresses. Added Terraform identifier sanitization and per-resource-type uniqueness handling.
- The import generation script ignored AWS CLI failures and attempted to parse stdout even when the command failed. Added `check=True` to fail clearly on unsuccessful AWS CLI calls.
- The multi-configuration migration script treated `terraform plan -detailed-exitcode` exit code 1, which indicates an error, the same as exit code 2, which indicates changes. Updated it to distinguish PASS, ERROR, and CHANGES_DETECTED according to Terraform's documented exit codes.
- The multi-configuration migration script depended on `OLDPWD`, did not fail early on directory or command errors, and used an unnecessary `terraform init -upgrade`. Updated it to track the root directory explicitly, use `set -e`, quote `basename`, and run normal initialization.

## Review Notes
Terraform and AWS CLI were not installed in the local workspace, so command behavior was verified against official documentation rather than local `--help` output. The edited Bash examples pass `bash -n`, and the edited Python example compiles with `python3 -m py_compile`.
