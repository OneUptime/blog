# Validation Summary: How to Structure Terraform Folders Properly

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- Terraform AWS provider
- Terraform S3 backend
- Terraform modules and remote state
- Terragrunt
- GitHub Actions

## Sources Consulted
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform configuration language style guide: https://developer.hashicorp.com/terraform/language/style
- Terraform provider block reference: https://developer.hashicorp.com/terraform/language/block/provider
- Terragrunt includes documentation: https://docs.terragrunt.com/features/units/includes/
- Terragrunt HCL functions documentation: https://docs.terragrunt.com/reference/hcl/functions/
- GitHub Actions matrix documentation: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations

## Issues Found
- The Terragrunt `remote_state` example used `dynamodb_table` for Terraform S3 backend locking. Terraform documents DynamoDB-based S3 state locking as deprecated, so this was changed to `use_lockfile = true`.
- The Terragrunt environment example included `env.hcl` and then referenced `local.environment` from the child config. Included locals are not available as child `local` values; Terragrunt's exposed include pattern requires `expose = true` and access through `include.env.locals.environment`. The example was updated accordingly.

## Review Notes
- Terraform and Terragrunt CLIs were not installed in the local environment, so snippets were reviewed against official documentation rather than executed locally.
- The `terraform_remote_state` example is valid Terraform, but HashiCorp recommends using provider-specific data sources or `tfe_outputs` where possible when sharing data between state files.
