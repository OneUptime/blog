# Validation Summary: How to Use Terragrunt Read Functions with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terragrunt
- Terragrunt HCL
- AWS CLI
- AWS Systems Manager Parameter Store
- AWS STS caller identity helpers

## Sources Consulted
- Terragrunt HCL functions documentation: https://docs.terragrunt.com/reference/hcl/functions/
- Terragrunt HCL blocks documentation: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt state backend documentation: https://docs.terragrunt.com/features/units/state-backend/
- OpenTofu module sources documentation: https://opentofu.org/docs/language/modules/sources/
- AWS CLI `ssm get-parameter` command reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/get-parameter.html
- AWS Systems Manager public AMI parameters documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-public-parameters-ami.html

## Issues Found
No technical issues found.

## Review Notes
The examples align with current Terragrunt documentation for `find_in_parent_folders`, `read_terragrunt_config`, `get_env`, AWS identity helpers, Terragrunt path helpers, `path_relative_to_include`, repository-root helpers, `run_cmd`, and `remote_state`. The AWS SSM parameter path used for the Amazon Linux 2023 AMI is documented by AWS.

Local CLI validation was not run because `terragrunt`, `tofu`, and `aws` were not installed in the review environment. A future editorial improvement could add a direct `get_path_to_repo_root()` example in the repository-root section, since the heading names both `get_path_to_repo_root` and `get_repo_root`, but the current `get_repo_root()` example is technically valid.
